'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES = ['en', 'es'];

const bundle = {};
for (const loc of LOCALES) {
  const file = path.join(ROOT, 'messages', `${loc}.json`);
  bundle[loc] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

const out = `window.MA_MESSAGES = ${JSON.stringify(bundle)};\n`;
const target = path.join(ROOT, 'public', 'messages.js');
fs.writeFileSync(target, out);
console.log(`wrote ${path.relative(ROOT, target)} (${LOCALES.join(', ')})`);
