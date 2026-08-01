import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAddon,
  parseCollection,
  searchAddons,
  filterByType,
  hasCredentialRisk,
  getCredentialWarnings,
  redactUrl,
  inspectManifest,
} from '../src/addon-model.js';

const ADDON_A = {
  manifest: { name: 'Torrentio', version: '0.0.14', description: 'Torrent streaming', id: 'torrentio', types: ['movie', 'series'], catalogs: [], resources: ['stream'] },
  transportUrl: 'https://torrentio.strem.fun/manifest.json',
  flags: {},
};

const ADDON_B = {
  manifest: { name: 'Comet', version: '1.0', description: 'Comet addon', id: 'comet', types: ['movie'], catalogs: [{ type: 'movie' }], resources: ['stream'] },
  transportUrl: 'https://comet.example.com/abc123def456ghi789jkl012mno345/manifest.json',
  flags: {},
};

const ADDON_BARE = { transportName: 'Legacy', transportUrl: 'https://x.com/m.json' };

test('parseAddon: extracts manifest fields', () => {
  const p = parseAddon(ADDON_A);
  assert.equal(p.name, 'Torrentio');
  assert.equal(p.version, '0.0.14');
  assert.equal(p.id, 'torrentio');
  assert.deepEqual(p.types, ['movie', 'series']);
});

test('parseAddon: handles missing manifest', () => {
  const p = parseAddon(ADDON_BARE);
  assert.equal(p.name, 'Legacy');
  assert.equal(p.version, null);
});

test('parseCollection: maps array', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  assert.equal(coll.length, 2);
  assert.equal(coll[0].name, 'Torrentio');
  assert.equal(coll[1].name, 'Comet');
});

test('searchAddons: filters by name', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  const results = searchAddons(coll, 'torrent');
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Torrentio');
});

test('searchAddons: filters by description', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  const results = searchAddons(coll, 'comet addon');
  assert.equal(results.length, 1);
});

test('searchAddons: empty query returns all', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  assert.equal(searchAddons(coll, '').length, 2);
  assert.equal(searchAddons(coll, null).length, 2);
});

test('filterByType: filters by type', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  const movies = filterByType(coll, 'movie');
  assert.equal(movies.length, 2);
  const series = filterByType(coll, 'series');
  assert.equal(series.length, 1);
  assert.equal(series[0].name, 'Torrentio');
});

test('filterByType: null returns all', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  assert.equal(filterByType(coll, null).length, 2);
});

test('hasCredentialRisk: detects long tokens in URL path', () => {
  assert.ok(hasCredentialRisk('https://x.com/abc123def456ghi789jkl012mno345/manifest.json'));
});

test('hasCredentialRisk: safe URL returns false', () => {
  assert.ok(!hasCredentialRisk('https://torrentio.strem.fun/manifest.json'));
});

test('hasCredentialRisk: handles null', () => {
  assert.ok(!hasCredentialRisk(null));
  assert.ok(!hasCredentialRisk(''));
});

test('getCredentialWarnings: returns warnings for risky URLs', () => {
  const coll = parseCollection([ADDON_A, ADDON_B]);
  const warnings = getCredentialWarnings(coll);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].addon, 'Comet');
  assert.ok(!warnings[0].url.includes('abc123def456ghi789jkl012mno345'));
});

test('redactUrl: redacts long path segments', () => {
  const r = redactUrl('https://comet.example.com/abc123def456ghi789jkl012mno345/manifest.json');
  assert.ok(r.includes('[REDACTED]'));
  assert.ok(!r.includes('abc123def456ghi789jkl012mno345'));
});

test('redactUrl: preserves short segments', () => {
  const r = redactUrl('https://example.com/short/manifest.json');
  assert.ok(r.includes('short'));
});

test('redactUrl: handles query params with credential names', () => {
  const r = redactUrl('https://x.com/m.json?apiKey=secretvalue12345678');
  assert.ok(!r.includes('secretvalue12345678'));
  assert.ok(r.includes('REDACTED'));
});

test('inspectManifest: returns redacted summary', () => {
  const p = parseAddon(ADDON_B);
  const info = inspectManifest(p);
  assert.equal(info.name, 'Comet');
  assert.ok(!info.transportUrl.includes('abc123def456ghi789jkl012mno345'));
  assert.ok(info.hasCredentialRisk);
});
