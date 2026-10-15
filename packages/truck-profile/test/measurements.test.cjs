/* eslint-disable @typescript-eslint/no-var-requires -- Node test runner uses CommonJS. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseMeters, parseKilograms} = require('../dist');

test('SI decimals preserve all significant digits without a floating point round-trip', () => {
  for (const parse of [parseMeters, parseKilograms]) {
    const exact = '9007199254740993.1234567890123456789';
    assert.deepEqual(parse(exact), {ok: true, value: exact});
    assert.deepEqual(parse(' 0004.114800 '), {ok: true, value: '4.1148'});
    assert.deepEqual(parse('000.0000100'), {ok: true, value: '0.00001'});
  }
});

test('measurements reject numbers, ambiguous formats and unknown values instead of assuming defaults', () => {
  for (const parse of [parseMeters, parseKilograms]) {
    for (const value of [4.1148, NaN, Infinity, null, undefined, '', '1e3', '-1', '+1', '.5', '1.',
      '4,1', '1,000', '13 ft', '100 kg', {}, []]) {
      assert.deepEqual(parse(value), {ok: false, code: 'expected-decimal-string'});
    }
    for (const zero of ['0', '0.0', '000.000']) {
      assert.deepEqual(parse(zero), {ok: false, code: 'must-be-positive'});
    }
  }
});
