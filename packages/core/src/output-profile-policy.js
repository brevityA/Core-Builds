/**
 * Core Builds output-profile policy.
 *
 * Profiles are applied after the legacy template assembly step so a Stable or
 * Balanced selection can safely reduce an otherwise feature-rich build without
 * changing credential handling or browser state. This module is pure and never
 * reads or returns credentials.
 */

import { resolutionTierFirst } from './sort-policy.js';
import { ALLOWED_MIGRATION_FIELDS } from './assemble-template.js';

export const OUTPUT_PROFILES = Object.freeze(['stable', 'balanced', 'advanced', 'labs']);

// The legacy TorBox Search preset ID is accepted by v2.31.1 but marked removed
// upstream in v2.32. This is deliberately a target choice, not a silent
// migration to Newznab: the two presets do not have equivalent options or
// credential handling.
//
// 2.35.7 is the schema pin (#770): by the 2026-10-02 audit every public host ran
// 2.35.4 or later, and the 2.34.1 -> 2.35.7 contract drift was additive only.
// Older entries stay so existing saved sessions and shared links keep resolving.
export const AIOSTREAMS_COMPATIBILITY_TARGETS = Object.freeze(['2.31.1', '2.32.0', '2.33.2', '2.34.0', '2.34.1', '2.35.7', '2.36.0', 'unknown']);

// The target a fresh session gets: the AIOStreams release this configurator is
// pinned against (see UPSTREAM.pin). Single source of truth — app.js imports it
// for the state default and every fallback that used to hard-code '2.32.0'.
export const DEFAULT_AIOSTREAMS_VERSION = '2.36.0';

export const OUTPUT_PROFILE_INFO = Object.freeze({
  stable: Object.freeze({
    label: 'Core Stable',
    shortLabel: 'Stable',
    description: 'Minimal local rules, predictable fetching, and visible diagnostics.',
    tone: 'safe',
  }),
  balanced: Object.freeze({
    label: 'Balanced',
    shortLabel: 'Balanced',
    description: 'Curated quality preferences without remote scoring or stacked exits.',
    tone: 'normal',
  }),
  advanced: Object.freeze({
    label: 'Advanced',
    shortLabel: 'Advanced',
    description: 'Local advanced controls; Dynamic may return before every source finishes.',
    tone: 'advanced',
  }),
  labs: Object.freeze({
    label: 'Labs',
    shortLabel: 'Labs',
    description: 'Experimental behaviour; Dynamic may omit later sources. Review warnings first.',
    tone: 'labs',
  }),
});

const SYNCED_EXPRESSION_FIELDS = Object.freeze([
  'syncedExcludedStreamExpressionUrls',
  'syncedIncludedStreamExpressionUrls',
  'syncedPreferredStreamExpressionUrls',
  'syncedRankedStreamExpressionUrls',
]);

const SYNCED_REGEX_FIELDS = Object.freeze([
  'syncedExcludedRegexUrls',
  'syncedRankedRegexUrls',
]);

