import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateTemplate } from '../src/generate-template.js';
import { PIN_4K_ELITE, PIN_1080_ELITE } from '../src/apex-policy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

const fixture = JSON.parse(
  readFileSync(join(ROOT, 'tests/fixtures/candidate-streams-everyday.json'), 'utf8')
);
const balancedGolden = JSON.parse(
  readFileSync(join(ROOT, 'configurator/e2e/golden/core-balanced-torbox-1080p.json'), 'utf8')
);
const nexusStreamTpl = JSON.parse(
  readFileSync(join(ROOT, 'Templates/Torbox/Single/core-nexus-stream.json'), 'utf8')
);
const nexusEssentialTpl = JSON.parse(
  readFileSync(join(ROOT, 'Templates/Torbox/Essential/core-nexus-essential.json'), 'utf8')
);
const apex4kTpl = JSON.parse(
  readFileSync(join(ROOT, 'Templates/Torbox/Single/core-nexus-4k-apex-torbox.json'), 'utf8')
);

function parseRegexLiteral(pattern) {
  const m = /^\/([\s\S]*)\/([gimsuy]*)$/.exec(pattern);
  if (!m) return new RegExp(pattern, 'i');
  return new RegExp(m[1], m[2].replace('g', ''));
}

function makeEvaluator(allStreams, context = {}) {
  const daysSinceRelease = context.daysSinceRelease ?? -1;
  const queryType = context.queryType ?? 'movie';
  const isAnime = context.isAnime ?? false;
  const genres = context.genres ?? [];
  const originalLanguage = context.originalLanguage ?? 'English';

  const byTag = (streams, fn) => streams.filter(fn);

  const env = {
    streams: allStreams,
    daysSinceRelease,
    queryType,
    isAnime,
    genres,
    originalLanguage,
    count: (arr) => (Array.isArray(arr) ? arr.length : 0),
    min: (...args) => Math.min(...args.flat()),
    max: (...args) => Math.max(...args.flat()),
    floor: Math.floor,
    merge: (...arrays) => {
      const seen = new Set();
      const out = [];
      for (const a of arrays) {
        if (!Array.isArray(a)) continue;
        for (const s of a) {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            out.push(s);
          }
        }
      }
      return out;
    },
    negate: (remove, original) => {
      const drop = new Set((remove || []).map((s) => s.id));
      return (original || []).filter((s) => !drop.has(s.id));
    },
    slice: (arr, start, end) => (arr || []).slice(start, end),
    perGroup: (streams, attr, maxPer) => {
      const counts = new Map();
      const out = [];
      for (const s of streams || []) {
        const key =
          attr === 'resolution' ? (s.parsedFile?.resolution || 'Unknown')
          : attr === 'quality' ? (s.parsedFile?.quality || 'Unknown')
          : attr === 'indexer' ? (s.indexer || 'Unknown')
          : attr === 'addon' ? (s.addon?.name || 'Unknown')
          : 'all';
        const n = counts.get(key) || 0;
        if (n < maxPer) {
          counts.set(key, n + 1);
          out.push(s);
        }
      }
      return out;
    },
    resolution: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => set.has(s.parsedFile?.resolution || 'Unknown'));
    },
    quality: (streams, ...vals) => {
      const set = new Set(vals.map((v) => v.toLowerCase()));
      return byTag(streams, (s) => set.has((s.parsedFile?.quality || 'Unknown').toLowerCase()));
    },
    visualTag: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => {
        const tags = s.parsedFile?.visualTags || [];
        if (tags.length === 0 && set.has('SDR')) return true;
        return tags.some((t) => set.has(t));
      });
    },
    audioTag: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => (s.parsedFile?.audioTags || []).some((t) => set.has(t)));
    },
    audioChannels: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => (s.parsedFile?.audioChannels || []).some((t) => set.has(t)));
    },
    encode: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => set.has(s.parsedFile?.encode || 'Unknown'));
    },
    releaseGroup: (streams, ...vals) => {
      if (vals.length === 0) return byTag(streams, (s) => Boolean(s.parsedFile?.releaseGroup));
      const set = new Set(vals);
      return byTag(streams, (s) => set.has(s.parsedFile?.releaseGroup));
    },
    language: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => {
        const langs = s.parsedFile?.languages || [];
        if (langs.length === 0 && set.has('Unknown')) return true;
        return langs.some((l) => set.has(l));
      });
    },
    type: (streams, ...vals) => {
      const set = new Set(vals);
      return byTag(streams, (s) => set.has(s.type));
    },
    cached: (streams) => byTag(streams, (s) => s.service?.cached === true),
    uncached: (streams) => byTag(streams, (s) => s.service?.cached === false),
    library: (streams) => byTag(streams, (s) => s.library === true),
    seadex: (streams) => byTag(streams, (s) => s.seadex?.isSeadex === true),
    seasonPack: (streams) => byTag(streams, (s) => Boolean(s.parsedFile?.seasonPack)),
    regexMatched: (streams, ...names) => {
      if (names.length === 0) return byTag(streams, (s) => Boolean(s.regexMatched?.name));
      const set = new Set(names);
      return byTag(streams, (s) => set.has(s.regexMatched?.name));
    },
    rseMatched: (streams, ...names) => {
      if (names.length === 0) return byTag(streams, (s) => Boolean(s.rseMatched?.name));
      const set = new Set(names);
      return byTag(streams, (s) => set.has(s.rseMatched?.name));
    },
    streamExpressionScore: (streams, min, max) =>
      byTag(streams, (s) => {
        const sc = s.streamExpressionScore ?? 0;
        if (max === undefined) return sc >= min;
        return sc >= min && sc <= max;
      }),
    seeders: (streams, min, max) =>
      byTag(streams, (s) => {
        const sd = s.seeders ?? 0;
        return max === undefined ? sd >= min : sd >= min && sd <= max;
      }),
    size: (streams) => streams,
    addon: (streams, ...names) => {
      const set = new Set(names);
      return byTag(streams, (s) => set.has(s.addon?.name));
    },
    service: (streams, ...ids) => {
      const set = new Set(ids);
      return byTag(streams, (s) => set.has(s.service?.id));
    },
    indexer: (streams, ...names) => {
      const set = new Set(names);
      return byTag(streams, (s) => set.has(s.indexer));
    },
    keyword: () => [],
    message: (streams, _op, needle) =>
      byTag(streams, (s) => (s.message || '').includes(needle || '')),
    filename: (streams) => streams,
    folderName: (streams) => streams,
    passthrough: (streams) => streams,
    values: () => [],
    q1: () => 0,
    q3: () => 0,
    iqr: () => 0,
    age: () => [],
    bitrate: () => [],
    duration: () => [],
    subbed: () => [],
    dubbed: () => [],
    pin: (streams, pos) => streams.map((s) => ({ ...s, _pin: pos || 'top' })),
  };

  return (expr) => {
    const clean = expr.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const js = clean
      .replace(/('[^']+')\s+in\s+genres/g, 'genres.includes($1)')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!');
    const keys = Object.keys(env);
    const fn = new Function(...keys, `return (${js});`);
    return fn(...keys.map((k) => env[k]));
  };
}

