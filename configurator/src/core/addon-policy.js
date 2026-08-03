/** Pure normalization and safety policy for generated addon presets. */

const DEFAULT_TIMEOUT = 6000;

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
