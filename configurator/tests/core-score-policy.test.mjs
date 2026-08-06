import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreStream, scoreFormattedStream } from '../src/core/core-score-policy.js';

const PREMIUM = {
  quality: 'BluRay REMUX',
  resolution: '2160p',
  bitrate: 61,
  visualTags: 'DV HDR10',
  cached: true,
  library: true,
  seeders: 1200,
  age: 14,
};

const WEAK = {
  quality: 'HDTV',
  resolution: '480p',
  bitrate: 2.5,
  visualTags: '',
  cached: false,
  seeders: 4,
  age: 800,
};

test('Core Score is bounded 0–100 and ranks premium above weak', () => {
  const hi = scoreStream(PREMIUM);
  const lo = scoreStream(WEAK);
  assert.ok(hi.score >= 75 && hi.score <= 100, `premium should be high, got ${hi.score}`);
  assert.ok(lo.score < 50, `weak should be low, got ${lo.score}`);
  assert.ok(hi.score > lo.score, 'premium must outrank weak');
});

test('score has a full explainable breakdown + gates', () => {
  const r = scoreStream(PREMIUM);
  assert.ok(r.summary.startsWith(r.rank));
  assert.ok(r.summary.includes('Core ' + r.score));
  assert.ok(r.breakdown.tier.label === 'Quality tier');
  assert.ok(r.breakdown.tier.points === 100);
  assert.ok(r.gates.length >= 2);
  assert.ok(r.gates.every(g => typeof g.passed === 'boolean'));
});

test('quality tier ordering is correct', () => {
  const mk = (quality) => scoreStream({ quality, resolution: '1080p', cached: true }).score;
  assert.ok(mk('BluRay REMUX') > mk('BluRay'));
  assert.ok(mk('BluRay') > mk('WEB-DL'));
  assert.ok(mk('WEB-DL') > mk('WEBRip'));
  assert.ok(mk('WEBRip') > mk('HDTV'));
  assert.ok(mk('CAM') < mk('HDTV'));
});

test('resolution fit respects preferred resolutions', () => {
  const a = scoreStream({ quality: 'WEB-DL', resolution: '2160p' }, { preferredResolutions: ['2160p'] });
  const b = scoreStream({ quality: 'WEB-DL', resolution: '480p' }, { preferredResolutions: ['2160p'] });
  assert.ok(a.breakdown.resolution.points === 100);
  assert.ok(b.breakdown.resolution.points < 50);
});

test('Score IQR Guard caps a low-scoring stream at 49 even if it survives', () => {
  const r = scoreStream({ quality: 'WEBRip', resolution: '720p' }, { scoreIqrGuard: 70 });
  assert.ok(r.score <= 49, `guard should cap score, got ${r.score}`);
  assert.ok(r.gates.some(g => g.name === 'Score IQR Guard' && g.passed === false));
});

test('bitrate outlier vs IQR fence is penalised', () => {
  const stats = { median: 20, q1: 15, q3: 30, iqr: 15 };
  const ok = scoreStream({ quality: 'WEB-DL', bitrate: 24, resolution: '1080p' }, { tierStats: stats });
  const out = scoreStream({ quality: 'WEB-DL', bitrate: 95, resolution: '1080p' }, { tierStats: stats });
  assert.ok(out.breakdown.bitrate.points < ok.breakdown.bitrate.points);
});

test('unknown components drop their weight without breaking the score', () => {
  const r = scoreStream({ quality: 'WEB-DL', resolution: '1080p' });
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.ok(r.breakdown.seeders.points === null);
});

test('scoreFormattedStream parses a formatted line best-effort', () => {
  const r = scoreFormattedStream({
    name: '🟣 4K ⚡ Cached BluRay REMUX HDR10+',
    description: '52 GB · 61 Mbps · 2h 16m',
  });
  assert.equal(r.partial, true);
  assert.ok(r.parsed.quality === 'bluray remux');
  assert.ok(r.parsed.cached === true);
  assert.ok(r.parsed.bitrate === '61');
  assert.ok(r.score >= 0 && r.score <= 100);
});