function runEseAndRegex(config, rawStreams, context) {
  let pool = rawStreams.map((s) => ({ ...s }));

  // 1. excludedResolutions / included / excludedQualities / excludedVisualTags / excludedEncodes / excludedAudioTags / excludedStreamTypes
  const exRes = new Set(config.excludedResolutions || []);
  const exQual = new Set((config.excludedQualities || []).map((q) => q.toLowerCase()));
  const exVis = new Set(config.excludedVisualTags || []);
  const exEnc = new Set(config.excludedEncodes || []);
  const exAud = new Set(config.excludedAudioTags || []);
  const exType = new Set(config.excludedStreamTypes || []);
  const exRegex = (config.excludedRegexPatterns || []).map(parseRegexLiteral);

  pool = pool.filter((s) => {
    const pf = s.parsedFile || {};
    if (exRes.has(pf.resolution || 'Unknown')) return false;
    if (exQual.has((pf.quality || 'Unknown').toLowerCase())) return false;
    if ((pf.visualTags || []).some((t) => exVis.has(t))) return false;
    if (exEnc.has(pf.encode || 'Unknown')) return false;
    if ((pf.audioTags || []).some((t) => exAud.has(t))) return false;
    if (exType.has(s.type)) return false;
    const text = s.filename || '';
    if (exRegex.some((rx) => rx.test(text))) return false;
    return true;
  });

  // 2. excludedStreamExpressions (evaluated sequentially against current pool)
  for (const item of config.excludedStreamExpressions || []) {
    if (!item?.enabled) continue;
    const evaluate = makeEvaluator(pool, context);
    const dropped = new Set((evaluate(item.expression) || []).map((s) => s.id));
    if (dropped.size > 0) {
      pool = pool.filter((s) => !dropped.has(s.id));
    }
  }
  return pool;
}

