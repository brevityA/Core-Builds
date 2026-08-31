/**
 * Phase 5 guarantee: in the default 4K profile, EVERY 2160p result outranks
 * EVERY 1080p result — regardless of bitrate, quality label, HDR/audio tags,
 * cached state, SEL score or regex score.
 *
 * The comparison is not asserted against the configurator's own opinion: it is
 * run through tests/helpers/aiostreams-sorter-model.mjs, a port of the upstream
 * lexicographic comparator at the pinned ref, so the test fails if the emitted
 * sortCriteria would lose the tier under AIOStreams' own rules.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { sortPolicy, resolutionTierFirst } from '../src/core/sort-policy.js';
import { resolutionPolicy } from '../src/core/device-policies.js';
import { AIO_SORT_SCOPES, AIO_SORT_CRITERIA, AIO_SORT_DIRECTIONS, AIO_SORT_SCORE_KEYS } from '../src/config/generated/aiostreams-sort-schema.js';
import { compareStreams, resolveCriteria, sortStreams } from './helpers/aiostreams-sorter-model.mjs';

/* ── fixture space ─────────────────────────────────────────────────────────── */

const QUALITIES = ['BluRay REMUX', 'BluRay', 'WEB-DL', 'WEBRip', 'HDTV'];
const VISUAL_TAG_SETS = [[], ['HDR'], ['DV'], ['DV', 'HDR10+'], ['HDR10+']];
const AUDIO_TAG_SETS = [[], ['Atmos'], ['TrueHD', 'Atmos'], ['DD+'], ['DTS-HD MA']];
const BITRATES = [1_000_000, 8_000_000, 25_000_000, 90_000_000, 400_000_000];
const SIZES = [700e6, 4e9, 22e9, 60e9, 120e9];
const SEEDER_COUNTS = [0, 3, 40, 900];
const SEL_SCORES = [-50, 0, 120, 5000];
const REGEX_SCORES = [-1000, 0, 250, 9999];

function* streamSpace(resolution) {
  let n = 0;
  for (const quality of QUALITIES) {
    for (const visualTags of VISUAL_TAG_SETS) {
      for (const audioTags of AUDIO_TAG_SETS) {
        n += 1;
        yield {
          id: `${resolution}#${n}`,
          resolution,
          quality,
          visualTags,
          audioTags,
          audioChannels: ['5.1'],
          languages: ['English'],
          encode: 'HEVC',
          bitrate: BITRATES[n % BITRATES.length],
          size: SIZES[n % SIZES.length],
          seeders: SEEDER_COUNTS[n % SEEDER_COUNTS.length],
          streamExpressionScore: SEL_SCORES[n % SEL_SCORES.length],
          regexScore: REGEX_SCORES[n % REGEX_SCORES.length],
          streamExpressionIndex: n % 3 === 0 ? 0 : null,
          seadex: n % 7 === 0,
          seadexBest: n % 11 === 0,
          library: n % 5 === 0,
          cached: n % 2 === 0,
          service: 'torbox',
          ageDays: n % 400,
        };
      }
    }
  }
}

/** The extreme case the brief calls out: a maxed-out 1080p REMUX. */
const BEST_POSSIBLE_1080P = {
  id: '1080p#apex',
  resolution: '1080p',
  quality: 'BluRay REMUX',
  visualTags: ['DV', 'HDR10+'],
  audioTags: ['TrueHD', 'Atmos'],
  audioChannels: ['7.1'],
  languages: ['English'],
  encode: 'HEVC',
  bitrate: 999_000_000,
  size: 200e9,
  seeders: 100_000,
  streamExpressionScore: 1e9,
  regexScore: 1e9,
  streamExpressionIndex: 0,
  seadex: true,
  seadexBest: true,
  library: true,
  cached: true,
  service: 'torbox',
  ageDays: 0,
};

