const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const {parseEnv} = require('node:util');
const {spawn, spawnSync} = require('node:child_process');
const {randomBytes} = require('node:crypto');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'artifacts/local-run');
const stateFile = path.join(directory, 'state.json');
const configFile = path.join(directory, 'config.json');
const serial = 'emulator-5554';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function run(file, args, options = {}) {
  const result = spawnSync(file, args, {cwd: root, encoding: 'utf8', windowsHide: true,
    timeout: 180000, ...options});
  if (result.error || result.status !== 0) {
    // Environment may contain credentials. Never echo environment or full commands.
    throw new Error(`${path.basename(file)} failed; inspect local-run logs or Docker status`);
  }
  return result.stdout?.trim() ?? '';
}

function powershell(script) {
  const executable = path.join(process.env.WINDIR ?? 'C:/Windows',
    'System32/WindowsPowerShell/v1.0/powershell.exe');
  return run(executable, ['-NoProfile', '-NonInteractive', '-EncodedCommand',
    Buffer.from(`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); ${script}`, 'utf16le').toString('base64')]);
}

const processProjection = `Select-Object @{n='pid';e={$_.ProcessId}},
  @{n='executable';e={$_.ExecutablePath}}, @{n='commandLine';e={$_.CommandLine}},
  @{n='createdAt';e={$_.CreationDate.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress`;

function processInfo(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) {throw new Error('Invalid managed PID');}
  const result = powershell(`Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' | ${processProjection}`);
  return result ? JSON.parse(result) : null;
}

function sameProcess(saved, current) {
  return !!saved && !!current && saved.pid === current.pid &&
    ['executable', 'commandLine', 'createdAt'].every(key =>
      typeof saved[key] === 'string' && saved[key].length > 0 && saved[key] === current[key]);
}

function stopProcess(saved) {
  // Compare and stop in one PowerShell invocation; stale/reused PIDs are never trusted.
  const encoded = Buffer.from(JSON.stringify(saved), 'utf8').toString('base64');
  const output = powershell(`$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')) | ConvertFrom-Json;
    $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$s.pid);
    if (!$p) { 'absent'; exit 0 };
    if ($p.ExecutablePath -cne $s.executable -or $p.CommandLine -cne $s.commandLine -or
      $p.CreationDate.ToUniversalTime().ToString('o') -cne $s.createdAt) { 'changed'; exit 0 };
    Stop-Process -Id $p.ProcessId -ErrorAction Stop; 'stopped'`);
  if (output === 'changed') {console.log('Skipped reused/changed PID; unrelated process left running.');}
  return output;
}

function loadState() {
  if (!fs.existsSync(stateFile)) {return {version: 1, root, processes: {}};}
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (state.version !== 1 || state.root !== root || !state.processes) {
    throw new Error('Local state belongs to another checkout or unsupported version');
  }
  return state;
}

function saveState(state) {
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(stateFile + '.tmp', JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(stateFile + '.tmp', stateFile);
}

function validateDatabase(env) {
  let url;
  try {url = new URL(env.DATABASE_URL);}
  catch {throw new Error('Local DATABASE_URL is missing or invalid');}
  if (!env.POSTGRES_PASSWORD || !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname !== '127.0.0.1' || (url.port || '5432') !== '5432' ||
      url.pathname !== '/truck_route_savings' || url.search || url.hash || decodeURIComponent(url.username) !== 'truck' ||
      decodeURIComponent(url.password) !== env.POSTGRES_PASSWORD) {
    throw new Error('Local DB config must match Compose loopback database and POSTGRES_PASSWORD');
  }
  return env;
}

function environment() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) {
    const volumes = run('docker', ['volume', 'ls', '--filter',
      'label=com.docker.compose.project=truck-route-savings', '--format', '{{.Name}}']);
    if (volumes.split(/\r?\n/).some(name => name.endsWith('_postgres-data'))) {
      throw new Error('Existing PostgreSQL volume: restore .env with its original password; data is preserved');
    }
    const password = randomBytes(24).toString('hex');
    fs.writeFileSync(file, `POSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://truck:${password}@127.0.0.1:5432/truck_route_savings\n`, {flag: 'wx', mode: 0o600});
  }
  return validateDatabase({...process.env, ...parseEnv(fs.readFileSync(file, 'utf8')),
    COMPOSE_PROJECT_NAME: 'truck-route-savings'});
}

