/**
 * Recipe + contract → AIOStreams template.
 *
 * The recipe is intent ("TorBox, 4K, Fire Stick"). The contract is what the
 * running AIOStreams code/host actually accepts. Unknown presets are dropped,
 * newly required options are filled from defaults, SEL only uses functions
 * that exist, and schema hotspots (deduplicator.merge as object, groups as
 * object with instanceIds) follow the live shape.
 */

import { createHash } from 'node:crypto';

const SERVICE_ALIASES = {
  tb: 'torbox',
  rd: 'realdebrid',
  ad: 'alldebrid',
  en: 'easynews',
  pm: 'premiumize',
  p2p: 'p2p',
  http: 'http',
  free: 'p2p',
};

const STACKS = {
  torbox: ['torrentio', 'comet', 'mediafusion', 'stremthruTorz', 'torbox-search', 'seadex', 'animetosho', 'knaben'],
  realdebrid: ['torrentio', 'comet', 'mediafusion', 'stremthruTorz', 'peerflix', 'seadex'],
  alldebrid: ['torrentio', 'comet', 'mediafusion', 'stremthruTorz', 'peerflix', 'seadex'],
  premiumize: ['torrentio', 'comet', 'mediafusion', 'stremthruTorz', 'seadex'],
  easynews: ['easynewsPlusPlus', 'easynews-search', 'easynews'],
  debridlink: ['torrentio', 'comet', 'mediafusion', 'stremthruTorz'],
  easydebrid: ['torrentio', 'comet', 'stremthruTorz', 'stremthruStore'],
  pikpak: ['stremthruStore', 'torrentio'],
  seedr: ['stremthruStore', 'torrentio'],
  torrin: ['stremthruTorz', 'torrentio'],
  p2p: ['torrentio', 'peerflix', 'sootio', 'hdhub', 'eztv', 'seadex'],
  http: ['webstreamr', 'sootio', 'peerflix', 'hdhub'],
};

const DEVICE_PROFILES = {
  generic: { excludedAudioTags: [], excludedVisualTags: [], excludedEncodes: [] },
  firestick: { excludedAudioTags: ['TrueHD', 'DTS-HD MA', 'DTS'], excludedVisualTags: [], excludedEncodes: [] },
  'apple-tv': { excludedAudioTags: [], excludedVisualTags: [], excludedEncodes: [] },
  samsung: { excludedAudioTags: ['TrueHD', 'DTS-HD MA'], excludedVisualTags: [], excludedEncodes: [] },
  lg: { excludedAudioTags: ['TrueHD'], excludedVisualTags: [], excludedEncodes: [] },
  android: { excludedAudioTags: ['TrueHD', 'DTS-HD MA'], excludedVisualTags: [], excludedEncodes: [] },
  pc: { excludedAudioTags: [], excludedVisualTags: [], excludedEncodes: [] },
  chromecast: { excludedAudioTags: ['TrueHD', 'DTS-HD MA', 'DTS'], excludedVisualTags: [], excludedEncodes: [] },
};

function resolveService(id) {
  const key = String(id || 'torbox').toLowerCase();
  return SERVICE_ALIASES[key] || key;
}

function presetIndex(contract) {
  const map = new Map();
  for (const p of contract.presets || []) map.set(p.id, p);
  return map;
}

function hasFn(contract, name) {
  return (contract.sel?.functions || []).includes(name);
}

function instanceId(type, n) {
  return createHash('sha1').update(`${type}:${n}`).digest('hex').slice(0, 3);
}

function fillRequiredOptions(preset, extras = {}) {
  const options = { ...extras };
  for (const req of preset.requiredOptions || []) {
    if (options[req.id] === undefined) {
      options[req.id] = req.default !== undefined ? req.default : req.type === 'boolean' ? false : req.type === 'multi-select' ? [] : '';
    }
  }
  return options;
}

function supportsService(preset, service) {
  if (['p2p', 'http'].includes(service)) return true;
  const list = preset.services || [];
  if (!list.length) return true;
  return list.includes(service);
}

function selOrNull(contract, expr) {
  const used = [...expr.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]);
  const builtins = new Set(['min', 'max', 'abs', 'sqrt', 'ceil', 'floor', 'round', 'trunc', 'random']);
  const known = new Set([...(contract.sel?.functions || []), ...builtins]);
  if (used.some((fn) => !known.has(fn))) return null;
  return expr;
}

