/** Local-only import/update helpers. No storage, network or browser globals. */
import { OPTIONAL_SCRAPER_DEFS } from '../data/scrapers.js';

export function cloneUpdateValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
const clone = cloneUpdateValue;
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const enabled = value => value?.enabled !== false;

/** Accept a config, a template, or AIOStreams' single-template array export. */
export function normalizeUpdateTemplate(input) {
  let template = input;
  if (Array.isArray(template)) {
    if (template.length !== 1) throw new TypeError('Choose one template to update; multi-template collections are not supported here.');
    [template] = template;
  }
  if (!object(template)) throw new TypeError('Expected an AIOStreams config or template object.');
  const config = Object.hasOwn(template, 'config') ? template.config : template;
  if (!object(config) || (!Array.isArray(config.services) && !Array.isArray(config.presets))) {
    throw new TypeError('Not a valid AIOStreams template — missing services or presets.');
  }
  if (config.presets !== undefined && !Array.isArray(config.presets)) throw new TypeError('Template presets must be an array.');
  if (config.services !== undefined && !Array.isArray(config.services)) throw new TypeError('Template services must be an array.');
  const ids = new Set();
  for (const preset of config.presets || []) {
    if (!object(preset) || typeof preset.type !== 'string' || !preset.type.trim()
      || typeof preset.instanceId !== 'string' || !preset.instanceId.trim() || !object(preset.options)) {
      throw new TypeError('Every imported preset needs a type, instanceId and options object. Use the Configuration Doctor to repair malformed presets first.');
    }
    if (ids.has(preset.instanceId)) throw new TypeError('Duplicate preset instanceId — repair the template with the Configuration Doctor before updating.');
    ids.add(preset.instanceId);
  }
  return clone(Object.hasOwn(template, 'config') ? template : { config });
}

