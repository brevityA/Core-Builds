import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OPTIONAL_SCRAPER_DEFS } from '../src/data/scrapers.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

// The three branch predicates used by presets() to generate optional scraper presets.
const BRANCHES = {
  'keyless (knaben/zilean)': x => !x.credKey && !x.apiUrl,
  'credKey without apiUrl (jackett/prowlarr)': x => x.credKey && !x.apiUrl,
  'newznab indexers': x => x.presetType === 'newznab',
};

test('every optional scraper definition maps to exactly one preset-generation branch', () => {
  for (const def of OPTIONAL_SCRAPER_DEFS) {
    const matched = Object.entries(BRANCHES).filter(([, pred]) => pred(def)).map(([name]) => name);
    assert.equal(matched.length, 1,
      `${def.id} matched ${matched.length} branches (${matched.join(', ')}) — must match exactly one`);
  }
});

test('jackett and prowlarr route to the credKey-without-apiUrl branch', () => {
  for (const id of ['jackett', 'prowlarr']) {
    const def = OPTIONAL_SCRAPER_DEFS.find(x => x.id === id);
    assert.ok(def, `${id} missing from OPTIONAL_SCRAPER_DEFS`);
    assert.ok(def.credKey, `${id} must keep credKey`);
    assert.ok(!def.apiUrl, `${id} must not gain apiUrl — that would make its preset unreachable again`);
    assert.equal(def.presetType, id);
  }
});

test('presets() guard for jackett/prowlarr uses credKey && !apiUrl (regression: PR #557 fix lost in v2.84)', () => {
  // The fixed filter — must be present (may additionally exclude nzbhydra presetType).
  assert.ok(
    app.includes('x.credKey && !x.apiUrl') || app.includes("x.credKey && !x.apiUrl && x.presetType !== 'nzbhydra'"),
    'jackett/prowlarr filter must use credKey && !apiUrl guard'
  );
  // The broken filter from the regression — must NOT be present anywhere.
  assert.ok(!app.includes('x.credKey && x.apiUrl'),
    'broken filter "x.credKey && x.apiUrl" found — jackett/prowlarr presets would never generate');
});

// AIOStreams' generateManifestUrl() throws "Jackett URL and API Key are required" when either
// half resolves empty, and that throw rejects the entire config — not just the one preset. So
// the gate must require BOTH, not just the URL. Behavioural coverage of the emitted option
// names lives in e2e/preset-option-contract.spec.mjs; this pins the gating condition, which the
// e2e fixture bypasses by seeding both credentials.
for (const [id, urlKey, keyKey] of [['jackett', 'jackettUrl', 'jackett'], ['prowlarr', 'prowlarrUrl', 'prowlarr']]) {
  test(`${id} preset is gated on BOTH its instance URL and API key`, () => {
    const gate = app.match(new RegExp(`if \\(d\\.id === '${id}'\\) return ([^?]+)\\?`));
    assert.ok(gate, `could not locate the ${id} emission gate — did the generator move?`);
    const cond = gate[1];
    assert.match(cond, new RegExp(`S\\.creds\\.${urlKey}\\b`), `${id} gate must check ${urlKey}`);
    assert.match(cond, new RegExp(`S\\.creds\\.${keyKey}\\b`), `${id} gate must also check the API key`);
    assert.match(cond, /&&/, `${id} gate must require both, not either`);
  });
}

test('jackett and prowlarr emit prefixed option names, never a bare apiKey', () => {
  for (const [id, opts] of [['jackett', ['jackettUrl:S.creds.jackettUrl', 'jackettApiKey:S.creds.jackett']],
                            ['prowlarr', ['prowlarrUrl:S.creds.prowlarrUrl', 'prowlarrApiKey:S.creds.prowlarr']]]) {
    const emission = app.match(new RegExp(`if \\(d\\.id === '${id}'\\) return .*?resources:\\['stream'\\]`));
    assert.ok(emission, `could not locate the ${id} emission`);
    for (const opt of opts) assert.ok(emission[0].includes(opt), `${id} must emit ${opt}`);
    assert.ok(!/[^a-zA-Z]apiKey\s*:/.test(emission[0]),
      `${id} emits a bare apiKey — the preset declares a prefixed key and ignores this one`);
  }
});
