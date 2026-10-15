const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifyInfrastructure} = require('./verify-infra.cjs');

test('fails when PostGIS distance semantics are unavailable', () => {
  assert.throws(() => verifyInfrastructure(() => '3.5 USE_GEOS=1\nf'), /geography/);
});

test('cleans up the Redis probe after a failed read', () => {
  const calls = [];
  assert.throws(() => verifyInfrastructure(args => {
    calls.push(args);
    if (args[2] === 'postgres') {return '3.5 USE_GEOS=1\nt';}
    switch (args[5]) {
      case 'PING': return 'PONG';
      case 'SET': return 'OK';
      case 'GET': return 'unexpected';
      case 'DEL': return '1';
      default: throw new Error('Unexpected command');
    }
  }), /write\/read/);
  assert.equal(calls.at(-1)[5], 'DEL');
});
