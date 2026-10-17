const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function configureDisplay(text) {
  for (const [key, value] of Object.entries({
    'hw.lcd.width': '720', 'hw.lcd.height': '1600', 'hw.lcd.density': '280',
  })) {
    const escaped = key.replaceAll('.', '\\.');
    text = text.replace(new RegExp(`^${escaped}\\s*=.*(?:\\r?\\n|$)`, 'gm'), '');
    text += `\n${key}=${value}\n`;
  }
  return text;
}

module.exports = {configureDisplay};
if (require.main === module) {
  // android-emulator-runner's explicitly configured, disposable CI AVD.
  const config = path.join(os.homedir(), '.android/avd/test.avd/config.ini');
  fs.writeFileSync(config, configureDisplay(fs.readFileSync(config, 'utf8')));
}
