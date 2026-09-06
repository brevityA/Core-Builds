/**
 * Regex-allowlist preflight — the 2026-09-06 "3 / 180 regexes" diagnosis.
 *
 * Regex-scoring builds (4K / ultrawide / mixed / apex-mixed) ship
 * `syncedRankedRegexUrls` pinned to Vidhin05's Releases-Regex *main* — a
 * moving target. At save time AIOStreams resolves that URL live and validates
 * the deduped union (synced + inline patterns) against the HOST's cached
 * allowlist (`settings.regexAccess.patterns`, refreshed on the host's own
 * schedule). When upstream merges pattern changes faster than a host
 * refreshes, every Direct Install bounces with the host 400
 * "You are only permitted to use specific regex patterns, you have N / M
 * regexes that are not allowed" (observed 2026-09-05 22:53 — two patterns
 * had changed upstream at 05:58 the same day; both reached host allowlists
 * only later).
 *
 * This module mirrors `validateRegexes()` in AIOStreams
 * packages/core/src/utils/config.ts at the pinned ref (v2.34.0 @ e694b6a):
 * only the five top-level `*RegexPatterns` arrays are part of this gate
 * (stream expressions are NOT validated against the allowlist upstream) and
 * matching is exact-string on the deduped union. The DOM half lives in app.js
 * (`regexGateForHost`): it resolves the synced lists client-side
 * (raw.githubusercontent.com sends `Access-Control-Allow-Origin: *`) and runs
 * this decision before the install POST.
 */

const STRING_PATTERN_KEYS = Object.freeze([
  'excludedRegexPatterns',
  'includedRegexPatterns',
  'requiredRegexPatterns',
]);
const OBJECT_PATTERN_KEYS = Object.freeze([
  'preferredRegexPatterns',
  'rankedRegexPatterns',
]);
export const SYNCED_URL_KEYS = Object.freeze([
  'syncedExcludedRegexUrls',
  'syncedIncludedRegexUrls',
  'syncedRequiredRegexUrls',
  'syncedPreferredRegexUrls',
  'syncedRankedRegexUrls',
]);

/**
 * Inline regex patterns + synced regex URLs a config carries.
 * @returns {{ inline: Set<string>, syncedUrls: string[] }}
 */
export function collectRegexPatternSet(config) {
  const cfg = config || {};
  const inline = new Set();
  for (const key of STRING_PATTERN_KEYS) {
    for (const p of cfg[key] || []) if (typeof p === 'string' && p) inline.add(p);
  }
  for (const key of OBJECT_PATTERN_KEYS) {
    for (const entry of cfg[key] || []) {
      const p = typeof entry === 'string' ? entry : entry && entry.pattern;
      if (typeof p === 'string' && p) inline.add(p);
    }
  }
  const syncedUrls = [];
  for (const key of SYNCED_URL_KEYS) {
    for (const u of cfg[key] || []) {
      if (typeof u === 'string' && u && !syncedUrls.includes(u)) syncedUrls.push(u);
    }
  }
  return { inline, syncedUrls };
}

/**
 * Verdict for posting this pattern set to a host.
 *
 * @param {null|{level?: string, patterns?: string[]}} regexAccess
 *        `settings.regexAccess` from the host's /api/v1/status (null when the
 *        status could not be fetched).
 * @param {{inline?: Set<string>, resolved?: Set<string>|null}} set
 *        `inline` — patterns in the config; `resolved` — patterns fetched
 *        client-side from the config's synced URLs (null = unfetchable).
 * @returns {{status: 'skip'|'ok'|'blocked', total: number, rejectedCount: number,
 *            level: string|null, reason?: string}}
 *   skip    — nothing to validate, or the check cannot know the answer
 *             (unrestricted host, status/allowlist not exposed, synced list
 *             unfetchable). The gate must never invent a new failure mode.
 *   ok      — every pattern of the union is allowlisted.
 *   blocked — the host will refuse the save; `reason` is user-facing.
 */
export function regexAccessDecision(regexAccess, set) {
  const union = new Set([...(set.resolved || []), ...(set.inline || [])]);
  const level = regexAccess && typeof regexAccess.level === 'string' ? regexAccess.level : null;
  if (!union.size) return { status: 'skip', total: 0, rejectedCount: 0, level };
  if (!level || level === 'all') return { status: 'skip', total: union.size, rejectedCount: 0, level };
  if (!Array.isArray(regexAccess.patterns)) {
    // Restrictive host, but the allowlist is not exposed — cannot validate.
    return { status: 'skip', total: union.size, rejectedCount: 0, level };
  }
  const allow = new Set(regexAccess.patterns);
  const rejectedCount = [...union].filter(p => !allow.has(p)).length;
  if (!rejectedCount) return { status: 'ok', total: union.size, rejectedCount: 0, level };
  return {
    status: 'blocked',
    total: union.size,
    rejectedCount,
    level,
    reason: `${rejectedCount} / ${union.size} regex patterns are not allowed on this host — its pattern allowlist lags the synced list. Pick another host, retry in a few hours, or use Export JSON and import manually.`,
  };
}
