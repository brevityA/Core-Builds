import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PIN_4K_ELITE, PIN_1080_ELITE, PIN_LQ,
  audioPriority, codecBooster,
  HDR_DV_PRIORITY, IMAX_PIN, CACHED_USENET_BOOST, BITRATE_ANOMALY_PIN,
  sliceLimits4k, sliceLimits1080,
  iqrTiers4k, iqrTiers1080,
  buildApexIqr4kPses, buildApexIqr1080Pses,
} from '../src/core/apex-policy.js';
import { SEL_POLICY_DATA } from '../src/core/sel-policy-data.js';

test('PIN constants have correct labels', () => {
  assert.ok(PIN_4K_ELITE.expression.includes('Elite 4K REMUX Pin'));
  assert.ok(PIN_1080_ELITE.expression.includes('Elite 1080p REMUX Pin'));
  assert.ok(PIN_LQ.expression.includes('LQ Pin Bottom'));
  assert.equal(PIN_4K_ELITE.enabled, true);
  assert.equal(PIN_1080_ELITE.enabled, true);
  assert.equal(PIN_LQ.enabled, true);
});

test('audioPriority returns empty for limited audio', () => {
  assert.deepEqual(audioPriority('limited', false), []);
  assert.deepEqual(audioPriority('full', true), []);
});

test('audioPriority returns dolby-only for dolby mode', () => {
  const result = audioPriority('dolby', false);
  assert.equal(result.length, 1);
  assert.ok(result[0].expression.includes('TrueHD'));
  assert.ok(!result[0].expression.includes('DTS-HD MA'));
});

test('audioPriority returns full lossless for default mode', () => {
  const result = audioPriority('full', false);
  assert.equal(result.length, 1);
  assert.ok(result[0].expression.includes('DTS-HD MA'));
  assert.ok(result[0].expression.includes('FLAC'));
});

test('codecBooster includes AV1 when supported', () => {
  const av1 = codecBooster(true);
  assert.ok(av1.expression.includes('AV1'));
  const noAv1 = codecBooster(false);
  assert.ok(!noAv1.expression.includes('AV1'));
  assert.ok(noAv1.expression.includes('HEVC'));
});

test('static components have expected labels', () => {
  assert.ok(HDR_DV_PRIORITY.expression.includes('HDR/DV Priority'));
  assert.ok(IMAX_PIN.expression.includes('IMAX'));
  assert.ok(CACHED_USENET_BOOST.expression.includes('Boost Cached Usenet'));
  assert.ok(BITRATE_ANOMALY_PIN.expression.includes('Bitrate Anomaly Pin'));
});

test('sliceLimits4k adjusts QR limit for DV devices', () => {
  const dvLimits = sliceLimits4k(true);
  const noDvLimits = sliceLimits4k(false);
  assert.equal(dvLimits.length, 3);
  assert.equal(noDvLimits.length, 3);
  assert.ok(dvLimits[0].expression.includes(',4,'));
  assert.ok(noDvLimits[0].expression.includes(',3,'));
});

test('sliceLimits1080 returns fixed 3 entries', () => {
  const limits = sliceLimits1080();
  assert.equal(limits.length, 3);
  assert.ok(limits[0].expression.includes("'1080p','720p'"));
  assert.ok(limits[2].expression.includes('Addon Diversity'));
});

test('iqrTiers4k adds DV tier conditionally', () => {
  const withDv = iqrTiers4k(true);
  const withoutDv = iqrTiers4k(false);
  assert.equal(withDv.length, withoutDv.length + 1);
  assert.ok(withDv[0].expression.includes('REMUX DV'));
  assert.ok(!withoutDv[0].expression.includes('REMUX DV'));
});

