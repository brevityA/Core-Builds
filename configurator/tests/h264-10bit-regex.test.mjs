/**
 * H.264 10-bit ranked-regex regression — reported as "the configurator has a
 * regex error on the H.264 10bit line, I had to delete it".
 *
 * What actually happens (not a syntax error):
 *   - Hosts that restrict regex filters (ElfHosted / ForTheWeak) permit a
 *     pattern only by EXACT string equality against the list AIOStreams builds
 *     from Vidhin05's English regexes.json. Pinned AIOStreams v2.36.0:
 *       packages/core/src/utils/regex-access.ts:143-155  partitionPatterns()
 *         -> `permitted.permitted.has(pattern)`
 *       packages/core/src/utils/config.ts:961-975       validateRegexes()
 *         -> throws "… you have N / M regexes that are not allowed …"
 *   - Vidhin05 commit a33d6982 (2026-11-15, "match more H.264 10-bit release
 *     tags") rewrote the `H.264 10bit` entry. Every Core Builds copy still
 *     carried the previous text, so the whole config was refused on save and
 *     the only line named in the error was this one.
 *   - The pattern itself was always valid: AIOStreams compiles it with
 *     `parseRegex()` + `new RegExp(body, flags)` (packages/core/src/utils/
 *     regex.ts:31), i.e. JavaScript RegExp, where `(?=…)` lookahead is fine.
 *     (Lookbehind `(?<=`/`(?<!` is the construct hosts refuse; this rule has
 *     never used it.)
 *
 * These tests pin the two things that broke and the policy that must survive:
 *   1. every shipped copy is byte-identical to the pinned upstream snapshot
 *      (the save-refusal class), including the configurator's own allowlist;
 *   2. the rule still means what it is for — H.264 10-bit is preferred over
 *      plain 8-bit H.264, while H.265/HEVC 10-bit never triggers it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

import { isAllowed, hasLookbehind, nonWhitelistedPatterns, stripNonWhitelisted } from '../src/core/regex-whitelist.js';
import { REGEX_ALLOWLIST } from '../src/data/regex-allowlist.js';
import { REGEX_ALLOWLIST as CORE_ALLOWLIST } from '../../packages/core/src/regex-allowlist.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = rel => readFileSync(join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));

// The expression users reported. Kept only to prove it is gone from every
// shipped lane and to explain the failure; it is no longer valid on hosts.
const REPORTED_OLD = String.raw`/\bhi10p?\b|(?=.*10[.-]?bit)(?=.*\b[xh][-_. ]?264\b)/i`;

// Current upstream text (Vidhin05 English/regexes.json, commit a33d6982,
// re-pinned 2026-11-16). Hosts compare this exact string.
const EXPECTED = String.raw`/\bhi10(?:p|res)?\b|(?=.*(?:\b10[ .\-_]?bits?\b|yuv4\d\dp10))(?=.*\b(?:[xh][-_. ]?264|avc)\b)/i`;

const NAME = 'H.264 10bit';
const REGEX_FIELDS = ['rankedRegexPatterns', 'preferredRegexPatterns', 'excludedRegexPatterns', 'regexOverrides'];

function countNamed(list = []) {
  return list.filter(entry => typeof entry === 'object' && entry?.name === NAME);
}

/** Entry with the given name in a ranked list, or undefined. */
const named = (list, name = NAME) => list.find(entry => entry?.name === name);

/** Ranked-regex consts embedded in the configurator bundle (derived data). */
function appConst(name) {
  const source = read('configurator/src/js/app.js');
  const match = new RegExp(`^const ${name} = (\\[.*\\]);$`, 'm').exec(source);
  assert.ok(match, `app.js must still define ${name}`);
  return JSON.parse(match[1]);
}

/** AIOStreams' own /body/flags split, verbatim from packages/core/src/utils/regex.ts. */
function parseRegex(pattern) {
  const m = /^\/(.+)\/([gimuyn]*)$/.exec(pattern);
  return m ? { regex: m[1], flags: m[2] } : { regex: pattern, flags: '' };
}