/** The weakest imaginable 2160p that still has to win in a 4K build. */
const WORST_POSSIBLE_2160P = {
  id: '2160p#runt',
  resolution: '2160p',
  quality: 'HDTV',
  visualTags: [],
  audioTags: [],
  audioChannels: ['2.0'],
  languages: ['English'],
  encode: 'AVC',
  bitrate: 1,
  size: 1,
  seeders: 0,
  streamExpressionScore: -1e9,
  regexScore: -1e9,
  streamExpressionIndex: null,
  seadex: false,
  seadexBest: false,
  library: false,
  cached: false,
  service: 'torbox',
  ageDays: 9999,
};

const prefsFor = state => {
  const res = resolutionPolicy(state);
  return {
    preferredResolutions: res.preferredResolutions,
    preferredQualities: ['BluRay REMUX', 'BluRay', 'WEB-DL', 'WEBRip', 'HDTV', 'Unknown'],
    preferredEncodes: ['HEVC', 'AVC', 'Unknown'],
    preferredVisualTags: ['DV', 'HDR10+', 'HDR', 'Unknown'],
    preferredAudioTags: ['TrueHD', 'Atmos', 'DTS-HD MA', 'DD+', 'Unknown'],
    preferredAudioChannels: ['7.1', '5.1', '2.0'],
    preferredLanguages: ['English'],
    preferredSubtitles: [],
    services: ['torbox'],
    presets: [],
  };
};

const FOURK = { service: 'torbox', device: 'shield', resolution: '4k' };
const TENEIGHTY = { service: 'torbox', device: 'shield', resolution: '1080p' };

/* ── contract sanity: what we emit is valid upstream ───────────────────────── */

test('every emitted sort scope, key and direction exists in the pinned upstream contract', () => {
  for (const state of [FOURK, TENEIGHTY, { ...FOURK, service: 'p2p' }, { ...FOURK, service: 'http' }, { ...FOURK, qualityFirst: true }]) {
    const criteria = sortPolicy(state);
    for (const [scope, list] of Object.entries(criteria)) {
      assert.ok(AIO_SORT_SCOPES.includes(scope), `unknown scope "${scope}"`);
      for (const entry of list) {
        assert.ok(AIO_SORT_CRITERIA.includes(entry.key), `unknown criterion "${entry.key}"`);
        assert.ok(AIO_SORT_DIRECTIONS.includes(entry.direction), `unknown direction "${entry.direction}"`);
      }
      const keys = list.map(e => e.key);
      assert.equal(new Set(keys).size, keys.length, `${scope} repeats a criterion`);
    }
  }
});

/* ── the 4K tier guarantee ─────────────────────────────────────────────────── */

test('the 4K profile puts resolution first in every scope', () => {
  const criteria = sortPolicy(FOURK);
  assert.ok(resolutionTierFirst(FOURK));
  for (const [scope, list] of Object.entries(criteria)) {
    assert.equal(list[0].key, 'resolution', `${scope} does not lead with resolution`);
    assert.equal(list[1].key, 'quality', `${scope} does not follow resolution with quality`);
  }
});

test('no score-based criterion sits above resolution in the 4K profile', () => {
  const criteria = sortPolicy(FOURK);
  for (const [scope, list] of Object.entries(criteria)) {
    const resIndex = list.findIndex(e => e.key === 'resolution');
    for (const scoreKey of AIO_SORT_SCORE_KEYS) {
      const scoreIndex = list.findIndex(e => e.key === scoreKey);
      assert.ok(scoreIndex === -1 || scoreIndex > resIndex, `${scope}: ${scoreKey} outranks resolution`);
    }
  }
});

test('4K profile: the worst 2160p still beats the best possible 1080p REMUX', () => {
  const prefs = prefsFor(FOURK);
  const criteria = sortPolicy(FOURK);
  for (const type of ['movies', 'series', 'anime']) {
    for (const cached of [true, false]) {
      const list = resolveCriteria(criteria, { type, cached });
      const order = compareStreams(list, WORST_POSSIBLE_2160P, BEST_POSSIBLE_1080P, prefs);
      assert.equal(order, -1, `${type}/${cached ? 'cached' : 'uncached'}: 1080p REMUX outranked 2160p`);
    }
  }
});

