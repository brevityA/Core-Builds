import { sanitizeAioEnumArrays } from '../config/schema-guard.js';

const ALLOWED_MIGRATION_FIELDS = new Set([
  'services','presets','groups','sortCriteria','deduplicator','formatter',
  'parentConfig','resultLimits','excludedResolutions','includedResolutions',
  'requiredResolutions','preferredResolutions','excludedEncodes','preferredEncodes',
  'excludedAudioTags','preferredAudioTags','preferredAudioChannels','preferredVisualTags',
  'excludedLanguages','includedLanguages','requiredLanguages','preferredLanguages',
  'excludedQualities','includedQualities','requiredQualities','preferredQualities',
  'excludedVisualTags','includedVisualTags','requiredVisualTags',
  'excludedStreamExpressions','includedStreamExpressions','requiredStreamExpressions',
  'preferredStreamExpressions','rankedStreamExpressions',
  'syncedExcludedStreamExpressionUrls','syncedIncludedStreamExpressionUrls',
  'syncedPreferredStreamExpressionUrls','syncedRankedStreamExpressionUrls',
  'excludedRegexPatterns','rankedRegexPatterns','preferredRegexPatterns',
  'syncedExcludedRegexUrls','syncedRankedRegexUrls',
  'size','bitrate','titleMatching','yearMatching','seasonEpisodeMatching',
  'digitalReleaseFilter',
]);

export function assembleTemplate(rawTemplate, options = {}) {
  const tpl = rawTemplate;

  if (options.disabledAddons?.size && Array.isArray(tpl.config?.presets)) {
    const matchFn = options.presetMatchesAddon;
    if (typeof matchFn === 'function') {
      const disabled = [...options.disabledAddons];
      tpl.config.presets = tpl.config.presets.filter(
        p => !disabled.some(n => matchFn(p, n))
      );
    }
  }

  if (options.migrationKeep && typeof options.migrationKeep === 'object') {
    const filtered = {};
    for (const k of Object.keys(options.migrationKeep)) {
      if (ALLOWED_MIGRATION_FIELDS.has(k)) filtered[k] = options.migrationKeep[k];
    }
    Object.assign(tpl.config, filtered);
  }

  sanitizeAioEnumArrays(tpl.config);

  if (!tpl.metadata) tpl.metadata = {};
  tpl.metadata.coreBuildsVersion = options.version || '0.0';
  tpl.metadata.generatedAt = new Date().toISOString();

  return tpl;
}

export { ALLOWED_MIGRATION_FIELDS };
