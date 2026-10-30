import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALLOWED_AIO_NAMES } from '../src/data/language-packs.js';

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const upstream = JSON.parse(readFileSync(new URL('./upstream/languages-2.36.0.json', import.meta.url), 'utf8')).languages;
const langOpts = [...app.match(/const LANG_OPTS = \[([\s\S]*?)\];/)[1].matchAll(/v:'([^']+)'/g)].map(m => m[1]);
const browserMap = Object.fromEntries([...app.match(/const BROWSER_LANG = \{([^}]*)\}/)[1].matchAll(/(\w+):'([^']+)'/g)].map(m => [m[1], m[2]]));

test('every language the Configurator offers is one AIOStreams accepts', () => {
  // requiredLanguages/preferredLanguages are z.array(z.enum(LANGUAGES)): one unknown name refuses the save.
  for (const v of langOpts) assert.ok(upstream.includes(v), `${v} is not in AIOStreams LANGUAGES`);
  for (const v of ALLOWED_AIO_NAMES) assert.ok(upstream.includes(v), `language pack name ${v}`);
});

test('saved Chinese variants are migrated to the one AIOStreams name', () => {
  assert.match(app, /'Chinese \(Simplified\)': 'Chinese', 'Chinese \(Traditional\)': 'Chinese'/);
  assert.match(app, /if \(Array\.isArray\(d\.langs\)\) \{ const l = normLangs\(d\.langs\);/);
});

test('the browser guess only ever names an offered language', () => {
  for (const v of Object.values(browserMap)) assert.ok(langOpts.includes(v), v);
  assert.equal(browserMap.zh, 'Chinese');
});

test('Quick install keeps English behind a picked language and states what it does', () => {
  assert.match(app, /S\.langs = p\.lang === 'English' \? \['English'\] : \[p\.lang, 'English'\];/);
  assert.match(app, /Releases in this language come first when everything else is equal\. English and original-audio releases still show\./);
});
