/**
 * AIOStreams contract extractor.
 *
 * Two sources, one shape:
 *   - GitHub source  (schema, SEL, formatters, preset IDs, services, required options)
 *   - Live host      (/api/v1/status — version, presets+OPTIONS, services, limits)
 *
 * The fingerprint is what CI diffs. The rest is what the generator consumes.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_PATH = resolve(ROOT, 'snapshots/contract.source.json');

export const AIOS_REPO = 'Viren070/AIOStreams';
export const AIOS_REF = process.env.AIOS_REF || 'main';
export const RAW_BASE = `https://raw.githubusercontent.com/${AIOS_REPO}/${AIOS_REF}/`;
export const DEFAULT_HOST = process.env.AIOS_HOST || 'https://aiostreams.elfhosted.com';

const UA = 'aios-regen/0.1 (+https://github.com/brevityA/Core-Builds)';

export const SOURCE_FILES = {
  presetManager: 'packages/core/src/presets/presetManager.ts',
  constants: 'packages/core/src/utils/constants.ts',
  schemas: 'packages/core/src/db/schemas.ts',
  streamExpression: 'packages/core/src/parser/streamExpression.ts',
  formatterBase: 'packages/core/src/formatters/base.ts',
  modifiers: 'packages/core/src/formatters/engine/modifiers.ts',
  comparators: 'packages/core/src/formatters/engine/comparators.ts',
};

const SKIP_OPTION_IDS = new Set(['name', 'timeout', 'socials', 'resources', 'url']);

export async function fetchText(url, { timeoutMs = 20000, extraHeaders } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'error',
      headers: { 'user-agent': UA, accept: '*/*', ...extraHeaders },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, opts) {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Not JSON: ${url}`);
  }
}

