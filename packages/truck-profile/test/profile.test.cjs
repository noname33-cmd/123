/* eslint-disable @typescript-eslint/no-var-requires -- Node test runner uses CommonJS. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseTruckProfile} = require('../dist');

// Synthetic input only: these values are not defaults, legal limits or provider data.
const fixture = (vehicleType = 'tractor-semitrailer') => ({
  schemaVersion: 1, vehicleType, name: ' Test vehicle ',
  overallHeightMeters: '004.1000', overallWidthMeters: '2.50', overallLengthMeters: '20.0',
  currentGrossMassKilograms: '30000.123456789', totalAxleCount: 5,
});

for (const vehicleType of ['rigid-truck', 'tractor-semitrailer']) {
test(`${vehicleType} keeps exact measurements, vehicle type and input unchanged`, () => {
  const input = fixture(vehicleType);
  const before = JSON.stringify(input);
  const result = parseTruckProfile(input);
  assert.equal(result.ok, true);
  assert.equal(result.value.vehicleType, vehicleType);
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.value.name, 'Test vehicle');
  assert.equal(result.value.overallHeightMeters, '4.1');
  assert.equal(result.value.currentGrossMassKilograms, '30000.123456789');
  assert.equal(Object.isFrozen(result.value), true);
  input.name = 'changed later';
  assert.equal(result.value.name, 'Test vehicle');
  assert.deepEqual(parseTruckProfile(JSON.parse(JSON.stringify(result.value))), result);
});

test(`${vehicleType} rejects missing fields`, () => {
  for (const field of Object.keys(fixture(vehicleType))) {
    const input = fixture(vehicleType); delete input[field];
    assert.deepEqual(parseTruckProfile(input), {ok: false, issues: [{field, code: 'required'}]});
  }
});
}

test('incomplete profiles and unsupported types never gain defaults or car fallback', () => {
  for (const field of Object.keys(fixture())) {
    const input = fixture(); delete input[field];
    assert.deepEqual(parseTruckProfile(input), {ok: false, issues: [{field, code: 'required'}]});
  }
  for (const vehicleType of ['car', 'tractor-double-trailer', '', null]) {
    const result = parseTruckProfile({...fixture(), vehicleType});
    assert.equal(result.ok, false);
    assert.ok(result.issues.some(issue => issue.code === 'unsupported-vehicle-type'));
  }
  assert.equal(parseTruckProfile({...fixture(), schemaVersion: '1'}).ok, false);
});

test('unknown constraints are rejected instead of silently discarded', () => {
  const result = parseTruckProfile({...fixture(), hazardousCargo: true});
  assert.deepEqual(result, {ok: false, issues: [{field: 'hazardousCargo', code: 'unexpected-field'}]});
  for (const input of [null, [], new Date(), 'profile']) {
    assert.deepEqual(parseTruckProfile(input), {ok: false, issues: [{field: '$', code: 'expected-object'}]});
  }
});

test('invalid declared values fail with field issues and do not echo input values', () => {
  const input = {...fixture(), name: ' ', overallHeightMeters: 4.1,
    overallWidthMeters: '0', overallLengthMeters: null,
    currentGrossMassKilograms: 'unknown-sensitive-value', totalAxleCount: 1.5};
  const result = parseTruckProfile(input);
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map(issue => issue.field).sort(), [
    'name', 'overallHeightMeters', 'overallWidthMeters', 'overallLengthMeters',
    'currentGrossMassKilograms', 'totalAxleCount',
  ].sort());
  assert.ok(!JSON.stringify(result).includes(input.currentGrossMassKilograms));
  for (const totalAxleCount of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '5']) {
    assert.equal(parseTruckProfile({...fixture(), totalAxleCount}).ok, false);
  }
});
