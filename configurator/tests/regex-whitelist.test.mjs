import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, hasLookbehind, nonWhitelistedPatterns, stripNonWhitelisted, REGEX_FIELDS } from '../src/core/regex-whitelist.js';
import { REGEX_ALLOWLIST } from '../src/data/regex-allowlist.js';

// Radarr Remux T1 is on the allowlist (from the snapshot).
const ALLOWED_PAT = "/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(3L|ATELiER|BiZKiT|BLURANiUM|BMF|CiNEPHiLES|FraMeSToR|PiRAMiDHEAD|PmP|WiLDCAT|ZQ)\\b).*/i";
const BAD_PAT = '/^custom-core-pattern-not-on-allowlist$/i';

test('isAllowed matches normalized patterns', () => {
  assert.equal(isAllowed(ALLOWED_PAT), true);
  assert.equal(isAllowed(BAD_PAT), false);
  assert.equal(isAllowed(''), false);
});

test('nonWhitelistedPatterns finds offenders across fields with names', () => {
  const cfg = {
    rankedRegexPatterns: [{ name: 'Radarr Remux T1', pattern: ALLOWED_PAT }, { name: 'Custom Bad', pattern: BAD_PAT }],
    preferredRegexPatterns: [{ name: 'Another Bad', pattern: '/x/i' }],
    excludedRegexPatterns: [{ name: 'Ok', pattern: ALLOWED_PAT }],
    regexOverrides: [],
  };
  const offenders = nonWhitelistedPatterns(cfg);
  assert.equal(offenders.length, 2);
  assert.ok(offenders.some(o => o.name === 'Custom Bad' && o.field === 'rankedRegexPatterns'));
  assert.ok(offenders.some(o => o.name === 'Another Bad' && o.field === 'preferredRegexPatterns'));
});

test('stripNonWhitelisted removes only the offenders', () => {
  const cfg = {
    rankedRegexPatterns: [{ name: 'A', pattern: ALLOWED_PAT }, { name: 'B', pattern: BAD_PAT }],
    preferredRegexPatterns: [{ name: 'C', pattern: '/x/i' }],
    excludedRegexPatterns: [{ name: 'D', pattern: ALLOWED_PAT }],
    otherSetting: true,
  };
  const next = stripNonWhitelisted(cfg);
  assert.deepEqual(next.rankedRegexPatterns.map(p => p.name), ['A']);
  assert.deepEqual(next.preferredRegexPatterns, []);
  assert.equal(next.excludedRegexPatterns.length, 1);
  assert.equal(next.otherSetting, true, 'non-regex settings preserved');
});

test('string-form patterns are handled and named by index', () => {
  const cfg = { rankedRegexPatterns: [ALLOWED_PAT, BAD_PAT] };
  const offenders = nonWhitelistedPatterns(cfg);
  assert.equal(offenders.length, 1);
  assert.ok(offenders[0].name.includes('rankedRegexPatterns'));
  const next = stripNonWhitelisted(cfg);
  assert.equal(next.rankedRegexPatterns.length, 1);
});

test('REGEX_FIELDS covers the four regex-bearing config fields', () => {
  assert.deepEqual(REGEX_FIELDS.sort(), ['excludedRegexPatterns', 'preferredRegexPatterns', 'rankedRegexPatterns', 'regexOverrides'].sort());
});

test('lookbehind patterns are flagged and stripped even when on the allowlist', () => {
  // Anime BD T1 is ON the allowlist but uses inline lookbehind (the documented
  // ElfHosted blocker) — it must be flagged and stripped.
  const ANIME_LB = Object.keys(REGEX_ALLOWLIST).find(k => REGEX_ALLOWLIST[k] === 'Anime BD T1');
  assert.ok(ANIME_LB, 'fixture must exist on the allowlist');
  assert.equal(isAllowed(ANIME_LB), true, 'fixture must be on the allowlist');
  assert.equal(hasLookbehind(ANIME_LB), true, 'fixture must use lookbehind');
  const cfg = { rankedRegexPatterns: [{ name: 'Anime BD T1', pattern: ANIME_LB }] };
  const offenders = nonWhitelistedPatterns(cfg);
  assert.equal(offenders.length, 1);
  assert.ok(offenders[0].reason.includes('lookbehind'), offenders[0].reason);
  const next = stripNonWhitelisted(cfg);
  assert.equal(next.rankedRegexPatterns.length, 0);
});

test('nonWhitelistedPatterns reports a reason for each offender', () => {
  const LOOKBEHIND_ON_ALLOWLIST = Object.keys(REGEX_ALLOWLIST).find(k => REGEX_ALLOWLIST[k] === 'Anime BD T2');
  const cfg = {
    rankedRegexPatterns: [
      { name: 'NotOnList', pattern: '/^custom-bad$/i' },
      { name: 'Anime BD T2', pattern: LOOKBEHIND_ON_ALLOWLIST },
    ],
  };
  const offenders = nonWhitelistedPatterns(cfg);
  assert.equal(offenders.length, 2);
  assert.ok(offenders.some(o => o.reason.includes('allowlist')));
  assert.ok(offenders.some(o => o.reason.includes('lookbehind')));
});
