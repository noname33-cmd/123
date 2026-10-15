const {test} = require('node:test');
const assert = require('node:assert/strict');
const {configFromEnv, assertSimulator, testArguments} = require('./verify-ios.cjs');
const udid = '12345678-1234-1234-1234-123456789abc';

test('iOS smoke rejects non-macOS and implicit or malformed simulator selection', () => {
  assert.throws(() => configFromEnv({IOS_SIMULATOR_UDID: udid}, 'win32'), /macOS/);
  for (const value of [undefined, 'booted', '-destination', 'iPhone']) {
    assert.throws(() => configFromEnv({IOS_SIMULATOR_UDID: value}, 'darwin'), /explicitly/);
  }
});
test('iOS smoke rejects unavailable devices and non-iOS runtimes', () => {
  const device = {udid, isAvailable: true, state: 'Shutdown'};
  assert.equal(assertSimulator({'com.apple.CoreSimulator.SimRuntime.iOS-18-5': [device]}, udid), device);
  assert.throws(() => assertSimulator({'runtime.tvOS-18-5': [device]}, udid), /unavailable/);
  assert.throws(() => assertSimulator({'runtime.iOS-18-5': [{...device, isAvailable: false}]}, udid), /unavailable/);
});
test('iOS command runs UI tests on the explicit device and retains result evidence', () => {
  const config = configFromEnv({IOS_SIMULATOR_UDID: udid}, 'darwin');
  const args = testArguments(config, '/evidence with spaces/run.xcresult');
  assert.equal(args[0], 'test');
  assert.ok(args.includes(`platform=iOS Simulator,id=${udid}`));
  assert.ok(args.includes('-only-testing:TruckRouteSavingsUITests/FoundationSmokeTests'));
  assert.equal(args[args.indexOf('-resultBundlePath') + 1], '/evidence with spaces/run.xcresult');
});
