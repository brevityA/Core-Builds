import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROVIDER_CREDENTIALS } from '../src/data/credentials.js';

const PAID_QUICK_KEYS = ['torbox','realdebrid','alldebrid','premiumize','easynews'];
const OPTIONAL_KEYS = ['debridlink','offcloud','nzbgeek','debridio','easydebrid','pikpak','seedr','nzbnoob','althub','usenetcrawler','drunkenslug','nzbfinder'];

test('Quick Install paid providers expose safe account links', () => {
  for (const key of [...PAID_QUICK_KEYS, ...OPTIONAL_KEYS]) {
    const item = PROVIDER_CREDENTIALS[key];
    assert.ok(item, `missing registry entry for ${key}`);
    assert.match(item.url, /^https:\/\//, `missing HTTPS URL for ${key}`);
    assert.ok(item.linkLabel, `missing link label for ${key}`);
  }
});

test('StreamNZB explicitly uses a user-owned manifest URL', () => {
  assert.equal(PROVIDER_CREDENTIALS.streamnzb.url, '');
  assert.equal(PROVIDER_CREDENTIALS.streamnzb.linkLabel, 'Use your manifest URL');
});

test('Quick Install renderer uses the credential registry and visible key links', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /const credentialField=/);
  assert.match(app, /PROVIDER_CREDENTIALS\[key\]/);
  assert.ok(app.includes('fastlane-get-key'));
  assert.ok(app.includes('noopener noreferrer'));
  assert.ok(app.includes('data-fl-tmdb'));
  assert.ok(app.includes('Optional · improves matching and release-date filtering'));
});

test('redaction denylist is derived from the credential registry (audit C4)', async () => {
  // nzbhydra/nzbhydraApiKey shipped v2.90 without joining SENSITIVE_KEYS — the manual
  // denylist drifted from the registry. Now the logger derives it; this test keeps the
  // derivation honest (incl. the next provider someone adds).
  const logger = await readFile(new URL('../src/js/error-logger.js', import.meta.url), 'utf8');
  assert.match(logger, /Object\.keys\(PROVIDER_CREDENTIALS\)/, 'SENSITIVE_KEYS must be derived from the registry');
  assert.match(logger, /import \{ PROVIDER_CREDENTIALS \}/, 'error-logger must import the registry');
  const creds = await readFile(new URL('../src/data/credentials.js', import.meta.url), 'utf8');
  for (const k of ['nzbhydra', 'nzbhydraApiKey']) {
    // `\s` must be double-escaped inside a template literal — as `\s` it degrades to a
    // literal "s", so the pattern was `\bnzbhydras*:` and matched only by luck.
    assert.match(creds, new RegExp(`\\b${k}\\s*:`), `expected ${k} in the registry`);
  }
});

test('no raw or partial-escaped remote error sinks remain (audit C3)', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.ok(!/\$\{err\.message\}/.test(app), 'raw ${err.message} sink found');
  assert.ok(!/err\.message\.replace\(\/<\/g/.test(app), 'partial < -only escape found');
});

test('every Stremio error throw is normalized through stremioErrText (audit C3, second half)', async () => {
  // Stremio returns `error` as a string OR a structured object. `new Error(obj)` yields the
  // message "[object Object]", which then gets faithfully escaped and shown as gibberish.
  // The first pass normalized only the two login throws; the addon-list and addon-set throws
  // in BOTH install flows still passed the raw value. Pin all six call sites.
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function stremioErrText\(/, 'the shared normalizer must exist');

  for (const raw of ['getData?.error', 'setData?.error', 'loginData?.error']) {
    const escaped = raw.replace(/[.?]/g, ch => '\\' + ch);
    assert.ok(
      !new RegExp(`new Error\\(${escaped}\\s*\\|\\|`).test(app),
      `${raw} is still passed raw to new Error() — a structured response renders as [object Object]`,
    );
  }

  // 1 definition + 6 call sites (login / addon-list / addon-set, in each of the two flows).
  const uses = app.match(/stremioErrText\(/g) || [];
  assert.equal(uses.length, 7, `expected 1 definition + 6 call sites, found ${uses.length}`);
});

test('stremioErrText normalizes string, object and missing shapes', async () => {
  // Behavioural check of the extracted logic — the function is not exported from the bundle,
  // so lift its body out of source and exercise it directly rather than asserting on text.
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  const src = app.match(/function stremioErrText\(raw, fallback\) \{[\s\S]*?\n\}/)[0];
  // eslint-disable-next-line no-new-func
  const stremioErrText = new Function(`${src}; return stremioErrText;`)();

  assert.equal(stremioErrText('plain string', 'fb'), 'plain string');
  assert.equal(stremioErrText({ message: 'structured' }, 'fb'), 'structured');
  assert.equal(stremioErrText({ code: 7 }, 'fb'), 'fb', 'object without a message falls back');
  assert.equal(stremioErrText(undefined, 'fb'), 'fb');
  assert.equal(stremioErrText('   ', 'fb'), 'fb', 'blank string is not a reason');
  assert.notEqual(stremioErrText({ code: 7 }, 'fb'), '[object Object]');
});

test('name write paths converge on sanitizeDisplayName (audit C1)', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('sanitizeDisplayName(h.name)'), 'genie hand-off path must sanitize');
  assert.ok(app.includes('sanitizeDisplayName(e.target.value)'), 'typed path must sanitize');
  assert.ok(app.includes('sanitizeDisplayName(d.name)'), 'share-import path must sanitize');
  assert.ok(app.includes('escH(S.name || auto)'), 'receipt header sink must escape');
});

test('Test Drive carries the payload guard like every other write path (audit C5)', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  const i = app.indexOf('async function runTestDrive');
  assert.ok(i !== -1);
  const head = app.slice(i, i + 3000);
  assert.ok(head.includes('payloadSizeGuard(cfg)'), 'Test Drive must check 100KB before upload');
});

test('splash stats formatter is type-safe against remote JSON (audit C2)', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('Number.isFinite(v)'), 'fmt() must coerce + verify');
});