function buildExpressions(contract, { resolution, device }) {
  const excluded = [];
  const preferred = [];
  const included = [];
  const ranked = [];
  const push = (arr, name, expr) => {
    const ok = selOrNull(contract, expr);
    if (ok) arr.push({ name, expression: ok, enabled: true });
  };

  if (resolution === '1080p') {
    push(excluded, 'Hard Resolution Kill', `resolution(streams, '2160p', '1440p')`);
  }
  push(excluded, 'Junk quality', `quality(streams, 'CAM', 'TS', 'TC', 'SCR')`);

  if (hasFn(contract, 'seadex')) {
    push(preferred, 'SeaDex first', `seadex(streams)`);
  }
  if (hasFn(contract, 'cached')) {
    push(preferred, 'Cached', `cached(streams)`);
  }

  if (hasFn(contract, 'perGroup') && resolution === '2160p') {
    const n = device === 'firestick' ? 3 : 4;
    push(excluded, 'QR balance', `perGroup(resolution(streams), ${n})`);
  } else if (hasFn(contract, 'slice')) {
    push(excluded, 'Per-resolution cap', `slice(resolution(streams, '${resolution === '1080p' ? '1080p' : '2160p'}'), 8)`);
  }

  if (hasFn(contract, 'seScore') && hasFn(contract, 'negate') === false) {
    /* ranked set supplies seScore */
  }

  if (hasFn(contract, 'quality')) {
    ranked.push(
      { name: 'REMUX', expression: `quality(streams, 'BluRay REMUX')`, score: 120, enabled: true },
      { name: 'BluRay', expression: `quality(streams, 'BluRay')`, score: 80, enabled: true },
      { name: 'WEB', expression: `quality(streams, 'WEB-DL', 'WEBRip')`, score: 50, enabled: true },
    );
  }
  if (hasFn(contract, 'resolution')) {
    ranked.push(
      { name: '4K', expression: `resolution(streams, '2160p')`, score: 80, enabled: resolution !== '1080p' },
      { name: '1080p', expression: `resolution(streams, '1080p')`, score: 40, enabled: true },
    );
  }

  return { excluded, preferred, included, ranked: ranked.filter((r) => r.enabled !== false) };
}

function sortCriteria(contract) {
  const allowed = new Set(contract.sortCriteria || []);
  const want = [
    { key: 'cached', direction: 'desc' },
    { key: 'library', direction: 'desc' },
    { key: 'resolution', direction: 'desc' },
    { key: 'quality', direction: 'desc' },
    { key: 'visualTag', direction: 'desc' },
    { key: 'streamExpressionScore', direction: 'desc' },
    { key: 'regexScore', direction: 'desc' },
    { key: 'encode', direction: 'desc' },
    { key: 'size', direction: 'desc' },
  ];
  const picked = want.filter((c) => !allowed.size || allowed.has(c.key));
  return picked.length ? picked : [{ key: 'cached', direction: 'desc' }, { key: 'resolution', direction: 'desc' }];
}

function deduplicator(contract) {
  const mergeKind = contract.hotspots?.['deduplicator.merge'] || 'object';
  const merge = mergeKind === 'boolean' ? false : { enabled: false };
  return {
    enabled: true,
    keys: ['filename', 'infoHash', 'smartDetect'],
    cached: 'single_result',
    uncached: 'single_result',
    p2p: 'single_result',
    http: 'single_result',
    libraryBehaviour: 'prefer',
    merge,
  };
}

function groups(contract, presets) {
  const kind = contract.hotspots?.groups || 'object';
  if (kind === 'array') {
    return presets.filter((p) => p.enabled).map((p) => ({
      addons: [p.instanceId || p.options?.name || p.type],
      condition: 'true',
    }));
  }
  const addons = presets.filter((p) => p.enabled).map((p) => p.instanceId).filter(Boolean);
  if (addons.length < 2) return undefined;
  return {
    enabled: true,
    behaviour: 'sequential',
    onConditionFailure: 'includeFinished',
    groupings: [
      {
        addons,
        condition: hasFn(contract, 'cached')
          ? `count(cached(streams)) >= 4`
          : `count(streams) >= 6`,
      },
    ],
  };
}

