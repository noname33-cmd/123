const {test} = require('node:test');
const assert = require('node:assert/strict');
const {assertApkIdentity, assertShellVisible, configFromEnv} = require('./verify-android.cjs');

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
