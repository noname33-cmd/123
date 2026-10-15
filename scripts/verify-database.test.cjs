const {test} = require('node:test');
const assert = require('node:assert/strict');
const {databaseUrl, verifyDatabase} = require('./verify-database.cjs');

test('database harness rejects non-loopback and ambiguous port mappings', () => {
  for (const mapping of ['0.0.0.0:5432', '[::]:5432', '127.0.0.1:0',
    '127.0.0.1:65536', '127.0.0.1:5432\n127.0.0.1:5433']) {
    assert.throws(() => databaseUrl(mapping, 'temporary'));
  }
  const url = new URL(databaseUrl('127.0.0.1:15432', 'with:@/characters'));
  assert.equal(decodeURIComponent(url.password), 'with:@/characters');
});

test('database harness cleans up only its own container when tests fail', async () => {
  const calls = [];
  const run = args => {
    calls.push(args);
    return args[0] === 'port' ? '127.0.0.1:15432' : '';
  };
  await assert.rejects(verifyDatabase({run, test: () => {throw new Error('test failed');}}), /test failed/);
  const created = calls.find(args => args[0] === 'run');
  const name = created[created.indexOf('--name') + 1];
  assert.match(name, /^truck-db-integration-[a-f0-9-]+$/);
  assert.deepEqual(calls.at(-1), ['rm', '--force', '--volumes', name]);
  assert.ok(created.includes('127.0.0.1::5432'));
  assert.ok(!created.includes('--volume'));
});
