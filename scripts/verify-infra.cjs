const {spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');

function compose(args, input) {
  const result = spawnSync('docker', ['compose', '-f', 'infra/compose.yaml', ...args], {
    encoding: 'utf8', input, timeout: 30000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr.trim() ?? 'Docker command failed');
  }
  return result.stdout.trim();
}

function verifyInfrastructure(run = compose) {
  const sql = `SELECT PostGIS_Version();
SELECT ST_DWithin(ST_SetSRID(ST_Point(0, 0), 4326)::geography,
                 ST_SetSRID(ST_Point(0, 1), 4326)::geography, 112000)
   AND NOT ST_DWithin(ST_SetSRID(ST_Point(0, 0), 4326)::geography,
                     ST_SetSRID(ST_Point(0, 1), 4326)::geography, 100000);`;
  const spatial = run(['exec', '-T', 'postgres', 'sh', '-c',
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -h postgres -U truck -d truck_route_savings -v ON_ERROR_STOP=1 -At'], sql);
  const lines = spatial.split(/\r?\n/);
  if (!lines[0]?.match(/^\d+\.\d+/) || lines[1] !== 't') {
    throw new Error('PostGIS version or geography distance check failed');
  }
  const redis = (...args) => run(['exec', '-T', 'redis', 'redis-cli', '--raw', ...args]);
  if (redis('PING') !== 'PONG') {throw new Error('Redis PING failed');}
  const key = `truck:foundation:smoke:${randomUUID()}`;
  try {
    if (redis('SET', key, 'foundation-ok', 'EX', '30') !== 'OK' ||
        redis('GET', key) !== 'foundation-ok') {
      throw new Error('Redis write/read check failed');
    }
  } finally {
    redis('DEL', key);
  }
  return `PostGIS ${lines[0]}: authenticated TCP connection and geography checks passed; Redis PING/write/read passed.`;
}

module.exports = {verifyInfrastructure};
if (require.main === module) {
  try {console.log(verifyInfrastructure());}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