function compile(pattern) {
  const { regex, flags } = parseRegex(pattern);
  return new RegExp(regex, flags.replace(/n/g, ''));
}

const matches = (pattern, title) => compile(pattern).test(title);

/** The pattern actually shipped today, read from the pinned snapshot. */
const SHIPPED = named(readJson('Filtering/upstream/vidhin05-regexes.snapshot.json'))?.pattern;

/** Score a release title with the shipped ranked list (name -> score on match). */
function scoreTitle(list, title) {
  return list.reduce((total, entry) => (matches(entry.pattern, title) ? total + (entry.score ?? 0) : total), 0);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.json')) out.push(full);
  }
  return out;
}

// ── 1. Source of truth ───────────────────────────────────────────────────────

test('pinned snapshot carries the current upstream H.264 10bit text', () => {
  const snapshot = readJson('Filtering/upstream/vidhin05-regexes.snapshot.json');
  const entry = named(snapshot);
  assert.ok(entry, 'snapshot must keep the H.264 10bit entry (feature, not deleted)');
  assert.equal(entry.pattern, EXPECTED);
});

test('the reported expression no longer exists in the snapshot', () => {
  const snapshot = readJson('Filtering/upstream/vidhin05-regexes.snapshot.json');
  assert.ok(!snapshot.some(e => e.pattern === REPORTED_OLD), 'stale copy re-pinned by mistake');
});

// ── 2. Every derived copy, byte for byte ─────────────────────────────────────

test('reviewed ranked list matches the snapshot and keeps its preference score', () => {
  const entry = named(readJson('Filtering/ranked-regex-patterns.json'));
  assert.ok(entry);
  assert.equal(entry.pattern, EXPECTED);
  assert.ok(entry.score > 0, 'H.264 10-bit is a preference, not a penalty');
});

test('configurator, CLI and packages/core copies match the snapshot', () => {
  assert.equal(named(appConst('RANKED_REGEX_COMMON')).pattern, EXPECTED, 'configurator RANKED_REGEX_COMMON');

  const common = readJson('cli/data/ranked-regex.json').common;
  assert.equal(named(common).pattern, EXPECTED, 'cli/data/ranked-regex.json common');

  // The generated allowlist is keyed by the unwrapped body.
  const body = parseRegex(EXPECTED).regex;
  assert.deepEqual(
    { configurator: REGEX_ALLOWLIST[body], core: CORE_ALLOWLIST[body] },
    { configurator: NAME, core: NAME },
    'both generated allowlist mirrors must permit the current text',
  );
  assert.ok(!(parseRegex(REPORTED_OLD).regex in REGEX_ALLOWLIST),
    'the stale text must no longer be permitted locally either');
});

