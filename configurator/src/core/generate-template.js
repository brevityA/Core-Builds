import { templateInput, hasTmdbCredentials } from './template-policy.js';
import { resolutionPolicy, encodePolicy, audioPolicy } from './device-policies.js';
import { sortPolicy } from './sort-policy.js';
import { filterPolicy } from './filter-policy.js';
import { addonPolicy, assertAddonPolicy } from './addon-policy.js';

/**
 * Pure generation facade.
 *
 * `assemble` is injected because the legacy preset/template assembly is still
 * being migrated from app.js. The facade owns normalization and policy order;
 * it never touches browser globals, storage, or the network.
 */
export function generateTemplate(rawInput = {}, dependencies = {}) {
  const input = templateInput(rawInput);
  const hasTmdb = hasTmdbCredentials(input);
  const device = {
    resolution: resolutionPolicy(input),
    encode: encodePolicy(input, dependencies.deviceAv1Safe || new Set()),
    audio: audioPolicy(input, dependencies.deviceForceLimitedAudio || new Set()),
  };
  const filters = filterPolicy(input, { hasTmdb });
  const sort = sortPolicy(input);
  const addonResult = addonPolicy(input, dependencies.presets || [], {
    defaultTimeout: dependencies.defaultTimeout,
    disabledPresetIds: dependencies.disabledPresetIds,
  });
  assertAddonPolicy(addonResult);

  const context = { input, hasTmdb, device, filters, sort, addons: addonResult };
  if (typeof dependencies.assemble === 'function') {
    return dependencies.assemble(context);
  }
  return context;
}