test('4K profile: every 2160p fixture outranks every 1080p fixture (full cross product)', () => {
  const prefs = prefsFor(FOURK);
  const criteria = sortPolicy(FOURK);
  const uhd = [...streamSpace('2160p'), WORST_POSSIBLE_2160P];
  const fhd = [...streamSpace('1080p'), BEST_POSSIBLE_1080P];
  assert.ok(uhd.length >= 125 && fhd.length >= 125, 'fixture space is large enough to be meaningful');

  let comparisons = 0;
  for (const type of ['movies', 'series', 'anime']) {
    for (const cached of [true, false]) {
      const list = resolveCriteria(criteria, { type, cached });
      for (const a of uhd) {
        for (const b of fhd) {
          comparisons += 1;
          if (compareStreams(list, a, b, prefs) !== -1) {
            assert.fail(`${type}/${cached ? 'cached' : 'uncached'}: ${b.id} (${b.quality}, ${b.bitrate}bps) outranked ${a.id} (${a.quality}, ${a.bitrate}bps)`);
          }
        }
      }
    }
  }
  assert.ok(comparisons > 90_000, `ran ${comparisons} comparisons`);
});

test('4K profile: a full sorted list is tier-partitioned, 2160p then 1440p then 1080p then 720p', () => {
  const prefs = prefsFor(FOURK);
  const list = resolveCriteria(sortPolicy(FOURK), { type: 'movies', cached: false });
  const pool = ['720p', '1080p', '1440p', '2160p'].flatMap(res => [...streamSpace(res)]);
  const sorted = sortStreams(list, pool, prefs);
  const order = ['2160p', '1440p', '1080p', '720p'];
  let expected = 0;
  for (const stream of sorted) {
    const rank = order.indexOf(stream.resolution);
    assert.ok(rank >= expected, `tier order broken at ${stream.id}`);
    expected = rank;
  }
});

test('4K profile: 1440p is preferred, not silently sorted below 720p', () => {
  const { preferredResolutions } = resolutionPolicy(FOURK);
  assert.ok(preferredResolutions.includes('1440p'), '1440p must be in the 4K preference list');
  assert.ok(preferredResolutions.indexOf('1440p') < preferredResolutions.indexOf('1080p'));
  assert.ok(preferredResolutions.indexOf('2160p') < preferredResolutions.indexOf('1440p'));
});

test('within a tier the existing quality ordering is preserved', () => {
  const prefs = prefsFor(FOURK);
  const list = resolveCriteria(sortPolicy(FOURK), { type: 'movies', cached: false });
  const remux = { ...WORST_POSSIBLE_2160P, id: 'uhd-remux', quality: 'BluRay REMUX' };
  const hdtv = { ...WORST_POSSIBLE_2160P, id: 'uhd-hdtv', quality: 'HDTV' };
  assert.equal(compareStreams(list, remux, hdtv, prefs), -1, 'REMUX should still beat HDTV inside the 2160p tier');
});

test('within a tier cached still beats uncached', () => {
  const prefs = prefsFor(FOURK);
  const list = resolveCriteria(sortPolicy(FOURK), { type: 'movies', cached: false });
  const a = { ...WORST_POSSIBLE_2160P, id: 'uhd-cached', cached: true };
  const b = { ...WORST_POSSIBLE_2160P, id: 'uhd-uncached', cached: false };
  assert.equal(compareStreams(list, a, b, prefs), -1);
});

/* ── the 1080p profile must be untouched ───────────────────────────────────── */

test('the 1080p profile still defaults to cached-first, 1080p-first', () => {
  assert.equal(resolutionTierFirst(TENEIGHTY), false);
  const criteria = sortPolicy(TENEIGHTY);
  assert.equal(criteria.global[0].key, 'cached', '1080p profile must keep the cached/uncached split');
  const { preferredResolutions } = resolutionPolicy(TENEIGHTY);
  assert.equal(preferredResolutions[0], '1080p');
});

