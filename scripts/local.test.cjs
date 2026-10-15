const {test} = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const {sameProcess, validateDatabase, portFree, waitFor, stopOwned, selectedAvd} = require('./local.cjs');

const snapshot = {pid: 123, executable: 'C:/node.exe', commandLine: 'node local-api', createdAt: '2026-10-15T00:00:00Z'};

test('AVD identity accepts adb Windows CRCRLF output without accepting another AVD', () => {
  assert.equal(selectedAvd('TruckFoundationApi35\r\r\nOK\r\r\n'), 'TruckFoundationApi35');
  assert.notEqual(selectedAvd('another-avd\nOK\n'), 'TruckFoundationApi35');
});

test('local ownership rejects reused PID, changed command and incomplete snapshots', () => {
  assert.equal(sameProcess(snapshot, {...snapshot}), true);
  for (const other of [null, {...snapshot, createdAt: 'later'}, {...snapshot, commandLine: 'other app'},
    {...snapshot, executable: 'other.exe'}, {pid: snapshot.pid}]) {
    assert.equal(sameProcess(snapshot, other), false);
  }
});

test('local config rejects remote DBs and password mismatches without exposing credentials', () => {
  const password = 'private-value';
  for (const url of [`postgresql://truck:${password}@remote.example/truck_route_savings`,
    `postgresql://truck:${password}@127.0.0.1:5432/truck_route_savings?host=remote.example`,
    `postgresql://truck:wrong@127.0.0.1:5432/truck_route_savings`]) {
    assert.throws(() => validateDatabase({POSTGRES_PASSWORD: password, DATABASE_URL: url}), error =>
      !error.message.includes(password) && !error.message.includes(url));
  }
  const encoded = 'with:@/symbols';
  assert.doesNotThrow(() => validateDatabase({POSTGRES_PASSWORD: encoded,
    DATABASE_URL: `postgresql://truck:${encodeURIComponent(encoded)}@127.0.0.1:5432/truck_route_savings`}));
});

test('local shutdown leaves changed PID and foreign AVD untouched, stopping only verified processes', async () => {
  const qemu = {...snapshot, pid: 124, commandLine: 'qemu own-avd'};
  const state = {android: {avd: 'owned'}, processes: {api: snapshot, qemu}};
  const stopped = [];
  const commands = [];
  await stopOwned(state, {
    getProcess: pid => pid === snapshot.pid ? {...snapshot, createdAt: 'reused'} : qemu,
    stop: saved => stopped.push(saved.pid),
    command: (_, args) => {commands.push(args); return 'different-avd\nOK';},
    pause: async () => {},
  });
  assert.deepEqual(stopped, [qemu.pid]);
  assert.deepEqual(commands, [['emu', 'avd', 'name']]);
});

test('local port check detects an existing listener without disturbing it', async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {assert.equal(await portFree(port), false); assert.equal(server.listening, true);}
  finally {await new Promise(resolve => server.close(resolve));}
  assert.equal(await portFree(port), true);
});

test('startup readiness fails explicitly rather than accepting a false response', async () => {
  await assert.rejects(waitFor(async () => false, 'test dependency', 1), /Timed out waiting for test dependency/);
});