function configuration() {
  if (!fs.existsSync(configFile)) {
    throw new Error('Create artifacts/local-run/config.json with androidSdk, avdHome, avd and apk; see README');
  }
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  for (const key of ['androidSdk', 'avdHome', 'avd', 'apk']) {
    if (typeof config[key] !== 'string' || !config[key].trim()) {throw new Error(`Missing local config: ${key}`);}
  }
  for (const key of ['androidSdk', 'avdHome', 'apk']) {
    if (!path.isAbsolute(config[key]) || !fs.existsSync(config[key])) {throw new Error(`Local path must exist and be absolute: ${key}`);}
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(config.avd)) {throw new Error('Invalid AVD name');}
  return config;
}

const compose = (args, env) => run('docker', ['compose', '--project-name', 'truck-route-savings',
  '--env-file', '.env', '-f', 'infra/compose.yaml', ...args], {env});
const adbPath = config => path.join(config.androidSdk, 'platform-tools/adb.exe');
const adb = (config, args) => run(adbPath(config), ['-s', serial, ...args], {timeout: 30000});
const selectedAvd = output => output.trim().split(/[\r\n]+/)[0].trim();

async function portFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({port, host: '127.0.0.1', exclusive: true}, () => server.close(() => resolve(true)));
  });
}

async function waitFor(check, description, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {if (await check()) {return;}} catch { /* Startup may not yet be ready. */ }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${description}; see artifacts/local-run logs`);
}

async function health(url, expected) {
  const response = await fetch(url, {signal: AbortSignal.timeout(3000)});
  return response.ok && (await response.text()).includes(expected);
}

async function startProcess(state, name, executable, args, cwd, env, visible = false) {
  const out = fs.openSync(path.join(directory, `${name}.log`), 'a');
  const err = fs.openSync(path.join(directory, `${name}-error.log`), 'a');
  const child = spawn(executable, args, {cwd, env, detached: true, windowsHide: !visible,
    stdio: ['ignore', out, err]});
  try {
    await new Promise((resolve, reject) => {child.once('spawn', resolve); child.once('error', reject);});
    state.processes[name] = processInfo(child.pid);
    if (!state.processes[name]) {throw new Error(`${name} exited during startup`);}
    saveState(state);
    child.unref();
  } catch (error) {
    child.kill();
    child.unref();
    throw error;
  } finally {fs.closeSync(out); fs.closeSync(err);}
}

async function warmMetro() {
  await waitFor(() => health('http://127.0.0.1:8081/status', 'packager-status:running'), 'Metro');
  for (const lazy of ['false', 'true']) {
    const response = await fetch(`http://127.0.0.1:8081/index.bundle?platform=android&dev=true&lazy=${lazy}&minify=false&app=com.truckroutesavings&modulesOnly=false&runModule=true&excludeSource=true&sourcePaths=url-server`,
      {signal: AbortSignal.timeout(180000)});
    await response.arrayBuffer();
    if (!response.ok) {throw new Error('Metro bundle failed; see metro logs');}
  }
}

async function stopOwned(state, {getProcess = processInfo, stop = stopProcess,
  command = adb, pause = sleep} = {}) {
  // Stop only exact process snapshots captured by this CLI; never kill by port/name.
  const config = state.android;
  if (config && ['emulator', 'qemu'].some(key => {
    const saved = state.processes[key];
    return saved && sameProcess(saved, getProcess(saved.pid));
  })) {
    try {
      if (selectedAvd(command(config, ['emu', 'avd', 'name'])) !== config.avd) {
        throw new Error('AVD identity mismatch');
      }
      command(config, ['emu', 'kill']);
      await pause(2000);
    } catch { /* If boot is incomplete, stop only verified owned processes below. */ }
  }
  for (const key of ['qemu', 'emulator', 'metro', 'api']) {
    const saved = state.processes[key];
    if (saved && sameProcess(saved, getProcess(saved.pid))) {stop(saved);}
  }
}

