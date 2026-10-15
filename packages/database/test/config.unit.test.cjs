const {test} = require('node:test');
const assert = require('node:assert/strict');
const {databaseUrlFromEnv} = require('../dist');

test('database config requires explicit PostgreSQL connection details', () => {
  for (const url of [undefined, '', 'file:./dev.db', 'postgresql://localhost/app', 'postgresql://truck:secret@localhost/']) {
    assert.throws(() => databaseUrlFromEnv({DATABASE_URL: url}), /DATABASE_URL/);
  }
});
test('invalid config errors never repeat supplied credentials', () => {
  const secret = 'do-not-log-this';
  try {databaseUrlFromEnv({DATABASE_URL: `https://truck:${secret}@localhost/app`});}
  catch (error) {
    assert.ok(!error.message.includes(secret));
    assert.ok(!error.message.includes('https://'));
    return;
  }
  assert.fail('Expected invalid protocol to be rejected');
});
test('database config preserves explicit connection options', () => {
  const url = 'postgresql://truck:local-only@127.0.0.1:5432/truck_route_savings?sslmode=require';
  assert.equal(databaseUrlFromEnv({DATABASE_URL: url}), url);
});
