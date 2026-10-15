/* eslint-disable @typescript-eslint/no-var-requires -- Node test runner uses CommonJS. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {feetToMeters, inchesToMeters, poundsToKilograms, feetAndInchesToMeters} = require('../dist');

test('exact definitions and independently specified decimal examples', () => {
  for (const [convert, input, expected] of [
    [feetToMeters, '1', '0.3048'], [inchesToMeters, '1', '0.0254'],
    [poundsToKilograms, '1', '0.45359237'],
    [feetToMeters, '13.5', '4.1148'], [inchesToMeters, '162', '4.1148'],
    [poundsToKilograms, '80000', '36287.3896'],
    [poundsToKilograms, '0.00000001', '0.0000000045359237'],
    [feetToMeters, ' 0000.00000100 ', '0.0000003048'],
    [inchesToMeters, '9007199254740993', '228782861070421.2222'],
  ]) {
    assert.deepEqual(convert(input), {ok: true, value: expected});
  }
});

test('converters reject ambiguous, nonpositive and non-string input without guessing units', () => {
  for (const convert of [feetToMeters, inchesToMeters, poundsToKilograms]) {
    for (const input of [null, undefined, 13.5, NaN, Infinity, {}, [], '', '-1', '+1',
      '1e3', '13,5', '80,000', '13 ft 6 in', '13 1/2', '1 lb', '.5', '1.']) {
      assert.deepEqual(convert(input), {ok: false, code: 'expected-decimal-string'});
    }
    assert.deepEqual(convert('000.00'), {ok: false, code: 'must-be-positive'});
  }
});

test('feet and equivalent inches give identical SI results across decimal scales', () => {
  for (const [feet, inches] of [['1', '12'], ['0.125', '1.5'], ['123456789.01', '1481481468.12']]) {
    assert.deepEqual(feetToMeters(feet), inchesToMeters(inches));
  }
});

test('compound lengths preserve exact digits and allow explicit zero components', () => {
  for (const [feet, inches, expected] of [
    ['13', '6', '4.1148'], ['0', '6', '0.1524'], ['1', '0', '0.3048'],
    [' 0013 ', ' 06.5000 ', '4.1275'], ['0', '0.00000001', '0.000000000254'],
    ['9007199254740993', '0', '2745394332845054.6664'],
  ]) {assert.deepEqual(feetAndInchesToMeters(feet, inches), {ok: true, value: expected});}
  assert.deepEqual(feetAndInchesToMeters('13', '6'), feetToMeters('13.5'));
});

test('compound notation never assumes missing components or silently carries twelve inches', () => {
  for (const feet of ['', null, undefined, 13, '-1', '1.5', '1e3', '13 ft', '+1']) {
    assert.deepEqual(feetAndInchesToMeters(feet, '6'), {ok: false, code: 'expected-whole-feet'});
  }
  for (const inches of ['', null, undefined, 6, '-1', '12', '012.0', '12.1', '6,5', '1/2', '.5', '1e1']) {
    assert.deepEqual(feetAndInchesToMeters('13', inches), {ok: false, code: 'expected-inches-below-twelve'});
  }
  assert.deepEqual(feetAndInchesToMeters('0', '0.00'), {ok: false, code: 'must-be-positive'});
  assert.equal(feetAndInchesToMeters('1', '11.999999999999999999999999').ok, true);
});
