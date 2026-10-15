import {parseMeters, parseKilograms, type Meters, type Kilograms, type MeasurementResult} from './measurements';

// Exact international foot/inch and avoirdupois pound. See README sources.
// Only the decimal's coefficient uses BigInt; the returned boundary remains a string.
function multiplyDecimal(value: string, coefficient: bigint, scale: number): string {
  const [whole = '', fraction = ''] = value.split('.');
  const digits = (BigInt(whole + fraction) * coefficient).toString();
  const places = fraction.length + scale;
  const padded = digits.padStart(places + 1, '0');
  return `${padded.slice(0, -places)}.${padded.slice(-places)}`;
}

export function feetToMeters(input: unknown): MeasurementResult<Meters> {
  const parsed = parseMeters(input);
  return parsed.ok ? parseMeters(multiplyDecimal(parsed.value, 3048n, 4)) : parsed;
}

export function inchesToMeters(input: unknown): MeasurementResult<Meters> {
  const parsed = parseMeters(input);
  return parsed.ok ? parseMeters(multiplyDecimal(parsed.value, 254n, 4)) : parsed;
}

export function poundsToKilograms(input: unknown): MeasurementResult<Kilograms> {
  const parsed = parseKilograms(input);
  return parsed.ok ? parseKilograms(multiplyDecimal(parsed.value, 45359237n, 8)) : parsed;
}

export type CompoundLengthResult = MeasurementResult<Meters> |
  {readonly ok: false; readonly code: 'expected-whole-feet' | 'expected-inches-below-twelve'};

/** Both components are explicit: whole nonnegative feet and decimal inches in [0, 12). */
export function feetAndInchesToMeters(feet: unknown, inches: unknown): CompoundLengthResult {
  if (typeof feet !== 'string' || !/^\d+$/.test(feet.trim())) {
    return {ok: false, code: 'expected-whole-feet'};
  }
  if (typeof inches !== 'string' || !/^\d+(?:\.\d+)?$/.test(inches.trim())) {
    return {ok: false, code: 'expected-inches-below-twelve'};
  }
  const [whole = '', fraction = ''] = inches.trim().split('.');
  if (BigInt(whole) >= 12n) {return {ok: false, code: 'expected-inches-below-twelve'};}
  const scale = 10n ** BigInt(fraction.length);
  const total = BigInt(feet.trim()) * 12n * scale + BigInt(whole + fraction);
  const digits = total.toString().padStart(fraction.length + 1, '0');
  const decimal = fraction.length ? `${digits.slice(0, -fraction.length)}.${digits.slice(-fraction.length)}` : digits;
  return parseMeters(multiplyDecimal(decimal, 254n, 4));
}