test('Fix 1 (DV-Only Kill): generic/non-DV 1080p build kills DV-only s14 while keeping HDR+DV s15 and SDR/HDR streams', () => {
  const cfg = generateTemplate({
    outputProfile: 'advanced',
    architecture: 'standard',
    service: 'torbox',
    device: 'generic',
    resolution: '1080p',
    profile: 'balanced',
    host: 'custom',
  }).config;

  const dvOnlyKill = (cfg.excludedStreamExpressions || []).find((e) =>
    e.expression.includes('DV-Only Kill')
  );
  assert.ok(dvOnlyKill, 'Advanced generic build includes DV-Only Kill');
  assert.match(dvOnlyKill.expression, /negate\(merge\(visualTag\(streams,'HDR10\+'\)/);

  // Direct expression verification on all 35 streams
  const evaluateAll = makeEvaluator(fixture.streams, fixture.context);
  const dvOnlyDropped = new Set(evaluateAll(dvOnlyKill.expression).map((s) => s.id));
  assert.equal(dvOnlyDropped.has('s12-4k-webdl-dv-only-mzabi'), true, '4K DV-only s12 must be caught by DV-Only Kill');
  assert.equal(dvOnlyDropped.has('s14-1080p-webdl-dv-only-ntb'), true, '1080p DV-only s14 must be caught by DV-Only Kill');
  assert.equal(dvOnlyDropped.has('s10-4k-remux-dv-hdr10-framestor'), false, '4K HDR+DV hybrid s10 must NOT be caught by DV-Only Kill');
  assert.equal(dvOnlyDropped.has('s15-1080p-webdl-hdr-dv-playweb'), false, '1080p HDR+DV hybrid s15 must NOT be caught by DV-Only Kill');
  assert.equal(dvOnlyDropped.has('s01-1080p-remux-framestor'), false, 'SDR 1080p REMUX s01 must NOT be caught by DV-Only Kill');

  // Full ESE + regex pipeline verification (was 0/35 before Fix 1!)
  const survivors = runEseAndRegex(cfg, fixture.streams, fixture.context);
  const ids = new Set(survivors.map((s) => s.id));

  assert.equal(ids.has('s14-1080p-webdl-dv-only-ntb'), false, 'DV-only stream s14 must be excluded');
  assert.equal(ids.has('s01-1080p-remux-framestor'), true, '1080p REMUX s01 must survive');
  assert.equal(ids.has('s04-1080p-webdl-flux-hevc'), true, '1080p FLUX WEB-DL s04 must survive');
  assert.ok(survivors.length >= 5, `Expected >=5 survivors (was 0 before Fix 1), got ${survivors.length}`);
});

test('Fix 2 (\\bAI\\b regex): excludes real AI upscales without killing legitimate "(AI)" titles like s28', () => {
  const customBalanced = generateTemplate({
    outputProfile: 'balanced',
    architecture: 'standard',
    service: 'torbox-pro',
    device: 'generic',
    resolution: '1080p',
    host: 'custom',
  }).config;
  const patterns = (customBalanced.excludedRegexPatterns || []).map(parseRegexLiteral);
  const aiRegex = patterns[0];
  assert.ok(aiRegex, 'First excluded regex pattern present on custom/self-hosted build');

  const s28 = fixture.streams.find((s) => s.id === 's28-edge-title-contains-ai-false-exclusion');
  assert.ok(s28, 'Fixture includes s28');
  assert.equal(aiRegex.test(s28.filename), false, 'Legitimate "(AI)" title s28 must NOT match');
  assert.equal(aiRegex.test('A.I. Artificial Intelligence (2001) 1080p BluRay.mkv'), false);

  const s29 = fixture.streams.find((s) => s.id === 's29-edge-true-ai-upscale');
  assert.ok(s29, 'Fixture includes s29');
  assert.equal(aiRegex.test(s29.filename), true, 'True AI upscale s29 must match');
  assert.equal(aiRegex.test('Movie.2024.AI-Enhanced.1080p.mkv'), true);
  assert.equal(aiRegex.test('Movie.2024.AI_Remastered.1080p.mkv'), true);
  assert.equal(aiRegex.test('Movie.2024.AIUS.1080p.mkv'), true);

  const customSurvivors = runEseAndRegex(customBalanced, fixture.streams, fixture.context);
  assert.ok(
    customSurvivors.some((s) => s.id === 's28-edge-title-contains-ai-false-exclusion'),
    'Custom Core Balanced TorBox 1080p keeps s28'
  );
  assert.equal(
    customSurvivors.some((s) => s.id === 's29-edge-true-ai-upscale'),
    false,
    'Custom Core Balanced TorBox 1080p still excludes true AI upscale s29'
  );

  // ElfHosted golden keeps s28 as well (non-allowlisted AI pattern stripped by host gate)
  const balancedSurvivors = runEseAndRegex(balancedGolden.config, fixture.streams, fixture.context);
  assert.ok(
    balancedSurvivors.some((s) => s.id === 's28-edge-title-contains-ai-false-exclusion'),
    'ElfHosted Core Balanced golden keeps s28'
  );
});

test('Fix 3 (PIN_4K_ELITE / PIN_1080_ELITE): uses resolution(quality(streams, BluRay REMUX), ...) and actually matches elite remuxes', () => {
  const evaluate = makeEvaluator(fixture.streams, fixture.context);

  const pinned4k = evaluate(PIN_4K_ELITE.expression);
  assert.deepEqual(
    pinned4k.map((s) => s.id),
    ['s10-4k-remux-dv-hdr10-framestor'],
    'PIN_4K_ELITE must match 2160p BluRay REMUX FraMeSToR (s10)'
  );

  const pinned1080 = evaluate(PIN_1080_ELITE.expression);
  assert.deepEqual(
    pinned1080.map((s) => s.id),
    ['s01-1080p-remux-framestor', 's02-1080p-remux-truehd-only'],
    'PIN_1080_ELITE must match 1080p BluRay REMUX FraMeSToR/NTb (s01, s02)'
  );

  const apexPse = apex4kTpl.config.preferredStreamExpressions.find((e) =>
    /Elite 4K/i.test(e.expression)
  );
  assert.ok(apexPse, 'core-nexus-4k-apex-torbox carries Elite 4K REMUX Pin');
  assert.equal(
    evaluate(apexPse.expression).map((s) => s.id).includes('s10-4k-remux-dv-hdr10-framestor'),
    true,
    'Shipped core-nexus-4k-apex Elite 4K REMUX Pin must match s10'
  );
});

test('Fix 4 (Bad 1080P Bluray): preserves older/indie 1080p BluRay encodes when no REMUX exists, while guarding <90d releases', () => {
  const indie = fixture.subScenarios.find((sc) => sc.id === 'indie-movie-no-remux');
  assert.ok(indie, 'indie-movie-no-remux subScenario exists');
  const indieStreams = indie.streamIds.map((id) => fixture.streams.find((s) => s.id === id));

  for (const [label, tpl] of [
    ['core-nexus-stream', nexusStreamTpl],
    ['core-nexus-essential', nexusEssentialTpl],
  ]) {
    const survivorsOld = runEseAndRegex(tpl.config, indieStreams, indie.context);
    assert.deepEqual(
      survivorsOld.map((s) => s.id).sort(),
      [...indie.streamIds].sort(),
      `${label} must keep all 5 streams on older indie movie without REMUX (daysSinceRelease=720)`
    );

    const survivorsUnknownAge = runEseAndRegex(tpl.config, indieStreams, {
      queryType: 'movie',
      daysSinceRelease: -1,
    });
    assert.deepEqual(
      survivorsUnknownAge.map((s) => s.id).sort(),
      [...indie.streamIds].sort(),
      `${label} must also preserve BluRay encodes when daysSinceRelease is unknown (-1)`
    );

    const survivorsNew = runEseAndRegex(tpl.config, indieStreams, {
      queryType: 'movie',
      daysSinceRelease: 14,
    });
    assert.deepEqual(
      survivorsNew.map((s) => s.id).sort(),
      ['s04-1080p-webdl-flux-hevc', 's05-1080p-webdl-tommy-x264'],
      `${label} still guards <90-day movie without REMUX against early BluRay encodes`
    );
  }
});