function sha(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function quotedStrings(src, re) {
  const out = [];
  const m = src.match(re);
  if (!m) return out;
  const body = m[1] || m[0];
  for (const s of body.matchAll(/['"]([^'"]+)['"]/g)) out.push(s[1]);
  return unique(out);
}

/** Pull a top-level `let/const NAME = [ ... ]` string-literal list. */
function stringArrayDecl(src, name) {
  const re = new RegExp(
    `(?:export\\s+)?(?:let|const)\\s+${name}\\s*(?::[^=]+)?=\\s*\\[([\\s\\S]*?)\\]`,
  );
  return quotedStrings(src, re);
}

function constStringMap(src, suffix = '_SERVICE') {
  const map = {};
  const re = new RegExp(
    `(?:export\\s+)?const\\s+([A-Z0-9_]+${suffix})\\s*=\\s*['"]([^'"]+)['"]`,
    'g',
  );
  for (const m of src.matchAll(re)) map[m[1]] = m[2];
  return map;
}

function objectKeysFromZod(src, declName) {
  const idx = src.search(new RegExp(`export const ${declName}\\s*=\\s*z\\.object\\(`));
  if (idx < 0) return [];
  const slice = src.slice(idx);
  const keys = [];
  let depth = 0;
  let started = false;
  for (const line of slice.split('\n')) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (line.includes('z.object({')) {
      depth += opens - closes;
      started = true;
      continue;
    }
    if (!started) continue;
    depth += opens - closes;
    const m = line.match(/^\s{2}([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (m && depth === 1) keys.push(m[1]);
    if (started && depth <= 0) break;
  }
  return keys;
}

function nestedShape(src, key) {
  const re = new RegExp(`\\b${key}\\s*:\\s*z\\s*\\n?\\s*\\.(\\w+)`, 'm');
  const m = src.match(re);
  if (!m) {
    const inline = src.match(new RegExp(`\\b${key}\\s*:\\s*z\\.(\\w+)`));
    return inline ? inline[1] : null;
  }
  return m[1];
}

function lastZodKind(src, key) {
  let kind = 'unknown';
  const re = new RegExp(`(?:^|\\n)\\s*${key}\\s*:\\s*z[\\s\\S]{0,240}`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const window = m[0]
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    if (/\.object\(/.test(window)) kind = 'object';
    else if (/\.array\(/.test(window)) kind = 'array';
    else if (/\.boolean\(/.test(window)) kind = 'boolean';
    else if (/\.enum\(/.test(window)) kind = 'enum';
    else if (/\.string\(/.test(window)) kind = 'string';
  }
  return kind;
}

function extractHotspots(schemas) {
  return {
    'deduplicator.merge': lastZodKind(schemas, 'merge'),
    groups: lastZodKind(schemas, 'groups'),
    dynamicAddonFetching: lastZodKind(schemas, 'dynamicAddonFetching'),
    sortCriteria: lastZodKind(schemas, 'sortCriteria'),
  };
}

function extractSel(src) {
  const functions = unique(
    [...src.matchAll(/this\.parser\.functions\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g)].map((m) => m[1]),
  ).sort();
  const constants = unique(
    [...src.matchAll(/this\.parser\.consts\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]),
  ).sort();
  return { functions, constants };
}

function extractFormatterFields(src) {
  const block = src.match(/stream\?\s*:\s*\{([\s\S]*?)\n\s{2}\};/);
  const fields = [];
  if (block) {
    for (const m of block[1].matchAll(/^\s{4}([A-Za-z_][A-Za-z0-9_]*)\s*[?:]/gm)) {
      fields.push(m[1]);
    }
  }
  return unique(fields);
}

function extractModifiers(src) {
  const tables = ['stringModifiers', 'numberModifiers', 'arrayModifiers', 'booleanModifiers'];
  const names = [];
  for (const table of tables) {
    const idx = src.indexOf(`const ${table}`);
    if (idx < 0) continue;
    const slice = src.slice(idx, idx + 4000);
    for (const m of slice.matchAll(/^\s{2}([a-z][a-z0-9]*)\s*[:(]/gm)) names.push(m[1]);
  }
  return unique(names).sort();
}

function extractComparators(src) {
  return unique([...src.matchAll(/^\s{4}([a-z]+)\s*:/gm)].map((m) => m[1])).sort();
}

/**
 * Walk OPTIONS: [ ... ] in a preset file and pull {id, type, required, default}.
 */
function parseOptionArray(body) {
  const options = [];
  let objDepth = 0;
  let buf = '';
  for (const ch of body) {
    if (ch === '{') {
      if (objDepth === 0) buf = '';
      objDepth++;
    }
    if (objDepth > 0) buf += ch;
    if (ch === '}') {
      objDepth--;
      if (objDepth === 0) {
        const id = (buf.match(/\bid\s*:\s*['"]([^'"]+)['"]/) || [])[1];
        const type = (buf.match(/\btype\s*:\s*['"]([^'"]+)['"]/) || [])[1] || null;
        const req = buf.match(/\brequired\s*:\s*(true|false)/);
        const defM = buf.match(/\bdefault\s*:\s*([^,\n]+)/);
        if (id) {
          let def = defM ? defM[1].trim() : undefined;
          if (def === 'undefined' || def === '') def = undefined;
          else if (def === 'true') def = true;
          else if (def === 'false') def = false;
          else if (def === 'null') def = null;
          else if (/^-?\d+(\.\d+)?$/.test(def || '')) def = Number(def);
          else if ((def || '').startsWith("'") || (def || '').startsWith('"')) {
            def = def.replace(/^['"]|['"]$/g, '');
          } else if ((def || '').startsWith('[')) {
            try {
              def = JSON.parse(def.replace(/'/g, '"'));
            } catch {
              /* keep raw */
            }
          }
          options.push({
            id,
            type,
            required: req ? req[1] === 'true' : false,
            default: def,
          });
        }
      }
    }
  }
  return options;
}

function sliceBalancedArray(src, from) {
  let i = src.indexOf('[', from);
  if (i < 0) return '';
  let depth = 0;
  let end = i;
  for (; end < src.length; end++) {
    if (src[end] === '[') depth++;
    else if (src[end] === ']') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  return src.slice(i, end);
}

export function extractPresetOptions(src) {
  const idx = src.search(/OPTIONS\s*:/);
  if (idx < 0) return parseOptionArray(src);
  const after = src.slice(idx, idx + 80);
  if (!after.includes('[')) {
    const ident = (after.match(/OPTIONS\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/) || [])[1];
    if (ident && ident !== 'OPTIONS') {
      const decl = src.search(new RegExp(`(?:const|let|var)\\s+${ident}\\s*=\\s*\\[`));
      if (decl >= 0) return parseOptionArray(sliceBalancedArray(src, decl));
    }
    return parseOptionArray(src);
  }
  return parseOptionArray(sliceBalancedArray(src, idx));
}

function presetIdFromMetadata(src) {
  const m = src.match(/ID\s*:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

async function listPresetFiles() {
  const url = `https://api.github.com/repos/${AIOS_REPO}/contents/packages/core/src/presets?ref=${AIOS_REF}`;
  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const listing = await fetchJson(url, { extraHeaders: headers });
  return listing
    .filter((f) => f.type === 'file' && f.name.endsWith('.ts') && !f.name.endsWith('.test.ts'))
    .filter((f) => !['index.ts', 'preset.ts', 'presetManager.ts'].includes(f.name))
    .map((f) => f.path);
}

export async function extractSource({ includePresetOptions = true } = {}) {
  const files = {};
  const shas = {};
  await Promise.all(
    Object.entries(SOURCE_FILES).map(async ([key, path]) => {
      const text = await fetchText(RAW_BASE + path);
      files[key] = text;
      shas[path] = sha(text).slice(0, 16);
    }),
  );

  const presetIds = stringArrayDecl(files.presetManager, 'PRESET_LIST');
  const serviceConsts = constStringMap(files.constants, '_SERVICE');
  const serviceIds = unique([
    ...stringArrayDecl(files.constants, 'SERVICES'),
    ...Object.values(serviceConsts),
  ]).sort();

  const schemaKeys = objectKeysFromZod(files.schemas, 'UserDataSchema');
  const hotspots = extractHotspots(files.schemas);
  const sel = extractSel(files.streamExpression);
  const formatterFields = extractFormatterFields(files.formatterBase);
  const modifiers = extractModifiers(files.modifiers);
  const comparators = extractComparators(files.comparators);

  const formatters = unique([
    ...quotedStrings(files.constants, /FORMATTERS\s*=\s*\[([\s\S]*?)\]/),
  ]);

  const sortCriteria = unique([
    ...quotedStrings(files.constants, /SORT_CRITERIA\s*=\s*\[([\s\S]*?)\]/),
  ]);

  const presets = [];
  if (includePresetOptions) {
    const paths = await listPresetFiles();
    const batches = [];
    for (let i = 0; i < paths.length; i += 12) batches.push(paths.slice(i, i + 12));
    for (const batch of batches) {
      const texts = await Promise.all(
        batch.map(async (p) => {
          try {
            return { path: p, text: await fetchText(RAW_BASE + p) };
          } catch (err) {
            return { path: p, error: err.message };
          }
        }),
      );
      for (const item of texts) {
        if (!item.text) continue;
        const id = presetIdFromMetadata(item.text);
        if (!id) continue;
        const options = extractPresetOptions(item.text);
        presets.push({
          id,
          file: item.path.split('/').pop(),
          options,
          requiredOptions: options
            .filter((o) => o.required && !SKIP_OPTION_IDS.has(o.id))
            .map((o) => ({ id: o.id, type: o.type, default: o.default })),
        });
      }
    }
  }

  const commit = await fetchSourceHead().catch(() => null);

  const contract = {
    kind: 'source',
    extractedAt: new Date().toISOString(),
    repo: AIOS_REPO,
    ref: AIOS_REF,
    commit,
    fileShas: shas,
    presetIds,
    presets,
    serviceIds,
    schemaKeys,
    hotspots,
    sel,
    formatterFields,
    formatterModifiers: modifiers,
    formatterComparators: comparators,
    formatters,
    sortCriteria,
    templateDirectives: ['__if', '{{inputs.}}', 'metadata.inputs'],
  };
  contract.fingerprint = fingerprint(contract);
  return contract;
}

async function fetchSourceHead() {
  const url = `https://api.github.com/repos/${AIOS_REPO}/commits/${AIOS_REF}`;
  const json = await fetchJson(url);
  return {
    sha: json.sha,
    date: json.commit?.committer?.date || json.commit?.author?.date,
    message: (json.commit?.message || '').split('\n')[0],
    url: json.html_url,
  };
}

function normalizeHostPreset(p) {
  const options = (p.OPTIONS || []).map((o) => ({
    id: o.id,
    type: o.type || null,
    required: !!o.required,
    default: o.default,
  }));
  return {
    id: p.ID,
    name: p.NAME,
    category: p.CATEGORY || null,
    services: p.SUPPORTED_SERVICES || [],
    streamTypes: p.SUPPORTED_STREAM_TYPES || [],
    resources: p.SUPPORTED_RESOURCES || [],
    disabled: Boolean(p.DISABLED),
    disabledReason: p.DISABLED?.reason || null,
    options,
    requiredOptions: options
      .filter((o) => o.required && !SKIP_OPTION_IDS.has(o.id))
      .map((o) => ({ id: o.id, type: o.type, default: o.default })),
  };
}

export function assertPublicHttps(raw) {
  const u = new URL(raw);
  if (u.protocol !== 'https:') throw new Error('Host URL must be https');
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    /^\[?fe80:/i.test(host) ||
    /^\[?::ffff:/i.test(host)
  ) {
    throw new Error('Refusing to call a private host');
  }
  return u;
}

export async function extractHost(hostUrl = DEFAULT_HOST) {
  const u = assertPublicHttps(hostUrl);
  const origin = u.origin;
  u.pathname = '/api/v1/status';
  u.search = '';
  u.hash = '';
  const raw = await fetchJson(u.href);
  const data = raw.data || raw;
  const settings = data.settings || {};
  const presets = (settings.presets || []).map(normalizeHostPreset);
  const servicesRaw = settings.services || {};
  const serviceIds = Array.isArray(servicesRaw)
    ? servicesRaw.map((s) => (typeof s === 'string' ? s : s.id)).filter(Boolean)
    : Object.keys(servicesRaw);

  const contract = {
    kind: 'host',
    extractedAt: new Date().toISOString(),
    host: origin,
    version: data.version || null,
    tag: data.tag || null,
    channel: data.channel || null,
    commit: data.commit || null,
    presetIds: presets.map((p) => p.id),
    presets,
    serviceIds: serviceIds.sort(),
    services: Array.isArray(servicesRaw)
      ? undefined
      : Object.fromEntries(
          Object.entries(servicesRaw).map(([id, v]) => [
            id,
            {
              name: v?.name || id,
              shortName: v?.shortName || null,
              credentialIds: (v?.credentials || []).map((c) => c.id).filter(Boolean),
            },
          ]),
        ),
    limits: settings.limits || null,
    regexAccess: settings.regexAccess
      ? { level: settings.regexAccess.level, count: (settings.regexAccess.patterns || settings.regexAccess.allowedRegexes || []).length || undefined }
      : null,
    selSyncAccess: settings.selSyncAccess || null,
  };
  contract.fingerprint = fingerprint(contract);
  return contract;
}

export function fingerprint(contract) {
  const slice = {
    presetIds: contract.presetIds || [],
    serviceIds: contract.serviceIds || [],
    schemaKeys: contract.schemaKeys || [],
    hotspots: contract.hotspots || {},
    selFunctions: contract.sel?.functions || [],
    formatterFields: contract.formatterFields || [],
    formatterModifiers: contract.formatterModifiers || [],
    required: (contract.presets || []).map((p) => ({
      id: p.id,
      req: (p.requiredOptions || []).map((o) => o.id).sort(),
    })),
  };
  return sha(slice).slice(0, 16);
}

export function compact(contract) {
  return {
    kind: contract.kind,
    extractedAt: contract.extractedAt,
    fingerprint: contract.fingerprint,
    repo: contract.repo,
    ref: contract.ref,
    commit: contract.commit,
    host: contract.host,
    version: contract.version,
    tag: contract.tag,
    channel: contract.channel,
    counts: {
      presets: (contract.presetIds || []).length,
      services: (contract.serviceIds || []).length,
      schemaKeys: (contract.schemaKeys || []).length,
      selFunctions: (contract.sel?.functions || []).length,
      formatterFields: (contract.formatterFields || []).length,
      requiredOptions: (contract.presets || []).reduce(
        (n, p) => n + (p.requiredOptions || []).length,
        0,
      ),
    },
    presetIds: contract.presetIds,
    serviceIds: contract.serviceIds,
    schemaKeys: contract.schemaKeys,
    hotspots: contract.hotspots,
    sel: contract.sel,
    formatterFields: contract.formatterFields,
    formatterModifiers: contract.formatterModifiers,
    formatterComparators: contract.formatterComparators,
    formatters: contract.formatters,
    sortCriteria: contract.sortCriteria,
    templateDirectives: contract.templateDirectives,
    requiredOptions: (contract.presets || []).flatMap((p) =>
      (p.requiredOptions || []).map((o) => ({ preset: p.id, ...o })),
    ),
    presets: (contract.presets || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      disabled: p.disabled,
      services: p.services,
      streamTypes: p.streamTypes,
      requiredOptions: p.requiredOptions,
      optionIds: (p.options || []).map((o) => o.id),
    })),
    services: contract.services,
    limits: contract.limits,
    regexAccess: contract.regexAccess,
    selSyncAccess: contract.selSyncAccess,
  };
}

function arrDiff(a = [], b = []) {
  const A = new Set(a);
  const B = new Set(b);
  return {
    added: [...B].filter((x) => !A.has(x)).sort(),
    removed: [...A].filter((x) => !B.has(x)).sort(),
  };
}

export function diffContracts(pinned, live) {
  const changes = [];
  const push = (surface, change, items, detail) => {
    if (!items || (Array.isArray(items) && items.length === 0)) return;
    changes.push({ surface, change, items, detail });
  };

  const presets = arrDiff(pinned.presetIds, live.presetIds);
  push('presets', 'added', presets.added);
  push('presets', 'removed', presets.removed);

  const services = arrDiff(pinned.serviceIds, live.serviceIds);
  push('services', 'added', services.added);
  push('services', 'removed', services.removed);

  const schema = arrDiff(pinned.schemaKeys, live.schemaKeys);
  push('schema', 'added', schema.added);
  push('schema', 'removed', schema.removed);

  const sel = arrDiff(pinned.sel?.functions, live.sel?.functions);
  push('sel.functions', 'added', sel.added);
  push('sel.functions', 'removed', sel.removed);

  const selC = arrDiff(pinned.sel?.constants, live.sel?.constants);
  push('sel.constants', 'added', selC.added);
  push('sel.constants', 'removed', selC.removed);

  const ff = arrDiff(pinned.formatterFields, live.formatterFields);
  push('formatter.fields', 'added', ff.added);
  push('formatter.fields', 'removed', ff.removed);

  const fm = arrDiff(pinned.formatterModifiers, live.formatterModifiers);
  push('formatter.modifiers', 'added', fm.added);
  push('formatter.modifiers', 'removed', fm.removed);

  if (pinned.hotspots && live.hotspots) {
    for (const key of unique([...Object.keys(pinned.hotspots), ...Object.keys(live.hotspots)])) {
      if (pinned.hotspots[key] !== live.hotspots[key]) {
        push('schema.hotspots', 'changed', [key], {
          from: pinned.hotspots[key],
          to: live.hotspots[key],
        });
      }
    }
  }

  const pinnedReq = new Map(
    (pinned.presets || []).map((p) => [p.id, (p.requiredOptions || []).map((o) => o.id).sort()]),
  );
  const liveReq = new Map(
    (live.presets || []).map((p) => [p.id, (p.requiredOptions || []).map((o) => o.id).sort()]),
  );
  for (const [id, req] of liveReq) {
    const prev = pinnedReq.get(id);
    if (!prev) continue;
    const d = arrDiff(prev, req);
    if (d.added.length) push('preset.required', 'added', d.added.map((o) => `${id}.${o}`));
    if (d.removed.length) push('preset.required', 'removed', d.removed.map((o) => `${id}.${o}`));
  }

  const severity = changes.some((c) => c.change === 'removed' || c.surface === 'preset.required')
    ? 'breaking'
    : changes.length
      ? 'additive'
      : 'none';

  return {
    drifted: changes.length > 0,
    severity,
    pinnedFingerprint: pinned.fingerprint,
    liveFingerprint: live.fingerprint,
    pinnedAt: pinned.extractedAt,
    liveAt: live.extractedAt,
    changes,
  };
}

export function loadSnapshot(path = SNAPSHOT_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function saveSnapshot(contract, path = SNAPSHOT_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  const body = compact(contract);
  writeFileSync(path, JSON.stringify(body, null, 2) + '\n');
  return path;
}

export function mergeContracts(source, host) {
  const presetById = new Map();
  for (const p of source?.presets || []) presetById.set(p.id, { ...p, origin: 'source' });
  for (const p of host?.presets || []) {
    const prev = presetById.get(p.id) || { id: p.id, origin: 'host' };
    presetById.set(p.id, {
      ...prev,
      ...p,
      origin: prev.origin === 'source' ? 'both' : 'host',
      requiredOptions: p.requiredOptions?.length ? p.requiredOptions : prev.requiredOptions,
      options: p.options?.length ? p.options : prev.options,
    });
  }
  return {
    kind: 'merged',
    extractedAt: new Date().toISOString(),
    source: source ? compact(source) : null,
    host: host ? compact(host) : null,
    presetIds: unique([...(source?.presetIds || []), ...(host?.presetIds || [])]).sort(),
    presets: [...presetById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    serviceIds: unique([...(source?.serviceIds || []), ...(host?.serviceIds || [])]).sort(),
    schemaKeys: source?.schemaKeys || [],
    hotspots: source?.hotspots || {},
    sel: source?.sel || { functions: [], constants: [] },
    formatterFields: source?.formatterFields || [],
    formatterModifiers: source?.formatterModifiers || [],
    formatterComparators: source?.formatterComparators || [],
    formatters: source?.formatters || [],
    sortCriteria: source?.sortCriteria || [],
    templateDirectives: source?.templateDirectives || [],
    limits: host?.limits || null,
    version: host?.version || null,
    hostUrl: host?.host || null,
  };
}
