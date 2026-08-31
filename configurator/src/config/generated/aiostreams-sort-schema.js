// DO NOT EDIT — generated from AIOStreams f36d0f93ff088280526ebca1fe3c93e2740b6987
// Source: https://github.com/Viren070/AIOStreams/tree/f36d0f93ff088280526ebca1fe3c93e2740b6987
// Upstream version: 2.33.2
// Regenerate with: npm run sync:upstream   (see configurator/README.md)
/** Sort-criteria contract: valid scopes, keys, directions and semantics. */

export const AIO_SORT_SCOPES = Object.freeze(["global","movies","series","anime","cached","uncached","cachedMovies","uncachedMovies","cachedSeries","uncachedSeries","cachedAnime","uncachedAnime"]);

export const AIO_SORT_CRITERIA = Object.freeze(["quality","resolution","language","subtitle","visualTag","audioTag","audioChannel","streamType","encode","size","service","seeders","private","age","addon","regexPatterns","cached","library","keyword","streamExpressionMatched","streamExpressionScore","regexScore","seadex","bitrate","releaseGroup"]);

export const AIO_SORT_DIRECTIONS = Object.freeze(["asc","desc"]);


export const AIO_SORT_DEFAULT_DIRECTIONS = Object.freeze({"addon":"desc","age":"desc","audioChannel":"desc","audioTag":"desc","bitrate":"desc","cached":"desc","encode":"desc","keyword":"desc","language":"desc","library":"desc","private":"desc","quality":"desc","regexPatterns":"desc","regexScore":"desc","releaseGroup":"desc","resolution":"desc","seadex":"desc","seeders":"desc","service":"desc","size":"desc","streamExpressionMatched":"desc","streamExpressionScore":"desc","streamType":"desc","subtitle":"desc","visualTag":"desc"});

/**
 * Keys whose value comes from a per-stream numeric score instead of a
 * preference-list index. Sorting is lexicographic over the criteria vector,
 * so any score key placed above `resolution` can flip resolution order.
 */
export const AIO_SORT_SCORE_KEYS = Object.freeze(["streamExpressionScore","regexScore","bitrate","size","seeders","age","seadex"]);


/**
 * Upstream only consults sortCriteria.cached* / .uncached* when the FIRST
 * global criterion is `cached` (streams/sorter.ts). Any other leading key
 * means the primary list is used verbatim for every stream.
 */
export const AIO_CACHED_SPLIT_REQUIRES_CACHED_FIRST = true;

export const AIO_SORT_SCOPE_SET = Object.freeze(new Set(AIO_SORT_SCOPES));
export const AIO_SORT_CRITERIA_SET = Object.freeze(new Set(AIO_SORT_CRITERIA));

/** Structural problems in a sortCriteria object, as human-readable strings. */
export function invalidSortCriteria(sortCriteria = {}) {
  const problems = [];
  if (!Array.isArray(sortCriteria.global)) problems.push("sortCriteria.global is required and must be an array");
  for (const [scope, list] of Object.entries(sortCriteria)) {
    if (!AIO_SORT_SCOPE_SET.has(scope)) { problems.push(`unknown sort scope: ${scope}`); continue; }
    if (!Array.isArray(list)) { problems.push(`sortCriteria.${scope} must be an array`); continue; }
    list.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") { problems.push(`sortCriteria.${scope}[${index}] must be an object`); return; }
      if (!AIO_SORT_CRITERIA_SET.has(entry.key)) problems.push(`sortCriteria.${scope}[${index}] has unknown key: ${entry.key}`);
      if (!AIO_SORT_DIRECTIONS.includes(entry.direction)) problems.push(`sortCriteria.${scope}[${index}] has invalid direction: ${entry.direction}`);
    });
  }
  return problems;
}
