/**
 * Every exported preset serves only the resources its role needs.
 *
 * AIOStreams reads `options.resources` and, when it is absent, runs a preset with
 * everything the preset supports. The generators' top-level `resources` hint is
 * stripped on export, so until v3.18 Torrentio, StremThru Store and Peerflix added
 * debrid-library catalogs, YaStream added subtitles, and live TV was tagged
 * stream-only while its channels live in catalogs. The fixture is the pinned
 * release's own /api/v1/status, so this needs no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { generateTemplate } from '../../packages/core/src/generate-template.js';
import { OPTIONAL_SCRAPER_DEFS } from '../src/data/scrapers.js';

const upstream = JSON.parse(await readFile(new URL('./upstream/preset-resources-2.36.0.json', import.meta.url), 'utf8'));
const pin = JSON.parse(await readFile(new URL('../UPSTREAM.pin', import.meta.url), 'utf8'));

// Presets whose job includes something beyond streams. Anything else that would
// serve a catalog, meta or subtitles must say `options.resources: ['stream']`.
const SERVES_MORE_THAN_STREAMS = new Set([
  'library', 'tmdb-addon', 'anime-catalogs', 'streaming-catalogs', 'rpdb-catalogs', 'torrent-catalogs',
  'anime-kitsu', 'debridio-tmdb', 'debridio-tvdb', 'tmdb-collections', 'doctor-who-universe',
  'argentina-tv', 'usa-tv-next', 'easynewsPlus',
  'opensubtitles', 'opensubtitles-v3-plus', 'subdl', 'aiosubtitle',
]);

const EXTRAS = OPTIONAL_SCRAPER_DEFS.filter(d => !d.credKey && !d.apiUrl).map(d => d.id);
const MATRIX = [
  { service: 'torbox-pro' },
  { service: 'torbox-pro', content: 'anime' },
  { service: 'realdebrid' },
  { service: 'alldebrid', multiServices: ['alldebrid', 'torbox-pro'] },
  { service: 'p2p' },
  { service: 'http' },
  { service: 'easynews' },
].flatMap(base => [
  { ...base, outputProfile: 'advanced', optionalScrapers: EXTRAS },
  { ...base, outputProfile: 'stable', optionalScrapers: EXTRAS },
  { ...base },
]);

const exported = () => MATRIX.flatMap(input => generateTemplate(input, {}).config.presets.map(preset => ({ input, preset })));
const effective = preset => preset.options?.resources || upstream.presets[preset.type]?.supported || [];

test('the fixture is the pinned release', () => {
  assert.equal(upstream.version, pin.version, 're-capture tests/upstream/preset-resources-*.json from a host on the new pin');
});

test('the matrix reaches the presets this file is about', () => {
  const types = new Set(exported().map(({ preset }) => preset.type));
  // Flix-Streams is only ever a disabled advert, which every profile drops on export.
  for (const type of ['torrentio', 'stremthruStore', 'peerflix', 'sootio', 'yastream', 'tmdb-collections',
    'argentina-tv', 'usa-tv-next', 'content-deep-dive', 'doctor-who-universe', 'mediafusion', 'meteor']) {
    assert.ok(types.has(type), `${type} is never emitted by the matrix, so nothing below checks it`);
  }
});

test('no exported preset serves catalogs, meta or subtitles unless that is its job', () => {
  const offenders = new Set();
  for (const { preset } of exported()) {
    if (SERVES_MORE_THAN_STREAMS.has(preset.type)) continue;
    const extra = effective(preset).filter(resource => resource !== 'stream');
    if (extra.length) offenders.add(`${preset.type} (${extra.join(', ')})`);
  }
  assert.deepEqual([...offenders], [], 'set options.resources, or add the type to SERVES_MORE_THAN_STREAMS if serving them is intended');
});

test('every options.resources is something the preset offers', () => {
  // AIOStreams reads options.resources on every preset; where the preset declares
  // the option (most do) the values must be among its choices, and they must
  // always be resources it supports (Zilean declares none but serves only streams).
  for (const { preset } of exported()) {
    if (!preset.options?.resources) continue;
    const { supported, resourcesOption } = upstream.presets[preset.type] || {};
    for (const resource of preset.options.resources) {
      assert.ok((supported || []).includes(resource), `${preset.type}: ${resource} is not supported`);
      if (resourcesOption) assert.ok(resourcesOption.includes(resource), `${preset.type}: ${resource} is not one of ${resourcesOption}`);
    }
  }
});

test('live TV keeps its channel catalogs; Content Deep Dive is a stream preset', () => {
  const byType = type => exported().map(({ preset }) => preset).filter(preset => preset.type === type);
  for (const type of ['argentina-tv', 'usa-tv-next']) {
    for (const preset of byType(type)) assert.deepEqual([...effective(preset)].sort(), ['catalog', 'meta', 'stream'], type);
  }
  for (const preset of byType('content-deep-dive')) {
    assert.deepEqual(effective(preset), ['stream']);
    assert.equal(preset.category, 'misc', 'its upstream category, not meta_catalogs');
  }
  for (const preset of byType('tmdb-collections')) assert.deepEqual(preset.options.resources, ['catalog', 'meta']);
});
