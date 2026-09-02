/**
 * Named store-service presets: AllDebrid, Premiumize, EasyDebrid.
 *
 * AllDebrid already has templates. Premiumize and EasyDebrid share the
 * same stremthruStore path — overlay the AllDebrid JSON, do not clone
 * 100 KB by hand. Real-Debrid has no named template (May 2026 WEB-DL
 * filter). TorBox stays on stremthruTorz / household.mjs.
 *
 * Import-ready. Do not wire into the 7k-line app.js unless asked.
 */

export const RAW = 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main';

export const STORE_LABELS = Object.freeze({
  alldebrid: 'StremThru AllDebrid',
  premiumize: 'StremThru Premiumize',
  easydebrid: 'StremThru EasyDebrid',
});

export const STORE_SERVICES = Object.freeze(Object.keys(STORE_LABELS));

export const KEY_URLS = Object.freeze({
  alldebrid: 'https://alldebrid.com/apikeys',
  premiumize: 'https://www.premiumize.me/account',
  easydebrid: 'https://easydebrid.com/',
});

const NO_DV = new Set([
  'samsung', 'samsung-tizen', 'tcl', 'tcl-google-tv', 'hisense',
  'firestick-hd', 'onn', 'generic-4k-hdr-tv',
]);

const STICK_1080 = new Set(['firestick-hd', 'firestick-4kmax', 'chromecast', 'android-mobile']);

function pathFor(service, res) {
  const folder = { alldebrid: 'AllDebrid', premiumize: 'Premiumize', easydebrid: 'EasyDebrid' }[service];
  const file = res === '4k'
    ? `core-nexus-4k-${service}.json`
    : `core-nexus-${service}.json`;
  return `${RAW}/Templates/Torbox/${folder}/${file}`;
}

function adBase(res) {
  return res === '4k'
    ? `${RAW}/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json`
    : `${RAW}/Templates/Torbox/AllDebrid/core-nexus-alldebrid.json`;
}

function preset(service, res, extra = {}) {
  const overlay = service !== 'alldebrid';
  return Object.freeze({
    id: res === '4k' ? `${service}-4k` : service,
    service,
    name: res === '4k' ? `Core Nexus 4K ${labelName(service)}` : `Core Nexus ${labelName(service)}`,
    res,
    dolbyVision: res === '4k',
    url: pathFor(service, res),
    baseUrl: overlay ? adBase(res) : pathFor(service, res),
    overlay,
    storeLabel: STORE_LABELS[service],
    keyUrl: KEY_URLS[service],
    note: extra.note || (overlay
      ? `Overlay AllDebrid ${res}. stremthruStore named ${STORE_LABELS[service]}. Not Apex.`
      : `${res} AllDebrid. stremthruStore, not stremthruTorz. Not Apex.`),
  });
}

function labelName(service) {
  return { alldebrid: 'AllDebrid', premiumize: 'Premiumize', easydebrid: 'EasyDebrid' }[service];
}

export const PRESETS = Object.freeze({
  alldebrid: preset('alldebrid', '1080p'),
  'alldebrid-4k': preset('alldebrid', '4k'),
  premiumize: preset('premiumize', '1080p'),
  'premiumize-4k': preset('premiumize', '4k'),
  easydebrid: preset('easydebrid', '1080p'),
  'easydebrid-4k': preset('easydebrid', '4k'),
});

export function resolveServiceId(id) {
  if (id == null || String(id).trim() === '') {
    throw new Error('resolveServiceId needs a store service id.');
  }
  const raw = String(id).trim().toLowerCase().replace(/[\s_]+/g, '');
  if (raw === 'realdebrid' || raw === 'rd') {
    throw new Error('No named Real-Debrid template. Enable RD in Services on any template. May 2026 WEB-DL filter.');
  }
  if (raw === 'torbox' || raw === 'torboxpro' || raw === 'torboxess' || raw === 'torbox-pro' || raw === 'torbox-ess') {
    throw new Error('TorBox uses stremthruTorz. Use household.mjs / Stream, not a store overlay.');
  }
  const aliases = {
    ad: 'alldebrid',
    alldebrid: 'alldebrid',
    pm: 'premiumize',
    premiumize: 'premiumize',
    ed: 'easydebrid',
    easydebrid: 'easydebrid',
  };
  const mapped = aliases[raw];
  if (mapped) return mapped;
  throw new Error(`Unknown store service: ${id}`);
}

