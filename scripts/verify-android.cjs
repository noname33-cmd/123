const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');

const expectedLabels = [
  'Truck Route & Savings',
  'Navigation provider is not configured.',
  'Foundation build. Routing and GPS are unavailable.',
];

function assertApkIdentity(badging) {
  if (!/^package: name='com\.truckroutesavings'/m.test(badging)) {
    throw new Error('APK must belong to com.truckroutesavings');
  }
}

function assertShellVisible(xml) {
  const decode = value => value.replace(/&(?:amp|lt|gt|quot|apos);/g, entity =>
    ({'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'"})[entity]);
  const labels = [...xml.matchAll(/\btext="([^"]*)"/g)].map(match => decode(match[1]));
  const missing = expectedLabels.filter(label => !labels.includes(label));
  if (missing.length) {throw new Error(`Android shell is missing: ${missing.join('; ')}`);}
}

function configFromEnv(env) {
  if (!env.ANDROID_SERIAL) {throw new Error('Set ANDROID_SERIAL explicitly; no device is selected automatically');}
  if (!env.ANDROID_APK_PATH || !fs.existsSync(env.ANDROID_APK_PATH)) {
    throw new Error('Set ANDROID_APK_PATH to an existing debug APK');
  }
  return {
    serial: env.ANDROID_SERIAL,
    apk: path.resolve(env.ANDROID_APK_PATH),
    adb: env.ADB_PATH ?? (env.ANDROID_HOME
      ? path.join(env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
      : 'adb'),
    aapt2: env.AAPT2_PATH ?? (env.ANDROID_HOME
      ? path.join(env.ANDROID_HOME, 'build-tools', '36.0.0', process.platform === 'win32' ? 'aapt2.exe' : 'aapt2')
      : 'aapt2'),
    artifacts: path.resolve(env.ANDROID_ARTIFACTS_DIR ?? 'artifacts/android-smoke'),
  };
}

async function verifyAndroid(config, {spawn = spawnSync,
  pause = () => new Promise(resolve => setTimeout(resolve, 2000))} = {}) {
  const manifest = spawn(config.aapt2, ['dump', 'badging', config.apk], {
    encoding: 'utf8', timeout: 30000,
  });
  if (manifest.error || manifest.status !== 0) {throw new Error('APK manifest inspection failed');}
  assertApkIdentity(manifest.stdout);
  const adb = (...args) => {
    const result = spawn(config.adb, ['-s', config.serial, ...args], {
      encoding: 'utf8', timeout: 30000,
    });
    if (result.error || result.status !== 0) {
      throw new Error(result.error?.message ?? result.stderr.trim() ?? 'adb failed');
    }
    return result.stdout.trim();
  };
  if (adb('get-state') !== 'device') {throw new Error('Selected device is not ready');}
  adb('install', '-r', config.apk);
  adb('reverse', 'tcp:8081', 'tcp:8081');
  const packageName = 'com.truckroutesavings';
  adb('shell', 'am', 'force-stop', packageName);
  const launch = adb('shell', 'am', 'start', '-W', '-n', `${packageName}/.MainActivity`);
  if (!/Status: ok/.test(launch)) {throw new Error('Android Activity launch failed');}
  const remoteBase = `/sdcard/truck-foundation-${randomUUID()}`;
  let xml;
  let lastError;
  try {
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        adb('shell', 'uiautomator', 'dump', `${remoteBase}.xml`);
        xml = adb('exec-out', 'cat', `${remoteBase}.xml`);
        assertShellVisible(xml);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        await pause();
      }
    }
    fs.mkdirSync(config.artifacts, {recursive: true});
    if (xml) {fs.writeFileSync(path.join(config.artifacts, 'ui.xml'), xml);}
    const evidenceErrors = [];
    const capture = (name, action) => {
      try {return action();}
      catch (error) {evidenceErrors.push(`${name}: ${error.message}`); return undefined;}
    };
    // Retain independent diagnostics even if a UI assertion or screenshot fails.
    capture('screenshot', () => {
      adb('shell', 'screencap', '-p', `${remoteBase}.png`);
      adb('pull', `${remoteBase}.png`, path.join(config.artifacts, 'screen.png'));
    });
    const pid = capture('pid', () => adb('shell', 'pidof', '-s', packageName));
    const logs = /^\d+$/.test(pid ?? '') ? capture('logs', () => {
      const value = adb('logcat', '-d', '--pid', pid, '-t', '200');
      fs.writeFileSync(path.join(config.artifacts, 'app.log'), value);
      return value;
    }) : undefined;
    if (evidenceErrors.length) {
      fs.writeFileSync(path.join(config.artifacts, 'capture-errors.txt'), evidenceErrors.join('\n'));
    }
    if (lastError) {throw lastError;}
    if (!/^\d+$/.test(pid)) {throw new Error('App process is no longer running');}
    if (evidenceErrors.length || logs === undefined) {throw new Error('Android evidence collection failed');}
    if (/FATAL EXCEPTION|JavascriptException|ReactNativeJS.*Error:/.test(logs)) {
      throw new Error('App logs contain a native or JavaScript error');
    }
    console.log(`Android shell passed on ${config.serial}; artifacts: ${config.artifacts}`);
  } finally {
    adb('shell', 'rm', '-f', `${remoteBase}.xml`, `${remoteBase}.png`);
  }
}

module.exports = {assertApkIdentity, assertShellVisible, configFromEnv, verifyAndroid};
if (require.main === module) {
  Promise.resolve().then(() => verifyAndroid(configFromEnv(process.env)))
    .catch(error => {console.error(error.message); process.exitCode = 1;});
}
