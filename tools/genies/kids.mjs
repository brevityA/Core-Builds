/**
 * English kids overlay + WuPlay home plan.
 *
 * AIOStreams cannot tell who is asking. Kids need their own Stremio or
 * WuPlay profile with a PIN. This module overlays an existing 1080p
 * Stream template. It does not clone 100 KB of JSON. It does not emit
 * certification() — that SEL function is not in AIOStreams.
 *
 * Import-ready. Do not wire into the 7k-line app.js unless asked.
 */

export const RAW = 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main';

export const STREAM_URL = `${RAW}/Templates/Torbox/Single/core-nexus-stream.json`;
export const KIDS_TEMPLATE_URL = `${RAW}/Templates/Torbox/Kids/core-nexus-kids.json`;
export const WUPLAY_KIDS_URL = `${RAW}/tools/genies/packs/wuplay-kids.json`;

export const ADULT_FILENAME_TERMS = Object.freeze([
  'XXX',
  'Porn',
  'NSFW',
  'Hentai',
  'Erotic',
]);

export const PIN_STEPS = Object.freeze([
  'Create a second Stremio or WuPlay profile. Do not share the adult account.',
  'WuPlay: Settings → Age Restrictions → Movies and Shows max Older Kids. Include titles without a rating: off.',
  'Stremio has no parental PIN. The Android TV / Google TV user lock is the PIN.',
  'Install the kids manifest only on the kids profile.',
]);

const ADULT_LABEL = 'Kids Adult Filename Kill';
const CAM_LABEL = 'Hard CAM Kill';

function unique(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (item == null || item === '') continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function quoteList(names) {
  return names.map((n) => `'${String(n).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ');
}

function blobOf(template) {
  const meta = template?.metadata || {};
  return `${meta.name || ''} ${meta.id || ''} ${meta.category || ''}`.toLowerCase();
}

function isApex(template) {
  return blobOf(template).includes('apex');
}

function adultExpression() {
  return `/* CB | Kids Adult Filename Kill */ keyword(negate(merge(library(streams), seadex(streams)), streams), 'filename', ${quoteList(ADULT_FILENAME_TERMS)})`;
}

function camExpression() {
  return "/* CB | Hard CAM Kill */ quality(streams, 'CAM', 'SCR', 'TS', 'TC', 'HC HD-Rip')";
}

function patchExpressionList(list, { label, nextExpr, insertIfMissing = false }) {
  const arr = Array.isArray(list)
    ? list.map((item) => {
        if (typeof item === 'string' && item.includes(label)) {
          return { enabled: true, expression: nextExpr };
        }
        if (!item || typeof item !== 'object') return item;
        const expr = item.expression || '';
        if (expr.includes(label)) {
          return { ...item, enabled: item.enabled !== false, expression: nextExpr };
        }
        return item;
      })
    : [];
  const found = arr.some((item) => {
    if (typeof item === 'string') return item.includes(label);
    return item && typeof item === 'object' && String(item.expression || '').includes(label);
  });
  if (!found && insertIfMissing) {
    arr.push({ enabled: true, expression: nextExpr });
  }
  return arr;
}

export function configuratorPatch() {
  return {
    langs: ['English'],
    subtitleLangs: ['en'],
    ageLimit: 'PG',
    content: 'mixed',
    exclude4K: true,
    langExclusive: false,
    foreignLangKill: true,
  };
}

export function recommendKids({ firstInstall = false } = {}) {
  return {
    needsOwnAccount: true,
    baseTemplate: {
      id: firstInstall ? 'stable1080' : 'stream',
      name: firstInstall ? 'Core Stable 1080p' : 'Core Nexus Stream',
      res: '1080p',
      url: firstInstall
        ? `${RAW}/Templates/Stable/core-stable-torbox-1080p.json`
        : STREAM_URL,
      note: '1080p. Not Apex.',
    },
    kidsTemplateUrl: KIDS_TEMPLATE_URL,
    wuplayPlanUrl: WUPLAY_KIDS_URL,
    ageLimit: 'PG',
    pin: PIN_STEPS,
    note: 'Two accounts. AIOStreams cannot tell which profile is asking. Stream-side certification() is not available — the PIN and the kids profile are the lock.',
  };
}

export function applyKidsToTemplate(template, opts = {}) {
  if (!template || typeof template !== 'object') {
    throw new Error('applyKidsToTemplate needs a template object.');
  }
  if (isApex(template)) {
    throw new Error('Kids overlay refuses Apex. Use Stream (1080p).');
  }
  const out = clone(template);
  if (!out.config || typeof out.config !== 'object') out.config = {};
  const cfg = out.config;

  cfg.requiredLanguages = unique(['English', 'Original', 'Dual Audio', 'Multi', 'Dubbed', 'Unknown']);
  cfg.preferredLanguages = unique(['English', 'Original', 'Dual Audio', 'Multi', 'Dubbed']);
  cfg.excludedLanguages = [];
  cfg.includedLanguages = [];

  cfg.excludedStreamExpressions = patchExpressionList(cfg.excludedStreamExpressions, {
    label: ADULT_LABEL,
    nextExpr: adultExpression(),
    insertIfMissing: true,
  });
  cfg.excludedStreamExpressions = patchExpressionList(cfg.excludedStreamExpressions, {
    label: CAM_LABEL,
    nextExpr: camExpression(),
    insertIfMissing: true,
  });

  const json = JSON.stringify(cfg.excludedStreamExpressions);
  if (json.includes('certification(')) {
    cfg.excludedStreamExpressions = cfg.excludedStreamExpressions.filter((item) => {
      const expr = typeof item === 'string' ? item : item?.expression || '';
      return !expr.includes('certification(');
    });
  }

  const meta = { ...(out.metadata || {}) };
  meta.id = opts.id || 'brevity.core-nexus-kids';
  meta.name = opts.name || 'Core Nexus Kids';
  meta.category = 'Kids';
  meta.description =
    opts.description ||
    'English 1080p kids overlay on Stream. Adult filename kill. Not Apex. Not a PIN. Pair with a second profile and WuPlay Age Restrictions.';
  meta.sourceUrl = opts.sourceUrl || KIDS_TEMPLATE_URL;
  meta.coreBuildsKids = true;
  out.metadata = meta;

  if (typeof cfg.addonName === 'string') cfg.addonName = meta.name;
  if (typeof cfg.addonDescription === 'string') cfg.addonDescription = meta.name;

  return out;
}
