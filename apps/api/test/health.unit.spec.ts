import {HealthController} from '../src/health.controller';

describe('liveness', () => {
  it('reports only process health', () => {
    expect(new HealthController().getHealth()).toEqual({status: 'ok', service: 'truck-route-savings-api'});
  });
});
