import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolutionPolicy } from '../src/core/device-policies.js';
import { sortPolicy } from '../src/core/sort-policy.js';
import { APEX_MIXED_PSES } from '../src/core/sel-policy-data.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

// ── Golden link: shared SEL data must stay byte-identical to the static template ──
assert.ok(Array.isArray(APEX_MIXED_PSES) && APEX_MIXED_PSES.length > 0, 'APEX_MIXED_PSES data missing');

test('APEX_MIXED_PSES is byte-identical to the 4K Apex Mixed nightly template (golden link)', async () => {
  const tpl = JSON.parse(await readFile(
    new URL('../../Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json', import.meta.url), 'utf8'));
  const templatePses = tpl.config.preferredStreamExpressions;
  assert.equal(APEX_MIXED_PSES.length, templatePses.length,
    `PSE count drift: configurator ${APEX_MIXED_PSES.length} vs template ${templatePses.length} — regenerate one from the other`);
  templatePses.forEach((p, i) => {
    assert.deepEqual(APEX_MIXED_PSES[i], p,
      `PSE #${i} drifted: configurator "${APEX_MIXED_PSES[i]?.expression?.slice(0, 60)}" vs template "${p.expression.slice(0, 60)}"`);
  });
});

test('apex-mixed stack keeps the Apex identity: IQR tiers, niche ladder, slice limits, IMAX, audio', () => {
  const text = APEX_MIXED_PSES.map(p => p.expression).join('\n');
  assert.ok(text.includes('IQR'), 'IQR Tukey-fence tiers missing');
  assert.ok(text.includes("'576p'") && text.includes("'480p'") && text.includes("'240p'"), 'niche SD ladder missing');
  assert.ok(text.includes('Limit 4K Remux'), 'slice limits missing');
  assert.ok(text.includes('IMAX pin'), 'IMAX pin missing');
  assert.ok(text.includes('Audio channel priority'), 'audio priority missing');
});

test('pses() delegates to getSelPolicy for all architectures including apex-mixed', () => {
  assert.ok(app.includes('getSelPolicy'), 'pses() must delegate to getSelPolicy');
  assert.ok(app.includes("architecture: S.pseArch || 'standard'"), 'pses() must pass pseArch to getSelPolicy');
});

test('apex-mixed adopts the mixed resolution policy end to end', () => {
  // Uncapped resolution config
  assert.deepEqual(resolutionPolicy({ resolution:'mixed' }).requiredResolutions, []);
  assert.deepEqual(resolutionPolicy({ pseArch:'apex-mixed', resolution:'mixed' }).preferredResolutions, ['2160p','1080p','1440p','720p','576p','480p','Unknown']);
  // Quality-before-resolution sort blend
  const sort = sortPolicy({ service:'torbox', resolution:'mixed', pseArch:'apex-mixed', qualityFirst:false, resolutionFirst:false });
  assert.equal(sort.global.findIndex(x => x.key === 'quality') < sort.global.findIndex(x => x.key === 'resolution'), true);
  // Blended dynamic-fetch exit
  assert.ok(app.includes("if(S.resolution==='mixed'||S.pseArch==='apex-mixed'){ const c1m="));
  // 4K-class regex/size/bitrate tiers
  assert.ok(app.includes("S.resolution==='mixed'||S.pseArch==='apex-mixed') ? [...RANKED_REGEX_COMMON,...RANKED_REGEX_UHD]"));
  assert.ok(app.includes("S.resolution==='mixed'||S.pseArch==='apex-mixed') ? PREFERRED_REGEX_4K"));
  // Full HDR visual tag ladder + Score IQR Guard
  assert.ok(app.includes("S.resolution === 'mixed' || S.pseArch === 'apex-mixed') return ['HDR+DV'"));
  assert.ok(app.includes("usesIqrPolicy || S.pseArch === 'apex-mixed') out.push({ ...SCORE_IQR_GUARD })"));
});

test('apex-mixed is a first-class UI option and survives share-link sanitization', () => {
  assert.ok(app.includes("['standard','Standard','Simple quality tiers'],['iqr','Apex IQR','Statistical bitrate filtering'],['apex-mixed','Apex Mixed','IQR + adaptive · niche-friendly']"));
  assert.ok(app.includes("pick('pseArch',      v => ['standard','iqr','apex-mixed'].includes(v))"));
  assert.ok(app.includes("const resSuffix = S.pseArch === 'apex-mixed' ? ' Apex Mixed'"));
});
