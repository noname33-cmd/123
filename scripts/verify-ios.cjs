const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');

function configFromEnv(env, platform = process.platform) {
  if (platform !== 'darwin') {throw new Error('iOS smoke requires macOS with Xcode');}
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(env.IOS_SIMULATOR_UDID ?? '')) {
    throw new Error('Set IOS_SIMULATOR_UDID explicitly to a simulator UUID');
  }
  return {
    udid: env.IOS_SIMULATOR_UDID,
    artifacts: path.resolve(env.IOS_ARTIFACTS_DIR ?? 'artifacts/ios-smoke'),
    ios: path.resolve(__dirname, '../apps/mobile/ios'),
  };
}

function assertSimulator(devices, udid) {
  const device = Object.entries(devices).filter(([runtime]) => runtime.includes('.iOS-'))
    .flatMap(([, entries]) => entries).find(entry => entry.udid === udid && entry.isAvailable);
  if (!device) {throw new Error('Selected iOS simulator is absent or unavailable');}
  return device;
}

function testArguments(config, result) {
  return ['test', '-workspace', 'TruckRouteSavings.xcworkspace', '-scheme', 'TruckRouteSavings',
    '-configuration', 'Debug', '-destination', `platform=iOS Simulator,id=${config.udid}`,
    '-parallel-testing-enabled', 'NO', '-maximum-concurrent-test-simulator-destinations', '1',
    '-only-testing:TruckRouteSavingsUITests/FoundationSmokeTests',
    '-resultBundlePath', result, 'CODE_SIGNING_ALLOWED=NO'];
}

function verifyIOS(config) {
  const simctl = (...args) => {
    const r = spawnSync('xcrun', ['simctl', ...args], {encoding: 'utf8', timeout: 180000});
    if (r.error || r.status !== 0) {throw new Error(`simctl ${args[0]} failed: ${r.error?.message ?? r.stderr}`);}
    return r.stdout;
  };
  const device = assertSimulator(JSON.parse(simctl('list', 'devices', '--json')).devices, config.udid);
  if (device.state === 'Shutdown') {simctl('boot', config.udid);}
  simctl('bootstatus', config.udid, '-b');
  fs.mkdirSync(config.artifacts, {recursive: true});
  const result = path.join(config.artifacts, `foundation-${randomUUID()}.xcresult`);
  const r = spawnSync('xcodebuild', testArguments(config, result), {
    cwd: config.ios, stdio: 'inherit', timeout: 1200000,
    env: {...process.env, FORCE_BUNDLING: '1', RCT_NO_LAUNCH_PACKAGER: '1'},
  });
  if (r.error || r.status !== 0) {throw new Error(`iOS XCTest failed: ${r.error?.message ?? r.status}; evidence: ${result}`);}
  console.log(`iOS shell XCTest passed on ${config.udid}; evidence: ${result}`);
}

module.exports = {configFromEnv, assertSimulator, testArguments};
if (require.main === module) {
  try {verifyIOS(configFromEnv(process.env));}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
