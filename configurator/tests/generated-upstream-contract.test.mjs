/**
 * The generated upstream contract (src/data/generated/*, src/config/generated/*)
 * must stay a faithful, reproducible view of the pinned AIOStreams ref.
 *
 * These tests are deliberately offline: they check the pin, the provenance
 * headers, internal consistency between the emitted modules and the snapshot,
 * and that nothing in the configurator contradicts the contract. Reproducing
 * the files from source is `npm run sync:upstream:check`, which needs network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { AIO_CONFIG_KEYS, AIO_CONFIG_KEY_SET, unknownConfigKeys } from '../src/config/generated/aiostreams-config-schema.js';
import { AIO_SORT_SCOPES, AIO_SORT_CRITERIA, AIO_SORT_SCORE_KEYS, AIO_SORT_DEFAULT_DIRECTIONS, AIO_CACHED_SPLIT_REQUIRES_CACHED_FIRST, invalidSortCriteria } from '../src/config/generated/aiostreams-sort-schema.js';
import { AIO_PRESET_IDS, AIO_PRESET_ID_SET, isKnownPresetId } from '../src/data/generated/aiostreams-presets.js';
import * as ENUMS from '../src/data/generated/aiostreams-enums.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PIN = JSON.parse(readFileSync(join(ROOT, 'UPSTREAM.pin'), 'utf8'));
const SNAPSHOT = JSON.parse(readFileSync(join(ROOT, 'src/config/generated/upstream-snapshot.json'), 'utf8'));
const GENERATED_FILES = [
  'src/config/generated/aiostreams-config-schema.js',
  'src/config/generated/aiostreams-sort-schema.js',
  'src/data/generated/aiostreams-enums.js',
  'src/data/generated/aiostreams-presets.js',
];

/* ── the pin ───────────────────────────────────────────────────────────────── */

test('UPSTREAM.pin names a full 40-char AIOStreams commit', () => {
  assert.equal(PIN.repo, 'Viren070/AIOStreams');
  assert.match(PIN.sha, /^[0-9a-f]{40}$/);
  assert.match(PIN.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Array.isArray(PIN.sources) && PIN.sources.length >= 4);
});

// The first pin claimed "version": "2.33.2" while its sha was a docs-only commit
// near the tip of main that day — three config keys, two enum members and a
// preset ahead of the actual release. Every generated header carries that sha,
// so the whole contract was misattributed. `ref` must be the release tag, and
// scripts/sync-upstream.mjs additionally proves tag -> sha against the remote on
// every networked run; this test is the offline half that CI always runs.
test('UPSTREAM.pin is pinned to a release tag, not a branch', () => {
  assert.match(PIN.ref, /^v\d+\.\d+\.\d+$/, `ref ${JSON.stringify(PIN.ref)} is not a release tag`);
  assert.equal(PIN.ref, `v${PIN.version}`, 'ref and version disagree');
  assert.notEqual(PIN.ref, 'main', 'a branch ref makes the drift baseline meaningless');
});

test('the snapshot records the same release the pin claims', () => {
  assert.equal(SNAPSHOT.upstream.sha, PIN.sha);
  assert.equal(SNAPSHOT.upstream.version, PIN.version);
  assert.equal(SNAPSHOT.upstream.repo, PIN.repo);
});

test('every generated file carries a DO-NOT-EDIT header naming the pinned SHA', () => {
  for (const rel of GENERATED_FILES) {
    const head = readFileSync(join(ROOT, rel), 'utf8').split('\n').slice(0, 4).join('\n');
    assert.match(head, /DO NOT EDIT — generated from AIOStreams/, `${rel} header`);
    assert.ok(head.includes(PIN.sha), `${rel} header does not name the pinned SHA`);
    assert.ok(head.includes(PIN.version), `${rel} header does not name the pinned version`);
    assert.match(head, /npm run sync:upstream/, `${rel} does not say how to regenerate`);
  }
});

test('generated files embed no credential VALUES', () => {
  // Key NAMES such as `tmdbApiKey` are legitimately part of the upstream schema
  // and must be present. What must never appear is a credential value, so this
  // looks for token shapes rather than identifiers.
  const tokenShapes = [
    /\bghp_[A-Za-z0-9]{20,}/, /\bgithub_pat_[A-Za-z0-9_]{20,}/, /\bsk-[A-Za-z0-9]{20,}/,
    /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i, /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
    /\b[0-9a-f]{64}\b/i,
  ];
  for (const rel of [...GENERATED_FILES, 'src/config/generated/upstream-snapshot.json']) {
    const body = readFileSync(join(ROOT, rel), 'utf8');
    for (const shape of tokenShapes) {
      assert.equal(shape.test(body), false, `${rel} matches credential shape ${shape}`);
    }
  }
});

test('the generated directories contain nothing but the expected modules', () => {
  assert.deepEqual(readdirSync(join(ROOT, 'src/data/generated')).sort(), ['aiostreams-enums.js', 'aiostreams-presets.js']);
  assert.deepEqual(readdirSync(join(ROOT, 'src/config/generated')).sort(), ['aiostreams-config-schema.js', 'aiostreams-sort-schema.js', 'upstream-snapshot.json']);
});

/* ── modules agree with the snapshot they were emitted from ────────────────── */