export function generateTemplate(recipe, contract) {
  const warnings = [];
  const notes = [];
  const service = resolveService(recipe.service);
  const resolution = recipe.resolution === '1080p' ? '1080p' : recipe.resolution === 'mixed' ? 'mixed' : '2160p';
  const device = DEVICE_PROFILES[recipe.device] ? recipe.device : 'generic';
  const profile = recipe.profile || 'advanced';
  const byId = presetIndex(contract);

  const requested = recipe.scrapers?.length
    ? recipe.scrapers
    : STACKS[service] || STACKS.torbox;

  const usedIds = new Set();
  const presets = [];
  let n = 0;
  for (const type of requested) {
    const meta = byId.get(type);
    if (!meta) {
      warnings.push(`Dropped unknown preset '${type}' — not in the current AIOStreams contract.`);
      continue;
    }
    if (meta.disabled) {
      warnings.push(`Skipped disabled preset '${type}'${meta.disabledReason ? ` (${meta.disabledReason})` : ''}.`);
      continue;
    }
    if (!supportsService(meta, service) && !['seadex', 'library', 'custom'].includes(type)) {
      notes.push(`Preset '${type}' does not list service '${service}' — included anyway as a scraper.`);
    }
    let id = instanceId(type, n++);
    while (usedIds.has(id)) {
      id = instanceId(type, n++);
    }
    usedIds.add(id);
    const extras = {};
    if (type === 'torrentio' || type === 'peerflix' || type === 'torrents-db') {
      extras.useMultipleInstances = false;
    }
    const options = fillRequiredOptions(meta, extras);
    if ((meta.requiredOptions || []).length) {
      notes.push(
        `Filled required options on ${type}: ${(meta.requiredOptions || []).map((o) => o.id).join(', ')}`,
      );
    }
    presets.push({
      type,
      instanceId: id,
      enabled: true,
      options: {
        name: meta.name || type,
        timeout: 8000,
        ...options,
      },
    });
  }

  if (!presets.length) {
    throw new Error('No valid presets remained after applying the contract. Check the scraper list / host.');
  }

  const expressions = buildExpressions(contract, { resolution, device });
  const deviceProfile = DEVICE_PROFILES[device];

  const excludedResolutions =
    resolution === '1080p' ? ['2160p', '1440p'] : resolution === '2160p' ? [] : [];

  const services = [];
  if (!['p2p', 'http'].includes(service) && (contract.serviceIds || []).includes(service)) {
    services.push({
      id: service,
      enabled: true,
      credentials: {},
    });
  } else if (!['p2p', 'http'].includes(service)) {
    warnings.push(`Service '${service}' is not in the current contract service list.`);
  }

  const formatterId = (contract.formatters || []).includes('tamtaro')
    ? 'tamtaro'
    : (contract.formatters || [])[0] || 'gdrive';

  const addonName = recipe.name || `Regen ${service} ${resolution} ${device}`;

  const config = {
    addonName,
    addonDescription: `Self-regenerated against AIOStreams ${contract.version || contract.ref || 'source'} (${new Date().toISOString().slice(0, 10)}).`,
    services,
    presets,
    formatter: { id: formatterId },
    excludedResolutions: excludedResolutions.length ? excludedResolutions : undefined,
    excludedAudioTags: deviceProfile.excludedAudioTags.length ? deviceProfile.excludedAudioTags : undefined,
    excludedVisualTags: deviceProfile.excludedVisualTags.length ? deviceProfile.excludedVisualTags : undefined,
    excludedQualities: ['CAM', 'TS', 'TC', 'SCR'],
    excludedStreamExpressions: expressions.excluded,
    preferredStreamExpressions: expressions.preferred,
    includedStreamExpressions: expressions.included,
    rankedStreamExpressions: profile === 'stable' ? [] : expressions.ranked,
    sortCriteria: {
      global: sortCriteria(contract),
    },
    deduplicator: deduplicator(contract),
    groups: profile === 'stable' ? undefined : groups(contract, presets),
    dynamicAddonFetching:
      profile === 'labs' || profile === 'advanced'
        ? {
            enabled: true,
            condition: hasFn(contract, 'cached')
              ? `count(cached(streams)) >= ${resolution === '1080p' ? 6 : 8}`
              : `count(streams) >= 10`,
          }
        : undefined,
    titleMatching: { enabled: true, method: 'contains', similarity: 0.75 },
    yearMatching: { enabled: true, tolerance: 1 },
    seasonEpisodeMatching: { enabled: true, requestTypes: ['series'] },
    autoPlay: { enabled: true, method: 'default' },
    precacheNextEpisode: true,
    preloadStreams: true,
    checkOwned: true,
    showChanges: true,
  };

  // The Zod walker can miss nested-adjacent keys (sortCriteria sits next to
  // groups). Warn only — never delete a generated field because the parser blinked.
  if (contract.schemaKeys?.length) {
    for (const key of Object.keys(config)) {
      if (config[key] !== undefined && !contract.schemaKeys.includes(key)) {
        notes.push(`Schema walker did not see '${key}' — left in place.`);
      }
    }
  }

  const template = {
    metadata: {
      id: recipe.id || `regen-${service}-${resolution}-${device}`,
      name: addonName,
      description: config.addonDescription,
      author: 'aios-regen',
      version: recipe.version || '0.1.0',
      source: 'aios-regen',
      category: 'community',
    },
    config,
    _regen: {
      service,
      resolution,
      device,
      profile,
      contractKind: contract.kind,
      contractVersion: contract.version || null,
      contractHost: contract.hostUrl || contract.host || null,
      fingerprint: contract.source?.fingerprint || contract.fingerprint || null,
      generatedAt: new Date().toISOString(),
      warnings,
      notes,
    },
  };

  return { template, warnings, notes, config };
}

