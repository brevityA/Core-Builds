/**
 * Guard against offering presets that need more than {name,timeout,resources,url}
 * as simple toggles. AIOStreams validates required:true and throws
 * `Option <id> is required` — default does NOT rescue, only forced does.
 * That path surfaces as USER_INVALID_CONFIG from the host.
 *
 * This test uses the generated AIO_PRESET_REQUIRED_OPTIONS map (pinned v2.34.1)
 * to prove every OPTIONAL_SCRAPER_DEFS entry is safe to emit as a simple toggle,
 * or has explicit credential handling that supplies the required option.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { OPTIONAL_SCRAPER_DEFS } from '../src/data/scrapers.js';
import { AIO_PRESET_REQUIRED_OPTIONS } from '../src/data/generated/aiostreams-preset-options.js';
import { mergeRequiredOptions } from '../src/data/preset-required-options-extra.js';

const BASE = new Set(['name', 'timeout', 'resources', 'url']);

// Reads the generated map MERGED with the known extractor gaps. Reading the
// generated map alone is what let this test pass while three Debridio add-ons
// shipped as keyless toggles: presets whose options come from a shared builder
// are absent from that map entirely, so asking it about them returned [] and
// the absence of a required option was indistinguishable from there being none.
function requiredBeyond(presetType) {
  return mergeRequiredOptions(AIO_PRESET_REQUIRED_OPTIONS, presetType);
}

test('optional scrapers that are keyless must be simple toggles (no extra required options)', () => {
  const unsafe = [];
  for (const def of OPTIONAL_SCRAPER_DEFS) {
    // Credential-bearing lanes (credKey / apiUrl) are allowed to require extra
    // because their branches in generate-template.js omit the preset until the
    // value is non-empty, or supply the required option (e.g. catalogs for
    // streaming-catalogs / rpdb-catalogs, api for torznab/newznab).
    if (def.credKey || def.apiUrl) continue;
    const beyond = requiredBeyond(def.presetType);
    if (beyond.length) unsafe.push(`${def.id} (preset ${def.presetType}) requires ${beyond.join(',')}`);
  }
  assert.deepEqual(unsafe, [], `keyless optional scrapers must not require extra options: ${unsafe.join('; ')}`);
});

test('catalog presets streaming-catalogs and rpdb-catalogs must require catalogs and be handled', () => {
  // These two are not in OPTIONAL_SCRAPER_DEFS but are emitted via catalogPresets().
  // They must be flagged as requiring catalogs, and the generator must supply it.
  assert.deepEqual(AIO_PRESET_REQUIRED_OPTIONS['streaming-catalogs'], ['catalogs']);
  assert.deepEqual(AIO_PRESET_REQUIRED_OPTIONS['rpdb-catalogs'], ['catalogs']);
});

test('newznab/torznab require api and must not be offered as keyless toggles', () => {
  // newznab/torznab need api (endpoint) — they are only safe when apiUrl+credKey branch supplies it.
  assert.ok((AIO_PRESET_REQUIRED_OPTIONS['newznab'] || []).includes('api'), 'newznab should require api');
  assert.ok((AIO_PRESET_REQUIRED_OPTIONS['torznab'] || []).includes('api'), 'torznab should require api');
  const keylessNewznab = OPTIONAL_SCRAPER_DEFS.filter(d => d.presetType === 'newznab' && !d.credKey && !d.apiUrl);
  assert.equal(keylessNewznab.length, 0, 'newznab must not appear as keyless toggle');
  const keylessTorznab = OPTIONAL_SCRAPER_DEFS.filter(d => d.presetType === 'torznab' && !d.credKey && !d.apiUrl);
  assert.equal(keylessTorznab.length, 0, 'torznab must not appear as keyless toggle');
});

test('safe add-on candidates from audit have no extra required options', () => {
  // The v2.34.0 audit listed 18. Three of them — debridio-tmdb, debridio-tvdb and
  // debridio-watchtower — are NOT simple toggles: each requires debridioApiKey, which
  // has no upstream default. They appeared safe only because the generated map is blind
  // to presets whose options come from a shared builder. They now carry credKey:'debridio'
  // and are emitted through the credentialed lane, so they are deliberately not candidates.
  const candidates = [
    'anime-kitsu', 'argentina-tv', 'bitmagnet', 'brazuca-torrents',
    'content-deep-dive', 'doctor-who-universe', 'easynews', 'easynewsPlus',
    'jackettio', 'opensubtitles', 'tmdb-collections', 'torbox', 'torbox-search',
    'usa-tv', 'usa-tv-next',
  ];
  const unsafe = candidates.filter(id => requiredBeyond(id).length > 0);
  assert.deepEqual(unsafe, [], `candidates should be simple toggles but require extra: ${unsafe.join(',')}`);
});
