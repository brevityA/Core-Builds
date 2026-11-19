#!/usr/bin/env node
/**
 * AIOStreams feature rundown.
 *
 * Answers, for the AIOStreams release we are pinned to and the newest one:
 *   - every config option AIOStreams accepts, and which of our output profiles
 *     (Stable / Balanced / Advanced / Labs), static templates and the smart
 *     template actually use it;
 *   - why we use it or not (decisions.json, kept by hand), and which options
 *     have no decision yet — every option upstream adds lands there;
 *   - presets and SEL functions added or removed since the pin, and which we use;
 *   - the stream-related changelog entries since the pin.
 *
 * Zero dependencies, Node 20+. Network: raw.githubusercontent.com and
 * `git ls-remote` against github.com (no GitHub API, no token).
 *
 *   node scripts/feature-rundown/rundown.mjs                       # write reports/FEATURE-RUNDOWN.md + .json
 *   node scripts/feature-rundown/rundown.mjs --latest v2.38.1      # skip the tag lookup
 *   node scripts/feature-rundown/rundown.mjs --out /tmp/r.md --json /tmp/r.json
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..', '..');
const AIOS_REPO = 'Viren070/AIOStreams';
const RAW = (ref, path) => `https://raw.githubusercontent.com/${AIOS_REPO}/${ref}/${path}`;
const UA = 'core-builds-feature-rundown/1.0 (+https://github.com/brevityA/Core-Builds)';

export const UPSTREAM_FILES = {
  schemas: 'packages/core/src/db/schemas.ts',
  presetManager: 'packages/core/src/presets/presetManager.ts',
  streamExpression: 'packages/core/src/parser/streamExpression.ts',
};

// Entries about Live TV, watch parties and playback sessions, whatever their scope.
const NON_STREAM_WORDS = /\b(live tv|live catalog|live session|live playback|(?<!audio[ -])channels?\b|programme|guide|catch-up|archive part|watch[- ]state|watch row|party|syncplay|playlist|jellyfin|poster|robots|memory cache|session|app reports?|reports from the apps|avatar|relay|remote command|custom css|offsets?\b|sign-ins|shared record|for reports)/i;

// Changelog scopes that never change which streams a config finds or how it ranks them.
const NON_STREAM_SCOPES = new Set([
  'web', 'jellyfin', 'ui', 'frontend', 'desktop', 'native', 'android', 'tv', 'docker', 'dashboard',
  'watch-state', 'docs', 'db', 'api', 'cache', 'logging', 'deps', 'ci', 'build', 'i18n', 'party',
]);

/* ----------------------------------------------------------------- fetching */

