declare const meters: unique symbol;
declare const kilograms: unique symbol;

/** Exact decimal SI values. Numbers are rejected at the input boundary. */
export type Meters = string & {readonly [meters]: true};
export type Kilograms = string & {readonly [kilograms]: true};

export type MeasurementResult<T> =
  | {readonly ok: true; readonly value: T}
  | {readonly ok: false; readonly code: 'expected-decimal-string' | 'must-be-positive'};

function positiveDecimal(input: unknown): MeasurementResult<string> {
  if (typeof input !== 'string') {return {ok: false, code: 'expected-decimal-string'};}
  const text = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) {return {ok: false, code: 'expected-decimal-string'};}
  if (!/[1-9]/.test(text)) {return {ok: false, code: 'must-be-positive'};}
  const [whole = '', fraction = ''] = text.split('.');
  const integer = whole.replace(/^0+/, '') || '0';
  const decimal = fraction.replace(/0+$/, '');
  return {ok: true, value: decimal ? `${integer}.${decimal}` : integer};
}

export function parseMeters(input: unknown): MeasurementResult<Meters> {
  const result = positiveDecimal(input);
  return result.ok ? {ok: true, value: result.value as Meters} : result;
}

export function parseKilograms(input: unknown): MeasurementResult<Kilograms> {
  const result = positiveDecimal(input);
  return result.ok ? {ok: true, value: result.value as Kilograms} : result;
}
