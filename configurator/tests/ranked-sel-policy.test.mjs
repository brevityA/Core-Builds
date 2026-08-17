/**
 * Ranked stream expressions are the only source of `streamExpressionScore`, and several
 * already-shipped features are silently deleted without them. These tests pin the properties
 * that make the layer actually do something, not merely exist.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rankedSelPolicy } from '../src/core/ranked-sel-policy.js';
import { applyOutputProfile } from '../src/core/output-profile-policy.js';
import { generateTemplate } from '../../packages/core/src/generate-template.js';

const label = e => e.expression.match(/^\/\* (.*?) \*\//)?.[1];
const labels = set => set.map(label);

test('every entry carries a /* Label */ so rseMatched() can address it', () => {
  for (const caps of [{ dv: true, limitedAudio: false }, { dv: false, limitedAudio: true }]) {
    for (const e of rankedSelPolicy({ resolution: '4k' }, caps)) {
      assert.ok(label(e), `unlabelled expression: ${e.expression}`);
    }
  }
});

test('scores stay inside the AIOStreams bound', () => {
  // packages/core/src/db/schemas.ts: z.number().min(-1_000_000).max(1_000_000)
  for (const e of rankedSelPolicy({ resolution: '4k' }, { dv: true })) {
    assert.ok(Number.isFinite(e.score), `${label(e)} has a non-numeric score`);
    assert.ok(Math.abs(e.score) <= 1_000_000, `${label(e)} exceeds the schema bound`);
  }
});

test('penalties reach past the Adaptive Score Floor threshold', () => {
  // The floor culls below `-50 + min(30, daysSinceRelease * 0.1)`, i.e. -50 at its strictest.
  // A purely positive score set would leave every stream above it — the floor would survive the
  // score-dependent-rule strip and then never fire, which is the failure mode this guards.
  const scores = rankedSelPolicy({ resolution: '4k' }, { dv: true }).map(e => e.score);
  assert.ok(
    scores.some(s => s <= -50),
    'no penalty reaches the floor threshold — the Adaptive Score Floor would be decorative',
  );
});

test('an unremarkable release from an LQ group still clears the floor', () => {
  // Calibration, not decoration: the floor should cut junk, not everything cheap. An LQ-group
  // 1080p WEB-DL is mediocre, not garbage, and must survive.
  const set = rankedSelPolicy({ resolution: '1080p' }, { dv: false, limitedAudio: true });
  const score = n => set.find(e => label(e) === n).score;
  const lqWebDl = score('RSE 1080p') + score('RSE WEB-DL') + score('RSE LQ Groups');
  assert.ok(lqWebDl > -50, `LQ 1080p WEB-DL totals ${lqWebDl} and would be culled by the floor`);
  assert.ok(score('RSE LQ Groups') <= -50, 'an LQ release with nothing else should be cullable');
});

test('device capabilities gate the tags that are scored', () => {
  const dvCapable = labels(rankedSelPolicy({ resolution: '4k' }, { dv: true, limitedAudio: false }));
  const dvBlind = labels(rankedSelPolicy({ resolution: '4k' }, { dv: false, limitedAudio: true }));

  assert.ok(dvCapable.includes('RSE Dolby Vision'), 'DV-capable device should score DV');
  assert.ok(!dvBlind.includes('RSE Dolby Vision'), 'scoring DV on a DV-blind device ranks unplayable streams');
  assert.ok(dvCapable.includes('RSE Lossless Audio'), 'lossless-capable device should score lossless');
  assert.ok(!dvBlind.includes('RSE Lossless Audio'), 'lossless is in excludedAudioTags on limited devices');
});

test('4K is scored only when the profile actually wants 4K', () => {
  assert.ok(labels(rankedSelPolicy({ resolution: '4k' }, {})).includes('RSE 2160p'));
  assert.ok(labels(rankedSelPolicy({ resolution: 'mixed' }, {})).includes('RSE 2160p'));
  assert.ok(!labels(rankedSelPolicy({ resolution: '1080p' }, {})).includes('RSE 2160p'),
    '1080p profiles hard-exclude 2160p, so scoring it would rank filtered streams');
});

