/** Pure normalization and safety policy for generated addon presets. */

const DEFAULT_TIMEOUT = 6000;

/**
 * Service ids AIOStreams' built-in Library preset can track. This is NOT a
 * guess: it mirrors `LibraryPreset.supportedServices` at the pinned upstream
 * (`packages/core/src/presets/library.ts` @ v2.34.0), which is every StremThru
 * service (`packages/core/src/utils/stremthru.ts`) plus the usenet-engine ids
 * (`nzbdav`, `altmount`, `stremthru_newz`, `aiostreams`).
 *
 * EasyNews is deliberately NOT on the list. Upstream refuses to save such a
 * config with "The library requires at least one usable service to be
 * configured" (library.ts), so emitting an enabled Library preset into an
 * EasyNews-only (or credential-free) template is a guaranteed install failure.
 * The configurator mirrors this same list in
 * `configurator/src/core/addon-policy.js`; both sides must stay in sync.
 */
export const LIBRARY_CAPABLE_SERVICES = Object.freeze([
  'alldebrid',
  'debrider',
  'debridlink',
  'easydebrid',
  'offcloud',
  'premiumize',
  'pikpak',
  'realdebrid',
  'torbox',
  'torrin',
  'nzbdav',
  'altmount',
  'stremthru_newz',
  'aiostreams',
]);

/** True when at least one enabled service id can actually drive the Library preset. */
export function hasLibraryCapableService(serviceIds = []) {
  return (Array.isArray(serviceIds) ? serviceIds : []).some(id => LIBRARY_CAPABLE_SERVICES.includes(id));
}

export function addonPolicy(input = {}, presets = [], options = {}) {
  const timeout = Number(input.addonTimeout) || options.defaultTimeout || DEFAULT_TIMEOUT;
  const disabled = new Set(options.disabledPresetIds || []);
  const warnings = [];
  const normalized = [];

  for (const source of Array.isArray(presets) ? presets : []) {
    if (!source || typeof source !== 'object') continue;
    const id = String(source.instanceId || source.id || source.type || '').trim();
    if (!id) {
      warnings.push('Preset without instanceId/type was skipped');
      continue;
    }
    if (disabled.has(id) || source.enabled === false) continue;
    if (!source.type) {
      warnings.push(`Preset ${id} has no type and was skipped`);
      continue;
    }
    const preset = {
      ...source,
      instanceId: id,
      enabled: true,
      options: { ...(source.options || {}) },
    };
    if (options.applyTimeout !== false || !('timeout' in preset.options)) {
      preset.options.timeout = timeout;
    }
    normalized.push(preset);
  }

  const groups = normalized.reduce((map, preset) => {
    const group = String(preset.group || preset.category || 'default');
    if (!map[group]) map[group] = [];
    map[group].push(preset);
    return map;
  }, {});

  return { presets: normalized, groups, disabled: [...disabled], warnings };
}

export function assertAddonPolicy(result) {
  if (!result || !Array.isArray(result.presets)) throw new TypeError('Invalid addon policy result');
  for (const preset of result.presets) {
    if (!preset.instanceId || !preset.type || !preset.options) throw new Error('Invalid addon preset');
  }
  for (const [name, group] of Object.entries(result.groups || {})) {
    if (!group.length) throw new Error(`Empty addon group: ${name}`);
  }
  return result;
}