async function up() {
  const state = loadState();
  if (Object.values(state.processes).some(saved => saved && sameProcess(saved, processInfo(saved.pid)))) {
    let ready = false;
    try {
      ready = await health('http://127.0.0.1:3000/health', 'truck-route-savings-api') &&
        await health('http://127.0.0.1:8081/status', 'packager-status:running');
    } catch { /* Report a partial run below without changing it. */ }
    if (ready &&
        ['emulator', 'qemu'].some(key => state.processes[key] &&
          sameProcess(state.processes[key], processInfo(state.processes[key].pid)))) {
      console.log('Managed local run already active.');
      await status();
      return;
    }
    throw new Error('A managed local run already exists. Use local:status or local:down before starting again');
  }
  const config = configuration();
  for (const port of [3000, 8081, 5554, 5555]) {
    if (!await portFree(port)) {throw new Error(`Port ${port} is occupied; existing process was not stopped`);}
  }
  const env = environment();
  const mobileEnv = {...env};
  delete mobileEnv.DATABASE_URL;
  delete mobileEnv.POSTGRES_PASSWORD;
  state.processes = {};
  state.android = config;
  saveState(state);
  const initiallyRunning = compose(['ps', '--status', 'running', '--services'], env).split(/\r?\n/);
  const newlyStarted = ['postgres', 'redis'].filter(service => !initiallyRunning.includes(service));
  try {
    console.log('Starting project PostgreSQL/PostGIS and Redis...');
    compose(['up', '-d', '--wait'], env);
    run(process.execPath, [path.join(root, 'scripts/verify-infra.cjs')], {env, stdio: 'inherit'});
    console.log('Building API, database client, navigation and truck profile...');
    // Invoke installed tools directly: local startup never installs packages or selects a global pnpm.
    run(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'generate'],
      {cwd: path.join(root, 'packages/database'), env: mobileEnv, stdio: 'inherit'});
    for (const project of ['packages/database/tsconfig.json', 'apps/api/tsconfig.build.json',
      'packages/navigation/tsconfig.json', 'packages/truck-profile/tsconfig.json']) {
      run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', path.join(root, project)],
        {env: mobileEnv, stdio: 'inherit'});
    }
    await startProcess(state, 'api', process.execPath, [path.join(root, 'apps/api/dist/main.js')], root,
      {...mobileEnv, DATABASE_URL: env.DATABASE_URL, PORT: '3000'});
    await waitFor(() => health('http://127.0.0.1:3000/health', 'truck-route-savings-api'), 'API');
    await startProcess(state, 'metro', process.execPath, [path.join(root, 'node_modules/react-native/cli.js'),
      'start', '--host', '127.0.0.1', '--port', '8081', '--no-interactive', '--max-workers', '2'],
    path.join(root, 'apps/mobile'), mobileEnv);
    console.log('Preparing Android JavaScript bundles...');
    await warmMetro();
    console.log('Opening Android emulator window...');
    await startProcess(state, 'emulator', path.join(config.androidSdk, 'emulator/emulator.exe'),
      ['-avd', config.avd, '-port', '5554', '-no-snapshot', '-no-audio', '-gpu', 'software'], root,
      {...mobileEnv, ANDROID_AVD_HOME: config.avdHome, ANDROID_HOME: config.androidSdk}, true);
    await waitFor(() => {
      const output = powershell(`Get-CimInstance Win32_Process -Filter 'ParentProcessId=${state.processes.emulator.pid}' |
        Where-Object {$_.Name -like 'qemu-system-*'} | Select-Object -First 1 | ${processProjection}`);
      if (output) {state.processes.qemu = JSON.parse(output); saveState(state); return true;}
      return false;
    }, 'emulator process', 30000);
    await waitFor(() => adb(config, ['shell', 'getprop', 'sys.boot_completed']) === '1', 'Android boot', 180000);
    if (selectedAvd(adb(config, ['emu', 'avd', 'name'])) !== config.avd) {throw new Error('AVD identity mismatch');}
    adb(config, ['shell', 'input', 'keyevent', '82']);
    run(process.execPath, [path.join(root, 'scripts/verify-android.cjs')], {env: {...mobileEnv,
      ANDROID_HOME: config.androidSdk, ANDROID_SERIAL: serial, ANDROID_APK_PATH: config.apk,
      ANDROID_ARTIFACTS_DIR: path.join(directory, 'android-smoke')}, stdio: 'inherit'});
    console.log('Local app ready. API http://127.0.0.1:3000/health; Metro 127.0.0.1:8081; Android window is open.');
  } catch (error) {
    await stopOwned(state);
    if (newlyStarted.length) {compose(['stop', ...newlyStarted], env);}
    fs.unlinkSync(stateFile);
    throw error;
  }
}

