import { sanitizeAioEnumArrays } from '../config/schema-guard.js';

const ALLOWED_MIGRATION_FIELDS = new Set([
  'services','presets','groups','sortCriteria','deduplicator','formatter',
  'parentConfig','resultLimits','excludedResolutions','includedResolutions',
  'requiredResolutions','preferredResolutions','excludedEncodes','preferredEncodes',
  'excludedAudioTags','preferredAudioTags','preferredAudioChannels','preferredVisualTags',
  'excludedLanguages','includedLanguages','requiredLanguages','preferredLanguages',
  'excludedQualities','includedQualities','requiredQualities','preferredQualities',
  'excludedVisualTags','includedVisualTags','requiredVisualTags',
  'excludedStreamExpressions','includedStreamExpressions',
  'requiredStreamExpressions','preferredStreamExpressions','rankedStreamExpressions',
  'syncedExcludedStreamExpressionUrls','syncedIncludedStreamExpressionUrls',
  'syncedPreferredStreamExpressionUrls','syncedRankedStreamExpressionUrls',
  'excludedRegexPatterns','rankedRegexPatterns','preferredRegexPatterns',
  'syncedExcludedRegexUrls','syncedRankedRegexUrls','size','bitrate',
  'titleMatching','yearMatching','seasonEpisodeMatching','digitalReleaseFilter',
]);

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function assembleTemplate(rawTemplate, options = {}) {
  if (!rawTemplate || typeof rawTemplate !== 'object') {
    throw new TypeError('Template must be an object');
  }

  const template = clone(rawTemplate);
  const config = template.config && typeof template.config === 'object'
    ? template.config
    : (template.config = {});

  if (options.disabledAddons?.size && Array.isArray(config.presets)) {
    const matchFn = options.presetMatchesAddon;
    if (typeof matchFn === 'function') {
      const disabled = [...options.disabledAddons];
      config.presets = config.presets.filter(
        preset => !disabled.some(name => matchFn(preset, name))
      );
    }
  }

  if (options.migrationKeep && typeof options.migrationKeep === 'object') {
    for (const [key, value] of Object.entries(options.migrationKeep)) {
      if (ALLOWED_MIGRATION_FIELDS.has(key)) config[key] = clone(value);
    }
  }

  sanitizeAioEnumArrays(config);

  if (options.metadata && typeof options.metadata === 'object') {
    template.metadata = { ...(template.metadata || {}), ...clone(options.metadata) };
  }

  return template;
}

export { ALLOWED_MIGRATION_FIELDS };