test('iqrTiers4k produces IQR expressions with correct labels', () => {
  const tiers = iqrTiers4k(false);
  const labels = tiers.map(t => t.expression.match(/\/\*([^*]+)\*\//)?.[1]?.trim());
  assert.ok(labels.includes('S-Tier 4K REMUX — IQR Tukey fence'));
  assert.ok(labels.includes('A-Tier 4K WEB-DL HDR — IQR + linear decay'));
  assert.ok(labels.includes('D-Tier 4K WEBRip SDR — IQR'));
  assert.ok(labels.includes('E-Tier Any 4K'));
});

test('iqrTiers1080 returns 4 entries with correct structure', () => {
  const tiers = iqrTiers1080();
  assert.equal(tiers.length, 4);
  assert.ok(tiers[0].expression.includes('S-Tier 1080p REMUX'));
  assert.ok(tiers[1].expression.includes('A-Tier 1080p WEB-DL'));
  assert.ok(tiers[2].expression.includes('B-Tier 1080p WEBRip'));
  assert.ok(tiers[3].expression.includes('C-Tier Any 1080p'));
});

test('buildApexIqr4kPses matches golden IQR fixture PSE count', () => {
  const goldenPses = SEL_POLICY_DATA.iqr.preferredStreamExpressions;
  const goldenNonPrelude = goldenPses.filter(p =>
    !p.expression.includes('Language Preference') &&
    !p.expression.includes('Sub-First Anime Booster')
  );
  const built = buildApexIqr4kPses({ dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  assert.equal(built.length, goldenNonPrelude.length,
    `Built ${built.length} PSEs, golden has ${goldenNonPrelude.length} (excl. prelude)`);
});

test('buildApexIqr4kPses expression content matches golden fixture byte-for-byte', () => {
  const goldenPses = SEL_POLICY_DATA.iqr.preferredStreamExpressions;
  const goldenNonPrelude = goldenPses.filter(p =>
    !p.expression.includes('Language Preference') &&
    !p.expression.includes('Sub-First Anime Booster')
  );
  const built = buildApexIqr4kPses({ dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  for (let i = 0; i < built.length; i++) {
    assert.equal(built[i].expression, goldenNonPrelude[i].expression,
      `PSE ${i} mismatch: built label=${built[i].expression.slice(0,60)}`);
  }
});

test('buildApexIqr4kPses with DV adds one extra PSE', () => {
  const withDv = buildApexIqr4kPses({ dv: true, audio: 'full', forceLimitedAudio: false, supportsAv1: true });
  const withoutDv = buildApexIqr4kPses({ dv: false, audio: 'full', forceLimitedAudio: false, supportsAv1: true });
  assert.equal(withDv.length, withoutDv.length + 1);
});

test('buildApexIqr1080Pses has correct structure', () => {
  const built = buildApexIqr1080Pses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true });
  const labels = built.map(t => t.expression.match(/\/\*([^*]+)\*\//)?.[1]?.trim()).filter(Boolean);
  assert.ok(labels.includes('Elite 1080p REMUX Pin'));
  assert.ok(labels.includes('LQ Pin Bottom'));
  assert.ok(labels.includes('S-Tier 1080p REMUX — IQR Tukey fence'));
  assert.ok(labels.includes('720p WEB-DL Fallback'));
  assert.ok(labels.includes('Addon Diversity'));
  assert.ok(!labels.includes('Bitrate Anomaly Pin'), '1080p should not have Bitrate Anomaly Pin');
  assert.ok(!labels.includes('HDR/DV Priority'), '1080p should not have HDR/DV Priority');
});

test('all apex-policy exports have balanced parentheses', () => {
  const all = [
    PIN_4K_ELITE, PIN_1080_ELITE, PIN_LQ,
    HDR_DV_PRIORITY, IMAX_PIN, CACHED_USENET_BOOST, BITRATE_ANOMALY_PIN,
    ...iqrTiers4k(true), ...iqrTiers1080(),
    ...sliceLimits4k(true), ...sliceLimits1080(),
    ...audioPriority('full', false),
    codecBooster(true),
  ];
  for (const { expression } of all) {
    const opens = (expression.match(/\(/g) || []).length;
    const closes = (expression.match(/\)/g) || []).length;
    assert.equal(opens, closes, `Unbalanced in: ${expression.slice(0, 60)}...`);
  }
});

test('apex-policy produces no browser globals', () => {
  const all = buildApexIqr4kPses({ dv: true, audio: 'full', forceLimitedAudio: false, supportsAv1: true });
  for (const { expression } of all) {
    for (const g of ['document', 'window', 'localStorage', 'fetch(', 'navigator']) {
      assert.ok(!expression.includes(g), `Expression contains browser global: ${g}`);
    }
  }
});
