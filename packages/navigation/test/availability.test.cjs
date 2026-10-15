const {test} = require('node:test');
const assert = require('node:assert/strict');
const {UnavailableNavigationEngine} = require('../dist');

test('unconfigured provider never advertises navigation', async () => {
  assert.deepEqual(await new UnavailableNavigationEngine().getAvailability(), {
    available: false, reason: 'provider-not-configured',
  });
});
