/**
 * Core Builds output-profile policy.
 *
 * Profiles are applied after the legacy template assembly step so a Stable or
 * Balanced selection can safely reduce an otherwise feature-rich build without
 * changing credential handling or browser state. This module is pure and never
 * reads or returns credentials.
 */

import { resolutionTierFirst } from './sort-policy.js';

export const OUTPUT_PROFILES = Object.freeze(['stable', 'balanced', 'advanced', 'labs']);

// The legacy TorBox Search preset ID is accepted by v2.31.1 but marked removed
// upstream in v2.32. This is deliberately a target choice, not a silent
// migration to Newznab: the two presets do not have equivalent options or
// credential handling.
export const AIOSTREAMS_COMPATIBILITY_TARGETS = Object.freeze(['2.31.1', '2.32.0', 'unknown']);

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

const STABLE_STREAM_TYPES = new Set([
  // Account/library and service bridges.
  'library', 'stremthrutorz', 'stremthrustore', 'easynewsplusplus', 'easynews-search',
  // Two broad sources plus an anime specialist.
  'meteor', 'comet', 'seadex',
  // Free/HTTP base paths.
  'torrentio', 'sootio', 'peerflix', 'hdhub',
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
  const type = String(preset?.type || '').toLowerCase();
  if (EXPLICIT_STREAM_TYPES.has(type)) return true;
  const services = new Set([context.service, ...values(context.multiServices)]);
  if (type === 'debridio') return services.has('debridio');
  if (type === 'debrider') return services.has('debrider');
  const optional = new Set(values(context.optionalScrapers));
  if (type === 'knaben') return optional.has('knaben');
  // AIOStreams v2.32 replaced the legacy Newznab URL/apiPath fields with an
  // options.api object. Keep Newznab out of Stable/Balanced until the explicit
  // v2.32 capability/import lane is proven rather than generating a shape that
  // is ambiguous across public-host versions.
  if (type === 'newznab') return false;
  return false;
}

function stablePresets(config, context) {
  return values(config.presets).filter(preset => {
    if (!preset || typeof preset !== 'object') return false;
    if (!isStreamPreset(preset)) return true;
    const type = String(preset.type || '').toLowerCase();
    return STABLE_STREAM_TYPES.has(type) || isExplicitPreset(preset, context);
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
  const global = resolutionTierFirst(context)
    ? [
      ...base.filter(entry => entry.key === 'resolution' || entry.key === 'quality'),
      ...base.filter(entry => entry.key !== 'resolution' && entry.key !== 'quality'),
    ]
    : base;
  return {
    global,
    movies: [], series: [], anime: [], cached: [], uncached: [],
    cachedMovies: [], uncachedMovies: [], cachedSeries: [], uncachedSeries: [],
    cachedAnime: [], uncachedAnime: [],
  };
}

function clearRemoteScoring(config) {
  for (const key of [...SYNCED_EXPRESSION_FIELDS, ...SYNCED_REGEX_FIELDS]) config[key] = [];
  config.rankedRegexPatterns = [];
  config.preferredRegexPatterns = [];
  config.excludedRegexPatterns = [];
  config.regexOverrides = [];
  config.selOverrides = [];
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
  if (target !== '2.31.1') {
    config.presets = values(config.presets).filter(
      preset => String(preset?.type || '').toLowerCase() !== 'torbox-search'
    );
  }

  template.metadata = {
    ...(template.metadata || {}),
    coreBuildsAIOStreamsTarget: target,
    ...(hasLegacyTorboxSearch && target === '2.31.1'
      ? { coreBuildsLegacyTorboxSearch: true }
      : {}),
  };
  if (target !== '2.31.1') delete template.metadata.coreBuildsLegacyTorboxSearch;
  return template;
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
  config.excludedStreamSources = unique([
    ...values(config.excludedStreamSources),
    'YouTube', 'AI Enhanced',
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
  config.resultLimits = { global, resolution, mode: 'independent' };
  config.maxResults = global;
  config.maxResultsPerResolution = resolution;
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
  config.statistics = {
    enabled: true,
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
  clearRemoteScoring(config);
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
  config.presets = stablePresets(config, context);
  setResultLimits(config, context, 'balanced');
  disableEarlyExitAndBackgroundFetch(config);
  config.hideErrors = false;
  return template;
}

/**
 * Resolve a requested profile. `auto` makes Simple Mode and Quick Install
 * genuinely Stable, maps the ordinary Custom flow to Balanced, and reserves
 * Advanced/Labs for an explicit architecture or profile selection.
 */
export function resolveOutputProfile(input = {}) {
  const requested = String(input.outputProfile || 'auto').toLowerCase();
  if (OUTPUT_PROFILES.includes(requested)) return requested;
  if (input.simpleMode || input.quickStart) return 'stable';
  if (input.pseArch === 'apex-mixed') return 'labs';
  if (input.pseArch === 'iqr') return 'advanced';
  return 'balanced';
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

  if (profile === 'stable') applyStableProfile(template, context);
  else if (profile === 'balanced') applyBalancedProfile(template, context);

  enforceLocalExpressionPolicy(template.config);
  preventStackedFetchExits(template.config);
  applyAIOStreamsCompatibility(template, context);
  profileMetadata(template, profile);
  return template;
}