/**
 * Patch an existing UserData / template so it satisfies the current contract.
 */
export function healTemplate(input, contract) {
  const warnings = [];
  const notes = [];
  const wrapper = input.config ? input : { metadata: input.metadata, config: input };
  const config = structuredClone(wrapper.config || input);
  const byId = presetIndex(contract);

  if (Array.isArray(config.groups) && (contract.hotspots || {}).groups === 'object') {
    config.groups = {
      enabled: true,
      behaviour: 'sequential',
      groupings: config.groups,
    };
    notes.push('Rewrote groups array → object.');
  }

  if (Array.isArray(config.presets)) {
    const kept = [];
    for (const preset of config.presets) {
      const type = preset.type;
      const meta = byId.get(type);
      if (!meta) {
        warnings.push(`Removed preset '${type}' — no longer in the AIOStreams contract.`);
        continue;
      }
      const options = { ...(preset.options || {}) };
      for (const req of meta.requiredOptions || []) {
        if (options[req.id] === undefined) {
          options[req.id] = req.default !== undefined ? req.default : req.type === 'boolean' ? false : '';
          notes.push(`Added required option ${type}.${req.id} = ${JSON.stringify(options[req.id])}`);
        }
      }
      if (!preset.instanceId) {
        preset.instanceId = instanceId(type, kept.length);
        notes.push(`Assigned instanceId ${preset.instanceId} to ${type} (groups need instanceId, not display name).`);
      }
      kept.push({ ...preset, options });
    }
    config.presets = kept;

    if (config.groups?.groupings) {
      const valid = new Set(kept.map((p) => p.instanceId));
      for (const g of config.groups.groupings) {
        const before = g.addons || [];
        g.addons = before.filter((a) => valid.has(a));
        if (g.addons.length !== before.length) {
          warnings.push(`Group addons rewritten to instanceIds; dropped ${before.length - g.addons.length} unknown refs.`);
        }
      }
      config.groups.groupings = config.groups.groupings.filter((g) => g.addons?.length);
    }
  }

  if (config.deduplicator && typeof config.deduplicator.merge === 'boolean') {
    if ((contract.hotspots || {})['deduplicator.merge'] === 'object') {
      config.deduplicator.merge = { enabled: config.deduplicator.merge };
      notes.push('Rewrote deduplicator.merge boolean → object (AIOStreams current schema).');
    }
  }

  if (Array.isArray(config.services) && contract.serviceIds?.length) {
    const known = new Set(contract.serviceIds);
    const before = config.services.length;
    config.services = config.services.filter((s) => known.has(s.id));
    if (config.services.length !== before) {
      warnings.push(`Dropped ${before - config.services.length} unknown service(s).`);
    }
  }

  const selFns = new Set(contract.sel?.functions || []);
  if (selFns.size) {
    for (const key of [
      'excludedStreamExpressions',
      'preferredStreamExpressions',
      'includedStreamExpressions',
      'requiredStreamExpressions',
      'rankedStreamExpressions',
    ]) {
      if (!Array.isArray(config[key])) continue;
      config[key] = config[key].filter((row) => {
        const expr = typeof row === 'string' ? row : row.expression;
        if (!expr) return true;
        const used = [...expr.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]);
        const unknown = used.filter((fn) => !selFns.has(fn) && !['min', 'max', 'sqrt', 'ceil', 'floor', 'round', 'trunc', 'random'].includes(fn));
        if (unknown.length) {
          warnings.push(`Dropped SEL '${row.name || expr.slice(0, 40)}' — unknown function(s): ${unknown.join(', ')}`);
          return false;
        }
        return true;
      });
    }
  }

  return {
    template: { ...(wrapper.metadata ? { metadata: wrapper.metadata } : {}), config },
    warnings,
    notes,
  };
}

export function defaultRecipe() {
  return {
    id: 'regen-core-nexus',
    name: 'Regen Core Nexus',
    version: '0.1.0',
    service: 'torbox',
    resolution: '2160p',
    device: 'generic',
    profile: 'advanced',
    scrapers: STACKS.torbox,
  };
}

export { STACKS, DEVICE_PROFILES, SERVICE_ALIASES };
