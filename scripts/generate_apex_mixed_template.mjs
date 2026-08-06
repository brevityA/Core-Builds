// One-off generator: Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json
//
// 4K Apex v0.9.0 (IQR Tukey-fence flagship) × Mixed · Adaptive resolution policy:
//   - requiredResolutions cap lifted → Apex's dormant 480p/240p fallback tiers wake up
//   - quality-before-resolution sort blend (cached × quality first)
//   - new 576p niche tier mirroring Apex's 480p entries
//   - blended 4K/1080p dynamic-addon-fetch exit
//   - pool widened slightly (12→20) since results now spread across more tiers
//
// Everything that makes Apex Apex — IQR PSEs, ESE stack, slice limits, IMAX pin,
// audio priority — is preserved verbatim.
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync('Templates/Torbox/Single/core-nexus-4k-apex.json', 'utf8'));
const c = src.config;

// ── Metadata ────────────────────────────────────────────────
src.metadata = {
  ...src.metadata,
  id: 'core-nexus-4k-apex-mixed',
  name: 'Core Nexus 4K Apex Mixed',
  version: '0.1.0',
  description:
    'Nightly — 4K Apex v0.9.0 IQR stack with the Mixed adaptive resolution policy. The requiredResolutions cap is lifted, which activates Apex\u2019s dormant 480p/240p fallback tiers and adds a 576p niche tier — classic and rare content that capped templates never surface. Sort uses the cached \u00d7 quality blend (quality ranks before resolution) so an elite 1080p encode can beat a mediocre 4K stream, while the full IQR Tukey-fence bitrate logic, ESE stack, slice limits, IMAX pin, and audio priority are preserved verbatim. Blended 4K/1080p dynamic-fetch exit. For niche-heavy libraries that want flagship ranking without a resolution floor.',
  sourceUrl: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json',
};

// ── Mixed policy: lift the cap ─────────────────────────────
if (JSON.stringify(c.requiredResolutions) !== JSON.stringify(['2160p', '1080p'])) {
  throw new Error('Apex requiredResolutions changed — aborting');
}
c.requiredResolutions = [];
// preferredResolutions already spans 2160p…240p + Unknown — keep Apex's ladder.

// ── PSE: mirror the 480p niche entries as 576p, inserted alongside ──
const pse = c.preferredStreamExpressions;
// Each new 576p entry lands just before its 480p twin; fresh index lookups keep
// the splices valid regardless of insertion order.
for (const marker of ['/* 480p */', '/* 480p Quality */', '/* Limit 480p results */']) {
  const idx = pse.findIndex(p => p.expression.includes(marker));
  if (idx < 0) throw new Error(`Apex PSE marker missing: ${marker}`);
  pse.splice(idx, 0, { enabled: true, expression: pse[idx].expression.replaceAll('480p', '576p') });
}

// ── Sort: cached × quality blend — quality ranks before resolution ──
for (const scope of Object.keys(c.sortCriteria)) {
  const keys = c.sortCriteria[scope];
  const qIdx = keys.findIndex(k => k.key === 'quality');
  const rIdx = keys.findIndex(k => k.key === 'resolution');
  if (qIdx > rIdx && rIdx >= 0) {
    const [q] = keys.splice(qIdx, 1);
    keys.splice(rIdx, 0, q);
  }
}

// ── Pool + dynamic fetch: blended exit across tiers ──
c.maxResults = 20;
c.maxResultsPerResolution = 8;
c.resultLimits = { global: 20, resolution: 8, mode: 'conjunctive' };
c.dynamicAddonFetching = {
  enabled: true,
  condition: "count(cached(resolution(totalStreams,'2160p'))) >= 8 or count(cached(resolution(totalStreams,'1080p'))) >= 12 or totalTimeTaken > 6000",
};

// A single Dynamic early-exit strategy is already enough for this explicit
// advanced template. Never restore the inherited Groups scheduler as well.
c.groups = { enabled: false, groupings: [] };

writeFileSync(
  'Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json',
  JSON.stringify(src, null, 2) + '\n'
);
console.log('Wrote core-nexus-4k-apex-mixed.json —',
  'PSEs:', c.preferredStreamExpressions.length,
  '| required:', JSON.stringify(c.requiredResolutions),
  '| sort global:', c.sortCriteria.global.map(k => k.key).slice(0, 5).join('→'));
