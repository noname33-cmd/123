import {type VehicleType} from '../src';

const rigid: VehicleType = 'rigid-truck';
const articulated: VehicleType = 'tractor-semitrailer';
// @ts-expect-error car routing is not a supported vehicle type
const car: VehicleType = 'car';
// @ts-expect-error multiple trailers are outside this contract
const multipleTrailers: VehicleType = 'tractor-double-trailer';
void [rigid, articulated, car, multipleTrailers];
