import {type Kilograms, type Meters} from '../src';

function unitSafety(length: Meters, mass: Kilograms): void {
  // @ts-expect-error kilograms cannot be assigned to a length
  const invalidLength: Meters = mass;
  // @ts-expect-error meters cannot be assigned to a mass
  const invalidMass: Kilograms = length;
  // @ts-expect-error a bare decimal must go through runtime validation
  const unvalidated: Meters = '4.1148';
  void [invalidLength, invalidMass, unvalidated];
}
void unitSafety;
