import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('resolution step offers the Mixed · Adaptive tier', () => {
  assert.ok(app.includes("{ v:'mixed',"), 'mixed resolution option missing from DEFS');
  assert.ok(app.includes("name:'Mixed · Adaptive'"));
  assert.ok(app.includes('niche-friendly'), 'mixed card should advertise its niche-library use case');
});

test('resolutionCfg gives mixed no caps and a broad preferred ladder incl. SD niche tiers', () => {
  assert.match(app, /S\.resolution === 'mixed' \|\| S\.pseArch === 'apex-mixed'\) return \{ excludedResolutions:ex, includedResolutions:\[\], requiredResolutions:\[\], preferredResolutions:\['2160p','1080p','1440p','720p','576p','480p','Unknown'\]/);
});

test('mixed gets its own debrid PSE stack with 4K → 1080p → 720p → SD niche fallback', () => {
  assert.ok(app.includes("} else if (res === 'mixed') {"), 'missing mixed PSE branch');
  assert.ok(app.includes('/* 576p/480p Niche Fallback */'), 'mixed stack must keep SD tiers reachable for niche catalogs');
  assert.ok(app.includes('/* S-Tier 4K BluRay REMUX */'), 'mixed stack must rank 4K tiers');
  // The 1080p Elite pin must NOT sit inside the mixed branch (it would outrank 4K).
  const branchStart = app.indexOf("} else if (res === 'mixed') {");
  const branchEnd = app.indexOf('} else {', branchStart); // stop at the ultrawide branch
  assert.ok(branchEnd > branchStart, 'mixed branch must precede the ultrawide fallback branch');
  const branch = app.slice(branchStart, branchEnd);
  assert.ok(!branch.includes('pin1080Elite'), 'mixed branch must not pin 1080p above 4K');
  assert.ok(branch.includes('pinLQ'), 'mixed branch should still sink low-quality groups');
});

test('p2p mixed route ranks 4K above 1080p', () => {
  assert.ok(app.includes("if (res === '4k' || res === 'mixed')"));
});

test('mixed default sort ranks quality before resolution (cached × quality blend)', () => {
  assert.match(app, /rq=\(qf\|\|\(\(S\.resolution==='mixed'\|\|S\.pseArch==='apex-mixed'\)&&!rf\)\)\?\[\{key:'quality',direction:d\},\{key:'resolution',direction:d\}\]/);
});

test('mixed uses 4K-class regex tiers and size/bitrate bounds', () => {
  assert.ok(app.includes("(S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'||S.pseArch==='apex-mixed') ? [...RANKED_REGEX_COMMON,...RANKED_REGEX_UHD]"));
  assert.ok(app.includes("(S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'||S.pseArch==='apex-mixed') ? PREFERRED_REGEX_4K"));
  assert.ok(app.includes("const is4k = S.resolution==='4k'||S.resolution==='ultrawide'||S.resolution==='mixed'"));
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
