import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolutionPolicy } from '../src/core/device-policies.js';
import { sortPolicy } from '../src/core/sort-policy.js';
import { isHighResolution } from '../src/core/filter-policy.js';
import { buildMixedPses } from '../src/core/standard-policy.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('resolution step offers the Mixed · Adaptive tier', () => {
  assert.ok(app.includes("{ v:'mixed',"), 'mixed resolution option missing from DEFS');
  assert.ok(app.includes("name:'Mixed · Adaptive'"));
  assert.ok(app.includes('niche-friendly'), 'mixed card should advertise its niche-library use case');
});

test('resolutionCfg gives mixed no caps and a broad preferred ladder incl. SD niche tiers', () => {
  const cfg = resolutionPolicy({ resolution: 'mixed' });
  assert.deepEqual(cfg.requiredResolutions, []);
  assert.deepEqual(cfg.preferredResolutions, ['2160p','1080p','1440p','720p','576p','480p','Unknown']);
});

test('mixed gets its own debrid PSE stack with 4K → 1080p → 720p → SD niche fallback', () => {
  assert.ok(app.includes('getSelPolicy'), 'pses() must delegate to getSelPolicy');
  const pses = buildMixedPses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false, dv: false });
  const labels = pses.map(p => p.expression.match(/\/\*([^*]+)\*\//)?.[1]?.trim()).filter(Boolean);
  assert.ok(labels.includes('576p/480p Niche Fallback'), 'mixed stack must keep SD tiers reachable for niche catalogs');
  assert.ok(labels.includes('S-Tier 4K BluRay REMUX'), 'mixed stack must rank 4K tiers');
  assert.ok(labels.includes('LQ Pin Bottom'), 'mixed branch should still sink low-quality groups');
  assert.ok(!labels.includes('Elite 1080p REMUX Pin'), 'mixed branch must not pin 1080p above 4K');
});

test('p2p mixed route ranks 4K above 1080p', () => {
  assert.ok(app.includes("if (res === '4k' || res === 'mixed')"));
});

test('mixed default sort ranks quality before resolution (cached × quality blend)', () => {
  const sort = sortPolicy({ service:'torbox', resolution:'mixed', pseArch:'apex-mixed', qualityFirst:false, resolutionFirst:false });
  assert.equal(sort.global.findIndex(x => x.key === 'quality') < sort.global.findIndex(x => x.key === 'resolution'), true);
});

test('mixed uses 4K-class regex tiers and size/bitrate bounds', () => {
  assert.ok(app.includes("(S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'||S.pseArch==='apex-mixed') ? [...RANKED_REGEX_COMMON,...RANKED_REGEX_UHD]"));
  assert.ok(app.includes("(S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'||S.pseArch==='apex-mixed') ? PREFERRED_REGEX_4K"));
  assert.equal(isHighResolution({ resolution:'mixed' }), true);
});

test('dynamicAddonFetching has a blended exit condition for mixed', () => {
  assert.match(app, /if\(S\.resolution==='mixed'\|\|S\.pseArch==='apex-mixed'\)\{ const c1m=pool==='max'\?35:pool==='large'\?22:12, c4m=pool==='max'\?20:pool==='large'\?12:6/);
});

test('imported mixed configs round-trip back to the mixed tier', () => {
  assert.match(app, /else if \(!req\.length && \(c\.preferredResolutions\|\|\[\]\)\[0\] === '2160p' && \(\(c\.preferredResolutions\|\|\[\]\)\.includes\('576p'\) \|\| \(c\.preferredResolutions\|\|\[\]\)\.includes\('480p'\)\)\) st\.resolution = 'mixed'/);
});

test('mixed qualifies for the full HDR visual tag ladder', () => {
  assert.ok(app.includes("S.resolution === '4k' || S.resolution === 'ultrawide' || S.resolution === 'mixed' || S.pseArch === 'apex-mixed') return ['HDR+DV','DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX']"));
});
