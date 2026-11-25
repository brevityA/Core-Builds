// Interface translations (src/data/i18n-strings.js, src/js/i18n.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { I18N_ROWS, I18N_LANGS } from '../src/data/i18n-strings.js';
import { translate, detectLang } from '../src/js/i18n.js';

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('every row has a translation for every language', () => {
  assert.deepEqual(I18N_LANGS.map(l => l.id), ['en', 'es', 'pt', 'fr', 'de']);
  for (const row of I18N_ROWS) {
    assert.equal(row.length, I18N_LANGS.length, `row for "${row[0]}" has ${row.length} columns`);
    for (const cell of row) assert.ok(typeof cell === 'string' && cell.trim(), `empty cell in "${row[0]}"`);
    assert.equal(row[0], row[0].trim(), `key "${row[0]}" must be trimmed: the translator matches trimmed text`);
  }
});

test('each English key appears once', () => {
  const seen = new Set();
  for (const [en] of I18N_ROWS) {
    assert.ok(!seen.has(en), `duplicate key "${en}"`);
    seen.add(en);
  }
});

test('labels the app reads back from the page are never translated', () => {
  // updateFmtReceiptRow() finds the formatter receipt row by its label text.
  assert.match(app, /textContent\.trim\(\) === 'formatter'/);
  const keys = new Set(I18N_ROWS.map(r => r[0]));
  for (const label of ['formatter', 'service', 'device', 'resolution', 'audio', 'content', 'cache']) {
    assert.ok(!keys.has(label), `"${label}" is read back by app.js and must stay English`);
  }
});

test('brand, app and service names are not keys', () => {
  const keys = new Set(I18N_ROWS.map(r => r[0]));
  for (const name of ['Core Builds', 'Stremio', 'Nuvio', 'WuPlay', 'TorBox', 'Real-Debrid', 'AIOStreams', 'Core Stable', 'Family v4']) {
    assert.ok(!keys.has(name), name);
  }
});

test('translate: exact match, English passthrough, unknown text untouched', () => {
  assert.equal(translate('Support Core Builds', 'es'), 'Apoya a Core Builds');
  assert.equal(translate('Support Core Builds', 'en'), 'Support Core Builds');
  assert.equal(translate('Some user template name', 'de'), 'Some user template name');
});

test('translate: step counters and labelled values', () => {
  assert.equal(translate('Step 5 of 6 — Accounts & Keys', 'de'), 'Schritt 5 von 6 — Konten & Schlüssel');
  assert.equal(translate('Step 2', 'fr'), 'Étape 2');
  assert.equal(translate('Video Quality: 4K HDR', 'pt'), 'Qualidade de vídeo: 4K HDR');
  assert.equal(translate('6/6 checks passed', 'es'), '6/6 comprobaciones superadas');
  assert.equal(translate('Go back to Your Device', 'es'), 'Volver a Tu dispositivo');
});

test('detectLang: saved choice, then browser languages, then English', () => {
  assert.equal(detectLang(['de-DE', 'en'], null), 'de');
  assert.equal(detectLang(['en-GB', 'fr'], null), 'en');
  assert.equal(detectLang(['ja-JP', 'pt-BR'], null), 'pt');
  assert.equal(detectLang(['ja-JP'], null), 'en');
  assert.equal(detectLang(['de-DE'], 'en'), 'en');
  assert.equal(detectLang(['de-DE'], 'xx'), 'de');
  assert.equal(detectLang(undefined, null), 'en');
});
