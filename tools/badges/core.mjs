import { BADGES, BADGE_ASSET_BASE, GROUPS, THEMES, defaultBuilderState } from './catalog.mjs';
import { MARKER_TERMS } from './marker-terms.mjs';

export const BADGE_BUILDER_VERSION = '1.0.0';
export const FORMATTER_FIELD_LIMIT = 4900;
export const HANDOFF_KEY = 'cb-badge-builder-handoff-v1';
export const HANDOFF_MAX_AGE_MS = 10 * 60 * 1000;

const badgeById = new Map(BADGES.map((badge) => [badge.id, badge]));
const groupById = new Map(GROUPS.map((group) => [group.id, group]));

function uniqueKnown(values, known) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).filter((value) => {
    if (!known.has(value) || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function normalizeHex(value, fallback = '#00D4FF') {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toUpperCase() : fallback;
}

export function toArgb(hex, alpha = 'FF') {
  return `#${alpha}${normalizeHex(hex).slice(1)}`;
}

export function normalizeBuilderState(input = {}) {
  const fallback = defaultBuilderState();
  const badgeIds = new Set(BADGES.map((badge) => badge.id));
  const groupIds = new Set(GROUPS.map((group) => group.id));
  const selected = uniqueKnown(input.selectedIds, badgeIds);
  const groupOrder = uniqueKnown(input.groupOrder, groupIds);
  const badgeOrder = uniqueKnown(input.badgeOrder, badgeIds);
  const groupColors = {};

  for (const group of GROUPS) {
    groupColors[group.id] = normalizeHex(input.groupColors?.[group.id], group.color);
  }

  return {
    version: 1,
    mode: input.mode === 'universal' ? 'universal' : 'enhanced',
    theme: THEMES[input.theme] ? input.theme : fallback.theme,
    selectedIds: selected.length || input.allowEmpty === true ? selected : fallback.selectedIds,
    groupOrder: [...groupOrder, ...GROUPS.map((group) => group.id).filter((id) => !groupOrder.includes(id))],
    badgeOrder: [...badgeOrder, ...BADGES.map((badge) => badge.id).filter((id) => !badgeOrder.includes(id))],
    groupColors,
    sample: typeof input.sample === 'string' ? input.sample.slice(0, 2000) : fallback.sample,
  };
}

export function markerToken(markerCode) {
  if (!Number.isInteger(markerCode) || markerCode < 1 || markerCode > 255) {
    throw new RangeError('Marker code must be between 1 and 255.');
  }
  const bits = markerCode.toString(2).padStart(8, '0');
  return `\u2060${[...bits].map((bit) => bit === '1' ? '\u200C' : '\u200B').join('')}\u2060`;
}

export function compileNuvioPattern(pattern) {
  let source = String(pattern || '').trim();
  let flags = '';
  let match = source.match(/^\(\?([ims]+)\)/i);
  while (match) {
    const inline = match[1].toLowerCase();
    if (inline.includes('i')) flags += 'i';
    if (inline.includes('m')) flags += 'm';
    if (inline.includes('s')) flags += 's';
    source = source.slice(match[0].length);
    match = source.match(/^\(\?([ims]+)\)/i);
  }
  flags = [...new Set(flags)].join('');
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

export function badgeMatchesText(badge, text) {
  const regex = compileNuvioPattern(badge?.pattern);
  return Boolean(regex && regex.test(String(text || '')));
}

export function matchingBadges(text, selectedIds = BADGES.map((badge) => badge.id), badgeOrder = []) {
  const selected = new Set(selectedIds);
  const order = new Map(badgeOrder.map((id, index) => [id, index]));
  return BADGES
    .filter((badge) => selected.has(badge.id) && badgeMatchesText(badge, text))
    .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

function visualStyle(themeId, groupColor) {
  const theme = THEMES[themeId] || THEMES.neon;
  if (theme.tagColor) {
    return {
      tagColor: theme.tagColor,
      borderColor: theme.borderColor,
      textColor: theme.textColor,
      tagStyle: 'filled',
    };
  }
  return {
    tagColor: toArgb(groupColor, theme.tagAlpha),
    borderColor: toArgb(groupColor, theme.borderAlpha),
    textColor: theme.textColor,
    tagStyle: 'filled',
  };
}

function orderedSelection(state) {
  const selected = new Set(state.selectedIds);
  const badgeRank = new Map(state.badgeOrder.map((id, index) => [id, index]));
  const grouped = new Map();
  for (const groupId of state.groupOrder) grouped.set(groupId, []);
  for (const badge of BADGES) {
    if (!selected.has(badge.id)) continue;
    if (!grouped.has(badge.groupId)) grouped.set(badge.groupId, []);
    grouped.get(badge.groupId).push(badge);
  }
  for (const badges of grouped.values()) {
    badges.sort((a, b) => (badgeRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (badgeRank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  }
  return grouped;
}

export function buildBadgePack(input = {}) {
  const state = normalizeBuilderState({ ...input, allowEmpty:true });
  const grouped = orderedSelection(state);
  const groups = [];
  const filters = [];

  for (const groupId of state.groupOrder) {
    const group = groupById.get(groupId);
    const badges = grouped.get(groupId) || [];
    if (!group || !badges.length) continue;
    const color = state.groupColors[groupId] || group.color;
    groups.push({ id:group.id, name:group.name, color, isExpanded:group.essential });
    const style = visualStyle(state.theme, color);
    for (const badge of badges) {
      filters.push({
        id: badge.id,
        groupId: badge.groupId,
        name: badge.name,
        pattern: state.mode === 'enhanced' ? markerToken(badge.markerCode) : badge.pattern,
        imageURL: `${BADGE_ASSET_BASE}/${badge.asset}`,
        isEnabled: true,
        ...style,
        type: 'filter',
      });
    }
  }

  // Keep the exported document to Nuvio's canonical two-key shape. Current clients ignore
  // unknown keys, but older Fusion importers have used strict decoders.
  const pack = { groups, filters };
  validateBadgePack(pack);
  return pack;
}

export function validateBadgePack(pack) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) throw new TypeError('Badge pack must be a JSON object.');
  if (!Array.isArray(pack.groups) || !Array.isArray(pack.filters)) throw new TypeError('Badge pack requires groups and filters arrays.');
  if (!pack.filters.length) throw new Error('Select at least one badge before generating.');

  const groupIds = new Set();
  for (const group of pack.groups) {
    if (!group.id || groupIds.has(group.id)) throw new Error(`Duplicate or missing group id: ${group.id || '(empty)'}`);
    groupIds.add(group.id);
  }
  const filterIds = new Set();
  for (const filter of pack.filters) {
    if (!filter.id || filterIds.has(filter.id)) throw new Error(`Duplicate or missing badge id: ${filter.id || '(empty)'}`);
    if (!groupIds.has(filter.groupId)) throw new Error(`Badge ${filter.id} points to missing group ${filter.groupId}.`);
    if (!filter.name || !filter.pattern || !filter.imageURL) throw new Error(`Badge ${filter.id} is missing a required field.`);
    if (!compileNuvioPattern(filter.pattern)) throw new Error(`Badge ${filter.id} has an invalid pattern.`);
    if (!/^https:\/\//.test(filter.imageURL)) throw new Error(`Badge ${filter.id} must use an HTTPS image URL.`);
    if (!/^#[0-9A-F]{8}$/i.test(filter.tagColor) || !/^#[0-9A-F]{8}$/i.test(filter.borderColor)) {
      throw new Error(`Badge ${filter.id} has an invalid ARGB color.`);
    }
    filterIds.add(filter.id);
  }
  return true;
}

function markerExpression(badge) {
  const [field, operation, value] = badge.markerRule;
  const token = markerToken(badge.markerCode);
  if (!/^(?:stream|service|addon)\.[A-Za-z][A-Za-z0-9]*$/.test(field)) {
    throw new Error(`Unsupported marker field for ${badge.id}.`);
  }
  if (operation === 'true') return `{${field}::istrue["${token}"||""]}`;
  if (operation === 'false') return `{${field}::isfalse["${token}"||""]}`;
  if (operation === 'exists') return `{${field}::exists["${token}"||""]}`;
  if (operation === 'match') {
    const definition = MARKER_TERMS[badge.id];
    if (!definition || !['exact','contains'].includes(definition.mode) || !Array.isArray(definition.values)) {
      throw new Error(`Missing parser-safe marker terms for ${badge.id}.`);
    }
    const seen = new Set();
    const values = definition.values.filter((term) => {
      if (typeof term !== 'string' || !term || /["\[\]\r\n]|::/.test(term)) throw new Error(`Unsafe marker term for ${badge.id}.`);
      const key = term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!values.length) throw new Error(`Empty marker terms for ${badge.id}.`);
    const modifier = definition.mode === 'exact' ? '=' : '~';
    const operands = values.map((term) => `${field}::${modifier}${term}`);
    return `{${operands.join(`::or::`)}["${token}"||""]}`;
  }
  throw new Error(`Unsupported marker operation for ${badge.id}.`);
}

const BASE_FORMATTER = Object.freeze({
  name: '{service.cached::istrue["⚡ "||"⏳ "]}{service.shortName::exists["{service.shortName::upper}  "||""]}{stream.title::exists["{stream.title::upper}"||"STREAM"]}{stream.formattedSeasons::exists[" {stream.formattedSeasons}"||""]}{stream.formattedEpisodes::exists[" {stream.formattedEpisodes}"||""]}',
  description: '{stream.size::exists["💾 {stream.size::sbytes}  "||""]}{stream.bitrate::exists["⚡ {stream.bitrate::sbitrate}  "||""]}{stream.seeders::exists["🌱 {stream.seeders}  "||""]}{stream.releaseGroup::exists["🏷 {stream.releaseGroup}"||""]}{tools.newLine}{addon.name::exists["{addon.name}"||"AIOStreams"]}{stream.indexer::exists[" · {stream.indexer}"||""]}',
});

export function buildCompanionFormatter(input = {}) {
  const state = normalizeBuilderState({ ...input, allowEmpty:true });
  const selected = new Set(state.selectedIds);
  const rank = new Map(state.badgeOrder.map((id, index) => [id, index]));
  const markers = state.mode === 'enhanced'
    ? BADGES.filter((badge) => selected.has(badge.id)).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)).map(markerExpression)
    : [];

  const fields = { name:BASE_FORMATTER.name, description:BASE_FORMATTER.description };
  for (const expression of markers) {
    const candidates = ['name','description'].sort((a, b) => fields[a].length - fields[b].length);
    const target = candidates.find((field) => fields[field].length + expression.length <= FORMATTER_FIELD_LIMIT);
    if (!target) {
      throw new RangeError(`The selected enhanced badge set cannot fit within AIOStreams' ${FORMATTER_FIELD_LIMIT}-character safety limit per formatter field. Disable some advanced badges.`);
    }
    fields[target] += expression;
  }

  for (const [field, value] of Object.entries(fields)) {
    if (value.length > FORMATTER_FIELD_LIMIT) throw new RangeError(`Formatter ${field} exceeds the safe limit.`);
  }
  return {
    _label: state.mode === 'enhanced' ? 'Core Badge Companion — Enhanced' : 'Core Badge Companion — Universal',
    name: fields.name,
    description: fields.description,
  };
}

export function makeConfiguratorHandoff(formatter, now = Date.now()) {
  validateFormatter(formatter);
  return {
    v: 1,
    ts: now,
    source: 'core-badge-builder',
    formatter: {
      name: formatter.name,
      description: formatter.description,
      label: String(formatter._label || 'Core Badge Companion').slice(0, 80),
    },
  };
}

export function validateFormatter(formatter) {
  if (!formatter || typeof formatter !== 'object' || Array.isArray(formatter)) throw new TypeError('Formatter must be an object.');
  for (const field of ['name','description']) {
    if (typeof formatter[field] !== 'string') throw new TypeError(`Formatter ${field} must be text.`);
    if (formatter[field].length > FORMATTER_FIELD_LIMIT) throw new RangeError(`Formatter ${field} exceeds ${FORMATTER_FIELD_LIMIT} characters.`);
  }
  if (!formatter.name && !formatter.description) throw new Error('Formatter cannot be empty.');
  return true;
}

export function parseConfiguratorHandoff(raw, now = Date.now()) {
  let handoff;
  try { handoff = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!handoff || handoff.v !== 1 || handoff.source !== 'core-badge-builder') return null;
  if (!Number.isFinite(handoff.ts) || now - handoff.ts < 0 || now - handoff.ts > HANDOFF_MAX_AGE_MS) return null;
  const formatter = handoff.formatter;
  try {
    validateFormatter({ name:formatter?.name, description:formatter?.description });
  } catch {
    return null;
  }
  return {
    name: formatter.name,
    description: formatter.description,
    label: typeof formatter.label === 'string' ? formatter.label.slice(0, 80) : 'Core Badge Companion',
  };
}

export function serialiseJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function badgeFileName(state) {
  const mode = normalizeBuilderState(state).mode;
  return `core-builds-nuvio-badges-${mode}.json`;
}

export function formatterFileName(state) {
  const mode = normalizeBuilderState(state).mode;
  return `core-builds-badge-formatter-${mode}.json`;
}

export function catalogByGroup() {
  return GROUPS.map((group) => ({
    ...group,
    badges: BADGES.filter((badge) => badge.groupId === group.id),
  }));
}

export function getBadge(id) { return badgeById.get(id) || null; }
export function getGroup(id) { return groupById.get(id) || null; }