export function listStorePresets() {
  return ['alldebrid', 'alldebrid-4k', 'premiumize', 'premiumize-4k', 'easydebrid', 'easydebrid-4k']
    .map((id) => PRESETS[id]);
}

export function recommendForService(serviceId, { want4k = false, firstInstall = false, deviceId = '' } = {}) {
  const service = resolveServiceId(serviceId);
  const stickLocked = STICK_1080.has(deviceId) || deviceId === 'firestick-hd' || deviceId === 'firestick-4kmax';
  const noDv = NO_DV.has(deviceId);
  const use4k = Boolean(want4k) && !firstInstall && !stickLocked && !noDv;
  const id = use4k ? `${service}-4k` : service;
  return PRESETS[id];
}

export function configuratorPatch(serviceId) {
  const service = resolveServiceId(serviceId);
  return {
    service,
    langs: ['English'],
    exclude4K: recommendForService(service).res !== '4k',
  };
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function blobOf(template) {
  const meta = template?.metadata || {};
  return `${meta.name || ''} ${meta.id || ''} ${meta.category || ''}`.toLowerCase();
}

function hasType(template, type) {
  const presets = template?.config?.presets || [];
  return presets.some((p) => p && p.type === type);
}

export function applyStoreService(template, serviceId) {
  if (!template || typeof template !== 'object') {
    throw new Error('applyStoreService needs a template object.');
  }
  const service = resolveServiceId(serviceId);
  if (blobOf(template).includes('apex')) {
    throw new Error('Store overlay refuses Apex. Use AllDebrid 4K, not Apex.');
  }
  if (hasType(template, 'stremthruTorz') && !hasType(template, 'stremthruStore')) {
    throw new Error('Store overlay needs a stremthruStore template. Use AllDebrid, not Stream.');
  }
  if (hasType(template, 'stremthruTorz') && hasType(template, 'stremthruStore')) {
    throw new Error('Store overlay refuses Hybrid. Pick AllDebrid or TorBox, not both.');
  }
  if (!hasType(template, 'stremthruStore')) {
    throw new Error('Store overlay needs a stremthruStore preset.');
  }

  const out = clone(template);
  if (!out.config || typeof out.config !== 'object') out.config = {};
  const cfg = out.config;
  const fourK = blobOf(template).includes('4k') || blobOf(template).includes('2160');
  const rec = PRESETS[fourK ? `${service}-4k` : service];

  cfg.services = (Array.isArray(cfg.services) ? cfg.services : []).map((row) => {
    if (!row || typeof row !== 'object') return row;
    return {
      ...row,
      enabled: row.id === service,
      credentials: row.credentials && typeof row.credentials === 'object' ? { ...row.credentials } : {},
    };
  });
  if (!cfg.services.some((row) => row && row.id === service)) {
    cfg.services.push({ id: service, enabled: true, credentials: {} });
  }

  cfg.presets = (cfg.presets || []).map((preset) => {
    if (!preset || preset.type !== 'stremthruStore') return preset;
    return {
      ...preset,
      enabled: true,
      options: { ...(preset.options || {}), name: STORE_LABELS[service] },
    };
  });

  if ((cfg.presets || []).some((p) => p && p.type === 'stremthruTorz')) {
    throw new Error('Store overlay refuses Hybrid. Pick AllDebrid or TorBox, not both.');
  }

  const meta = { ...(out.metadata || {}) };
  meta.id = rec.id === service ? `brevity.core-nexus-${service}` : `brevity.core-nexus-4k-${service}`;
  meta.name = rec.name;
  meta.category = labelName(service);
  meta.description = rec.note;
  meta.sourceUrl = rec.url;
  meta.coreBuildsStoreService = service;
  out.metadata = meta;
  if (typeof cfg.addonName === 'string') cfg.addonName = meta.name;
  if (typeof cfg.addonDescription === 'string') cfg.addonDescription = meta.name;
  return out;
}
