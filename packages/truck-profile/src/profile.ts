import {type Kilograms, type Meters, parseKilograms, parseMeters} from './measurements';

export type VehicleType = 'rigid-truck' | 'tractor-semitrailer';

/** Declared input values, not proof of road legality or provider compatibility. */
export interface TruckProfile {
  readonly schemaVersion: 1;
  readonly vehicleType: VehicleType;
  readonly name: string;
  readonly overallHeightMeters: Meters;
  readonly overallWidthMeters: Meters;
  readonly overallLengthMeters: Meters;
  readonly currentGrossMassKilograms: Kilograms;
  readonly totalAxleCount: number;
}

export interface ProfileIssue {
  readonly field: string;
  readonly code: 'expected-object' | 'unexpected-field' | 'required' |
    'unsupported-schema-version' | 'unsupported-vehicle-type' | 'expected-nonempty-string' |
    'expected-positive-integer' | 'expected-decimal-string' | 'must-be-positive';
}

export type ProfileResult =
  | {readonly ok: true; readonly value: TruckProfile}
  | {readonly ok: false; readonly issues: readonly ProfileIssue[]};

const fields = ['schemaVersion', 'vehicleType', 'name', 'overallHeightMeters', 'overallWidthMeters',
  'overallLengthMeters', 'currentGrossMassKilograms', 'totalAxleCount'] as const;

export function parseTruckProfile(input: unknown): ProfileResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    return {ok: false, issues: [{field: '$', code: 'expected-object'}]};
  }
  const record = input as Record<string, unknown>;
  const issues: ProfileIssue[] = [];
  const known = new Set<string>(fields);
  for (const field of Object.keys(record)) {
    if (!known.has(field)) {issues.push({field, code: 'unexpected-field'});}
  }
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) {issues.push({field, code: 'required'});}
  }
  if (issues.length) {return {ok: false, issues};}

  if (record.schemaVersion !== 1) {issues.push({field: 'schemaVersion', code: 'unsupported-schema-version'});}
  const vehicleType = record.vehicleType;
  if (vehicleType !== 'rigid-truck' && vehicleType !== 'tractor-semitrailer') {
    issues.push({field: 'vehicleType', code: 'unsupported-vehicle-type'});
  }
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {issues.push({field: 'name', code: 'expected-nonempty-string'});}
  const height = parseMeters(record.overallHeightMeters);
  const width = parseMeters(record.overallWidthMeters);
  const length = parseMeters(record.overallLengthMeters);
  const mass = parseKilograms(record.currentGrossMassKilograms);
  for (const [field, result] of [
    ['overallHeightMeters', height], ['overallWidthMeters', width],
    ['overallLengthMeters', length], ['currentGrossMassKilograms', mass],
  ] as const) {
    if (!result.ok) {issues.push({field, code: result.code});}
  }
  const axles = record.totalAxleCount;
  if (typeof axles !== 'number' || !Number.isSafeInteger(axles) || axles <= 0) {
    issues.push({field: 'totalAxleCount', code: 'expected-positive-integer'});
  }
  if (issues.length || !height.ok || !width.ok || !length.ok || !mass.ok || typeof axles !== 'number' ||
      (vehicleType !== 'rigid-truck' && vehicleType !== 'tractor-semitrailer')) {
    return {ok: false, issues};
  }
  return {ok: true, value: Object.freeze({
    schemaVersion: 1, vehicleType, name,
    overallHeightMeters: height.value, overallWidthMeters: width.value,
    overallLengthMeters: length.value, currentGrossMassKilograms: mass.value, totalAxleCount: axles,
  })};
}
