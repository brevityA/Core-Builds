/**
 * Core Builds Reliable Configurator — V3 template contract.
 *
 * This is intentionally separate from the legacy builder while it is proven.
 * It has no network dependency, no synced stream-expression URL support, and
 * no implicit configuration upload path.
 */

export const REBUILD_VERSION = '0.1.0';

// Version capability is deliberately separate from the upstream latest tag.
// A release can be structurally compatible with this tiny V3 template while
// still needing selector/runtime/import proof before Core Builds calls it
// verified.
export const AIOSTREAMS_CAPABILITY_MANIFEST = Object.freeze({
  '2.31.1': Object.freeze({
    status: 'verified',
    label: '2.31.1 — verified V1 target',
    detail: 'Verified V1 configuration contract',
  }),
  '2.32.0': Object.freeze({
    status: 'review',
    label: '2.32.0 — compatibility review pending',
    detail: 'Download only — v2.32 changed Newznab configuration and removed the legacy torbox-search preset',
  }),
  unknown: Object.freeze({
    status: 'unknown',
    label: 'Unknown / older — do not claim verified support',
    detail: 'Download only — run compatibility test first',
  }),
});

export const SUPPORTED_AIOSTREAMS_VERSIONS = Object.freeze(
  Object.entries(AIOSTREAMS_CAPABILITY_MANIFEST)
    .filter(([, capability]) => capability.status === 'verified')
    .map(([version]) => version)
);

export function aiostreamsCapability(version) {
  return AIOSTREAMS_CAPABILITY_MANIFEST[version] || AIOSTREAMS_CAPABILITY_MANIFEST.unknown;
}

export const SERVICES = Object.freeze({
  torbox: {
    label: 'TorBox',
    kind: 'debrid',
    serviceId: 'torbox',
    credentialLabel: 'TorBox API key',
    bridge: 'stremthruTorz',
    bridgeName: 'StremThru Torz',
  },
  realdebrid: {
    label: 'Real-Debrid',
    kind: 'debrid',
    serviceId: 'realdebrid',
    credentialLabel: 'Real-Debrid API key',
    bridge: 'stremthruStore',
    bridgeName: 'StremThru Real-Debrid',
  },
  alldebrid: {
    label: 'AllDebrid',
    kind: 'debrid',
    serviceId: 'alldebrid',
    credentialLabel: 'AllDebrid API key',
    bridge: 'stremthruStore',
    bridgeName: 'StremThru AllDebrid',
  },
  debridlink: {
    label: 'Debrid-Link',
    kind: 'debrid',
    serviceId: 'debridlink',
    credentialLabel: 'Debrid-Link API key',
    bridge: 'stremthruStore',
    bridgeName: 'StremThru Debrid-Link',
  },
  p2p: {
    label: 'P2P',
    kind: 'p2p',
    serviceId: null,
    credentialLabel: null,
    bridge: 'torrentio',
    bridgeName: 'Torrentio',
  },
});

export const DEVICES = Object.freeze({
  generic_tv: {
    label: 'Generic TV',
    description: 'Conservative 4K TV baseline',
    av1: false,
    lossless: false,
    defaultResolution: '1080p',
    preferredVisualTags: ['HDR10', 'HDR', 'HLG', 'SDR'],
  },
  fire_tv: {
    label: 'Fire TV / Fire Stick',
    description: 'HEVC/AVC and streaming audio first',
    av1: false,
    lossless: false,
    defaultResolution: '1080p',
    preferredVisualTags: ['HDR10', 'HDR', 'HLG', 'SDR'],
  },
  samsung: {
    label: 'Samsung TV',
    description: 'HDR10/HDR10+ first, streaming audio',
    av1: false,
    lossless: false,
    defaultResolution: '1080p',
    preferredVisualTags: ['HDR10+', 'HDR10', 'HDR', 'HLG', 'SDR'],
  },
  apple_tv: {
    label: 'Apple TV',
    description: '4K HDR/Dolby Vision capable profile',
    av1: false,
    lossless: true,
    defaultResolution: '4k',
    preferredVisualTags: ['HDR+DV', 'DV', 'HDR10+', 'HDR10', 'HDR', 'HLG', 'SDR'],
  },
  desktop: {
    label: 'Desktop / HTPC',
    description: 'Broad codec and lossless-audio support',
    av1: true,
    lossless: true,
    defaultResolution: '4k',
    preferredVisualTags: ['HDR+DV', 'DV', 'HDR10+', 'HDR10', 'HDR', 'HLG', 'SDR'],
  },
  mobile: {
    label: 'Phone / Tablet',
    description: '1080p, compact files, streaming audio',
    av1: false,
    lossless: false,
    defaultResolution: '1080p',
    preferredVisualTags: ['HDR10', 'HDR', 'SDR'],
  },
});