function endpoint(value) {
  try {
    const url = new URL(String(value || ''));
    // Match host/path, not an arbitrary substring of a user-controlled URL.
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch { return ''; }
}

export function optionalScraperForPreset(preset) {
  return OPTIONAL_SCRAPER_DEFS.find(definition => {
    if (definition.presetType !== preset?.type) return false;
    return definition.apiUrl
      ? endpoint(preset?.options?.api?.url) === endpoint(definition.apiUrl)
      : true;
  });
}

const PRESET_CREDENTIALS = Object.freeze({
  debridio: ['debridio', 'debridioApiKey'],
  debrider: ['debrider', 'apiKey'],
  subdl: ['subdl', 'subDlApiKey'],
  jackett: ['jackett', 'jackettApiKey'],
  prowlarr: ['prowlarr', 'prowlarrApiKey'],
  streamnzb: ['streamnzb', 'url'],
  'debridio-tmdb': ['debridio', 'debridioApiKey'],
  'debridio-tvdb': ['debridio', 'debridioApiKey'],
  'debridio-watchtower': ['debridio', 'debridioApiKey'],
  subdl: ['subdl', 'subDlApiKey'],
});

// Credentials that only mean something next to one endpoint. A key entered for
// one URL must never be written into a preset that points somewhere else: an
// imported NZBHydra/Jackett/Prowlarr at a new address with a blank key would
// otherwise inherit the previous setup's key and send it to that address.
const ENDPOINT_BOUND = Object.freeze({
  nzbhydra: Object.freeze({ urlCred: 'nzbhydra', keyCred: 'nzbhydraApiKey', url: options => options?.api?.url }),
  jackett: Object.freeze({ urlCred: 'jackettUrl', keyCred: 'jackett', url: options => options?.jackettUrl }),
  prowlarr: Object.freeze({ urlCred: 'prowlarrUrl', keyCred: 'prowlarr', url: options => options?.prowlarrUrl }),
});
const sameEndpoint = (a, b) => { const left = endpoint(a); return Boolean(left) && left === endpoint(b); };

/**
 * Credentials for an update preview: saved values, overridden by every non-empty
 * imported value. An endpoint-bound key is inherited only while the imported
 * endpoint is the saved one; at a new endpoint the imported key (even blank) wins.
 */
export function inheritUpdateCredentials(saved = {}, imported = {}) {
  const out = { ...saved };
  for (const [key, value] of Object.entries(imported)) if (typeof value === 'string' && value.trim()) out[key] = value;
  for (const { urlCred, keyCred } of Object.values(ENDPOINT_BOUND)) {
    const importedUrl = imported[urlCred];
    if (typeof importedUrl === 'string' && importedUrl.trim() && !sameEndpoint(importedUrl, saved[urlCred])) {
      out[keyCred] = typeof imported[keyCred] === 'string' ? imported[keyCred] : '';
    }
  }
  return out;
}

export function importedSourceState(config = {}) {
  const presets = clone(config.presets || []), optionalScrapers = [], creds = {};
  // Recover disabled-source credentials too, without selecting those sources.
  // Enabled instances win the shared credential field, but distinct per-instance
  // values remain on the original presets unless the shared field changes.
  for (const preset of [...presets.filter(p => !enabled(p)), ...presets.filter(enabled)]) {
    const definition = optionalScraperForPreset(preset);
    if (definition) {
      if (enabled(preset)) optionalScrapers.push(definition.id);
      const key = preset.options?.api?.apiKey ?? preset.options?.apiKey;
      if (definition.credKey && preset.type !== 'nzbhydra' && typeof key === 'string' && key.trim()) creds[definition.credKey] = key;
    }
    if (preset.type === 'newznab' && endpoint(preset.options?.api?.url) === endpoint('https://api.nzbgeek.info/api')) {
      if (typeof preset.options.api.apiKey === 'string') creds.nzbgeek = preset.options.api.apiKey;
    }
    const credential = PRESET_CREDENTIALS[preset.type];
    if (credential && typeof preset.options?.[credential[1]] === 'string') creds[credential[0]] = preset.options[credential[1]];
    const bound = ENDPOINT_BOUND[preset.type];
    if (bound && preset.type !== 'nzbhydra' && typeof bound.url(preset.options) === 'string') creds[bound.urlCred] = bound.url(preset.options);
    if (preset.type === 'nzbhydra' && object(preset.options?.api)) {
      creds.nzbhydra = preset.options.api.url || '';
      creds.nzbhydraApiKey = preset.options.api.apiKey || '';
    }
  }
  return { _importedPresets: presets, optionalScrapers: [...new Set(optionalScrapers)], creds };
}

/**
 * Keep existing instances/options instead of replacing every source by a canned
 * default. A generated type already present in the import is not added again:
 * two custom Newznab endpoints remain two endpoints, not one overwritten slot.
 * Explicit optional-source toggles and re-entered keys still take effect.
 */
export function mergeImportedPresets(generated = [], imported, { optionalScrapers = [], creds = {}, multiServices, catalogs, subtitleAddons } = {}) {
  if (!Array.isArray(imported)) return clone(generated);
  const existingTypes = new Set(imported.map(preset => preset.type));
  const selected = new Set(optionalScrapers);
  const baselineCreds = importedSourceState({ presets: imported }).creds;
  const credentialChanged = key => typeof creds[key] === 'string' && creds[key] !== (baselineCreds[key] || '');
  const originallySelected = new Set(imported.filter(enabled).map(optionalScraperForPreset).filter(Boolean).map(definition => definition.id));
  const selectedTypes = new Set(imported.filter(enabled).map(preset => preset.type));
  const controlledSelection = type => {
    if (['debridio', 'debrider'].includes(type) && Array.isArray(multiServices)) return multiServices.includes(type);
    if (['tmdb-addon', 'streaming-catalogs', 'anime-catalogs', 'rpdb-catalogs', 'torrent-catalogs'].includes(type) && Array.isArray(catalogs)) return catalogs.includes(type);
    if (['aiosubtitle', 'opensubtitles-v3-plus', 'subdl'].includes(type) && Array.isArray(subtitleAddons)) return subtitleAddons.includes(type);
    return undefined;
  };
  const retained = clone(imported).map(preset => {
    const definition = optionalScraperForPreset(preset);
    if (definition && selected.has(definition.id) !== originallySelected.has(definition.id)) preset.enabled = selected.has(definition.id);
    const selection = controlledSelection(preset.type);
    if (selection !== undefined && selection !== selectedTypes.has(preset.type)) preset.enabled = selection;
    const options = preset.options;
    if (definition?.credKey && preset.type !== 'nzbhydra' && credentialChanged(definition.credKey)) {
      if (object(options.api)) options.api.apiKey = creds[definition.credKey];
      else if (Object.hasOwn(options, 'apiKey')) options.apiKey = creds[definition.credKey];
      if (!creds[definition.credKey].trim()) preset.enabled = false;
    }
    const credential = PRESET_CREDENTIALS[preset.type];
    const bound = ENDPOINT_BOUND[preset.type];
    if (credential && credentialChanged(credential[0]) && (!bound || sameEndpoint(bound.url(options), creds[bound.urlCred]))) {
      options[credential[1]] = creds[credential[0]];
      // Match the keyless generated-source policy rather than leave an enabled
      // required-key preset that the target host cannot save.
      if (!creds[credential[0]].trim()) preset.enabled = false;
    }
    // AIOStreams refuses the whole save for a SubDL preset with no key, and an imported
    // one survives the generator's own key gate, so apply the same rule here.
    if (preset.type === 'subdl' && preset.enabled !== false && !String(options?.subDlApiKey || '').trim()) preset.enabled = false;
    if (preset.type === 'nzbhydra' && object(options.api)) {
      for (const [key, field] of [['nzbhydra', 'url'], ['nzbhydraApiKey', 'apiKey']]) {
        // The URL is applied first, so a key is written only next to the URL it was entered for.
        if (field === 'apiKey' && !sameEndpoint(options.api.url, creds.nzbhydra)) continue;
        if (credentialChanged(key)) {
          options.api[field] = creds[key];
          if (!creds[key].trim()) preset.enabled = false;
        }
      }
    }
    if (preset.type === 'newznab' && endpoint(options.api?.url) === endpoint('https://api.nzbgeek.info/api') && credentialChanged('nzbgeek')) {
      options.api.apiKey = creds.nzbgeek;
      if (!creds.nzbgeek.trim()) preset.enabled = false;
    }
    return preset;
  });
  const ids = new Set(retained.map(preset => preset.instanceId));
  return [...retained, ...clone(generated).filter(preset => {
    if (ids.has(preset.instanceId)) return false;
    if (!existingTypes.has(preset.type)) return true;
    const definition = optionalScraperForPreset(preset);
    // Adding a different known indexer is an explicit choice, not a duplicate
    // of every other Newznab endpoint already present in the import.
    return Boolean(definition && selected.has(definition.id)
      && !imported.some(source => optionalScraperForPreset(source)?.id === definition.id));
  })];
}
