import {feetToMeters, inchesToMeters, feetAndInchesToMeters, poundsToKilograms, type Meters, type Kilograms} from '../src';

for (const result of [feetToMeters('1'), inchesToMeters('1'), feetAndInchesToMeters('1', '0')]) {
  if (result.ok) {
    const length: Meters = result.value;
    // @ts-expect-error length conversions cannot produce mass
    const mass: Kilograms = result.value;
    void [length, mass];
  }
}
const result = poundsToKilograms('1');
if (result.ok) {
  const mass: Kilograms = result.value;
  // @ts-expect-error mass conversions cannot produce length
  const length: Meters = result.value;
  void [mass, length];
}