const LOCAL_EXPRESSION_FIELDS = Object.freeze([
  'syncedExcludedStreamExpressionUrls',
  'syncedIncludedStreamExpressionUrls',
  'syncedRequiredStreamExpressionUrls',
  'syncedPreferredStreamExpressionUrls',
  'syncedRankedStreamExpressionUrls',
]);

const ALL_SERVICE_IDS = Object.freeze([
  'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'torbox',
  'offcloud', 'easydebrid', 'pikpak', 'seedr', 'easynews', 'putio',
  'debrider', 'nzbdav', 'altmount', 'stremthru_newz', 'stremio_nntp',
  'aiostreams',
]);

export function defaultState() {
  return {
    service: 'torbox',
    device: 'generic_tv',
    resolution: '1080p',
    content: 'all',
    cacheMode: 'mixed',
    language: 'English',
    excludeDolbyVision: false,
    aiostreamsVersion: '2.31.1',
    includeCredentialInDownload: false,
    credential: '',
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isSupportedService(value) {
  return Object.prototype.hasOwnProperty.call(SERVICES, value);
}

function isSupportedDevice(value) {
  return Object.prototype.hasOwnProperty.call(DEVICES, value);
}

export function normalizeState(raw = {}) {
  const fallback = defaultState();
  const service = isSupportedService(raw.service) ? raw.service : fallback.service;
  const device = isSupportedDevice(raw.device) ? raw.device : fallback.device;
  const resolution = ['1080p', '4k'].includes(raw.resolution) ? raw.resolution : DEVICES[device].defaultResolution;
  return {
    ...fallback,
    service,
    device,
    resolution,
    content: raw.content === 'anime' ? 'anime' : 'all',
    cacheMode: ['mixed', 'cached'].includes(raw.cacheMode) ? raw.cacheMode : fallback.cacheMode,
    language: typeof raw.language === 'string' && raw.language.trim() ? raw.language.trim() : fallback.language,
    excludeDolbyVision: Boolean(raw.excludeDolbyVision),
    aiostreamsVersion: typeof raw.aiostreamsVersion === 'string' ? raw.aiostreamsVersion : fallback.aiostreamsVersion,
    includeCredentialInDownload: Boolean(raw.includeCredentialInDownload),
    credential: typeof raw.credential === 'string' ? raw.credential.trim() : '',
  };
}

function serviceCredentials(input) {
  const selected = SERVICES[input.service];
  return ALL_SERVICE_IDS.map(id => {
    const enabled = selected.serviceId === id;
    const credentials = enabled && input.includeCredentialInDownload && input.credential
      ? { apiKey: input.credential }
      : {};
    return { id, enabled, credentials };
  });
}

function serviceBridge(input) {
  const service = SERVICES[input.service];
  if (service.kind === 'p2p') {
    return {
      type: 'torrentio',
      instanceId: 'core-v3-torrentio',
      enabled: true,
      resources: ['stream'],
      options: { name: 'Torrentio', timeout: 5000, providers: [], useMultipleInstances: false },
    };
  }
  return {
    type: service.bridge,
    instanceId: `core-v3-${service.bridge.toLowerCase()}`,
    enabled: true,
    resources: ['stream'],
    options: {
      name: service.bridgeName,
      timeout: 5000,
      ...(service.bridge === 'stremthruTorz' ? { includeP2P: false, useMultipleInstances: false } : { useMultipleInstances: false }),
    },
  };
}

function sourcePresets(input) {
  const isP2P = SERVICES[input.service].kind === 'p2p';
  const presets = [
    ...(isP2P ? [] : [{
      type: 'library',
      instanceId: 'core-v3-library',
      enabled: true,
      resources: ['stream'],
      options: { name: 'Library', timeout: 3000, resources: ['stream'], mediaTypes: [], useMultipleInstances: false },
    }]),
    serviceBridge(input),
    {
      type: 'comet',
      instanceId: 'core-v3-comet',
      enabled: true,
      resources: ['stream'],
      options: { name: 'Comet', timeout: 5000, resources: ['stream'], mediaTypes: ['movie', 'series', 'anime'] },
    },
    {
      type: 'mediafusion',
      instanceId: 'core-v3-mediafusion',
      enabled: true,
      resources: ['stream'],
      options: { name: 'MediaFusion', timeout: 5000, resources: ['stream'], mediaTypes: ['movie', 'series', 'anime'] },
    },
  ];
  if (input.content === 'all' || input.content === 'anime') {
    presets.push({
      type: 'seadex',
      instanceId: 'core-v3-seadex',
      enabled: true,
      resources: ['stream'],
      options: { name: 'SeaDex', timeout: 4000, resources: ['stream'], mediaTypes: ['anime'] },
    });
  }
  return presets;
}

function devicePolicy(input) {
  const device = DEVICES[input.device];
  const is4k = input.resolution === '4k';
  const excludedResolutions = is4k
    ? ['144p', '240p', '360p', '480p']
    : ['144p', '240p', '360p', '1440p', '2160p'];
  const excludedEncodes = unique([
    ...(device.av1 ? [] : ['AV1']),
    ...(input.device === 'desktop' ? [] : ['VC-1']),
  ]);
  const excludedAudioTags = device.lossless
    ? []
    : ['TrueHD', 'DTS-HD MA', 'DTS:X', 'DTS-HD', 'DTS-ES', 'FLAC'];
  return {
    excludedResolutions,
    preferredResolutions: is4k ? ['2160p', '1080p', '720p', 'Unknown'] : ['1080p', '720p', 'Unknown'],
    excludedEncodes,
    preferredEncodes: device.av1 ? ['HEVC', 'AV1', 'AVC', 'Unknown'] : ['HEVC', 'AVC', 'Unknown'],
    excludedAudioTags,
    preferredAudioTags: device.lossless
      ? ['TrueHD', 'Atmos', 'DTS-HD MA', 'DTS:X', 'DD+', 'DTS', 'AAC', 'DD']
      : ['Atmos', 'DD+', 'AAC', 'DD', 'DTS'],
    preferredAudioChannels: device.lossless ? ['7.1', '5.1', '2.0'] : ['5.1', '2.0'],
    preferredVisualTags: input.excludeDolbyVision
      ? device.preferredVisualTags.filter(tag => !['DV', 'HDR+DV'].includes(tag))
      : device.preferredVisualTags,
    excludedVisualTags: unique(['3D', 'H-OU', 'H-SBS', ...(input.excludeDolbyVision ? ['DV', 'HDR+DV'] : [])]),
  };
}

function stableSort(input) {
  const direction = 'desc';
  const base = [
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
  if (SERVICES[input.service].kind === 'p2p') {
    base.splice(0, 1);
    base.splice(3, 0, { key: 'seeders', direction });
  }
  return {
    global: base,
    movies: [], series: [], anime: [], cached: [], uncached: [],
    cachedMovies: [], uncachedMovies: [], cachedSeries: [], uncachedSeries: [],
    cachedAnime: [], uncachedAnime: [],
  };
}

export function buildReliableTemplate(rawInput = {}) {
  const input = normalizeState(rawInput);
  const service = SERVICES[input.service];
  const policy = devicePolicy(input);
  const isP2P = service.kind === 'p2p';
  const globalLimit = input.resolution === '4k' ? 12 : 10;
  const resolutionLimit = 3;
  const name = `Core Builds Stable · ${service.label} · ${input.resolution === '4k' ? '4K' : '1080p'}`;

  const config = {
    trusted: false,
    showChanges: true,
    addonName: name,
    addonDescription: 'Local-first Core Builds Stable configuration. No synced stream expressions, groups, dynamic exits, or remote configuration upload.',
    excludedResolutions: policy.excludedResolutions,
    includedResolutions: [],
    requiredResolutions: [],
    preferredResolutions: policy.preferredResolutions,
    excludedQualities: ['CAM', 'SCR', 'TS', 'TC'],
    includedQualities: [],
    requiredQualities: [],
    preferredQualities: ['BluRay REMUX', 'BluRay', 'WEB-DL', 'WEBRip', 'HDRip', 'HDTV'],
    excludedLanguages: [],
    includedLanguages: [],
    requiredLanguages: [],
    preferredLanguages: unique([input.language, 'Original', 'Dual Audio', 'Multi', 'Dubbed', 'Unknown']),
    excludedVisualTags: policy.excludedVisualTags,
    includedVisualTags: [],
    requiredVisualTags: [],
    preferredVisualTags: policy.preferredVisualTags,
    excludedAudioTags: policy.excludedAudioTags,
    includedAudioTags: [],
    requiredAudioTags: [],
    preferredAudioTags: policy.preferredAudioTags,
    preferredAudioChannels: policy.preferredAudioChannels,
    excludedEncodes: policy.excludedEncodes,
    includedEncodes: [],
    requiredEncodes: [],
    preferredEncodes: policy.preferredEncodes,
    excludedStreamTypes: ['external', 'youtube'],
    includedStreamTypes: [],
    requiredStreamTypes: [],
    preferredStreamTypes: isP2P ? ['p2p'] : ['debrid', 'usenet'],
    excludeCached: false,
    excludeUncached: !isP2P && input.cacheMode === 'cached',
    excludeCachedFromAddons: [],
    excludeCachedFromServices: [],
    excludeCachedFromStreamTypes: [],
    excludeUncachedFromAddons: [],
    excludeUncachedFromServices: [],
    excludeUncachedFromStreamTypes: [],
    excludedStreamExpressions: [],
    includedStreamExpressions: [],
    requiredStreamExpressions: [],
    preferredStreamExpressions: [],
    rankedStreamExpressions: [],
    syncedExcludedStreamExpressionUrls: [],
    syncedIncludedStreamExpressionUrls: [],
    syncedRequiredStreamExpressionUrls: [],
    syncedPreferredStreamExpressionUrls: [],
    syncedRankedStreamExpressionUrls: [],
    rankedRegexPatterns: [],
    preferredRegexPatterns: [],
    excludedRegexPatterns: [],
    syncedExcludedRegexUrls: [],
    syncedIncludedRegexUrls: [],
    syncedRequiredRegexUrls: [],
    syncedPreferredRegexUrls: [],
    syncedRankedRegexUrls: [],
    sortCriteria: stableSort(input),
    resultLimits: { global: globalLimit, resolution: resolutionLimit, mode: 'independent' },
    maxResults: globalLimit,
    maxResultsPerResolution: resolutionLimit,
    deduplicator: {
      enabled: true,
      excludeAddons: [],
      multiGroupBehaviour: 'aggressive',
      keys: isP2P ? ['filename', 'infoHash'] : ['filename', 'infoHash', 'smartDetect'],
      cached: isP2P ? 'disabled' : 'single_result',
      uncached: isP2P ? 'disabled' : 'per_service',
      p2p: 'per_addon',
      smartDetectAttributes: ['size', 'resolution', 'quality', 'visualTags', 'audioTags', 'audioChannels', 'languages', 'encode'],
      smartDetectRounding: 10,
      libraryBehaviour: isP2P ? 'ignore' : 'prefer',
    },
    seasonEpisodeMatching: { enabled: true, strict: false, requestTypes: [], addons: [] },
    titleMatching: { enabled: false, requestTypes: [], addons: [] },
    yearMatching: { enabled: false, strict: false, requestTypes: [], addons: [] },
    digitalReleaseFilter: { enabled: false, tolerance: 0, requestTypes: [], addons: [] },
    groups: { enabled: false, groupings: [] },
    dynamicAddonFetching: { enabled: false },
    autoPlay: { enabled: false, attributes: ['resolution', 'quality', 'releaseGroup'] },
    precacheNextEpisode: false,
    preloadStreams: { enabled: false },
    cacheAndPlay: { enabled: false, streamTypes: [] },
    hideErrors: false,
    hideErrorsForResources: ['catalog', 'meta', 'subtitles'],
    statistics: { enabled: true, position: 'bottom', statsToShow: ['addon', 'filter', 'timing'], showFilterStatsOnNoStreams: true },
    formatter: {
      id: 'tamtaro',
      definitions: {
        overrides: {
          tamtaro: {
            name: "{service.cached::istrue[\"⚡ \"||\"\"]}{stream.resolution::exists[\"{stream.resolution} \"||\"\"]}{stream.title::exists[\"{stream.title}\"||\"\"]}",
            description: "{stream.quality::exists[\"{stream.quality}\"||\"\"]}{stream.encode::exists[\" · {stream.encode}\"||\"\"]}{stream.size::exists[\" · {stream.size::sbytes}\"||\"\"]}\n{service.id} · {stream.type}",
          },
        },
      },
    },
    proxy: { id: 'mediaflow', proxiedAddons: [], proxiedServices: [] },
    posterService: 'none',
    services: serviceCredentials(input),
    presets: sourcePresets(input),
  };

  return {
    metadata: {
      id: `core-reliable-${input.service}-${input.device}-${input.resolution}`,
      name,
      description: 'Generated locally by the Core Builds Reliable Configurator. No synced stream-expression URLs.',
      source: 'external',
      author: 'Branding-Brevity',
      version: '0.1.0',
      category: isP2P ? 'P2P' : 'Debrid',
      serviceRequired: false,
      setToSaveInstallMenu: true,
      coreBuildsProduct: 'Reliable Configurator',
      coreBuildsProfile: 'stable',
      coreBuildsExpressionPolicy: 'local-only',
      coreBuildsMinimumAIOStreams: '2.31.1',
    },
    config,
  };
}

function countExpressions(config) {
  return ['excludedStreamExpressions', 'includedStreamExpressions', 'requiredStreamExpressions', 'preferredStreamExpressions', 'rankedStreamExpressions']
    .reduce((total, key) => total + (Array.isArray(config[key]) ? config[key].length : 0), 0);
}

export function inspectReliableTemplate(template, rawInput = {}) {
  const input = normalizeState(rawInput);
  const config = template?.config || {};
  const checks = [];
  const push = (id, pass, label, detail) => checks.push({ id, pass, label, detail });
  const synced = LOCAL_EXPRESSION_FIELDS.flatMap(key => Array.isArray(config[key]) ? config[key] : []);
  const scoreRules = [
    ...(config.excludedStreamExpressions || []),
    ...(config.includedStreamExpressions || []),
    ...(config.requiredStreamExpressions || []),
    ...(config.preferredStreamExpressions || []),
  ].some(entry => /\b(?:streamExpressionScore|rseMatched)\s*\(/.test(typeof entry === 'string' ? entry : String(entry?.expression || '')));
  const scoreSort = Object.values(config.sortCriteria || {}).some(list => Array.isArray(list) && list.some(item => item?.key === 'streamExpressionScore'));

  push('local-sel', synced.length === 0, 'Local expressions only', synced.length ? `${synced.length} synced expression URL(s) found` : 'No synced expression URL');
  push('no-score-dependency', !scoreRules && !scoreSort, 'No hidden score dependency', !scoreRules && !scoreSort ? 'No RSE score selector or score sort' : 'Score logic requires an explicit local RSE contract');
  push('predictable-fetch', config.groups?.enabled === false && config.dynamicAddonFetching?.enabled === false, 'Predictable fetching', 'Groups and Dynamic fetching are disabled');
  push('single-limit-owner', Boolean(config.resultLimits) && !countExpressions(config), 'Single result-limit owner', 'Native independent result limit; no SEL caps');
  push('observable', config.hideErrors === false && config.statistics?.enabled === true, 'Observable diagnostics', 'Errors and timing statistics are enabled');
  const capability = aiostreamsCapability(input.aiostreamsVersion);
  push('host-version', capability.status === 'verified', 'Supported AIOStreams target', capability.detail);
  push('credential-locality', !input.credential || input.includeCredentialInDownload, 'Credential locality', input.credential && !input.includeCredentialInDownload ? 'Credential is not included in the downloaded JSON' : 'No credential is transmitted by this configurator');

  return {
    supported: checks.every(check => check.pass || check.id === 'credential-locality'),
    checks,
    summary: {
      expressions: countExpressions(config),
      syncedExpressionUrls: synced.length,
      groupsEnabled: Boolean(config.groups?.enabled),
      dynamicEnabled: Boolean(config.dynamicAddonFetching?.enabled),
      presets: (config.presets || []).filter(preset => preset.enabled !== false).length,
      resultLimit: config.resultLimits?.global || null,
    },
  };
}

export function redactTemplate(template) {
  const clone = JSON.parse(JSON.stringify(template));
  for (const service of clone?.config?.services || []) {
    service.credentials = {};
  }
  for (const preset of clone?.config?.presets || []) {
    if (!preset?.options || typeof preset.options !== 'object') continue;
    for (const key of Object.keys(preset.options)) {
      if (/(api.?key|token|password|secret|auth)/i.test(key)) delete preset.options[key];
    }
  }
  return clone;
}

export function safeDiagnostics(template, rawInput = {}) {
  const input = normalizeState(rawInput);
  const report = inspectReliableTemplate(template, input);
  return {
    product: 'Core Builds Reliable Configurator',
    productVersion: REBUILD_VERSION,
    profile: 'stable',
    settings: {
      service: input.service,
      device: input.device,
      resolution: input.resolution,
      content: input.content,
      cacheMode: input.cacheMode,
      aiostreamsVersion: input.aiostreamsVersion,
      credentialPresent: Boolean(input.credential),
      credentialIncludedInDownload: Boolean(input.credential && input.includeCredentialInDownload),
    },
    checks: report.checks,
    summary: report.summary,
  };
}