// Core Builds must not emit synced SEL / stream-expression URLs. Some hosts
// reject them outright and, even where permitted, they make import/runtime
// behaviour depend on an external allowlist and upstream content.
const SCORE_DEPENDENT_EXPRESSION = /\b(?:streamExpressionScore|rseMatched)\s*\(/;

const EXPLICIT_STREAM_TYPES = new Set([
  'debridio', 'debrider', 'jackett', 'prowlarr',
]);

// Preset types whose emission is driven by an optional-extras toggle. knaben was the only one
// until these were added; its id and its preset type are the same string, which is what makes
// the `optional.has(type)` check below work at all. The 18 safe add-ons audited against
// v2.34.1 (all simple toggles; contract re-verified byte-identical at the pin bump) are
// included so Stable/Balanced do not filter them back out
// the moment a user switches them on.
const OPTIONAL_EXTRAS_STREAM_TYPES = new Set([
  'knaben', 'zilean', 'neko-bt', 'sootio', 'webstreamr', 'yastream',
  // 17 safe add-ons (v2.34.1 audit — all isSimpleTogglePreset, lowercased, torbox-search removed in v2.32)
  'anime-kitsu', 'bitmagnet', 'brazuca-torrents',
  'content-deep-dive', 'debridio-tmdb', 'debridio-tvdb',
  'doctor-who-universe', 'easynews', 'easynewsplus', 'jackettio',
  'opensubtitles', 'tmdb-collections', 'torbox',
  'usa-tv-next',
]);

const STABLE_STREAM_TYPES = new Set([
  // Account/library and service bridges.
  'library', 'stremthrutorz', 'stremthrustore', 'easynewsplusplus', 'easynews-search',
  // Two broad sources plus an anime specialist.
  'meteor', 'comet', 'seadex',
  // Free/HTTP base paths.
  'torrentio', 'sootio', 'peerflix', 'hdhub',
]);

// Balanced was the default profile until v3.17 and is still the first step up from
// Core Stable. Restricting it to the Stable set cut a TorBox build to three torrent sources,
// and because AIOStreams applies a template by replacing the whole preset list,
// every update silently removed these five from configs that predated it.
const BALANCED_STREAM_TYPES = new Set([
  ...STABLE_STREAM_TYPES,
  'mediafusion', 'eztv', 'torrent-galaxy', 'zilean', 'knaben',
  // Emitted only for Anime / Movies + Anime content with a torrent debrid service;
  // without it, choosing Anime added no anime source on the default profile.
  // anime-tosho-new replaces animetosho from 2.36 (see applyAIOStreamsCompatibility).
  'animetosho', 'anime-tosho-new',
]);

const CORE_EXTERNAL_KILL = Object.freeze({
  enabled: true,
  expression: "/* Core Stable | External stream kill */ type(streams,'youtube','external')",
});

const BALANCED_LATE_PACK_FALLBACKS = Object.freeze([
  {
    enabled: true,
    expression: "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []",
  },
  {
    enabled: true,
    expression: "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []",
  },
]);

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function unique(valuesToMerge) {
  const seen = new Set();
  return valuesToMerge
    .filter(value => value != null && String(value).trim() !== '')
    .filter(value => {
      const key = String(value).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function enabledExpressions(config, key) {
  return values(config[key])
    .filter(entry => !entry || typeof entry !== 'object' || entry.enabled !== false)
    .map(entry => typeof entry === 'string' ? entry : String(entry?.expression || ''))
    .filter(Boolean);
}

function expressionLabel(entry) {
  const expression = typeof entry === 'string' ? entry : String(entry?.expression || '');
  const match = expression.match(/\/\*\s*(.*?)\s*\*\//s);
  return (match?.[1] || '').replace(/\s+/g, ' ').trim();
}

function namedEntries(config, key, matcher, limit) {
  return values(config[key])
    .filter(entry => entry && typeof entry === 'object' && entry.enabled !== false)
    .filter(entry => matcher.test(expressionLabel(entry)))
    .slice(0, limit)
    .map(entry => ({ ...entry }));
}

function resourcesFor(preset) {
  return values(preset?.resources || preset?.options?.resources).map(value => String(value).toLowerCase());
}

function isStreamPreset(preset) {
  return resourcesFor(preset).includes('stream');
}

function isExplicitPreset(preset, context) {
  // An imported, already-selected source is explicit too. Updating the rules
  // must not silently turn a working custom/indexer setup into a canned stack.
  if (values(context.preservedPresetIds).includes(preset?.instanceId)) return true;
  const type = String(preset?.type || '').toLowerCase();
  if (EXPLICIT_STREAM_TYPES.has(type)) return true;
  const services = new Set([context.service, ...values(context.multiServices)]);
  if (type === 'debridio') return services.has('debridio');
  if (type === 'debrider') return services.has('debrider');
  // A lean profile may trim sources, never leave a chosen service or content
  // type with none: MediaFusion is the only preset that can use Seedr, and the
  // generator emits AnimeTosho only for Anime / Movies + Anime content.
  if (type === 'mediafusion') return services.has('seedr');
  if (type === 'animetosho' || type === 'anime-tosho-new') return ['anime', 'mixed'].includes(context.content);
  const optional = new Set(values(context.optionalScrapers).map(v => String(v).toLowerCase()));
  // Optional-extras toggles are explicit by definition. Without this the four extras that are
  // advertised *disabled* on most lanes (neko-bt/sootio/webstreamr/yastream) get filtered back
  // out of Stable/Balanced the moment a user switches them on — the toggle would silently do
  // nothing. Scoped to a set rather than "any id in optionalScrapers" so `nzbhydra`/`newznab`
  // keep their deliberate Stable exclusion below. Lowercased for case-insensitive match (easynewsPlus).
  if (OPTIONAL_EXTRAS_STREAM_TYPES.has(type)) return optional.has(type);
  // AIOStreams v2.32 replaced the legacy Newznab URL/apiPath fields with an
  // options.api object. Keep Newznab out of Stable/Balanced until the explicit
  // v2.32 capability/import lane is proven rather than generating a shape that
  // is ambiguous across public-host versions.
  if (type === 'newznab') return false;
  return false;
}

function stablePresets(config, context, allowed = STABLE_STREAM_TYPES) {
  return values(config.presets).filter(preset => {
    if (!preset || typeof preset !== 'object') return false;
    if (!isStreamPreset(preset)) return true;
    const type = String(preset.type || '').toLowerCase();
    return allowed.has(type) || isExplicitPreset(preset, context);
  });
}

// NOTE: this duplicates src/core/device-policies.js#resolutionPolicy and is
// applied AFTER it, so it wins. Keep the two in step until the duplication is
// removed. 1440p must appear in the 4K list: a resolution that is neither
// preferred nor excluded scores -Infinity upstream and sorts below 720p.
function preferredResolutions(resolution) {
  if (resolution === '1080p') return ['1080p', '720p', 'Unknown'];
  if (resolution === '4k') return ['2160p', '1440p', '1080p', '720p', 'Unknown'];
  if (resolution === 'ultrawide') return ['2160p', '1440p', '1080p', '720p', 'Unknown'];
  if (resolution === 'mixed') return ['2160p', '1080p', '1440p', '720p', '576p', '480p', 'Unknown'];
  return [];
}

function stableSortCriteria(context) {
  const direction = 'desc';
  const core = [
    { key: 'cached', direction },
    { key: 'resolution', direction },
    { key: 'quality', direction },
    { key: 'visualTag', direction },
    { key: 'audioTag', direction },
    { key: 'audioChannel', direction },
    { key: 'language', direction },
    { key: 'encode', direction },
    { key: 'size', direction },
  ];
  const p2p = [
    { key: 'resolution', direction },
    { key: 'quality', direction },
    { key: 'seeders', direction },
    { key: 'language', direction },
    { key: 'encode', direction },
    { key: 'size', direction },
  ];
  // The Stable profile replaces the generated sort list wholesale, so it has to
  // honour the 4K-first rule itself — otherwise a Stable 4K build would fall
  // back to cached-first and a cached 1080p would outrank an uncached 2160p.
  const base = context.service === 'p2p' ? p2p : core;
  // 4K tier-first: resolution, then cached, then quality — the same order as
  // sort-policy.js#hoistResolution, so an uncached 2160p never outranks a
  // cached one on quality alone.
  const lead = ['resolution', 'cached', 'quality'];
  // Resolution First leads with resolution at any tier; Quality First still wins, as in sort-policy.
  const global = resolutionTierFirst(context) || (context.resolutionFirst && !context.qualityFirst)
    ? [
      ...lead.flatMap(key => base.filter(entry => entry.key === key)),
      ...base.filter(entry => !lead.includes(entry.key)),
    ]
    : base;
  return {
    global,
    movies: [], series: [], anime: [], cached: [], uncached: [],
    cachedMovies: [], uncachedMovies: [], cachedSeries: [], uncachedSeries: [],
    cachedAnime: [], uncachedAnime: [],
  };
}

// Remote scoring is the synced URL fields plus the override lists that only
// re-score what those URLs deliver. Inline regex is not remote: every pattern
// is a verbatim copy of a host-allowlisted string, so Balanced keeps it.
function clearSyncedScoring(config) {
  for (const key of [...SYNCED_EXPRESSION_FIELDS, ...SYNCED_REGEX_FIELDS]) config[key] = [];
  config.regexOverrides = [];
  config.selOverrides = [];
}

function clearRemoteScoring(config) {
  clearSyncedScoring(config);
  config.rankedRegexPatterns = [];
  config.preferredRegexPatterns = [];
  config.excludedRegexPatterns = [];
}

function hasLocalRankedExpressions(config) {
  return values(config.rankedStreamExpressions).some(entry => {
    if (!entry || typeof entry !== 'object' || entry.enabled === false) return false;
    const expression = String(entry.expression || '').trim();
    return expression && expression !== '[]' && !/^\/\*.*\*\/\s*\[\]$/s.test(expression);
  });
}

function removeScoreDependentRules(config) {
  if (hasLocalRankedExpressions(config)) return;

  for (const key of ['excludedStreamExpressions', 'includedStreamExpressions', 'requiredStreamExpressions', 'preferredStreamExpressions']) {
    config[key] = values(config[key]).filter(entry => !SCORE_DEPENDENT_EXPRESSION.test(
      typeof entry === 'string' ? entry : String(entry?.expression || '')
    ));
  }

  for (const [scope, sort] of Object.entries(config.sortCriteria || {})) {
    if (!Array.isArray(sort)) continue;
    config.sortCriteria[scope] = sort.filter(entry => entry?.key !== 'streamExpressionScore');
  }
}

function enforceLocalExpressionPolicy(config) {
  for (const key of SYNCED_EXPRESSION_FIELDS) config[key] = [];
  removeScoreDependentRules(config);
  removeDeadSortKeys(config);
}

// A sort key with nothing to read from is not neutral: it reads as a working
// tiebreaker and hides that the real signal is missing. regexScore is filled
// only by ranked regex (inline or synced). audioChannel has no case in the
// upstream sorter (verified on main 2026-10-02) and falls through to 0; re-add
// it here once upstream handles it. Static templates keep it — see CLAUDE.md.
function removeDeadSortKeys(config) {
  const hasRankedRegex = values(config.rankedRegexPatterns).length > 0
    || values(config.syncedRankedRegexUrls).length > 0;
  const dead = new Set(['audioChannel']);
  if (!hasRankedRegex) dead.add('regexScore');
  for (const [scope, sort] of Object.entries(config.sortCriteria || {})) {
    if (!Array.isArray(sort)) continue;
    config.sortCriteria[scope] = sort.filter(entry => !dead.has(entry?.key));
  }
}

function disableEarlyExitAndBackgroundFetch(config, { disableAutoPlay = false } = {}) {
  config.groups = { enabled: false, groupings: [] };
  config.dynamicAddonFetching = { enabled: false };
  config.preloadStreams = { enabled: false };
  config.precacheNextEpisode = false;
  delete config.precacheSelector;
  delete config.precacheSingleStream;
  config.cacheAndPlay = { enabled: false, streamTypes: [] };
  if (disableAutoPlay) config.autoPlay = { ...(config.autoPlay || {}), enabled: false };
}

// Groups and Dynamic are independent early-exit mechanisms. A generated
// template must never combine them: one can skip a later group while the other
// can return before remaining sources finish. Advanced/Labs may retain an
// explicitly selected Dynamic strategy, but Group scheduling is removed when
// both are present.
function preventStackedFetchExits(config) {
  if (config.groups?.enabled && config.dynamicAddonFetching?.enabled) {
    config.groups = { enabled: false, groupings: [] };
  }
}

function compatibilityTarget(context = {}) {
  const requested = String(context.aiostreamsVersion || '2.31.1');
  return AIOSTREAMS_COMPATIBILITY_TARGETS.includes(requested) ? requested : 'unknown';
}

function applyAIOStreamsCompatibility(template, context) {
  const target = compatibilityTarget(context);
  const config = template.config;
  const hasLegacyTorboxSearch = values(config.presets).some(
    preset => String(preset?.type || '').toLowerCase() === 'torbox-search'
  );

  // Only the explicitly selected v2.31.1 lane retains the legacy built-in
  // preset. v2.32 and unknown targets fail safe by removing it; a future
  // Newznab replacement must be an explicit, credential-aware migration.
  if (target === '2.31.1' && config.nzbFailover === undefined && config.failover !== undefined) {
    const canonical = config.failover || {};
    config.nzbFailover = {
      enabled: Boolean(canonical.enabled),
      count: Number(canonical.maxAttempts) || 3,
      position: canonical.position === 'beforeLimiting' ? 'first' : 'last',
    };
    delete config.failover;
  }

  if (target !== '2.31.1') {
    config.presets = values(config.presets).filter(
      preset => String(preset?.type || '').toLowerCase() !== 'torbox-search'
    );


    // Modern targets receive the canonical v2.34 failover shape. Preserve the
    // explicit v2.31.1 lane unchanged for hosts that still require nzbFailover.
    if (config.failover === undefined && config.nzbFailover !== undefined) {
      const legacy = config.nzbFailover || {};
      config.failover = {
        enabled: Boolean(legacy.enabled),
        contentTypes: ['usenet', 'debrid'],
        ...(legacy.position === 'first' ? { position: 'beforeLimiting' } : {}),
        maxAttempts: Number(legacy.count ?? legacy.maxFailoverNzbs) || 3,
      };
    }
    delete config.nzbFailover;
  }

  template.metadata = {
    ...(template.metadata || {}),
    coreBuildsAIOStreamsTarget: target,
    ...(hasLegacyTorboxSearch && target === '2.31.1'
      ? { coreBuildsLegacyTorboxSearch: true }
      : {}),
  };
  if (target !== '2.31.1') delete template.metadata.coreBuildsLegacyTorboxSearch;
  useAnimeToshoForTarget(config, target);
  dropRemovedPresets(config, target);
  stripNonSchemaPresetKeys(config);
  return template;
}

// AnimeTosho's feed (feed.animetosho.org) stopped taking new releases on 2026-05-09
// and shuts down in October 2026; AIOStreams 2.36 archived that preset. The
// generators emit its community continuation, anime-tosho-new (feed.animetosho.net),
// which needs no API key from 2.36.0 but requires one before it. An explicitly
// older target keeps the archived preset so its save is not refused; 'unknown'
// is treated as current.
const ANIME_TOSHO_NEW_FROM = '2.36.0';

// Presets AIOStreams 2.36.0 marks removed (METADATA.DISABLED.removed): their addons are
// gone, and a save carrying one is refused ("AIO Subtitle has been removed: Addon is no
// longer hosted"). An imported or updated config can still hold one, so exports for the
// pinned or an unknown target drop them; an explicit older target keeps them, since those
// releases accept them. Held equal to the pinned host data by
// configurator/tests/preset-resources.test.mjs.
export const PRESETS_REMOVED_IN_2_36 = Object.freeze([
  'ai-companion', 'aiosubtitle', 'argentina-tv', 'astream', 'baguettio', 'debridio-ic4a', 'debridio-tv',
  'debridio-watchtower', 'nuvio-streams', 'streamasia', 'streamfusion', 'subhero', 'torbox', 'torbox-search', 'usa-tv',
]);
const REMOVED_PRESET_TYPES = new Set(PRESETS_REMOVED_IN_2_36.map(type => type.toLowerCase()));
function dropRemovedPresets(config, target) {
  if (!Array.isArray(config.presets) || (target !== 'unknown' && !targetAtLeast(target, ANIME_TOSHO_NEW_FROM))) return;
  config.presets = config.presets.filter(preset => !REMOVED_PRESET_TYPES.has(String(preset?.type || '').toLowerCase()));
}
function targetAtLeast(target, floor) {
  const [a, b, c] = target.split('.').map(Number), [x, y, z] = floor.split('.').map(Number);
  return a !== x ? a > x : b !== y ? b > y : c >= z;
}
function useAnimeToshoForTarget(config, target) {
  if (target === 'unknown' || !Array.isArray(config.presets) || targetAtLeast(target, ANIME_TOSHO_NEW_FROM)) return;
  config.presets = config.presets.map(preset => (
    preset && String(preset.type).toLowerCase() === 'anime-tosho-new' ? { ...preset, type: 'animetosho' } : preset
  ));
}

// AIOStreams' PresetSchema keeps type, instanceId, enabled, options and category,
// and strips anything else on save. The generators tag presets with a top-level
// `resources` hint that isStreamPreset() reads while the profiles trim sources;
// AIOStreams never sees it (it reads options.resources, falling back to everything
// the preset supports), so it is dropped here, after the reducers.
//
// Where a preset supports more than the role Core Builds gives it, the hint becomes
// the options.resources restriction AIOStreams applies. Read from the pinned
// release's /api/v1/status (2.36.0, 2026-10-22; held by
// configurator/tests/upstream/preset-resources-2.36.0.json): without it Torrentio,
// StremThru Store and Peerflix add debrid-library catalogs, Sootio and Flix-Streams
// catalogs, YaStream catalogs and subtitles, and TMDB Collections streams.
// MediaFusion and Meteor set options.resources in the generators directly.
const PRESET_SCHEMA_KEYS = new Set(['type', 'instanceId', 'enabled', 'options', 'category']);
const RESOURCE_LIMITED_TYPES = new Set(['torrentio', 'stremthrustore', 'peerflix', 'sootio', 'yastream', 'flix-streams', 'tmdb-collections']);
function stripNonSchemaPresetKeys(config) {
  if (!Array.isArray(config.presets)) return;
  config.presets = config.presets.map(preset => {
    if (!preset || typeof preset !== 'object') return preset;
    const kept = Object.fromEntries(Object.entries(preset).filter(([key]) => PRESET_SCHEMA_KEYS.has(key)));
    const hint = values(preset.resources);
    if (hint.length && RESOURCE_LIMITED_TYPES.has(String(preset.type || '').toLowerCase()) && !values(kept.options?.resources).length) {
      kept.options = { ...(kept.options || {}), resources: [...hint] };
    }
    return kept;
  });
}

function applyNativeFilters(config, context) {
  config.excludedQualities = unique([
    ...values(config.excludedQualities),
    'CAM', 'SCR', 'TS', 'TC', 'HC HD-Rip',
  ]);
  config.excludedVisualTags = unique([
    ...values(config.excludedVisualTags),
    '3D', 'H-OU', 'H-SBS',
  ]);
  // `excludedStreamSources` is not an upstream key (see KNOWN_DEAD_CONFIG_KEYS)
  // — the live equivalent is the stream *type*. 'AI Enhanced' has no type
  // spelling; external-URL killing stays with the Stable profile's ESE.
  config.excludedStreamTypes = unique([
    ...values(config.excludedStreamTypes),
    'youtube',
  ]);

  const resolution = context.resolution;
  if (resolution) {
    config.preferredResolutions = preferredResolutions(resolution);
    config.requiredResolutions = [];
    if (resolution === '1080p') {
      config.excludedResolutions = unique([
        ...values(config.excludedResolutions),
        '2160p', '1440p',
      ]);
    }
  }

  // Hide 4K and Hide Dolby Vision are plain filters, so they belong in native
  // fields that every profile keeps. Emitted only as stream expressions, they
  // were wiped with the rest by Stable and Balanced and the toggles did nothing.
  if (context.exclude4K && resolution !== '1080p') {
    config.excludedResolutions = unique([...values(config.excludedResolutions), '2160p', '1440p']);
  }
  if (context.excludeDV) {
    config.excludedVisualTags = unique([...values(config.excludedVisualTags), 'DV', 'HDR+DV']);
  }

  const selectedLanguages = unique(values(context.langs));
  if (context.langExclusive && selectedLanguages.length) {
    config.requiredLanguages = selectedLanguages;
    config.preferredLanguages = selectedLanguages;
  } else {
    config.requiredLanguages = [];
    config.preferredLanguages = unique([
      ...selectedLanguages,
      'Original', 'Dual Audio', 'Multi', 'Dubbed', 'Unknown',
    ]);
  }
}

function removeImplicitPosterDependency(config) {
  config.posterService = 'none';
  delete config.rpdbApiKey;
  delete config.usePosterRedirectApi;
  delete config.usePosterServiceForMeta;
  delete config.enhanceResults;
}

function applyStableFormatter(config) {
  config.formatter = {
    id: 'tamtaro',
    definitions: {
      overrides: {
        tamtaro: {
          name: "{service.cached::istrue[\"⚡ \"||\"\"]}{stream.resolution::exists[\"{stream.resolution} \"||\"\"]}{stream.title::exists[\"{stream.title}\"||\"\"]}",
          description: "{stream.quality::exists[\"{stream.quality}\"||\"\"]}{stream.encode::exists[\" · {stream.encode}\"||\"\"]}{stream.size::exists[\" · {stream.size::sbytes}\"||\"\"]}\n{service.id} · {stream.type}{stream.languages::exists[\" · {stream.languageEmojis::join(' ')}\"||\"\"]}",
        },
      },
    },
  };
}

function setResultLimits(config, context, profile) {
  const high = ['4k', 'ultrawide', 'mixed'].includes(context.resolution);
  const global = profile === 'stable' ? (high ? 12 : 10) : (high ? 20 : 16);
  const resolution = profile === 'stable' ? 3 : 5;
  // `maxResults` / `maxResultsPerResolution` are not upstream keys (see
  // KNOWN_DEAD_CONFIG_KEYS) — resultLimits is the live spelling.
  config.resultLimits = { global, resolution, mode: 'independent' };
}

function clearUnselectedCaps(config, context) {
  const explicitSize = context.sizeLimit && context.sizeLimit !== 'unlimited';
  if (!explicitSize) delete config.size;
  if (!(Number(context.bandwidthMbps) > 0)) delete config.bitrate;
}

function profileMetadata(template, profile) {
  template.metadata = {
    ...(template.metadata || {}),
    coreBuildsProfile: profile,
    coreBuildsProfileVersion: '1',
  };
}

function applyStableProfile(template, context) {
  const config = template.config;
  clearRemoteScoring(config);
  applyNativeFilters(config, context);
  config.excludedStreamExpressions = [{ ...CORE_EXTERNAL_KILL }];
  config.includedStreamExpressions = [];
  config.requiredStreamExpressions = [];
  config.preferredStreamExpressions = [];
  config.rankedStreamExpressions = [];
  config.presets = stablePresets(config, context);
  config.sortCriteria = stableSortCriteria(context);
  setResultLimits(config, context, 'stable');
  clearUnselectedCaps(config, context);
  disableEarlyExitAndBackgroundFetch(config, { disableAutoPlay: true });
  config.hideErrors = false;
  // Off by default. These render as "Removal Reasons" / "Pipeline Timing" cards
  // in the stream list itself — on Android TV they sit ABOVE the streams, so the
  // first thing a user sees is diagnostics rather than something to play. Stable
  // was the only profile enabling them; the other 66 templates already ship
  // `enabled: false`, so this makes the fleet consistent. `hideErrors` stays
  // false, which is what actually keeps failures visible.
  config.statistics = {
    enabled: false,
    position: 'bottom',
    statsToShow: ['addon', 'filter', 'timing'],
    showFilterStatsOnNoStreams: true,
  };
  removeImplicitPosterDependency(config);
  applyStableFormatter(config);
  return template;
}

function applyBalancedProfile(template, context) {
  const config = template.config;
  clearSyncedScoring(config);
  applyNativeFilters(config, context);
  const safePse = namedEntries(
    config,
    'preferredStreamExpressions',
    /^(?:language preference|sub-first anime booster|s-tier|a-tier|b-tier|c-tier|codec efficiency booster|hdr\/dv priority)/i,
    8
  );
  const safeIse = namedEntries(
    config,
    'includedStreamExpressions',
    /^(?:protect library|smart play pin)/i,
    2
  );
  config.excludedStreamExpressions = [
    { ...CORE_EXTERNAL_KILL },
    ...BALANCED_LATE_PACK_FALLBACKS.map(entry => ({ ...entry })),
  ];
  config.includedStreamExpressions = safeIse;
  config.requiredStreamExpressions = [];
  config.preferredStreamExpressions = safePse;
  config.rankedStreamExpressions = [];
  config.presets = stablePresets(config, context, BALANCED_STREAM_TYPES);
  setResultLimits(config, context, 'balanced');
  disableEarlyExitAndBackgroundFetch(config);
  config.hideErrors = false;
  return template;
}

/**
 * Resolve a requested profile. `auto` is Core Stable for every flow; only an
 * explicit architecture (IQR, Apex Mixed) or an explicit profile selects more.
 */
export function resolveOutputProfile(input = {}) {
  const requested = String(input.outputProfile || 'auto').toLowerCase();
  if (OUTPUT_PROFILES.includes(requested)) return requested;
  if (input.simpleMode || input.quickStart) return 'stable';
  if (input.pseArch === 'apex-mixed') return 'labs';
  if (input.pseArch === 'iqr') return 'advanced';
  return 'stable';
}

// Builder choices a profile replaces or drops, and why. Stable rewrites the
// formatter, sort list (where Library Boost lives) and auto-play; Stable and
// Balanced both drop rules that exist only as stream expressions, and preloading.
const PROFILE_DROPS = Object.freeze({
  formatter: Object.freeze({ dropped: ['stable'], reason: 'Core Stable always uses its own stream card' }),
  libraryBoost: Object.freeze({ dropped: ['stable'], reason: 'Core Stable does not boost library items' }),
  autoPlay: Object.freeze({ dropped: ['stable'], reason: 'Core Stable turns auto-play off' }),
  foreignLangKill: Object.freeze({ dropped: ['stable', 'balanced'], reason: 'the foreign-language filter runs only in the Advanced and Labs profiles' }),
  preload: Object.freeze({ dropped: ['stable', 'balanced'], reason: 'preloading runs only in the Advanced and Labs profiles' }),
  streamPool: Object.freeze({ dropped: ['stable', 'balanced'], reason: 'the stream pool sizes dynamic fetching, which runs only in the Advanced and Labs profiles' }),
});

/**
 * What to tell the user when the resolved profile would silently drop a choice
 * they just made. An `auto` build moves to Balanced when Balanced honours the
 * choice, so it takes effect; an explicitly chosen profile is never overridden,
 * and nothing switches to Advanced on its own (it fetches differently). Null
 * when the choice takes effect as is.
 */
export function profileVerdictForChoice(setting, context = {}) {
  const rule = PROFILE_DROPS[setting];
  if (!rule) return null;
  const profile = resolveOutputProfile(context);
  if (!rule.dropped.includes(profile)) return null;
  const explicit = OUTPUT_PROFILES.includes(String(context.outputProfile || 'auto').toLowerCase());
  const switchTo = !explicit && !rule.dropped.includes('balanced') ? 'balanced' : null;
  return { profile, reason: rule.reason, switchTo };
}

/**
 * Apply the selected profile without mutating the source template.
 */
export function applyOutputProfile(rawTemplate, requestedProfile = 'auto', context = {}) {
  if (!rawTemplate || typeof rawTemplate !== 'object') throw new TypeError('Template must be an object');
  const template = clone(rawTemplate);
  template.config = template.config && typeof template.config === 'object' ? template.config : {};
  const profile = OUTPUT_PROFILES.includes(requestedProfile)
    ? requestedProfile
    : resolveOutputProfile({ ...context, outputProfile: requestedProfile });

  const beforeProfile = values(context.preserveFields).length ? clone(template.config) : {};
  if (profile === 'stable') applyStableProfile(template, context);
  else if (profile === 'balanced') applyBalancedProfile(template, context);

  // Cherry-picked values were assembled before the profile reducers. Restore
  // them AFTER those reducers, otherwise Stable overwrites a kept sort list or
  // formatter and the export contradicts the user's confirmation. Safety and
  // compatibility gates below still apply, including the no-synced-SEL policy.
  for (const key of values(context.preserveFields)) {
    if (!ALLOWED_MIGRATION_FIELDS.has(key) || key === 'parentConfig') continue;
    if (Object.hasOwn(beforeProfile, key)) template.config[key] = clone(beforeProfile[key]);
    else delete template.config[key];
  }
  for (const key of values(context.removeFields)) {
    if (ALLOWED_MIGRATION_FIELDS.has(key) && key !== 'parentConfig') delete template.config[key];
  }

  enforceLocalExpressionPolicy(template.config);
  preventStackedFetchExits(template.config);
  applyAIOStreamsCompatibility(template, context);
  profileMetadata(template, profile);
  return template;
}
