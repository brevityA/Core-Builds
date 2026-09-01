/** Pure sort policy extracted from the configurator generator.
 *
 * Sorting semantics this file has to respect (AIOStreams packages/core/src/streams/sorter.ts
 * at the pinned ref — see src/config/generated/aiostreams-sort-schema.js):
 *
 *  - A criteria list is turned into a numeric vector per stream and compared
 *    LEXICOGRAPHICALLY. The first key that differs decides the order; nothing
 *    after it is consulted.
 *  - `resolution` and `quality` score by index into preferredResolutions /
 *    preferredQualities. `streamExpressionScore`, `regexScore`, `bitrate`,
 *    `size` and `seadex` score off the stream itself, so wherever they sit
 *    ABOVE `resolution` they can put a 1080p REMUX over a 2160p WEB-DL.
 *  - The cached/uncached split lists are only used when the FIRST global
 *    criterion is `cached`. Putting anything else first makes the primary list
 *    authoritative for every stream, which is what the 4K-first profile wants.
 */

// Only the 4K profile. "ultrawide" is deliberately excluded: its
// preferredResolutions list leads with 1080p (src/core/device-policies.js),
// so hoisting `resolution` there would enforce 1080p-first, not 4K-first.
const RESOLUTION_TIER_PROFILES = new Set(['4k']);

/**
 * True when resolution tier must dominate every other signal.
 *
 * The 4K-tier profiles ("4k", "ultrawide") default to tier-first so that every
 * 2160p result outranks every 1080p result regardless of bitrate, quality label
 * or aggregate score. `qualityFirst` is the explicit opt-out; the 1080p and
 * mixed profiles keep their existing behaviour.
 */
export function resolutionTierFirst(input = {}) {
  if (input.qualityFirst) return false;
  if (input.resolutionTierFirst === false) return false;
  return RESOLUTION_TIER_PROFILES.has(String(input.resolution || ''));
}

/** Move `resolution` (and the `quality` that follows it) to the front of a list. */
function hoistResolution(list, rq) {
  const rest = list.filter(entry => entry.key !== 'resolution' && entry.key !== 'quality');
  return [...rq, ...rest];
}

export function sortPolicy(input = {}) {
 const d='desc',qf=input.qualityFirst,rf=input.resolutionFirst, rq=(qf||((input.resolution==='mixed'||input.pseArch==='apex-mixed')&&!rf))?[{key:'quality',direction:d},{key:'resolution',direction:d}]:[{key:'resolution',direction:d},{key:'quality',direction:d}], rfPre=rf?rq:[],rfPost=rf?[]:rq, isFree=input.service==='p2p'||input.service==='http';
      if (input.service==='http') { return applyTierFirst({ global:[{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},...rq,{key:'language',direction:d},{key:'size',direction:d}] }, input, rq); }
      if (input.service==='p2p') { return applyTierFirst({ global:[{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...rq,{key:'seeders',direction:d},{key:'encode',direction:d},{key:'language',direction:d},{key:'size',direction:d}] }, input, rq); }
      const isHybrid=input.service==='hybrid'||(input.service==='multi'&&input.multiServices&&input.multiServices.includes('torbox-pro')&&input.multiServices.includes('realdebrid')), svcKey=isHybrid?[{key:'service',direction:d}]:[];
      const sc = { global:[...rfPre,{key:'cached',direction:d},{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...svcKey,...rfPost,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'library',direction:d},{key:'seeders',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], movies:[...rfPre,{key:'cached',direction:d},{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...svcKey,{key:'library',direction:d},...rfPost,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'seeders',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], series:[...rfPre,{key:'cached',direction:d},{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...svcKey,{key:'library',direction:d},...rfPost,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'seeders',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], cachedMovies:[...rfPre,{key:'cached',direction:d},{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...svcKey,{key:'library',direction:d},...rfPost,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'seeders',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], anime:[...rfPre,{key:'cached',direction:d},{key:'seadex',direction:d},...svcKey,{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},...rfPost,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'seeders',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], cachedAnime:[...rfPre,{key:'cached',direction:d},{key:'seadex',direction:d},...svcKey,{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'library',direction:d},...rfPost,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'seeders',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], uncachedAnime:[{key:'seadex',direction:d},...svcKey,{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'library',direction:d},...rq,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'seeders',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], uncachedMovies:[{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...svcKey,{key:'library',direction:d},...rq,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'seeders',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}], uncachedSeries:[{key:'streamExpressionMatched',direction:d},{key:'streamExpressionScore',direction:d},{key:'seadex',direction:d},...svcKey,{key:'library',direction:d},...rq,{key:'regexScore',direction:d},{key:'visualTag',direction:d},{key:'encode',direction:d},{key:'seeders',direction:d},{key:'audioTag',direction:d},{key:'audioChannel',direction:d},{key:'language',direction:d},{key:'bitrate',direction:d},{key:'size',direction:d},{key:'age',direction:d},{key:'subtitle',direction:d}] };
      const lb = input.libraryBoost || 'default';
      if (lb === 'none') { for (const k of Object.keys(sc)) sc[k] = sc[k].filter(e => e.key !== 'library'); }
      else if (lb === 'strong') { for (const k of Object.keys(sc)) { sc[k] = sc[k].filter(e => e.key !== 'library'); sc[k].unshift({key:'library',direction:d}); } }
      return applyTierFirst(sc, input, rq);
}

/**
 * 4K-first: hoist `resolution` (then `quality`) to index 0 of EVERY scope.
 *
 * Applying it to every scope is not optional. Upstream picks
 * sortCriteria.movies / .anime over .global for those request types and, when
 * `cached` leads the primary list, ignores the primary list entirely in favour
 * of .cachedMovies / .uncachedMovies. Hoisting only `global` would therefore be
 * a no-op for movie and anime queries — which is exactly how a high-bitrate
 * 1080p REMUX used to reach the top of a 4K build.
 *
 * `cached` stays immediately below resolution, so cached still beats uncached
 * inside a tier; it just no longer beats a whole resolution tier.
 */
function applyTierFirst(scopes, input, rq) {
  if (!resolutionTierFirst(input)) return scopes;
  const out = {};
  for (const [scope, list] of Object.entries(scopes)) out[scope] = hoistResolution(list, rq);
  return out;
}