async function fetchText(url, { timeoutMs = 20000 } = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** Newest `vMAJOR.MINOR.PATCH` release tag upstream, via git (no API rate limit). */
export function latestReleaseTag() {
  const out = execFileSync('git', ['ls-remote', '--tags', '--refs', `https://github.com/${AIOS_REPO}.git`], { encoding: 'utf8' });
  const tags = [...out.matchAll(/refs\/tags\/(v\d+\.\d+\.\d+)$/gm)].map(m => m[1]);
  if (!tags.length) throw new Error('no release tags found upstream');
  return tags.sort(compareVersions).at(-1);
}

export function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

async function fetchUpstream(ref) {
  const out = {};
  await Promise.all(Object.entries(UPSTREAM_FILES).map(async ([k, p]) => { out[k] = await fetchText(RAW(ref, p)); }));
  return out;
}

/* ------------------------------------------------------------------ parsing */

/** Slice `const NAME = z…` up to the next top-level statement (prettier puts those at column 0). */
function schemaBlock(src, name) {
  const start = src.search(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*z`));
  if (start < 0) return null;
  const lines = src.slice(start).split('\n');
  const out = [lines[0]];
  for (const l of lines.slice(1)) {
    if (/^(export|const|let|function|type|interface|\/\*\*|\/\/)\b|^\/\*\*/.test(l)) break;
    if (/^\}\)/.test(l)) break;
    out.push(l);
  }
  return out.join('\n');
}

/**
 * Keys of a prettier-formatted z.object block: the property lines at the shallowest
 * indentation inside it, with the JSDoc just above each and the text of its value.
 */
function objectProperties(block) {
  const lines = block.split('\n').slice(1);
  const keyLine = /^(\s+)([A-Za-z_$][\w$]*)\??\s*:/;
  let indent = Infinity;
  for (const l of lines) {
    const m = l.match(keyLine);
    if (m && !l.trim().startsWith('//') && !l.trim().startsWith('*')) indent = Math.min(indent, m[1].length);
  }
  if (!Number.isFinite(indent)) return [];
  const props = [];
  let doc = [];
  let docAtTop = false;
  let inDoc = false;
  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith('/**')) { inDoc = true; doc = []; docAtTop = l.indexOf('/**') === indent; }
    if (inDoc) {
      const text = t.replace(/^\/\*\*\s?|\*\/$|^\*\s?/g, '').trim();
      if (text && docAtTop) doc.push(text);
      if (t.endsWith('*/')) inDoc = false;
      if (props.length && !docAtTop) props.at(-1).value.push(l);
      continue;
    }
    const m = l.match(keyLine);
    if (m && m[1].length === indent) {
      // The value starts on the key's own line (`key: z.array(...)`) and runs to the next key.
      props.push({ key: m[2], doc: doc.join(' '), value: [l.slice(l.indexOf(':') + 1)] });
      doc = [];
      continue;
    }
    if (props.length) props.at(-1).value.push(l);
  }
  return props.map(p => ({ ...p, value: p.value.join('\n') }));
}

/** Nested option keys of an object-typed property, following one `XxxSchema` reference. */
function nestedKeys(src, value) {
  const head = value.split('\n').slice(0, 3).join(' ');
  if (/^\s*z\s*\.object\(/.test(head)) {
    return objectProperties('x\n' + value.split('\n').slice(1).join('\n')).map(p => p.key);
  }
  const ref = head.match(/^\s*([A-Z][A-Za-z0-9]*)\b/);
  if (ref) {
    const block = schemaBlock(src, ref[1]);
    if (block && /=\s*z\s*\.object\(/.test(block.slice(0, 200).replace(/\s+/g, ' '))) return objectProperties(block).map(p => p.key);
  }
  return [];
}

/** A property whose value is a named schema (`Formatter`, `SizeFilterOptions.optional()`): its kind. */
function refKind(src, value) {
  const ref = value.trim().match(/^([A-Z][A-Za-z0-9]*)\b/);
  if (!ref) return null;
  const block = schemaBlock(src, ref[1]);
  if (!block) return 'ref';
  const first = (block.replace(/\s+/g, ' ').match(/=\s*z\s*\.\s*(\w+)\(/) || [])[1];
  return first || 'ref';
}

export function parseSchema(src) {
  const block = schemaBlock(src, 'UserDataSchema');
  if (!block) throw new Error('UserDataSchema not found in schemas.ts');
  const props = objectProperties(block);
  const options = {};
  for (const p of props) {
    // The first call after `z` (or a named schema) decides the kind: `z.array(z.object(…))` is an array.
    const v = p.value.replace(/\s+/g, ' ').trim();
    const first = (v.match(/^z\s*\.\s*(\w+)\(/) || [])[1] || refKind(src, v);
    const kind = first === 'object' ? 'object'
      : first === 'array' ? 'array'
        : first === 'boolean' ? 'boolean'
          : first === 'enum' || first === 'nativeEnum' ? 'enum'
            : first === 'number' ? 'number'
              : first === 'string' ? 'string'
                : first === 'tuple' ? 'tuple'
                  : first === 'record' ? 'record'
                    : first || 'other';
    options[p.key] = { kind, doc: p.doc, keys: kind === 'object' ? nestedKeys(src, p.value) : [] };
  }
  return options;
}

export function parsePresets(src) {
  const m = src.match(/(?:export\s+)?(?:let|const)\s+PRESET_LIST\s*(?::[^=]+)?=\s*\[([\s\S]*?)\]/);
  return m ? [...new Set([...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]))].sort() : [];
}

export function parseSel(src) {
  return [...new Set([...src.matchAll(/this\.parser\.functions\.([A-Za-z_]\w*)\s*=/g)].map(m => m[1]))].sort();
}

/** Changelog sections newer than `pin`, keeping only entries that can affect streams. */
export function changelogSince(md, pin) {
  const sections = [];
  const re = /^## \[?(\d+\.\d+\.\d+)\]?[^\n]*\((\d{4}-\d{2}-\d{2})\)/gm;
  const heads = [...md.matchAll(re)];
  heads.forEach((h, i) => {
    if (compareVersions(h[1], pin) <= 0) return;
    const body = md.slice(h.index, heads[i + 1]?.index ?? md.length);
    const entries = [];
    let kind = '';
    for (const line of body.split('\n')) {
      const k = line.match(/^### (.+)/);
      if (k) { kind = k[1].trim(); continue; }
      const e = line.match(/^\* (?:\*\*([^*]+):\*\* )?(.+)/);
      if (!e) continue;
      const scope = (e[1] || '').trim();
      const root = scope.split(/[/,]/)[0].trim();
      if (NON_STREAM_SCOPES.has(root) || NON_STREAM_WORDS.test(e[2])) continue;
      const text = e[2].replace(/\s*\(\[[0-9a-f]{7,}\]\([^)]*\)\)/g, '').replace(/\s*\(\[#\d+\]\([^)]*\)\)/g, '').replace(/,\s*closes.*$/, '').trim();
      entries.push({ kind, scope, text });
    }
    sections.push({ version: h[1], date: h[2], entries });
  });
  return sections;
}

/* -------------------------------------------------------------- our usage */

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
const cfgOf = j => (j && typeof j === 'object' && j.config && typeof j.config === 'object') ? j.config : j;

/** True when a config value switches its feature on: enabled objects, non-empty lists, set scalars. */
export function isActive(v) {
  if (v === null || v === undefined || v === false || v === '' ) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') {
    if ('enabled' in v) return v.enabled === true;
    return Object.values(v).some(isActive);
  }
  return true;
}

function walkJson(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJson(p, out);
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

/** Strings of every stream expression in a config, so SEL function use can be counted. */
function expressionTexts(cfg) {
  const out = [];
  const take = v => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(take);
    else if (v && typeof v === 'object') take(v.expression ?? v.condition ?? v.selector ?? Object.values(v));
  };
  for (const k of Object.keys(cfg || {})) if (/StreamExpressions$|Selector$|Condition$/.test(k)) take(cfg[k]);
  for (const g of cfg?.groups?.groupings || []) take(g.condition);
  take(cfg?.dynamicAddonFetching?.condition);
  take(cfg?.preloadStreams?.selector);
  return out;
}

function presetTypes(cfg) {
  const types = new Set();
  const visit = x => {
    if (Array.isArray(x)) x.forEach(visit);
    else if (x && typeof x === 'object') {
      if (typeof x.type === 'string' && 'instanceId' in x && x.enabled !== false) types.add(x.type);
      Object.values(x).forEach(visit);
    }
  };
  visit(cfg?.presets);
  return types;
}

const SKIP_TEMPLATE_DIRS = /[\\/](Personal|Deprecated|Legacy)[\\/]/;

export function collectUsage(root = REPO_ROOT) {
  const goldenDir = join(root, 'configurator', 'e2e', 'golden');
  const goldens = walkJson(goldenDir).map(p => {
    const j = readJson(p);
    return { name: relative(goldenDir, p).replace(/\.json$/, ''), profile: j?.metadata?.coreBuildsProfile || 'unknown', cfg: cfgOf(j) };
  });
  const templates = walkJson(join(root, 'Templates'))
    .filter(p => !SKIP_TEMPLATE_DIRS.test(p) && !/[\\/]Smart[\\/]/.test(p))
    .map(p => { try { return { name: relative(root, p), cfg: cfgOf(readJson(p)) }; } catch { return null; } })
    .filter(t => t && t.cfg && Array.isArray(t.cfg.presets));
  const smartPath = join(root, 'Templates', 'Smart', 'core-builds.json');
  const smart = existsSync(smartPath) ? cfgOf(readJson(smartPath)) : null;
  return { goldens, templates, smart };
}

/* --------------------------------------------------------------- decisions */

export function loadDecisions(path = join(HERE, 'decisions.json')) {
  const d = readJson(path);
  // Shared reasons name their keys: nothing is decided by a pattern, so a new
  // upstream option always arrives as "no decision".
  const grouped = new Map();
  for (const g of d.groups || []) for (const k of g.keys || []) grouped.set(k, { status: g.status, why: g.why });
  return {
    raw: d,
    lookup(key) {
      if (d.options?.[key]) return { ...d.options[key], source: 'option' };
      if (grouped.has(key)) return { ...grouped.get(key), source: 'group' };
      return null;
    },
  };
}

export const STATUSES = ['used', 'candidate', 'off-by-design', 'not-applicable'];

/* ------------------------------------------------------------------ report */

export function buildRundown({ pin, latest, pinSrc, latestSrc, changelog, usage, decisions }) {
  const pinOpts = parseSchema(pinSrc.schemas);
  const latestOpts = latestSrc ? parseSchema(latestSrc.schemas) : pinOpts;
  const profiles = [...new Set(usage.goldens.map(g => g.profile))].sort((a, b) => ['stable', 'balanced', 'advanced', 'labs'].indexOf(a) - ['stable', 'balanced', 'advanced', 'labs'].indexOf(b));

  const options = Object.keys({ ...pinOpts, ...latestOpts }).map(key => {
    const inPin = key in pinOpts;
    const inLatest = key in latestOpts;
    const byProfile = {};
    for (const p of profiles) {
      const gs = usage.goldens.filter(g => g.profile === p);
      byProfile[p] = { active: gs.filter(g => isActive(g.cfg?.[key])).length, total: gs.length };
    }
    const templates = usage.templates.filter(t => isActive(t.cfg?.[key])).length;
    const smart = usage.smart ? (key in usage.smart) : false;
    // Present in the smart template is what the Smart column shows; switched on there counts as use.
    const smartActive = usage.smart ? isActive(usage.smart[key]) : false;
    const usedAnywhere = Object.values(byProfile).some(x => x.active > 0) || templates > 0 || smartActive;
    const decision = decisions.lookup(key);
    const meta = latestOpts[key] || pinOpts[key];
    const flags = [];
    if (!decision) flags.push('no decision');
    else if (!STATUSES.includes(decision.status)) flags.push(`unknown status "${decision.status}"`);
    else if (decision.status === 'used' && !usedAnywhere && !smart) flags.push('decision says used, but no generated config or template sets it');
    else if (['off-by-design', 'not-applicable'].includes(decision.status) && usedAnywhere) flags.push(`decision says ${decision.status}, but configs set it`);
    if (!inPin && inLatest) flags.push(`new upstream after ${pin}`);
    if (inPin && !inLatest) flags.push(`removed upstream by ${latest}`);
    return { key, kind: meta.kind, doc: meta.doc, keys: meta.keys, inPin, inLatest, byProfile, templates, smart, decision, flags };
  });

  const pinPresets = parsePresets(pinSrc.presetManager);
  const latestPresets = latestSrc ? parsePresets(latestSrc.presetManager) : pinPresets;
  const ourPresets = new Map();
  const note = (type, where) => { if (!ourPresets.has(type)) ourPresets.set(type, new Set()); ourPresets.get(type).add(where); };
  for (const g of usage.goldens) for (const t of presetTypes(g.cfg)) note(t, g.profile);
  for (const t of usage.templates) for (const ty of presetTypes(t.cfg)) note(ty, 'templates');
  if (usage.smart) for (const t of presetTypes(usage.smart)) note(t, 'smart');

  const pinSel = parseSel(pinSrc.streamExpression);
  const latestSel = latestSrc ? parseSel(latestSrc.streamExpression) : pinSel;
  const exprs = [
    ...usage.goldens.flatMap(g => expressionTexts(g.cfg)),
    ...usage.templates.flatMap(t => expressionTexts(t.cfg)),
  ].join('\n');
  const selUse = Object.fromEntries([...new Set([...pinSel, ...latestSel])].map(fn => [fn, (exprs.match(new RegExp(`\\b${fn}\\s*\\(`, 'g')) || []).length]));

  const diff = (a, b) => ({ added: b.filter(x => !a.includes(x)), removed: a.filter(x => !b.includes(x)) });
  const attention = options.filter(o => o.flags.some(f => f === 'no decision' || f.startsWith('decision says') || f.startsWith('unknown status') || f.startsWith('removed upstream')));
  return {
    pin, latest, behind: compareVersions(latest, pin) > 0,
    releasesSincePin: changelog.map(s => s.version),
    profiles, goldens: usage.goldens.length, templates: usage.templates.length, smart: !!usage.smart,
    options, attention: attention.map(o => o.key),
    presets: { ...diff(pinPresets, latestPresets), upstream: latestPresets, ours: Object.fromEntries([...ourPresets].map(([k, v]) => [k, [...v].sort()])) },
    sel: { ...diff(pinSel, latestSel), use: selUse },
    changelog,
  };
}

const tick = ({ active, total }) => (total ? (active === total ? '✓' : active ? `${active}/${total}` : '·') : '–');
// Backslashes first, so a `\|` in upstream text cannot end a table cell early.
const cell = s => String(s || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

export function renderMarkdown(r, { generatedAt = new Date().toISOString().slice(0, 10) } = {}) {
  const L = [];
  const byStatus = s => r.options.filter(o => (o.decision?.status || 'undecided') === s);
  const usedDefault = r.options.filter(o => (o.byProfile.stable?.active || 0) > 0).length;
  L.push('# AIOStreams feature rundown', '');
  L.push(`Generated ${generatedAt} by \`node scripts/feature-rundown/rundown.mjs\`. Pinned to **${r.pin}**; newest upstream release **${r.latest}**${r.behind ? ` (${r.releasesSincePin.length} release${r.releasesSincePin.length === 1 ? '' : 's'} ahead of the pin)` : ' (the pin is current)'}.`, '');
  L.push(`Usage comes from ${r.goldens} golden configs (profiles: ${r.profiles.join(', ')}), ${r.templates} static templates and ${r.smart ? 'the smart template' : 'no smart template'}. A golden counts as using an option when the option switches something on (an \`enabled: true\` object, a non-empty list or a set value). Reasons come from \`scripts/feature-rundown/decisions.json\`.`, '');
  L.push('## Summary', '');
  L.push(`| | Count |`, `|---|---|`);
  L.push(`| Config options AIOStreams accepts (${r.latest}) | ${r.options.filter(o => o.inLatest).length} |`);
  L.push(`| Used by at least one generated profile or template | ${r.options.filter(o => Object.values(o.byProfile).some(x => x.active) || o.templates).length} |`);
  L.push(`| Used by the default profile (Core Stable) | ${usedDefault} |`);
  for (const s of STATUSES) L.push(`| Decision: ${s} | ${byStatus(s).length} |`);
  L.push(`| **Needs attention** | **${r.attention.length}** |`, '');

  L.push('## Needs attention', '');
  const att = r.options.filter(o => r.attention.includes(o.key));
  if (!att.length) L.push('Nothing: every option has a decision that matches what the configs do.', '');
  else {
    L.push('Add or correct an entry in `decisions.json` for each of these.', '', '| Option | Why it is listed | What AIOStreams says |', '|---|---|---|');
    for (const o of att) L.push(`| \`${o.key}\` | ${cell(o.flags.join('; '))} | ${cell(o.doc).slice(0, 220) || '–'} |`);
    L.push('');
  }

  L.push(`## New upstream since ${r.pin}`, '');
  const newOpts = r.options.filter(o => !o.inPin && o.inLatest).map(o => `\`${o.key}\``);
  const goneOpts = r.options.filter(o => o.inPin && !o.inLatest).map(o => `\`${o.key}\``);
  L.push(`- **Config options added:** ${newOpts.join(', ') || 'none'}`);
  L.push(`- **Config options removed:** ${goneOpts.join(', ') || 'none'}`);
  L.push(`- **Presets added:** ${r.presets.added.map(x => `\`${x}\``).join(', ') || 'none'}`);
  L.push(`- **Presets removed:** ${r.presets.removed.map(x => `\`${x}\``).join(', ') || 'none'}`);
  L.push(`- **SEL functions added:** ${r.sel.added.map(x => `\`${x}()\``).join(', ') || 'none'}`);
  L.push(`- **SEL functions removed:** ${r.sel.removed.map(x => `\`${x}()\``).join(', ') || 'none'}`, '');
  if (r.changelog.length) {
    L.push('### Stream-related changelog entries', '', 'Web player, Jellyfin, UI, desktop, Android, TV and watch-state entries are left out.', '');
    for (const s of r.changelog) {
      L.push(`**${s.version}** (${s.date})`, '');
      if (!s.entries.length) L.push('- nothing stream-related', '');
      else { for (const e of s.entries) L.push(`- ${e.kind ? `_${e.kind}_ · ` : ''}${e.scope ? `**${e.scope}:** ` : ''}${e.text}`); L.push(''); }
    }
  }

  const head = ['Option', ...r.profiles.map(p => p[0].toUpperCase() + p.slice(1)), 'Templates', 'Smart', 'Why'];
  for (const s of [...STATUSES, 'undecided']) {
    const rows = byStatus(s);
    if (!rows.length) continue;
    L.push(`## ${{ used: 'Used', candidate: 'Candidates — worth evaluating', 'off-by-design': 'Off by design', 'not-applicable': 'Not a template concern', undecided: 'No decision yet' }[s]} (${rows.length})`, '');
    L.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`);
    for (const o of rows) {
      const nested = o.keys?.length ? ` <sub>${o.keys.slice(0, 8).join(', ')}${o.keys.length > 8 ? ', …' : ''}</sub>` : '';
      L.push(`| \`${o.key}\`${nested} | ${r.profiles.map(p => tick(o.byProfile[p])).join(' | ')} | ${o.templates || '·'} | ${o.smart ? '✓' : '·'} | ${cell(o.decision?.why || o.doc || '').slice(0, 260)} |`);
    }
    L.push('');
  }
  L.push('Profile columns: ✓ every golden of that profile sets it, n/m some do, · none do.', '');

  L.push('## Presets', '');
  const ours = r.presets.ours;
  const unusedUp = r.presets.upstream.filter(p => !ours[p]);
  L.push('| Preset | Where we emit it |', '|---|---|');
  for (const [p, where] of Object.entries(ours).sort()) L.push(`| \`${p}\`${r.presets.upstream.includes(p) ? '' : ' ⚠ not in upstream list'} | ${where.join(', ')} |`);
  L.push('', `**Upstream presets we never emit (${unusedUp.length}):** ${unusedUp.map(x => `\`${x}\``).join(', ')}`, '');

  L.push('## SEL functions', '');
  const used = Object.entries(r.sel.use).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const unused = Object.entries(r.sel.use).filter(([, n]) => n === 0).map(([f]) => `\`${f}()\``);
  L.push(`**Used** (calls across goldens and templates): ${used.map(([f, n]) => `\`${f}()\` ${n}`).join(' · ') || 'none'}`, '');
  L.push(`**Never used:** ${unused.join(', ') || 'none'}`, '');
  return L.join('\n');
}

/* --------------------------------------------------------------------- CLI */

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const pinFile = readJson(join(REPO_ROOT, 'configurator', 'UPSTREAM.pin'));
  const pin = pinFile.version;
  const latestTag = arg('--latest') || latestReleaseTag();
  const latest = latestTag.replace(/^v/, '');
  const [pinSrc, latestSrc, changelogMd] = await Promise.all([
    fetchUpstream(pinFile.sha),
    compareVersions(latest, pin) > 0 ? fetchUpstream(latestTag.startsWith('v') ? latestTag : `v${latestTag}`) : null,
    fetchText(RAW(latestTag.startsWith('v') ? latestTag : `v${latestTag}`, 'CHANGELOG.md')).catch(() => ''),
  ]);
  const rundown = buildRundown({
    pin, latest, pinSrc, latestSrc,
    changelog: changelogSince(changelogMd, pin),
    usage: collectUsage(),
    decisions: loadDecisions(),
  });
  const out = resolve(arg('--out', join(REPO_ROOT, 'reports', 'FEATURE-RUNDOWN.md')));
  const json = resolve(arg('--json', join(REPO_ROOT, 'reports', 'feature-rundown.json')));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderMarkdown(rundown) + '\n');
  writeFileSync(json, JSON.stringify({ ...rundown, options: rundown.options.map(({ doc, ...o }) => o) }, null, 2) + '\n');
  console.log(`feature rundown: pin ${pin}, latest ${latest}, ${rundown.options.length} options, ${rundown.attention.length} need attention`);
  console.log(`wrote ${relative(process.cwd(), out)} and ${relative(process.cwd(), json)}`);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `attention=${rundown.attention.length}\nbehind=${rundown.behind}\nlatest=${latest}\npin=${pin}\n`, { flag: 'a' });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err.stack || err.message); process.exit(1); });
}
