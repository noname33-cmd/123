const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {assertApkIdentity, assertShellVisible, configFromEnv, verifyAndroid} = require('./verify-android.cjs');

test('refuses to choose an arbitrary device', () => {
  assert.throws(() => configFromEnv({}), /ANDROID_SERIAL explicitly/);
});

test('rejects an APK for another application', () => {
  assert.throws(() => assertApkIdentity("package: name='com.otherapp'"), /com.truckroutesavings/);
});

test('does not accept a loading screen or redbox as a successful launch', () => {
  assert.throws(() => assertShellVisible('<node text="Checking navigation availability…"/>'), /missing/);
});

test('recognizes the exact shell text with XML-escaped ampersand', () => {
  assert.doesNotThrow(() => assertShellVisible('<hierarchy>' +
    '<node text="Truck Route &amp; Savings"/>' +
    '<node text="Navigation provider is not configured."/>' +
    '<node text="Foundation build. Routing and GPS are unavailable."/>' +
    '</hierarchy>'));
});

test('retains failed UI and app logs when screenshot capture fails, preserving the UI failure', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'truck-android-evidence-'));
  const xml = '<hierarchy><node text="Loading"/></hierarchy>';
  const commands = [];
  const spawn = (command, args) => {
    const input = args.slice(2).join(' ');
    commands.push(input);
    let stdout = '';
    if (command === 'aapt2') {stdout = "package: name='com.truckroutesavings'";}
    else if (input === 'get-state') {stdout = 'device';}
    else if (input.startsWith('shell am start')) {stdout = 'Status: ok';}
    else if (input.startsWith('exec-out cat')) {stdout = xml;}
    else if (input.startsWith('shell pidof')) {stdout = '123';}
    else if (input.startsWith('logcat')) {stdout = 'application diagnostics';}
    else if (input.startsWith('shell screencap')) {return {status: 1, stderr: 'screenshot unavailable'};}
    return {status: 0, stdout, stderr: ''};
  };
  try {
    await assert.rejects(verifyAndroid({aapt2: 'aapt2', adb: 'adb', serial: 'test-device',
      apk: 'test.apk', artifacts: dir}, {spawn, pause: async () => {}}), /Android shell is missing/);
    assert.equal(fs.readFileSync(path.join(dir, 'ui.xml'), 'utf8'), xml);
    assert.equal(fs.readFileSync(path.join(dir, 'app.log'), 'utf8'), 'application diagnostics');
    assert.match(fs.readFileSync(path.join(dir, 'capture-errors.txt'), 'utf8'), /screenshot unavailable/);
    assert.ok(commands.at(-1).startsWith('shell rm -f /sdcard/truck-foundation-'));
  } finally {
    // mkdtemp returned this exact owned child of the OS temp directory.
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
