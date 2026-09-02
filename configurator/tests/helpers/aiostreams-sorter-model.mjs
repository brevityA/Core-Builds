/**
 * Faithful-enough port of the AIOStreams stream comparator, used only by tests.
 *
 * Mirrors `packages/core/src/streams/sorter.ts` at the pinned ref
 * (see configurator/UPSTREAM.pin): every criterion produces a number, the
 * numbers form a vector, and streams are ordered by comparing that vector
 * LEXICOGRAPHICALLY — the first index that differs decides, and nothing after
 * it is consulted.
 *
 * Only the criteria Core Builds actually emits are implemented; an unimplemented
 * key throws rather than silently scoring 0, so this file cannot quietly drift
 * away from the real sorter.
 */

import { AIO_CACHED_SPLIT_REQUIRES_CACHED_FIRST } from '../../src/config/generated/aiostreams-sort-schema.js';

const NEG_INF = Number.NEGATIVE_INFINITY;

/** `-indexOf(value)` against a preference list; absent => -Infinity. Unset list => 0 (no-op). */
function preferenceScore(list, value) {
  if (!Array.isArray(list) || !list.length) return 0;
  const index = list.indexOf(value);
  return index === -1 ? NEG_INF : -index;
}

/** Minimum preference index across a set of tags (best tag wins). */
function minPreferenceScore(list, values) {
  if (!Array.isArray(list) || !list.length) return 0;
  const scores = (values || []).map(value => preferenceScore(list, value)).filter(score => score !== NEG_INF);
  return scores.length ? Math.max(...scores) : NEG_INF;
}

const SCORERS = {
  resolution: (s, p) => preferenceScore(p.preferredResolutions, s.resolution ?? 'Unknown'),
  quality: (s, p) => preferenceScore(p.preferredQualities, s.quality ?? 'Unknown'),
  encode: (s, p) => preferenceScore(p.preferredEncodes, s.encode ?? 'Unknown'),
  visualTag: (s, p) => minPreferenceScore(p.preferredVisualTags, s.visualTags),
  audioTag: (s, p) => minPreferenceScore(p.preferredAudioTags, s.audioTags),
  audioChannel: (s, p) => minPreferenceScore(p.preferredAudioChannels, s.audioChannels),
  language: (s, p) => minPreferenceScore(p.preferredLanguages, s.languages),
  subtitle: (s, p) => minPreferenceScore(p.preferredSubtitles, s.subtitles),
  service: (s, p) => preferenceScore(p.services, s.service),
  addon: (s, p) => preferenceScore(p.presets, s.addon),
  cached: (s) => (s.cached ? 1 : 0),
  library: (s) => (s.library ? 1 : 0),
  seadex: (s) => (s.seadexBest ? 2 : s.seadex ? 1 : 0),
  private: (s) => (s.private ? 1 : 0),
  streamExpressionMatched: (s) => (s.streamExpressionIndex == null ? NEG_INF : -s.streamExpressionIndex),
  regexPatterns: (s) => (s.regexIndex == null ? NEG_INF : -s.regexIndex),
  streamExpressionScore: (s) => s.streamExpressionScore ?? 0,
  regexScore: (s) => s.regexScore ?? 0,
  bitrate: (s) => s.bitrate ?? 0,
  size: (s) => s.size ?? 0,
  seeders: (s) => s.seeders ?? 0,
  age: (s) => -(s.ageDays ?? 0),
  keyword: (s) => (s.keyword ? 1 : 0),
  streamType: (s, p) => preferenceScore(p.preferredStreamTypes, s.streamType),
  releaseGroup: (s, p) => preferenceScore(p.preferredReleaseGroups, s.releaseGroup),
};

export function criterionValue(key, stream, prefs) {
  const scorer = SCORERS[key];
  if (!scorer) throw new Error(`test sorter has no scorer for criterion "${key}"`);
  return scorer(stream, prefs);
}

export function sortVector(criteria, stream, prefs) {
  return criteria.map(({ key, direction }) => {
    const value = criterionValue(key, stream, prefs);
    return direction === 'asc' ? -value : value;
  });
}

/**
 * Pick the criteria list upstream would actually use for a request.
 * Mirrors the cached/uncached split: the scoped lists are only consulted when
 * the primary list leads with `cached`.
 */
export function resolveCriteria(sortCriteria, { type = 'movies', cached = false } = {}) {
  const primary = sortCriteria[type] && sortCriteria[type].length ? sortCriteria[type] : sortCriteria.global;
  if (!AIO_CACHED_SPLIT_REQUIRES_CACHED_FIRST) return primary;
  if (!primary || !primary.length || primary[0].key !== 'cached') return primary;
  const scoped = sortCriteria[`${cached ? 'cached' : 'uncached'}${type[0].toUpperCase()}${type.slice(1)}`];
  return scoped && scoped.length ? scoped : primary;
}

export function compareStreams(criteria, a, b, prefs) {
  const va = sortVector(criteria, a, prefs);
  const vb = sortVector(criteria, b, prefs);
  for (let i = 0; i < criteria.length; i += 1) {
    if (va[i] === vb[i]) continue;
    return vb[i] - va[i] > 0 ? 1 : -1; // descending: higher value first
  }
  return 0;
}

export function sortStreams(criteria, streams, prefs) {
  return [...streams].sort((a, b) => compareStreams(criteria, a, b, prefs));
}
