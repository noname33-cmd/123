const {test} = require('node:test');
const assert = require('node:assert/strict');
const {configureDisplay} = require('./configure-ci-avd.cjs');

test('CI display settings replace duplicate keys and preserve unrelated AVD configuration', () => {
  const input = 'hw.lcd.width=1080\r\nhw.lcd.width = 999\r\nhw.lcd.height=2400\r\nhw.lcd.density=420\r\nhw.ramSize=4096M\r\nimage.sysdir.1=api35\r\n';
  const output = configureDisplay(input);
  for (const [key, value] of [['width', '720'], ['height', '1600'], ['density', '280']]) {
    assert.equal(output.split(/\r?\n/).filter(line => line.startsWith(`hw.lcd.${key}`)).join(''), `hw.lcd.${key}=${value}`);
  }
  assert.ok(output.includes('hw.ramSize=4096M\r\nimage.sysdir.1=api35'));
});

test('CI display settings handle absent keys and repeated configuration', () => {
  const first = configureDisplay('hw.cpu.ncore=2');
  const second = configureDisplay(first);
  assert.equal(second.match(/hw.lcd.width=720/g).length, 1);
  assert.ok(second.startsWith('hw.cpu.ncore=2'));
});