async function down() {
  const state = loadState();
  if (!fs.existsSync(path.join(root, '.env')) && Object.keys(state.processes).length) {
    throw new Error('Restore local .env before local:down; managed state and database data are preserved');
  }
  const ports = [];
  for (const [key, saved] of Object.entries(state.processes)) {
    if (!saved || !sameProcess(saved, processInfo(saved.pid))) {continue;}
    if (key === 'api') {ports.push(3000);}
    if (key === 'metro') {ports.push(8081);}
    if (key === 'emulator' || key === 'qemu') {ports.push(5554, 5555);}
  }
  await stopOwned(state);
  await waitFor(async () => (await Promise.all([...new Set(ports)].map(portFree))).every(Boolean),
    'managed port release', 30000);
  if (fs.existsSync(path.join(root, '.env'))) {
    compose(['stop', 'postgres', 'redis'], environment());
  }
  if (fs.existsSync(stateFile)) {fs.unlinkSync(stateFile);}
  console.log('Local shutdown complete. Only project processes/Compose services were targeted; volumes and data preserved.');
}

async function status() {
  const state = loadState();
  for (const [name, url, expected] of [['API', 'http://127.0.0.1:3000/health', 'truck-route-savings-api'],
    ['Metro', 'http://127.0.0.1:8081/status', 'packager-status:running']]) {
    let ready = false;
    try {ready = await health(url, expected);} catch { /* Report offline status. */ }
    console.log(`${name}: ${ready ? 'ready' : 'offline'}`);
  }
  for (const [name, saved] of Object.entries(state.processes)) {
    console.log(`${name} ownership: ${saved && sameProcess(saved, processInfo(saved.pid)) ? 'verified' : 'absent/changed'}`);
  }
  if (state.android) {
    let booted = false;
    try {
      booted = adb(state.android, ['shell', 'getprop', 'sys.boot_completed']) === '1' &&
        selectedAvd(adb(state.android, ['emu', 'avd', 'name'])) === state.android.avd;
    } catch { /* The selected emulator may still be booting or already closed. */ }
    console.log(`Android: ${booted ? 'booted' : 'offline/booting'} (${serial})`);
  }
  if (fs.existsSync(path.join(root, '.env'))) {console.log(compose(['ps', '--all'], environment()));}
}

async function main(command = process.argv[2]) {
  if (process.platform !== 'win32') {throw new Error('local:* commands currently support Windows only; use README manual commands on other OS');}
  fs.mkdirSync(directory, {recursive: true});
  if (command === 'status') {await status(); return;}
  // An exclusive file lock prevents concurrent starts/stops and cross-process state overwrites.
  const lock = path.join(directory, 'control.lock');
  let handle;
  try {handle = fs.openSync(lock, 'wx');}
  catch {throw new Error('Another local command is active (or interrupted). Check processes before removing artifacts/local-run/control.lock');}
  try {
    if (command === 'up') {await up();}
    else if (command === 'down') {await down();}
    else {throw new Error('Usage: node scripts/local.cjs up|status|down');}
  } finally {fs.closeSync(handle); fs.unlinkSync(lock);}
}

module.exports = {sameProcess, validateDatabase, portFree, waitFor, stopOwned, selectedAvd};
if (require.main === module) {
  main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