test('the snapshot was taken at the pinned SHA', () => {
  assert.equal(SNAPSHOT.upstream.sha, PIN.sha);
  assert.equal(SNAPSHOT.upstream.version, PIN.version);
  assert.equal(SNAPSHOT.upstream.repo, PIN.repo);
});

test('emitted config keys match the snapshot exactly and in order', () => {
  assert.deepEqual(AIO_CONFIG_KEYS, SNAPSHOT.config.keys);
  assert.equal(AIO_CONFIG_KEY_SET.size, AIO_CONFIG_KEYS.length, 'duplicate config key emitted');
  assert.ok(AIO_CONFIG_KEYS.length > 100, `only ${AIO_CONFIG_KEYS.length} keys extracted — extraction probably silently failed`);
});

test('emitted sort contract matches the snapshot exactly', () => {
  assert.deepEqual(AIO_SORT_SCOPES, SNAPSHOT.sort.scopes);
  assert.deepEqual(AIO_SORT_CRITERIA, SNAPSHOT.sort.criteria);
  assert.deepEqual([...AIO_SORT_SCORE_KEYS].sort(), [...SNAPSHOT.sort.scoreKeys].sort());
});

test('emitted preset ids match the snapshot exactly', () => {
  assert.deepEqual(AIO_PRESET_IDS, SNAPSHOT.presetIds);
  assert.equal(AIO_PRESET_ID_SET.size, AIO_PRESET_IDS.length);
  assert.ok(AIO_PRESET_IDS.length > 20, `only ${AIO_PRESET_IDS.length} presets extracted`);
});

test('emitted enums match the snapshot exactly', () => {
  for (const [name, values] of Object.entries(SNAPSHOT.enums || {})) {
    const exported = ENUMS[`AIO_${name}`];
    if (!exported) continue;
    assert.deepEqual(exported, values, `${name} drifted from the snapshot`);
  }
});

/* ── internal consistency ──────────────────────────────────────────────────── */

test('every sort scope has a default direction for every criterion it can hold', () => {
  for (const key of AIO_SORT_CRITERIA) {
    assert.ok(key in AIO_SORT_DEFAULT_DIRECTIONS, `${key} has no default direction`);
    assert.ok(['asc', 'desc'].includes(AIO_SORT_DEFAULT_DIRECTIONS[key]));
  }
});

test('score keys are a subset of the criteria list', () => {
  for (const key of AIO_SORT_SCORE_KEYS) assert.ok(AIO_SORT_CRITERIA.includes(key), `${key} is not a criterion`);
});

test('the cached/uncached split flag reflects the pinned sorter', () => {
  assert.equal(AIO_CACHED_SPLIT_REQUIRES_CACHED_FIRST, true);
  for (const scope of ['cachedMovies', 'uncachedMovies', 'cachedSeries', 'uncachedSeries', 'cachedAnime', 'uncachedAnime']) {
    assert.ok(AIO_SORT_SCOPES.includes(scope), `${scope} missing from the scope list`);
  }
});

test('`sortCriteria` is itself a valid config key', () => {
  assert.ok(AIO_CONFIG_KEY_SET.has('sortCriteria'));
});

/* ── the helpers the rest of the app relies on ─────────────────────────────── */

test('unknownConfigKeys reports exactly the keys upstream would strip', () => {
  assert.deepEqual(unknownConfigKeys({ sortCriteria: {}, presets: [] }), []);
  assert.deepEqual(unknownConfigKeys({ maxResults: 9, notAThing: 1 }).sort(), ['maxResults', 'notAThing']);
});

test('invalidSortCriteria rejects bad scopes, keys and directions', () => {
  assert.deepEqual(invalidSortCriteria({ global: [{ key: 'resolution', direction: 'desc' }] }), []);
  const bad = invalidSortCriteria({
    global: [{ key: 'notAKey', direction: 'desc' }, { key: 'resolution', direction: 'sideways' }],
    notAScope: [{ key: 'resolution', direction: 'desc' }],
  });
  assert.equal(bad.length, 3, bad.join(' | '));
});

test('isKnownPresetId agrees with the emitted set', () => {
  assert.ok(isKnownPresetId(AIO_PRESET_IDS[0]));
  assert.ok(!isKnownPresetId('definitely-not-a-preset'));
});

/* ── the configurator must not contradict the contract ─────────────────────── */

test('the sort policy only ever emits contract-valid criteria', async () => {
  const { sortPolicy } = await import('../src/core/sort-policy.js');
  const states = [];
  for (const service of ['torbox-pro', 'realdebrid', 'multi', 'hybrid', 'p2p', 'http', 'usenet']) {
    for (const resolution of ['4k', '1080p', 'mixed', 'ultrawide']) {
      for (const flags of [{}, { qualityFirst: true }, { resolutionFirst: true }, { libraryBoost: 'none' }, { libraryBoost: 'strong' }]) {
        states.push({ service, resolution, ...flags });
      }
    }
  }
  for (const state of states) {
    const problems = invalidSortCriteria(sortPolicy(state));
    assert.deepEqual(problems, [], `${JSON.stringify(state)} -> ${problems.join(' | ')}`);
  }
  assert.equal(states.length, 140);
});