test('1080p profile: a 1080p REMUX can still beat a weak 2160p', () => {
  const prefs = prefsFor(TENEIGHTY);
  const list = resolveCriteria(sortPolicy(TENEIGHTY), { type: 'movies', cached: true });
  // 2160p is not in the 1080p profile's preference list at all, so it scores
  // -Infinity on `resolution` — the 1080p-first choice remains available.
  assert.equal(compareStreams(list, BEST_POSSIBLE_1080P, WORST_POSSIBLE_2160P, prefs), -1);
});

test('resolutionFirst stays an explicit user choice on the 1080p profile', () => {
  const criteria = sortPolicy({ ...TENEIGHTY, resolutionFirst: true });
  assert.equal(criteria.global[0].key, 'resolution');
});

test('qualityFirst is an explicit opt-out of 4K tier-first', () => {
  assert.equal(resolutionTierFirst({ ...FOURK, qualityFirst: true }), false);
  const criteria = sortPolicy({ ...FOURK, qualityFirst: true });
  assert.notEqual(criteria.global[0].key, 'resolution');
  assert.ok(criteria.global.findIndex(e => e.key === 'quality') < criteria.global.findIndex(e => e.key === 'resolution'));
});

test('mixed and default profiles are unaffected by the 4K tier rule', () => {
  for (const resolution of ['mixed', 'ultrawide', undefined]) {
    assert.equal(resolutionTierFirst({ ...FOURK, resolution }), false, `${resolution} must not be tier-first`);
  }
});

/* ── free-service lanes ────────────────────────────────────────────────────── */

test('4K tier-first also applies to the P2P and HTTP lanes', () => {
  for (const service of ['p2p', 'http']) {
    const criteria = sortPolicy({ ...FOURK, service });
    assert.equal(criteria.global[0].key, 'resolution', `${service} lane does not lead with resolution`);
  }
});

test('libraryBoost=strong does not lift library above the resolution tier in a 4K build', () => {
  const criteria = sortPolicy({ ...FOURK, libraryBoost: 'strong' });
  for (const [scope, list] of Object.entries(criteria)) {
    assert.equal(list[0].key, 'resolution', `${scope} lost the tier to libraryBoost`);
  }
});

test('libraryBoost=none removes the library criterion entirely', () => {
  const criteria = sortPolicy({ ...FOURK, libraryBoost: 'none' });
  for (const list of Object.values(criteria)) {
    assert.ok(!list.some(e => e.key === 'library'));
  }
});

/* ── the Stable output profile replaces the sort list wholesale ────────────── */

test('the Stable output profile is also 4K-tier-first', async () => {
  const { applyOutputProfile } = await import('../src/core/output-profile-policy.js');
  const template = () => ({ metadata: {}, config: { presets: [], services: [], sortCriteria: {}, resultLimits: {} } });
  const ctx = res => ({ outputProfile: 'stable', simpleMode: true, service: 'torbox-pro', multiServices: ['torbox-pro'], optionalScrapers: [], resolution: res, content: 'all', langs: ['English'], qualityFirst: false, resolutionFirst: false, aiostreamsVersion: '2.32.0' });

  const fourK = applyOutputProfile(template(), 'stable', ctx('4k')).config.sortCriteria.global;
  assert.equal(fourK[0].key, 'resolution', 'Stable 4K must lead with resolution');
  assert.equal(fourK[1].key, 'quality');
  assert.ok(fourK.some(e => e.key === 'cached'), 'cached must still be in the list, just below the tier');

  const oneEighty = applyOutputProfile(template(), 'stable', ctx('1080p')).config.sortCriteria.global;
  assert.equal(oneEighty[0].key, 'cached', 'Stable 1080p must keep cached-first');

  const optOut = applyOutputProfile(template(), 'stable', { ...ctx('4k'), qualityFirst: true }).config.sortCriteria.global;
  assert.equal(optOut[0].key, 'cached', 'qualityFirst must opt out of Stable tier-first too');
});
