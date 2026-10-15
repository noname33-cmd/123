const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
fs.mkdirSync('dist', {recursive: true});
for (const platform of ['android', 'ios']) {
  const result = spawnSync(process.execPath, [require.resolve('react-native/cli.js'),
    'bundle', '--platform', platform, '--dev', 'false', '--entry-file', 'index.js',
    '--bundle-output', path.join('dist', platform + '.jsbundle'), '--assets-dest', 'dist',
    '--max-workers', '2'], {stdio: 'inherit'});
  if (result.status !== 0) {process.exit(result.status ?? 1);}
}
