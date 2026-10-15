const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

async function verifyCompiledApi() {
  // Execute the emitted decorator metadata and generated Prisma client, not ts-jest output.
  const {createApp} = require('../apps/api/dist/bootstrap');
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const {port} = app.getHttpServer().address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {status: 'ok', service: 'truck-route-savings-api'});
  } finally {await app.close();}

  const env = {...process.env};
  delete env.DATABASE_URL;
  const missing = spawnSync(process.execPath, [path.resolve(__dirname, '../apps/api/dist/main.js')], {
    env, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(missing.status, 1, 'Compiled main must reject missing DATABASE_URL');
  assert.match(missing.stderr, /DATABASE_URL is required/);
  console.log('Compiled API: real database startup/HTTP/shutdown passed; missing configuration exits 1.');
}

if (require.main === module) {
  verifyCompiledApi().catch(() => {console.error('Compiled API database smoke failed'); process.exitCode = 1;});
}
