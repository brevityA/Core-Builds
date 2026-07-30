import test from 'node:test';
import assert from 'node:assert/strict';
import {
  standardTiers4k, standardTiers1080, fallback720,
  buildStandard4kPses, buildStandard1080Pses,
  buildMixedPses, buildDefaultPses,
} from '../src/core/standard-policy.js';
import { SEL_POLICY_DATA } from '../src/core/sel-policy-data.js';

test('standardTiers4k returns 4 quality tiers', () => {
  const tiers = standardTiers4k();
  assert.equal(tiers.length, 4);
  assert.ok(tiers[0].expression.includes('S-Tier 4K BluRay REMUX'));
  assert.ok(tiers[3].expression.includes('C-Tier Any 4K'));
});

test('standardTiers1080 returns 4 quality tiers', () => {
  const tiers = standardTiers1080();
  assert.equal(tiers.length, 4);
  assert.ok(tiers[0].expression.includes('S-Tier 1080p BluRay REMUX'));
  assert.ok(tiers[3].expression.includes('C-Tier Any 1080p'));
});

test('fallback720 returns 2 entries', () => {
  const fb = fallback720();
  assert.equal(fb.length, 2);
  assert.ok(fb[0].expression.includes('720p WEB-DL Fallback'));
  assert.ok(fb[1].expression.includes('720p Any Fallback'));
});

test('buildStandard4kPses matches golden standard-4k fixture', () => {
  const goldenPses = SEL_POLICY_DATA['standard-4k'].preferredStreamExpressions;
  const goldenNonPrelude = goldenPses.filter(p =>
    !p.expression.includes('Language Preference') &&
    !p.expression.includes('Sub-First Anime Booster') &&
    !p.expression.includes('Dolby Priority')
  );
  const built = buildStandard4kPses({ dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  assert.equal(built.length, goldenNonPrelude.length,
    `Built ${built.length} PSEs, golden has ${goldenNonPrelude.length} (excl. prelude)`);
  for (let i = 0; i < built.length; i++) {
    assert.equal(built[i].expression, goldenNonPrelude[i].expression,
      `PSE ${i} mismatch: built=${built[i].expression.slice(0,60)}`);
  }
});

test('buildStandard4kPses with DV adds one extra PSE', () => {
  const withDv = buildStandard4kPses({ dv: true, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  const withoutDv = buildStandard4kPses({ dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  assert.equal(withDv.length, withoutDv.length + 1);
  assert.ok(withDv[3].expression.includes('REMUX DV'));
});

test('buildStandard1080Pses matches golden standard fixture', () => {
  const goldenPses = SEL_POLICY_DATA.standard.preferredStreamExpressions;
  const goldenNonPrelude = goldenPses.filter(p =>
    !p.expression.includes('Language Preference') &&
    !p.expression.includes('Sub-First Anime Booster') &&
    !p.expression.includes('Dolby Priority')
  );
  const built = buildStandard1080Pses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  assert.equal(built.length, goldenNonPrelude.length,
    `Built ${built.length} PSEs, golden has ${goldenNonPrelude.length} (excl. prelude)`);
  for (let i = 0; i < built.length; i++) {
    assert.equal(built[i].expression, goldenNonPrelude[i].expression,
      `PSE ${i} mismatch: built=${built[i].expression.slice(0,60)}`);
  }
});

test('buildMixedPses matches golden mixed-standard fixture', () => {
  const goldenPses = SEL_POLICY_DATA['mixed-standard'].preferredStreamExpressions;
  const goldenNonPrelude = goldenPses.filter(p =>
    !p.expression.includes('Language Preference') &&
    !p.expression.includes('Sub-First Anime Booster') &&
    !p.expression.includes('Dolby Priority')
  );
  const built = buildMixedPses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false, dv: false });
  assert.equal(built.length, goldenNonPrelude.length,
    `Built ${built.length} PSEs, golden has ${goldenNonPrelude.length} (excl. prelude)`);
  for (let i = 0; i < built.length; i++) {
    assert.equal(built[i].expression, goldenNonPrelude[i].expression,
      `PSE ${i} mismatch: built=${built[i].expression.slice(0,60)}`);
  }
});

test('buildMixedPses does not include Elite 1080p Pin', () => {
  const built = buildMixedPses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true, dv: false });
  const labels = built.map(p => p.expression.match(/\/\*([^*]+)\*\//)?.[1]?.trim()).filter(Boolean);
  assert.ok(!labels.includes('Elite 1080p REMUX Pin'), 'Mixed should not have 1080p Elite pin');
  assert.ok(labels.includes('LQ Pin Bottom'));
  assert.ok(labels.includes('576p/480p Niche Fallback'));
});

test('buildDefaultPses includes 1440p and 4K fallbacks', () => {
  const built = buildDefaultPses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true, dv: false });
  const labels = built.map(p => p.expression.match(/\/\*([^*]+)\*\//)?.[1]?.trim()).filter(Boolean);
  assert.ok(labels.includes('1440p Any Quality'));
  assert.ok(labels.includes('4K Fallback BluRay REMUX'));
  assert.ok(labels.includes('4K Fallback WEB-DL HDR'));
  assert.ok(labels.includes('4K Fallback Any'));
});

test('all standard-policy PSEs have balanced parentheses', () => {
  const all = [
    ...buildStandard4kPses({ dv: true, audio: 'full', forceLimitedAudio: false, supportsAv1: true }),
    ...buildStandard1080Pses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true }),
    ...buildMixedPses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true, dv: true }),
    ...buildDefaultPses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true, dv: true }),
  ];
  for (const { expression } of all) {
    const opens = (expression.match(/\(/g) || []).length;
    const closes = (expression.match(/\)/g) || []).length;
    assert.equal(opens, closes, `Unbalanced in: ${expression.slice(0, 60)}...`);
  }
});

test('standard-policy produces no browser globals', () => {
  const all = [
    ...buildStandard4kPses({ dv: true, audio: 'full', forceLimitedAudio: false, supportsAv1: true }),
    ...buildMixedPses({ audio: 'full', forceLimitedAudio: false, supportsAv1: true, dv: true }),
  ];
  for (const { expression } of all) {
    for (const g of ['document', 'window', 'localStorage', 'fetch(', 'navigator']) {
      assert.ok(!expression.includes(g), `Expression contains browser global: ${g}`);
    }
  }
});
