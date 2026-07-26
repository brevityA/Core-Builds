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
  // The fixed filter — must be present.
  assert.match(app, /OPTIONAL_SCRAPER_DEFS\.find\(x => x\.id === sid && x\.credKey && !x\.apiUrl\)/);
  // The broken filter from the regression — must NOT be present anywhere.
  assert.ok(!app.includes('x.credKey && x.apiUrl'),
    'broken filter "x.credKey && x.apiUrl" found — jackett/prowlarr presets would never generate');
});

test('jackett and prowlarr preset bodies remain wired with credential passthrough', () => {
  assert.ok(app.includes("if (d.id === 'jackett') return { type:'jackett', instanceId:'jackett-1'"));
  assert.ok(app.includes("if (d.id === 'prowlarr') return { type:'prowlarr', instanceId:'prowlarr-1'"));
  assert.ok(app.includes('S.creds.jackett'));
  assert.ok(app.includes('S.creds.prowlarr'));
});
