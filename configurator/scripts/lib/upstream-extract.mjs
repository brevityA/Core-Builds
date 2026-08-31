/**
 * Pure extraction + emission helpers for the AIOStreams upstream sync.
 *
 * Everything here is deterministic and network-free: `sync-upstream.mjs` does
 * the fetching, hands the raw source text to `extractContract()`, and writes
 * whatever `emitFiles()` returns. Tests re-run the same functions against the
 * committed snapshot to prove the generated modules are reproducible.
 */

/* ------------------------------------------------------------------ *
 * Tiny TypeScript-source readers
 * ------------------------------------------------------------------ */

/** Return the source slice enclosed by the balanced pair starting at `open`. */
function balanced(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let inString = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; continue; }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return { body: source.slice(openIndex + 1, i), end: i };
    }
  }
  throw new Error(`Unbalanced ${openChar}${closeChar} starting at ${openIndex}`);
}

/**
 * Remove TS comments without touching string or regex literals. Line comments
 * are only stripped when the trimmed line starts with `//`, and block comments
 * only when `/*` is preceded by start-of-line or whitespace — enough for the
 * upstream files we read, and safe against inline regex like /https?:\/\//.
 */
function stripComments(text) {
  const source = String(text);
  let out = '';
  let inString = null;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      out += ch;
      if (ch === '\\') { out += source[i + 1] ?? ''; i += 1; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; out += ch; continue; }
    if (ch === '/' && source[i + 1] === '*') {
      const before = out.slice(out.lastIndexOf('\n') + 1);
      if (before.trim() === '' || /\s$/.test(out)) {
        const end = source.indexOf('*/', i + 2);
        i = end === -1 ? source.length : end + 1;
        continue;
      }
    }
    if (ch === '/' && source[i + 1] === '/') {
      const before = out.slice(out.lastIndexOf('\n') + 1);
      const previous = out.trimEnd().slice(-1);
      if (before.trim() === '' || ',;{[('.includes(previous)) {
        const end = source.indexOf('\n', i);
        i = end === -1 ? source.length : end - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/** Split a balanced body on commas that sit at nesting depth 0. */
function splitTopLevel(rawBody) {
  const body = stripComments(rawBody);
  const parts = [];
  let depth = 0;
  let inString = null;
  let current = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      current += ch;
      if (ch === '\\') { current += body[i + 1] ?? ''; i += 1; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inString = ch; current += ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth += 1;
    if (ch === '}' || ch === ']' || ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

/** Collect every `const IDENT = 'literal'` in a file so array members resolve. */
function scalarConstants(source) {
  const map = new Map();
  const re = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::\s*[^=]+)?=\s*(['"])((?:\\.|(?!\2)[^\\])*)\2\s*(?:as\s+const\s*)?;/g;
  let match;
  while ((match = re.exec(source))) map.set(match[1], match[3]);
  return map;
}

/**
 * Read `const NAME = [ ... ]` (or `let NAME: string[] = [ ... ]`) into a plain
 * string array, resolving identifier members and `...OTHER_ARRAY` spreads.
 */
export function readStringArray(source, name, scalars = scalarConstants(source), seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular array reference: ${name}`);
  seen.add(name);
  const decl = new RegExp(`(?:export\\s+)?(?:const|let)\\s+${name}\\s*(?::[^=]+)?=\\s*\\[`);
  const match = decl.exec(source);
  if (!match) return null;
  const openIndex = source.indexOf('[', match.index + match[0].length - 1);
  const { body } = balanced(source, openIndex, '[', ']');
  const out = [];
  for (const raw of splitTopLevel(body)) {
    const item = raw.replace(/\s+as\s+const\s*$/, '').trim();
    if (!item) continue;
    const literal = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/.exec(item);
    if (literal) { out.push(literal[2]); continue; }
    const spread = /^\.\.\.([A-Za-z_][\w]*)$/.exec(item);
    if (spread) {
      const nested = readStringArray(source, spread[1], scalars, seen);
      if (!nested) throw new Error(`Cannot resolve spread ...${spread[1]} inside ${name}`);
      out.push(...nested);
      continue;
    }
    const filtered = /^([A-Za-z_][\w]*)$/.exec(item);
    if (filtered) {
      if (!scalars.has(filtered[1])) throw new Error(`Cannot resolve ${filtered[1]} inside ${name}`);
      out.push(scalars.get(filtered[1]));
      continue;
    }
    throw new Error(`Unsupported array member in ${name}: ${item}`);
  }
  return out;
}

/** Top-level property names of the object literal that follows `header`. */
export function readObjectKeys(source, header) {
  const index = source.indexOf(header);
  if (index === -1) return null;
  const openIndex = source.indexOf('{', index + header.length - 1);
  const { body } = balanced(source, openIndex, '{', '}');
  const keys = [];
  for (const part of splitTopLevel(body)) {
    const match = /^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/.exec(part);
    if (match) keys.push(match[1] ?? match[2] ?? match[3]);
  }
  return keys;
}

/** `{ quality: 'desc', size: 'desc', ... }` read out of SORT_CRITERIA_DETAILS. */
export function readSortDirections(source) {
  const header = 'export const SORT_CRITERIA_DETAILS';
  const index = source.indexOf(header);
  if (index === -1) return null;
  const openIndex = source.indexOf('{', source.indexOf('= {', index));
  const { body } = balanced(source, openIndex, '{', '}');
  const out = {};
  for (const part of splitTopLevel(body)) {
    const key = /^(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*:/.exec(part);
    const direction = /defaultDirection:\s*'(asc|desc)'/.exec(part);
    if (key && direction) out[key[1] ?? key[2]] = direction[1];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Contract extraction
 * ------------------------------------------------------------------ */

export const REQUIRED_SOURCES = Object.freeze([
  'package.json',
  'packages/core/src/utils/constants.ts',
  'packages/core/src/db/schemas.ts',
  'packages/core/src/presets/presetManager.ts',
  'packages/core/src/streams/sorter.ts',
]);

const ENUM_ARRAYS = Object.freeze([
  'SERVICES', 'RESOLUTIONS', 'QUALITIES', 'VISUAL_TAGS', 'AUDIO_TAGS',
  'AUDIO_CHANNELS', 'ENCODES', 'SORT_CRITERIA', 'SORT_DIRECTIONS',
  'STREAM_TYPES', 'PASSTHROUGH_STAGES', 'FORMATTERS', 'PROXY_SERVICES',
  'RESOURCES',
]);

/**
 * Build the canonical, order-stable contract object from raw upstream sources.
 * `sources` maps the repo-relative path to its text.
 */
export function extractContract(sources, pin) {
  for (const path of REQUIRED_SOURCES) {
    if (typeof sources[path] !== 'string') throw new Error(`Missing upstream source: ${path}`);
  }

  const constants = sources['packages/core/src/utils/constants.ts'];
  const schemas = sources['packages/core/src/db/schemas.ts'];
  const presetManager = sources['packages/core/src/presets/presetManager.ts'];
  const sorter = sources['packages/core/src/streams/sorter.ts'];
  const scalars = scalarConstants(constants);

  const enums = {};
  for (const name of ENUM_ARRAYS) {
    const values = readStringArray(constants, name, scalars);
    if (!values) throw new Error(`Upstream constant ${name} not found — extraction rules need updating`);
    enums[name] = values;
  }

  const presetIds = readStringArray(presetManager, 'PRESET_LIST');
  if (!presetIds?.length) throw new Error('PRESET_LIST not found in presetManager.ts');

  const configKeys = readObjectKeys(schemas, 'export const UserDataSchema = z.object({');
  if (!configKeys?.length) throw new Error('UserDataSchema not found in schemas.ts');

  const sortScopes = readObjectKeys(schemas, 'sortCriteria: z.object({');
  if (!sortScopes?.length) throw new Error('sortCriteria scope object not found in schemas.ts');

  const sortDirections = readSortDirections(constants) || {};

  // The sorter only honours the cached/uncached split lists when the *first*
  // global criterion is `cached`; everything after it in `global` is ignored.
  // Recording the marker keeps the configurator's sort policy honest.
  const cachedSplitRequiresCachedFirst = /primarySortCriteria\[0\]\.key === 'cached'/.test(sorter);

  // Sort keys that read a per-stream numeric score rather than a preference
  // list. These dominate lexicographic comparison wherever they sit.
  const scoreKeys = ['streamExpressionScore', 'regexScore', 'bitrate', 'size', 'seeders', 'age', 'seadex']
    .filter(key => enums.SORT_CRITERIA.includes(key));

  return {
    upstream: {
      repo: pin.repo,
      sha: pin.sha,
      version: JSON.parse(sources['package.json']).version,
    },
    enums,
    presetIds,
    config: { keys: configKeys },
    sort: {
      scopes: sortScopes,
      criteria: enums.SORT_CRITERIA,
      directions: enums.SORT_DIRECTIONS,
      defaultDirections: sortDirections,
      scoreKeys,
      cachedSplitRequiresCachedFirst,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Emission
 * ------------------------------------------------------------------ */

function header(contract) {
  return [
    '// DO NOT EDIT — generated from AIOStreams ' + contract.upstream.sha,
    '// Source: https://github.com/' + contract.upstream.repo + '/tree/' + contract.upstream.sha,
    '// Upstream version: ' + contract.upstream.version,
    '// Regenerate with: npm run sync:upstream   (see configurator/README.md)',
    '',
  ].join('\n');
}

/** Key-sorted shallow copy so emitted output does not depend on source order. */
function sortedKeys(object) {
  const out = {};
  for (const key of Object.keys(object || {}).sort()) out[key] = object[key];
  return out;
}

function constArray(name, values) {
  return `export const ${name} = Object.freeze(${JSON.stringify(values)});\n`;
}

/** Stable JSON with sorted object keys so re-runs are byte-identical. */
export function stableJson(value) {
  const seen = new WeakSet();
  const normalize = (input) => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      if (seen.has(input)) throw new TypeError('Cannot serialise circular structure');
      seen.add(input);
      const out = {};
      for (const key of Object.keys(input).sort()) out[key] = normalize(input[key]);
      return out;
    }
    return input;
  };
  return JSON.stringify(normalize(value), null, 2) + '\n';
}

/**
 * Map the contract onto the generated modules. Returns
 * `{ 'src/data/generated/…': contents }` with repo-relative paths.
 */
export function emitFiles(contract) {
  const head = header(contract);
  const files = {};

  files['src/data/generated/aiostreams-enums.js'] = head + [
    '/** Authoritative enum values accepted by the pinned AIOStreams config schema. */',
    '',
    constArray('AIO_SERVICES', contract.enums.SERVICES),
    constArray('AIO_RESOLUTIONS', contract.enums.RESOLUTIONS),
    constArray('AIO_QUALITIES', contract.enums.QUALITIES),
    constArray('AIO_VISUAL_TAGS', contract.enums.VISUAL_TAGS),
    constArray('AIO_AUDIO_TAGS', contract.enums.AUDIO_TAGS),
    constArray('AIO_AUDIO_CHANNELS', contract.enums.AUDIO_CHANNELS),
    constArray('AIO_ENCODES', contract.enums.ENCODES),
    constArray('AIO_STREAM_TYPES', contract.enums.STREAM_TYPES),
    constArray('AIO_PASSTHROUGH_STAGES', contract.enums.PASSTHROUGH_STAGES),
    constArray('AIO_FORMATTERS', contract.enums.FORMATTERS),
    constArray('AIO_PROXY_SERVICES', contract.enums.PROXY_SERVICES),
    constArray('AIO_RESOURCES', contract.enums.RESOURCES),
  ].join('\n');

  files['src/data/generated/aiostreams-presets.js'] = head + [
    '/** Every preset id PresetManager.fromId() resolves at the pinned ref. */',
    '',
    constArray('AIO_PRESET_IDS', contract.presetIds),
    '',
    'export const AIO_PRESET_ID_SET = Object.freeze(new Set(AIO_PRESET_IDS));',
    '',
    '/** True when AIOStreams at the pinned ref can resolve this preset type. */',
    'export function isKnownPresetId(id) {',
    '  return AIO_PRESET_ID_SET.has(String(id || ""));',
    '}',
    '',
  ].join('\n');

  files['src/config/generated/aiostreams-config-schema.js'] = head + [
    '/**',
    ' * Top-level keys of UserDataSchema. AIOStreams uses a plain `z.object`, so',
    ' * unknown keys are silently STRIPPED rather than rejected — anything not in',
    ' * this list is dead payload in an exported template.',
    ' */',
    '',
    constArray('AIO_CONFIG_KEYS', contract.config.keys),
    '',
    'export const AIO_CONFIG_KEY_SET = Object.freeze(new Set(AIO_CONFIG_KEYS));',
    '',
    '/** Keys present on `config` that the pinned schema does not define. */',
    'export function unknownConfigKeys(config = {}) {',
    '  return Object.keys(config).filter(key => !AIO_CONFIG_KEY_SET.has(key));',
    '}',
    '',
  ].join('\n');

  files['src/config/generated/aiostreams-sort-schema.js'] = head + [
    '/** Sort-criteria contract: valid scopes, keys, directions and semantics. */',
    '',
    constArray('AIO_SORT_SCOPES', contract.sort.scopes),
    constArray('AIO_SORT_CRITERIA', contract.sort.criteria),
    constArray('AIO_SORT_DIRECTIONS', contract.sort.directions),
    '',
    'export const AIO_SORT_DEFAULT_DIRECTIONS = Object.freeze(' + JSON.stringify(sortedKeys(contract.sort.defaultDirections)) + ');',
    '',
    '/**',
    ' * Keys whose value comes from a per-stream numeric score instead of a',
    ' * preference-list index. Sorting is lexicographic over the criteria vector,',
    ' * so any score key placed above `resolution` can flip resolution order.',
    ' */',
    constArray('AIO_SORT_SCORE_KEYS', contract.sort.scoreKeys),
    '',
    '/**',
    ' * Upstream only consults sortCriteria.cached* / .uncached* when the FIRST',
    ' * global criterion is `cached` (streams/sorter.ts). Any other leading key',
    ' * means the primary list is used verbatim for every stream.',
    ' */',
    'export const AIO_CACHED_SPLIT_REQUIRES_CACHED_FIRST = ' + String(contract.sort.cachedSplitRequiresCachedFirst) + ';',
    '',
    'export const AIO_SORT_SCOPE_SET = Object.freeze(new Set(AIO_SORT_SCOPES));',
    'export const AIO_SORT_CRITERIA_SET = Object.freeze(new Set(AIO_SORT_CRITERIA));',
    '',
    '/** Structural problems in a sortCriteria object, as human-readable strings. */',
    'export function invalidSortCriteria(sortCriteria = {}) {',
    '  const problems = [];',
    '  if (!Array.isArray(sortCriteria.global)) problems.push("sortCriteria.global is required and must be an array");',
    '  for (const [scope, list] of Object.entries(sortCriteria)) {',
    '    if (!AIO_SORT_SCOPE_SET.has(scope)) { problems.push(`unknown sort scope: ${scope}`); continue; }',
    '    if (!Array.isArray(list)) { problems.push(`sortCriteria.${scope} must be an array`); continue; }',
    '    list.forEach((entry, index) => {',
    '      if (!entry || typeof entry !== "object") { problems.push(`sortCriteria.${scope}[${index}] must be an object`); return; }',
    '      if (!AIO_SORT_CRITERIA_SET.has(entry.key)) problems.push(`sortCriteria.${scope}[${index}] has unknown key: ${entry.key}`);',
    '      if (!AIO_SORT_DIRECTIONS.includes(entry.direction)) problems.push(`sortCriteria.${scope}[${index}] has invalid direction: ${entry.direction}`);',
    '    });',
    '  }',
    '  return problems;',
    '}',
    '',
  ].join('\n');

  files['src/config/generated/upstream-snapshot.json'] = stableJson(contract);

  return files;
}

/* ------------------------------------------------------------------ *
 * Drift
 * ------------------------------------------------------------------ */

function flatten(value, prefix = '', out = {}) {
  if (Array.isArray(value)) {
    out[prefix] = value.slice();
    return out;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort()) flatten(value[key], prefix ? `${prefix}.${key}` : key, out);
    return out;
  }
  out[prefix] = String(value);
  return out;
}

function sameValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => item === b[i]);
  return a === b;
}

function renderValue(value) {
  return Array.isArray(value) ? `[${value.length}] ${value.join(', ')}` : String(value);
}

/** Member-level +/- for array fields; plain from/to for scalars. */
function renderChange(item, lines) {
  lines.push(`  ~ ${item.path}`);
  if (Array.isArray(item.from) && Array.isArray(item.to)) {
    const gained = item.to.filter(v => !item.from.includes(v));
    const lost = item.from.filter(v => !item.to.includes(v));
    if (gained.length) lines.push(`      + ${gained.join(', ')}`);
    if (lost.length) lines.push(`      - ${lost.join(', ')}`);
    if (!gained.length && !lost.length) lines.push('      (order changed)');
    return;
  }
  lines.push(`      from: ${renderValue(item.from)}`);
  lines.push(`      to:   ${renderValue(item.to)}`);
}

/** Field-level diff between two contracts: `{ added, removed, changed }`. */
export function diffContracts(previous, next) {
  const a = flatten(previous || {});
  const b = flatten(next || {});
  const added = [];
  const removed = [];
  const changed = [];
  for (const key of Object.keys(b)) {
    if (!(key in a)) added.push({ path: key, value: b[key] });
    else if (!sameValue(a[key], b[key])) changed.push({ path: key, from: a[key], to: b[key] });
  }
  for (const key of Object.keys(a)) if (!(key in b)) removed.push({ path: key, value: a[key] });
  return { added, removed, changed };
}

export function formatDriftReport(diff, contract, previousSha) {
  const lines = [];
  lines.push(`Upstream drift report — AIOStreams ${contract.upstream.version} @ ${contract.upstream.sha}`);
  lines.push(`Previous pin: ${previousSha || '(none — first sync)'}`);
  lines.push('');
  const total = diff.added.length + diff.removed.length + diff.changed.length;
  if (!total) {
    lines.push('No schema drift. Generated files are already up to date.');
    return lines.join('\n');
  }
  if (diff.added.length) {
    lines.push(`Added (${diff.added.length}):`);
    for (const item of diff.added) lines.push(`  + ${item.path} = ${renderValue(item.value)}`);
    lines.push('');
  }
  if (diff.removed.length) {
    lines.push(`Removed (${diff.removed.length}):`);
    for (const item of diff.removed) lines.push(`  - ${item.path} = ${renderValue(item.value)}`);
    lines.push('');
  }
  if (diff.changed.length) {
    lines.push(`Changed (${diff.changed.length}):`);
    for (const item of diff.changed) renderChange(item, lines);
    lines.push('');
  }
  return lines.join('\n');
}