test('no 1080p architecture lets 2160p through unscored', () => {
  // Omitting the 2160p score on 1080p profiles is only safe because a Hard Resolution Kill ESE
  // removes 2160p first. That fact lives in another module, so this pins the pair: if any
  // architecture ever stops emitting the kill, 4K would survive scoring at zero and rank BELOW
  // 1080p (+80) — an inversion, not just a missing bonus. Raised in review against apex-mixed,
  // which does emit the kill; this makes that hold for every architecture rather than today's.
  for (const architecture of ['standard', 'iqr', 'apex-mixed']) {
    const { config } = generateTemplate({
      service: 'torbox-pro', device: 'generic', resolution: '1080p',
      architecture, outputProfile: architecture === 'standard' ? 'advanced' : 'labs',
    });
    const killsUhd = (config.excludedStreamExpressions || []).some(
      e => /\/\* Hard Resolution Kill \*\/\s*resolution\(streams,'2160p'/.test(e.expression || ''),
    );
    const scores2160 = (config.rankedStreamExpressions || []).some(e => /RSE 2160p/.test(e.expression || ''));
    assert.ok(
      killsUhd || scores2160,
      `1080p/${architecture} neither excludes 2160p nor scores it — 4K would rank below 1080p`,
    );
  }
});

test('composite quality out-totals any single factor', () => {
  // The argument for additive scoring over an ordinal PSE ladder: combinations rank themselves
  // without anyone hand-ordering each pair.
  const set = rankedSelPolicy({ resolution: '4k' }, { dv: true, limitedAudio: false });
  const score = n => set.find(e => label(e) === n).score;
  const eliteRemux4k = score('RSE 2160p') + score('RSE Bluray REMUX') + score('RSE Elite Remux Groups') + score('RSE Atmos');
  const plainRemux4k = score('RSE 2160p') + score('RSE Bluray REMUX');
  assert.ok(eliteRemux4k > plainRemux4k);
  assert.ok(plainRemux4k > score('RSE 2160p'), 'a plain 4K remux must outrank a bare 4K');
});

test('score-dependent rules survive only when ranked expressions exist', () => {
  // The mechanism this whole module exists for. output-profile-policy strips the score sort key
  // and every score-reading expression unless a local ranked set is present.
  const base = () => ({
    config: {
      rankedStreamExpressions: [{ enabled: true, expression: "/* RSE 2160p */ resolution(streams,'2160p')", score: 330 }],
      excludedStreamExpressions: [{ enabled: true, expression: '/* Adaptive Score Floor */ streamExpressionScore(streams,-1000000,-50)' }],
      sortCriteria: { global: [{ key: 'cached', direction: 'desc' }, { key: 'streamExpressionScore', direction: 'desc' }] },
    },
  });

  const withScores = applyOutputProfile(base(), 'advanced');
  assert.ok(withScores.config.sortCriteria.global.some(k => k.key === 'streamExpressionScore'),
    'score sort key should survive when a ranked set is present');
  assert.equal(withScores.config.excludedStreamExpressions.length, 1,
    'the Adaptive Score Floor should survive when a ranked set is present');

  // Negative control: same config, ranked set removed.
  const stripped = base();
  stripped.config.rankedStreamExpressions = [];
  const withoutScores = applyOutputProfile(stripped, 'advanced');
  assert.ok(!withoutScores.config.sortCriteria.global.some(k => k.key === 'streamExpressionScore'),
    'score sort key must be stripped with no ranked set — otherwise it sorts on an unset field');
  assert.equal(withoutScores.config.excludedStreamExpressions.length, 0,
    'the Adaptive Score Floor must be stripped with no ranked set');
});
