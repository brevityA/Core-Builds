/**
 * Regex-allowlist preflight — 2026-09-06 "3 / 180 regexes" diagnosis.
 *
 * Pure rule coverage for src/core/regex-access-policy.js (the DOM half,
 * regexGateForHost in app.js, is wired below and covered by
 * e2e/direct-install-gate.spec.mjs). The recorded stale-allowlist case
 * reproduces the observed race: Vidhin05 modified two patterns on
 * 2026-09-05 05:58 UTC and hosts rejected the fresh versions until their
 * allowlist refresh caught up.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { collectRegexPatternSet, regexAccessDecision, SYNCED_URL_KEYS } from '../src/core/regex-access-policy.js';

const VIDHIN_URL = 'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json';

// The two pattern strings Vidhin05 changed at 2026-09-05 05:58 UTC
// (commit 30600174 "anchor Anime LQ Groups…" and 3215706f "BR-DISK should
// match 720p full-disc releases"). Recorded here — no network in tests.
const RACE_OLD = [
  '/\\b($tore-Chill|0neshot|A-Destiny|AnimeRG|Animesu…OLD-VARIANT)\\b/i',
  '/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|720p|MKV|XviD…OLD-VARIANT)\\b).*$/i',
];
const RACE_NEW = [
  '/\\b($tore-Chill|0neshot|A-Destiny|AnimeRG|Animesu…NEW-VARIANT)\\b/i',
  '/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|MKV|XviD…NEW-VARIANT)\\b).*$/i',
];

test('collectRegexPatternSet: a regex-scoring golden carries the synced URL + its inline patterns', async () => {
  const golden = JSON.parse(await readFile(new URL('../e2e/golden/torbox-4k-apex-mixed.json', import.meta.url), 'utf8'));
  const set = collectRegexPatternSet(golden.config);
  assert.deepEqual(set.syncedUrls, [VIDHIN_URL]);
  // 83 unique: the 5 preferred + 3 excluded arrays overlap the 83 ranked entries
  assert.equal(set.inline.size, 83);
});

test('collectRegexPatternSet: a base-config golden carries neither', async () => {
  const golden = JSON.parse(await readFile(new URL('../e2e/golden/torbox-1080p-standard.json', import.meta.url), 'utf8'));
  const set = collectRegexPatternSet(golden.config);
  assert.equal(set.syncedUrls.length, 0);
  assert.equal(set.inline.size, 0);
});

test('regexAccessDecision: skip when there is nothing to validate or nothing it can know', () => {
  assert.equal(regexAccessDecision(null, { inline: new Set() }).status, 'skip');
  assert.equal(regexAccessDecision({ level: 'none' }, { inline: new Set() }).status, 'skip');
  // unrestricted host
  assert.equal(regexAccessDecision({ level: 'all', patterns: [] }, { inline: new Set(['/x/']) }).status, 'skip');
  // status unreachable → null
  assert.equal(regexAccessDecision(null, { inline: new Set(['/x/']) }).status, 'skip');
  // restrictive host but allowlist not exposed
  assert.equal(regexAccessDecision({ level: 'none' }, { inline: new Set(['/x/']) }).status, 'skip');
});

test('regexAccessDecision: ok when the whole union is allowlisted', () => {
  const d = regexAccessDecision(
    { level: 'trusted', patterns: [...RACE_OLD, ...RACE_NEW] },
    { resolved: new Set(RACE_NEW), inline: new Set(RACE_OLD) },
  );
  assert.equal(d.status, 'ok');
  assert.equal(d.total, 4);
});

test('regexAccessDecision: blocked with N / M counts — the recorded 2026-09-05 race', () => {
  // Host allowlist still holds the pre-05:58 strings; the config's synced URL
  // resolves to the fresh ones at save time.
  const d = regexAccessDecision(
    { level: 'none', patterns: RACE_OLD },
    { resolved: new Set(RACE_NEW), inline: new Set(RACE_OLD) },
  );
  assert.equal(d.status, 'blocked');
  assert.equal(d.total, 4, 'deduped union of synced + inline');
  assert.equal(d.rejectedCount, 2, 'the two freshly-changed patterns');
  assert.match(d.reason, /2 \/ 4 regex patterns are not allowed/);
  assert.match(d.reason, /lags the synced list/);
});

test('regexAccessDecision: inline-only configs are checked too (no synced URL needed)', () => {
  const d = regexAccessDecision({ level: 'trusted', patterns: ['/ok/'] }, { inline: new Set(['/ok/', '/custom/']) });
  assert.equal(d.status, 'blocked');
  assert.equal(d.total, 2);
  assert.equal(d.rejectedCount, 1);
});

test('SYNCED_URL_KEYS covers the arrays upstream validates', () => {
  // validateRegexes() resolves synced lists for all five pattern arrays.
  for (const k of ['syncedExcludedRegexUrls', 'syncedIncludedRegexUrls', 'syncedRequiredRegexUrls', 'syncedPreferredRegexUrls', 'syncedRankedRegexUrls']) {
    assert.ok(SYNCED_URL_KEYS.includes(k), k);
  }
});

test('app.js wiring: the gate runs after the host resolves and before the install POST', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  // gate + fetchers exist
  assert.match(app, /async function regexGateForHost/, 'gate helper defined');
  assert.match(app, /async function fetchHostRegexAccess/, 'status fetcher defined');
  assert.match(app, /async function fetchSyncedRegexPatterns/, 'synced-list fetcher defined');
  // ordering inside simpleInstall: resolveInstallHost → regexGateForHost → writeHostFetch POST
  // anchor inside simpleInstall (an earlier free-lane upload path also
  // resolves a host and POSTs — the gate deliberately guards the install
  // POST; the free lane never carries synced regex URLs)
  const iStart = app.indexOf('async function simpleInstall');
  const iHost = app.indexOf('const fastest = await resolveInstallHost(4000);', iStart);
  const iGate = app.indexOf('await regexGateForHost(fastest, cfg)', iStart);
  const iPost = app.indexOf("writeHostFetch(fastest, '/api/v1/user'", iStart);
  assert.ok(iHost >= 0 && iGate > iHost && iPost > iGate, `gate must sit between host resolve (${iHost}) and POST (${iPost}); got ${iGate}`);
  // the chip surfaces the verdict too
  assert.match(app, /rgx = await regexGateForHost\(url, buildFinal\(\)\.config\)/);
  // nothing unknown may block: every fetch failure path returns skip
  assert.match(app, /if \(resolved === null\) return \{ status: 'skip' \};/);
});
