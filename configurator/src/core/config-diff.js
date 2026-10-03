/** Content-aware, credential-safe configuration diffs for the update preview. */
import { cloneUpdateValue } from './template-update-policy.js';

export const CONFIG_UPDATE_SECTIONS = Object.freeze([
  { key: 'pses', label: 'Preferred & Ranked Stream Expressions', fields: ['preferredStreamExpressions', 'rankedStreamExpressions', 'syncedPreferredStreamExpressionUrls', 'syncedRankedStreamExpressionUrls'] },
  { key: 'eses', label: 'Excluded Stream Expressions', fields: ['excludedStreamExpressions', 'syncedExcludedStreamExpressionUrls'] },
  { key: 'ises', label: 'Included & Required Stream Expressions', fields: ['includedStreamExpressions', 'requiredStreamExpressions', 'syncedIncludedStreamExpressionUrls', 'syncedRequiredStreamExpressionUrls'] },
  { key: 'ranked_regex', label: 'Ranked Regex Patterns', fields: ['rankedRegexPatterns', 'syncedRankedRegexUrls'] },
  { key: 'pref_regex', label: 'Preferred Regex Patterns', fields: ['preferredRegexPatterns', 'syncedPreferredRegexUrls'] },
  { key: 'excl_regex', label: 'Excluded Regex Patterns', fields: ['excludedRegexPatterns', 'syncedExcludedRegexUrls'] },
  { key: 'sort', label: 'Sort Criteria & Preferences', fields: ['sortCriteria', 'preferredResolutions', 'preferredQualities', 'preferredEncodes', 'preferredVisualTags', 'preferredAudioTags', 'preferredAudioChannels', 'preferredLanguages', 'preferredSubtitles', 'preferredStreamTypes', 'preferredReleaseGroups', 'preferredKeywords'] },
  { key: 'sources', label: 'Services & Scrapers', fields: ['services', 'presets'] },
  { key: 'formatter', label: 'Formatter', fields: ['formatter'] },
]);

// Transport/account bookkeeping is not a template-logic upgrade. In particular,
// never manufacture a change just because the app/template version increased.
const IGNORED_FIELDS = new Set([
  'uuid', 'encryptedPassword', 'accessKey', 'ip', 'trusted', 'showChanges',
  'appliedTemplates', 'linkedAccounts', 'healthResults',
]);
const LIST_DETAIL_FIELDS = new Set([
  'presets', 'services', 'preferredStreamExpressions', 'rankedStreamExpressions',
  'excludedStreamExpressions', 'includedStreamExpressions', 'requiredStreamExpressions',
  'rankedRegexPatterns', 'preferredRegexPatterns', 'excludedRegexPatterns',
]);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

export function configValuesEqual(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function fieldLabel(field) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

function entryLabel(entry, index, field) {
  if (field === 'presets') return String(entry?.options?.name || entry?.type || `Preset ${index + 1}`);
  if (field === 'services') return String(entry?.id || `Service ${index + 1}`);
  if (entry && typeof entry === 'object') {
    const label = String(entry.expression || '').match(/\/\*\s*(.*?)\s*\*\//s)?.[1];
    return String(entry.name || label || `${fieldLabel(field)} #${index + 1}`);
  }
  // Regex/expression contents can contain URLs or credentials. They are compared
  // internally, but never interpolated into a report or the DOM.
  return `${fieldLabel(field)} #${index + 1}`;
}

function entryIdentity(entry, index, field) {
  if (field === 'presets') return entry?.instanceId || `${entry?.type || 'preset'}#${index}`;
  if (field === 'services') return entry?.id || `service#${index}`;
  return entryLabel(entry, index, field);
}

function indexedEntries(entries, field) {
  const counts = new Map();
  return new Map(entries.map((entry, index) => {
    const identity = entryIdentity(entry, index, field);
    const occurrence = counts.get(identity) || 0;
    counts.set(identity, occurrence + 1);
    return [`${identity}\u0000${occurrence}`, { entry, label: entryLabel(entry, index, field) }];
  }));
}

function listRows(before, after, field) {
  const oldMap = indexedEntries(before, field), newMap = indexedEntries(after, field);
  const rows = [];
  for (const [identity, { entry, label }] of newMap) {
    if (!oldMap.has(identity)) rows.push({ type: 'add', text: label });
    else if (!configValuesEqual(oldMap.get(identity).entry, entry)) rows.push({ type: 'chg', text: `${label} — updated` });
  }
  for (const [identity, { label }] of oldMap) {
    if (!newMap.has(identity)) rows.push({ type: 'rem', text: label });
  }
  const oldOrder = [...oldMap.keys()], newOrder = [...newMap.keys()];
  if (oldOrder.length === newOrder.length && oldOrder.every(key => newMap.has(key)) && !configValuesEqual(oldOrder, newOrder)) {
    rows.push({ type: 'chg', text: `${fieldLabel(field)} — order changed` });
  }
  return rows;
}

function fieldRows(before, after, field) {
  if (field === 'sortCriteria' && before && after && typeof before === 'object' && typeof after === 'object') {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
      .filter(scope => !configValuesEqual(before[scope], after[scope]))
      .map(scope => ({
        type: before[scope] === undefined ? 'add' : after[scope] === undefined ? 'rem' : 'chg',
        text: `${scope} — sort keys, order or direction changed`,
      }));
  }
  if (LIST_DETAIL_FIELDS.has(field) && Array.isArray(before) && Array.isArray(after)) return listRows(before, after, field);
  return [{ type: before === undefined ? 'add' : after === undefined ? 'rem' : 'chg', text: `${fieldLabel(field)} — updated` }];
}

/** All values are compared; returned rows contain labels, never option values. */
export function diffConfigSections(oldConfig = {}, newConfig = {}) {
  const assigned = new Set(CONFIG_UPDATE_SECTIONS.flatMap(section => section.fields));
  const settingsFields = [...new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)])]
    .filter(field => !assigned.has(field) && !IGNORED_FIELDS.has(field)).sort();
  const definitions = [...CONFIG_UPDATE_SECTIONS, { key: 'settings', label: 'Filters & Settings', fields: settingsFields }];
  return definitions.flatMap(section => {
    const rows = section.fields.flatMap(field => configValuesEqual(oldConfig[field], newConfig[field])
      ? [] : fieldRows(oldConfig[field], newConfig[field], field));
    if (!rows.length) return [];
    return [{
      ...section, rows,
      added: rows.filter(row => row.type === 'add').length,
      removed: rows.filter(row => row.type === 'rem').length,
      changed: rows.filter(row => row.type === 'chg').length,
    }];
  });
}

/** Represent both kept values AND absent original fields for cherry-picking. */
export function migrationSelection(oldConfig, newConfig, selected = new Set(), offered = new Set()) {
  const keep = {}, remove = [];
  for (const section of diffConfigSections(oldConfig, newConfig)) {
    if (!offered.has(section.key) || selected.has(section.key)) continue;
    for (const field of section.fields) {
      if (Object.hasOwn(oldConfig, field)) keep[field] = cloneUpdateValue(oldConfig[field]);
      else remove.push(field);
    }
  }
  return { keep, remove };
}
