// One-off generator: Templates/Torbox/Single/core-nexus-mixed.json
// Derives from core-nexus-stream.json, applies the Mixed · Adaptive resolution policy,
// and pulls the 4K regex tiers straight from configurator/src/js/app.js so the static
// template stays byte-consistent with configurator output.
import { readFileSync, writeFileSync } from 'node:fs';

const app = readFileSync('configurator/src/js/app.js', 'utf8');
const dataLines = app.split('\n').slice(22, 26).join('\n'); // PREFERRED_REGEX_4K … RANKED_REGEX_UHD
const { PREFERRED_REGEX_4K, RANKED_REGEX_COMMON, RANKED_REGEX_UHD } =
  new Function(`${dataLines}; return { PREFERRED_REGEX_4K, RANKED_REGEX_COMMON, RANKED_REGEX_UHD };`)();

const tpl = JSON.parse(readFileSync('Templates/Torbox/Single/core-nexus-stream.json', 'utf8'));
const c = tpl.config;

// ── Metadata ────────────────────────────────────────────────
tpl.metadata = {
  ...tpl.metadata,
  id: 'brevity.core-nexus-mixed',
  name: 'Core Nexus Mixed',
  description:
    'Adaptive multi-resolution build for niche and mixed libraries. No hard resolution caps — 4K, 1440p, 1080p, 720p and SD tiers all stay eligible and are ranked by a cached × quality blend (availability first, encode quality second, resolution third). 4K BluRay REMUX and HDR WEB-DL tiers sit above the 1080p ladder, with 576p/480p niche fallbacks for classic and rare content that never surfaces in capped templates. Full ranked regex scoring (Common + UHD tiers), local ESE/PSE rules, and a blended dynamic-fetch exit. Pairs with any device profile.',
  version: '1.0.0',
  category: 'Mixed',
  sourceUrl: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-mixed.json',
};

// ── Resolution policy: no caps, broad ladder ───────────────
c.requiredResolutions = [];
c.preferredResolutions = ['2160p', '1080p', '1440p', '720p', '576p', '480p', 'Unknown'];
// excludedResolutions stays ['144p','240p','360p']

// ── PSE stack: 4K tiers above the 1080p ladder + SD niche fallback ──
const pse = c.preferredStreamExpressions;
const firstTierIdx = pse.findIndex(p => p.expression.includes('S-Tier 1080p'));
const fallbackIdx = pse.findIndex(p => p.expression.includes('720p Fallback | Any'));
if (firstTierIdx < 0 || fallbackIdx < 0) throw new Error('Stream PSE structure changed — aborting');
const fourKTiers = [
  { enabled: true, expression: "/* S-Tier 4K | BluRay REMUX */ resolution(quality(streams, 'BluRay REMUX'), '2160p')" },
  { enabled: true, expression: "/* A-Tier 4K | WEB-DL HDR */ visualTag(resolution(quality(streams, 'WEB-DL'), '2160p'), 'DV', 'HDR+DV', 'HDR10+', 'HDR10', 'HDR')" },
  { enabled: true, expression: "/* B-Tier 4K | WEB-DL */ resolution(quality(streams, 'WEB-DL'), '2160p')" },
  { enabled: true, expression: "/* C-Tier 4K | Any 2160p */ resolution(streams, '2160p')" },
];
const sdNiche = [
  { enabled: true, expression: "/* SD Niche Fallback | 576p/480p */ resolution(streams, '576p', '480p')" },
];
pse.splice(firstTierIdx, 0, ...fourKTiers);
const fallbackIdx2 = pse.findIndex(p => p.expression.includes('720p Fallback | Any'));
pse.splice(fallbackIdx2 + 1, 0, ...sdNiche);

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

// ── Regex tiers: 4K-class preferred + UHD ranked additions ──
c.preferredRegexPatterns = PREFERRED_REGEX_4K;
const rankedNames = new Set(c.rankedRegexPatterns.map(p => p.name));
for (const p of RANKED_REGEX_UHD) {
  if (!rankedNames.has(p.name)) c.rankedRegexPatterns.push({ ...p });
}
void RANKED_REGEX_COMMON; // referenced for provenance; stream's inline set already mirrors COMMON

// ── Limits: match configurator mixed output (normal pool) ──
c.resultLimits = { global: 35, resolution: 15, mode: 'conjunctive' };

// ── Dynamic addon fetching: blended exit across tiers ──
c.dynamicAddonFetching = {
  enabled: true,
  condition: 'count(cached(resolution(totalStreams, "1080p"))) >= 12 or count(cached(resolution(totalStreams, "2160p"))) >= 6 or totalTimeTaken > 6000',
};

// A single Dynamic early-exit strategy is already enough for this explicit
// advanced template. Never restore the inherited Groups scheduler as well.
c.groups = { enabled: false, groupings: [] };

writeFileSync('Templates/Torbox/Single/core-nexus-mixed.json', JSON.stringify(tpl, null, 2) + '\n');
console.log('Wrote core-nexus-mixed.json —',
  'PSEs:', c.preferredStreamExpressions.length,
  '| ranked:', c.rankedRegexPatterns.length,
  '| preferred:', c.preferredRegexPatterns.length);
