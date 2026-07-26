import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

// ── Golden link: APEX_MIXED_PSES must stay byte-identical to the static template ──
// Extract the constant from source (pure data — safe to evaluate).
const start = app.indexOf('const APEX_MIXED_PSES = [');
const end = app.indexOf('];', start);
assert.ok(start > 0 && end > start, 'APEX_MIXED_PSES constant missing from app.js');
const APEX_MIXED_PSES = new Function(`${app.slice(start, end + 2)}; return APEX_MIXED_PSES;`)();

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

test('pses() emits the ported stack for apex-mixed and returns early', () => {
  assert.match(app, /if \(S\.pseArch === 'apex-mixed'\) \{\s*out\.push\(\.\.\.APEX_MIXED_PSES\.map\(p => \(\{ \.\.\.p \}\)\)\);\s*return out;/);
});

test('apex-mixed adopts the mixed resolution policy end to end', () => {
  // Uncapped resolution config
  assert.ok(app.includes("S.resolution === 'mixed' || S.pseArch === 'apex-mixed') return { excludedResolutions:ex"));
  // Quality-before-resolution sort blend
  assert.ok(app.includes("((S.resolution==='mixed'||S.pseArch==='apex-mixed')&&!rf)"));
  // Blended dynamic-fetch exit
  assert.ok(app.includes("if(S.resolution==='mixed'||S.pseArch==='apex-mixed'){ const c1m="));
  // 4K-class regex/size/bitrate tiers
  assert.ok(app.includes("S.resolution==='mixed'||S.pseArch==='apex-mixed') ? [...RANKED_REGEX_COMMON,...RANKED_REGEX_UHD]"));
  assert.ok(app.includes("S.resolution==='mixed'||S.pseArch==='apex-mixed') ? PREFERRED_REGEX_4K"));
  assert.ok(app.includes("S.resolution==='mixed'||S.pseArch==='apex-mixed';"));
  // Full HDR visual tag ladder + Score IQR Guard
  assert.ok(app.includes("S.resolution === 'mixed' || S.pseArch === 'apex-mixed') return ['HDR+DV'"));
  assert.ok(app.includes("S.pseArch === 'iqr' || S.pseArch === 'apex-mixed') out.push({ enabled:true, expression: \"/*Score IQR Guard*/"));
});

test('apex-mixed is a first-class UI option and survives share-link sanitization', () => {
  assert.ok(app.includes("['standard','Standard','Simple quality tiers'],['iqr','Apex IQR','Statistical bitrate filtering'],['apex-mixed','Apex Mixed','IQR + adaptive · niche-friendly']"));
  assert.ok(app.includes("pick('pseArch',      v => ['standard','iqr','apex-mixed'].includes(v))"));
  assert.ok(app.includes("const resSuffix = S.pseArch === 'apex-mixed' ? ' Apex Mixed'"));
});
