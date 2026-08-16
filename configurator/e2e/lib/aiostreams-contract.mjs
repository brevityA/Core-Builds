/**
 * AIOStreams preset option contract — the thing the mocked backend never checked.
 *
 * WHY THIS EXISTS
 *
 * The e2e mock fulfils POST /api/v1/user with success no matter what config it is handed.
 * That made the suite validate our own shape against itself. Three real bugs shipped green
 * behind it, all the same shape: we emitted a bare `apiKey` for a preset whose schema
 * declares a PREFIXED key, so AIOStreams saw its required option as undefined and rejected
 * the config — but only for users who actually supplied a key, which is why nobody caught it.
 *
 *   debridio  emitted apiKey  → schema wants debridioApiKey   (field report, fixed v2.93)
 *   jackett   emitted apiKey  → schema wants jackettApiKey    (found by building this table)
 *   prowlarr  emitted apiKey  → schema wants prowlarrApiKey   (found by building this table)
 *
 * Two of those were found by writing this file. That is the argument for it.
 *
 * WHAT IT CHECKS
 *
 * Unknown option keys, not missing required ones. Several AIOStreams options are required
 * only conditionally (jackettUrl/jackettApiKey are required unless the host is preconfigured),
 * so asserting presence would produce false failures. But emitting a key the preset does not
 * define is unambiguously wrong in every configuration — and it is precisely the bug class
 * above. Cheap, precise, no false positives.
 *
 * PROVENANCE
 *
 * Every entry below was read from the AIOStreams preset source, not inferred. Presets absent
 * from this table are skipped rather than guessed at — and `assertKnownPresetTypes` fails when
 * app.js starts emitting a type we have no entry for, so the gap is reported instead of
 * silently widening. That is the C4 lesson: a hand-maintained table needs a drift alarm.
 */

/** Option ids each preset accepts. Dotted ids denote nested objects (newznab's `api.url`). */
export const PRESET_OPTION_IDS = {
  debridio: ['name', 'timeout', 'debridioApiKey', 'socials'],
  jackett: ['name', 'timeout', 'services', 'notRequiredNote', 'jackettUrl', 'jackettApiKey', 'mediaTypes', 'useMultipleInstances'],
  prowlarr: ['name', 'timeout', 'notRequiredNote', 'prowlarrUrl', 'prowlarrApiKey', 'indexers', 'sources', 'tags', 'mediaTypes', 'services', 'useMultipleInstances'],
  subdl: ['name', 'resources', 'timeout', 'subDlApiKey', 'language', 'hearingImpairment', 'socials'],
  newznab: ['name', 'api', 'api.url', 'api.apiKey', 'proxyAuth', 'timeout', 'mediaTypes', 'services', 'searchMode', 'seasonEpisodeStrategy', 'paginate', 'useMultipleInstances', 'zyclopsHealthProxy'],
};

/**
 * Preset types this contract knowingly does not model yet — skipped, not guessed.
 *
 * This list is checked for completeness against the generator by
 * `configurator/tests/preset-contract-coverage.test.mjs`, which enumerates every type app.js
 * can emit and fails when one is in neither set. That unit test found `torrent-galaxy` and
 * `torrents-db` missing here: the e2e fixture happens not to emit them, so the drift alarm
 * would have stayed quiet until some other config tripped it in CI.
 */
export const UNMODELLED_PRESET_TYPES = new Set([
  'library', 'comet', 'meteor', 'mediafusion', 'knaben', 'eztv', 'hdhub', 'animetosho',
  'seadex', 'neko-bt', 'sootio', 'peerflix', 'easynews-search', 'easynewsPlusPlus',
  'easynewsPlus', 'easynews', 'streamnzb', 'nzbhydra', 'aiosubtitle', 'opensubtitles-v3-plus',
  'tmdb-addon', 'streaming-catalogs', 'anime-catalogs', 'rpdb-catalogs', 'torrent-catalogs',
  'stremthruTorz', 'stremthruStore', 'torrentio', 'webstreamr', 'nuvio-streams', 'flix-streams',
  'torznab', 'zilean', 'jackettio', 'debrider', 'torrent-galaxy', 'torrents-db',
]);

/**
 * Validate a generated config against the modelled option contract.
 * @returns {{ok: true} | {ok: false, error: {message: string}}} AIOStreams' rejection shape.
 */
export function validateConfigOptions(config) {
  const presets = config?.presets;
  if (!Array.isArray(presets)) return { ok: true };

  for (const preset of presets) {
    const known = PRESET_OPTION_IDS[preset?.type];
    if (!known) continue; // unmodelled — skipped by design, see assertKnownPresetTypes
    const allowed = new Set(known);

    const reject = (id) => ({
      ok: false,
      error: {
        message:
          `The value for option '${id}' in preset '${preset.type}' is invalid: ` +
          `Error: Option ${id} is not defined by this preset. ` +
          `Accepted: ${known.join(', ')}`,
      },
    });

    for (const [key, value] of Object.entries(preset.options || {})) {
      const hasNestedIds = known.some(id => id.startsWith(`${key}.`));
      if (!allowed.has(key) && !hasNestedIds) return reject(key);

      // Descend into modelled nested objects (newznab's `api: {url, apiKey}`). Accepting the
      // parent wholesale would let `api: {url, unexpected}` through — the same "looks checked,
      // checks nothing" gap this whole contract exists to close.
      if (hasNestedIds && value && typeof value === 'object' && !Array.isArray(value)) {
        for (const childKey of Object.keys(value)) {
          if (!allowed.has(`${key}.${childKey}`)) return reject(`${key}.${childKey}`);
        }
      }
    }
  }
  return { ok: true };
}

/**
 * Fail when the generator emits a preset type neither modelled nor explicitly skipped, so the
 * table cannot quietly fall behind the code the way SENSITIVE_KEYS did (audit C4).
 * @param {string[]} emittedTypes
 */
export function assertKnownPresetTypes(emittedTypes) {
  const unknown = [...new Set(emittedTypes)].filter(
    t => !PRESET_OPTION_IDS[t] && !UNMODELLED_PRESET_TYPES.has(t),
  );
  if (unknown.length) {
    throw new Error(
      `Preset type(s) not covered by the AIOStreams option contract: ${unknown.join(', ')}.\n` +
      'Add the verified option ids to PRESET_OPTION_IDS (read them from the AIOStreams preset\n' +
      'source — do not guess), or list the type in UNMODELLED_PRESET_TYPES to skip it knowingly.',
    );
  }
}