test('every active template and golden config ships the identical string', () => {
  const files = [
    ...walk(join(ROOT, 'Templates'))
      .filter(f => !/\/(Legacy|Deprecated|Personal)\//.test(relative(ROOT, f))),
    ...walk(join(ROOT, 'configurator/e2e/golden')),
  ];
  let carriers = 0;
  for (const file of files) {
    let doc;
    try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const config = doc?.config;
    if (!config) continue;
    for (const field of REGEX_FIELDS) {
      for (const entry of countNamed(config[field])) {
        carriers++;
        assert.equal(entry.pattern, EXPECTED, `${relative(ROOT, file)}:${field}`);
      }
    }
  }
  // Guard against a partial re-sync that silently drops the rule instead.
  assert.ok(carriers >= 39, `expected the rule in every active lane, saw ${carriers}`);
});

test('no shipped lane still carries the reported expression', () => {
  const offenders = [];
  const files = [
    'Filtering/ranked-regex-patterns.json',
    'cli/data/ranked-regex.json',
    'configurator/src/js/app.js',
    'packages/core/src/generate-template.js',
    'configurator/index.html',
    ...walk(join(ROOT, 'Templates'))
      .filter(f => !/\/(Legacy|Deprecated|Personal)\//.test(relative(ROOT, f))),
    ...walk(join(ROOT, 'configurator/e2e/golden')),
  ].map(file => (file.startsWith(ROOT) ? file : join(ROOT, file)));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    // Compare against the JSON-escaped form so both raw and minified copies hit.
    if (text.includes(JSON.stringify(REPORTED_OLD).slice(1, -1)) || text.includes(REPORTED_OLD)) {
      offenders.push(relative(ROOT, file));
    }
  }
  assert.deepEqual(offenders, [], 're-run scripts/sync_ranked_regex.py --apply for these files');
});

test('the separate visual-tag 10bit rule is untouched and distinct', () => {
  // Ordinary "10bit" is a visual tag (+20); it is not the H.264-specific rule.
  assert.equal(named(readJson('Filtering/ranked-regex-patterns.json'), '10bit').pattern, String.raw`/10[.-]?bit|hi10p?/i`);
});

// ── 3. The consuming engine accepts it ──────────────────────────────────────

test('pattern compiles in the JavaScript RegExp engine AIOStreams uses', () => {
  const { regex, flags } = parseRegex(EXPECTED);
  assert.equal(flags, 'i', 'hosts compare the wrapped string, /i included');
  assert.doesNotThrow(() => new RegExp(regex, flags));
  assert.equal(hasLookbehind(EXPECTED), false, 'inline lookbehind is the construct hosts block');
});

// ── 4. Policy: what must and must not match ─────────────────────────────────

test('matches H.264 10-bit release tags, including the newly covered spellings', () => {
  const titles = [
    // x264/H.264 + 10-bit, every separator form the rule allows
    'Movie.2019.1080p.BluRay.x264.10bit-GRP',
    'Movie.2019.1080p.BluRay.x264-10bit-GRP',
    'Movie.2019.1080p.BluRay.x264.10.bit-GRP',
    'Movie.2019.1080p.BluRay.x264.10 bit-GRP',
    'Movie.2019.1080p.BluRay.x264.10_bits-GRP',
    'Movie.2019.1080p.BluRay.h264.10bit-GRP',
    'Movie.2019.1080p.BluRay.H.264.10-bit-GRP',
    'Movie.2019.1080p.BluRay.x_264.10bit-GRP',
    // AVC-tagged 10-bit (added upstream so it is not "unknown codec + 10bit")
    'Movie.2019.1080p.WEB-DL.AVC.10bit-GRP',
    // the anime Hi10 family
    '[SubsPlease] Anime - 01 (1080p) [Hi10P].mkv',
    '[Group] Anime - 01 (1080p) [Hi10Res].mkv',
    '[Group] Anime - 01 (1080p) [Hi10].mkv',
    // pixel-format tag
    '[Group] Anime - 01 [yuv420p10][x264].mkv',
    // case variants (the /i flag is part of the host-compared string)
    'MOVIE.2019.1080P.X264.10BIT-GRP',
    'movie.2019.1080p.x264.10Bit-grp',
  ];
  for (const title of titles) assert.equal(matches(SHIPPED, title), true, title);
});

test('does not match ordinary H.264 8-bit releases', () => {
  const titles = [
    'Movie.2019.1080p.BluRay.x264-GRP',
    'Movie.2019.1080p.BluRay.x264.DTS-HD.MA.5.1-GRP',
    'Movie.2019.1080p.WEB-DL.H.264-GRP',
    'Movie.2019.1080p.WEB-DL.AVC-GRP',
    'Movie.2019.1080p.BluRay.8bit.x264-GRP',
    'Movie.2019.1080p.BluRay.x264-GRP',
    'Movie.10.1080p.BluRay.x264-GRP',       // bare "10" that is not a bit depth
  ];
  for (const title of titles) assert.equal(matches(SHIPPED, title), false, title);
});

test('does not match H.265/HEVC 10-bit releases (H.264-only rule)', () => {
  const titles = [
    'Movie.2019.2160p.UHD.BluRay.x265.10bit.HDR-GRP',
    'Movie.2019.1080p.BluRay.x265.10bit-GRP',
    'Movie.2019.1080p.BluRay.HEVC.10bit-GRP',
    'Movie.2019.1080p.BluRay.H.265.10-bit-GRP',
    'Movie.2019.1080p.BluRay.HEVC.10 bit-GRP',
  ];
  for (const title of titles) assert.equal(matches(SHIPPED, title), false, title);
});

test('a 10-bit tag without a known H.264 codec is left to the generic 10bit rule', () => {
  assert.equal(matches(SHIPPED, 'Movie.2019.1080p.BluRay.10bit-GRP'), false);
  assert.equal(matches('/10[.-]?bit|hi10p?/i', 'Movie.2019.1080p.BluRay.10bit-GRP'), true);
});

test('ranking keeps H.264 10-bit ahead of 8-bit x264 without inventing an HEVC match', () => {
  const ranked = appConst('RANKED_REGEX_COMMON');
  const hi10 = scoreTitle(ranked, 'Movie.2019.1080p.BluRay.x264.10bit-GRP');
  const plain = scoreTitle(ranked, 'Movie.2019.1080p.BluRay.x264-GRP');
  const hevc = scoreTitle(ranked, 'Movie.2019.1080p.BluRay.x265.10bit-GRP');
  assert.ok(hi10 > plain, `x264 10-bit (${hi10}) must outrank plain x264 (${plain})`);
  assert.ok(hevc > plain, `HEVC 10-bit (${hevc}) must outrank plain x264 (${plain})`);
  assert.equal(matches(SHIPPED, 'Movie.2019.1080p.BluRay.x265.10bit-GRP'), false);
});

// ── 5. Generation / JSON round trip through the configurator's own gate ─────

test('generated config keeps the rule through JSON and the local allowlist gate', () => {
  // What buildFinal() puts on a regex-scoring profile: the shipped const list.
  const shipped = appConst('RANKED_REGEX_COMMON');
  const config = {
    service: 'torbox',
    rankedRegexPatterns: shipped,
    preferredRegexPatterns: [],
    excludedRegexPatterns: [],
    regexOverrides: [],
  };
  const roundTripped = JSON.parse(JSON.stringify(config));
  assert.equal(roundTripped.rankedRegexPatterns.length, shipped.length, 'nothing dropped in serialization');
  const carried = named(roundTripped.rankedRegexPatterns);
  assert.ok(carried, 'the rule must survive serialization');
  assert.equal(carried.pattern, EXPECTED);
  assert.equal(isAllowed(carried.pattern), true);

  // The configurator's own gate (regexGateForHost feeds the same allowlist).
  // Scoped to this rule: the list also carries lookbehind patterns that hosts
  // reject for an unrelated, documented reason, so only this entry is checked.
  const oneRule = { rankedRegexPatterns: [carried] };
  assert.deepEqual(nonWhitelistedPatterns(oneRule), []);
  const kept = stripNonWhitelisted(oneRule);
  assert.equal(kept.rankedRegexPatterns.length, 1, 'the rule must not be silently dropped');
  assert.equal(kept.rankedRegexPatterns[0].pattern, EXPECTED);
});

test('template JSON round-trips without losing the rule', () => {
  const doc = readJson('Templates/Torbox/Single/core-nexus-stream.json');
  const roundTripped = JSON.parse(JSON.stringify(doc));
  const entry = named(roundTripped.config.rankedRegexPatterns);
  assert.ok(entry);
  assert.equal(entry.pattern, EXPECTED);
  assert.equal(entry.score > 0, true);
});

test('packages/core allowlist mirror stays in step with the configurator', () => {
  assert.deepEqual(Object.keys(CORE_ALLOWLIST), Object.keys(REGEX_ALLOWLIST));
});
