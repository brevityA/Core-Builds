/**
 * Template complexity and feature-conflict policy.
 *
 * This module deliberately operates on configuration structure and rule labels;
 * it never reads, returns, logs, or serialises service credentials.
 * It is suitable for both generated and imported AIOStreams templates.
 */

const EXPRESSION_FIELDS = Object.freeze([
  'excludedStreamExpressions',
  'includedStreamExpressions',
  'requiredStreamExpressions',
  'preferredStreamExpressions',
  'rankedStreamExpressions',
]);

const SYNCED_SEL_FIELDS = Object.freeze([
  'syncedExcludedStreamExpressionUrls',
  'syncedIncludedStreamExpressionUrls',
  'syncedPreferredStreamExpressionUrls',
  'syncedRankedStreamExpressionUrls',
]);

const SYNCED_REGEX_FIELDS = Object.freeze([
  'syncedExcludedRegexUrls',
  'syncedRankedRegexUrls',
]);

export const OUTPUT_PROFILE_BUDGETS = Object.freeze({
  // Core Stable is a strict product contract, not an aspirational ceiling.
  stable: Object.freeze({
    excludedExpressions: 1,
    includedExpressions: 0,
    preferredExpressions: 0,
    rankedExpressions: 0,
    inlineRankedRegex: 0,
    syncedSelUrls: 0,
    syncedRegexUrls: 0,
    groups: false,
    dynamicFetching: false,
  }),
  // Balanced has a bounded local preference layer, but no remote scoring or
  // background/early-exit fetch strategy.
  balanced: Object.freeze({
    excludedExpressions: 3,
    includedExpressions: 2,
    preferredExpressions: 8,
    rankedExpressions: 0,
    inlineRankedRegex: 0,
    syncedSelUrls: 0,
    syncedRegexUrls: 0,
    groups: false,
    dynamicFetching: false,
  }),
  advanced: Object.freeze({
    excludedExpressions: 30,
    includedExpressions: 8,
    preferredExpressions: 24,
    rankedExpressions: 10,
    inlineRankedRegex: 120,
    syncedSelUrls: 0,
    syncedRegexUrls: 2,
    groups: null,
    dynamicFetching: null,
  }),
  labs: Object.freeze({
    excludedExpressions: null,
    includedExpressions: null,
    preferredExpressions: null,
    rankedExpressions: null,
    inlineRankedRegex: null,
    syncedSelUrls: 0,
    syncedRegexUrls: null,
    groups: null,
    dynamicFetching: null,
  }),
});

function configOf(templateOrConfig) {
  if (!templateOrConfig || typeof templateOrConfig !== 'object') return {};
  return templateOrConfig.config && typeof templateOrConfig.config === 'object'
    ? templateOrConfig.config
    : templateOrConfig;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function enabledEntries(value) {
  return list(value).filter(item => !item || typeof item !== 'object' || item.enabled !== false);
}

function expressionText(entry) {
  return typeof entry === 'string' ? entry : String(entry?.expression || '');
}

function expressions(config, field) {
  return enabledEntries(config[field]).map(expressionText).filter(Boolean);
}

function allExpressions(config) {
  return EXPRESSION_FIELDS.flatMap(field => expressions(config, field));
}

function hasExpression(expressionsToCheck, matcher) {
  return expressionsToCheck.some(expression => matcher.test(expression));
}

function listCount(config, fields) {
  return fields.reduce((count, field) => count + list(config[field]).length, 0);
}

function normalisedValues(value) {
  return new Set(list(value).map(item => String(item).trim().toLowerCase()).filter(Boolean));
}

function overlap(left, right) {
  const a = normalisedValues(left);
  return [...normalisedValues(right)].filter(value => a.has(value));
}

function issue(id, severity, title, message, fields = []) {
  return { id, severity, title, message, fields };
}

function hasNativeResultLimit(config) {
  const limits = config.resultLimits;
  return Boolean(
    (limits && typeof limits === 'object' && Object.keys(limits).length)
    || Number(config.maxResults) > 0
    || Number(config.maxResultsPerResolution) > 0
  );
}

/**
 * Return structural counts only. URLs and credentials are intentionally not
 * returned so this result is safe to show in diagnostics and support reports.
 */
export function inspectTemplateComplexity(templateOrConfig) {
  const config = configOf(templateOrConfig);
  const expressionSets = Object.fromEntries(
    EXPRESSION_FIELDS.map(field => [field, expressions(config, field)])
  );
  const all = Object.values(expressionSets).flat();
  const presets = enabledEntries(config.presets);

  return {
    expressions: {
      excluded: expressionSets.excludedStreamExpressions.length,
      included: expressionSets.includedStreamExpressions.length,
      required: expressionSets.requiredStreamExpressions.length,
      preferred: expressionSets.preferredStreamExpressions.length,
      ranked: expressionSets.rankedStreamExpressions.length,
      total: all.length,
      characters: all.reduce((count, expression) => count + expression.length, 0),
    },
    regex: {
      excluded: list(config.excludedRegexPatterns).length,
      preferred: list(config.preferredRegexPatterns).length,
      ranked: list(config.rankedRegexPatterns).length,
    },
    remoteDependencies: {
      syncedSelUrls: listCount(config, SYNCED_SEL_FIELDS),
      syncedRegexUrls: listCount(config, SYNCED_REGEX_FIELDS),
    },
    runtime: {
      groupsEnabled: Boolean(config.groups?.enabled),
      dynamicFetchingEnabled: Boolean(config.dynamicAddonFetching?.enabled),
      nativeResultLimitEnabled: hasNativeResultLimit(config),
      enabledPresets: presets.length,
    },
  };
}

/**
 * Detect combinations which are contradictory, redundant, or significantly
 * harder to support. A warning does not mean a template is invalid.
 */
export function findFeatureConflicts(templateOrConfig) {
  const config = configOf(templateOrConfig);
  const all = allExpressions(config);
  const issues = [];

  const hasNamedLimit = hasExpression(all, /\/\*\s*(?:per-addon flood guard|final limit|extra cached|extra uncached|standard extra cached|labs.*pergroup)/i);
  if (hasNativeResultLimit(config) && hasNamedLimit) {
    issues.push(issue(
      'C01_RESULT_CAP_STACK',
      'warning',
      'More than one result-limiting layer is active',
      'Native result limits and named SEL result caps can both remove streams. Use one owner for output count, or document the intended order.',
      ['resultLimits', 'maxResults', 'maxResultsPerResolution', 'excludedStreamExpressions']
    ));
  }

  if (config.groups?.enabled && config.dynamicAddonFetching?.enabled) {
    issues.push(issue(
      'C02_FETCH_EXIT_STACK',
      'warning',
      'Groups and dynamic fetching are both active',
      'Both mechanisms can stop later add-ons from being queried. This is valid only when their combined coverage and timeout behaviour has been tested.',
      ['groups', 'dynamicAddonFetching']
    ));
  }

  const syncedExpressionCount = listCount(config, SYNCED_SEL_FIELDS);
  if (syncedExpressionCount > 0) {
    issues.push(issue(
      'C17_SYNCED_EXPRESSIONS_PROHIBITED',
      'error',
      'Synced stream-expression URLs are prohibited',
      'Core Builds must use local stream expressions only. Remove every synced stream-expression URL and any score rules that depended on it.',
      [...SYNCED_SEL_FIELDS]
    ));
  }

  const remoteRankedScoring = list(config.syncedRankedStreamExpressionUrls).length > 0;
  const localScoreCull = hasExpression(all, /\/\*\s*(?:score\s*iqr|adaptive score|low sel score)/i);
  if (remoteRankedScoring && localScoreCull) {
    issues.push(issue(
      'C03_REMOTE_SCORE_WITH_LOCAL_CULL',
      'warning',
      'Remote scoring is combined with local score culling',
      'An upstream score change can change which streams are removed by the local score threshold. Keep one score owner or make the dependency explicit.',
      ['syncedRankedStreamExpressionUrls', 'excludedStreamExpressions']
    ));
  }

  const remoteCount = listCount(config, [...SYNCED_SEL_FIELDS, ...SYNCED_REGEX_FIELDS]);
  if (remoteCount > 0 && all.length > 0) {
    issues.push(issue(
      'C04_REMOTE_AND_INLINE_RULES',
      'info',
      'Remote and inline filtering rules are combined',
      'Runtime behaviour depends on both this configuration and remote sources. Show dependency and host-compatibility details in support diagnostics.',
      [...SYNCED_SEL_FIELDS, ...SYNCED_REGEX_FIELDS, ...EXPRESSION_FIELDS]
    ));
  }

  if (config.excludeUncached === true && hasExpression(all, /\/\*\s*cached only\b/i)) {
    issues.push(issue(
      'C05_DUPLICATE_CACHED_ONLY',
      'warning',
      'Cached-only is applied twice',
      'The native excludeUncached flag and a Cached Only SEL rule both remove uncached streams. Keep the native flag and remove the duplicate SEL rule.',
      ['excludeUncached', 'excludedStreamExpressions']
    ));
  }

  if (config.excludeCached === true && hasExpression(all, /\/\*\s*uncached only\b/i)) {
    issues.push(issue(
      'C06_DUPLICATE_UNCACHED_ONLY',
      'warning',
      'Uncached-only is applied twice',
      'The native excludeCached flag and an Uncached Only SEL rule both remove cached streams. Keep the native flag and remove the duplicate SEL rule.',
      ['excludeCached', 'excludedStreamExpressions']
    ));
  }

  if (config.size && hasExpression(all, /\/\*\s*size limit\b/i)) {
    issues.push(issue(
      'C07_DUPLICATE_SIZE_CAP',
      'warning',
      'Size filtering is applied twice',
      'A native size policy and a Size Limit SEL rule can have different pack/folder semantics. Use the native size policy as the single cap owner.',
      ['size', 'excludedStreamExpressions']
    ));
  }

  const hardLanguageMechanisms = [
    normalisedValues(config.requiredLanguages).size > 0,
    hasExpression(all, /foreign language kill/i),
    hasExpression(all, /language exclusive/i),
  ].filter(Boolean).length;
  if (hardLanguageMechanisms > 1) {
    issues.push(issue(
      'C08_LANGUAGE_HARD_FILTER_STACK',
      'warning',
      'Several hard language filters are active',
      'Required language fields, Foreign Language Kill, and Language Exclusive can each remove Unknown, Original, Multi, or Dual Audio releases. Keep one hard language mechanism.',
      ['requiredLanguages', 'excludedStreamExpressions', 'includedStreamExpressions']
    ));
  }

  for (const [suffix, label] of [
    ['Resolutions', 'resolution'],
    ['Qualities', 'quality'],
    ['Languages', 'language'],
    ['VisualTags', 'visual tag'],
    ['Encodes', 'encode'],
    ['AudioTags', 'audio tag'],
    ['AudioChannels', 'audio channel'],
    ['StreamTypes', 'stream type'],
  ]) {
    const excluded = `excluded${suffix}`;
    const required = `required${suffix}`;
    const included = `included${suffix}`;
    const preferred = `preferred${suffix}`;
    const requiredOverlap = overlap(config[excluded], config[required]);
    const includedOverlap = overlap(config[excluded], config[included]);
    const preferredOverlap = overlap(config[excluded], config[preferred]);

    if (requiredOverlap.length || includedOverlap.length) {
      issues.push(issue(
        `C09_${suffix.toUpperCase()}_CONTRADICTION`,
        'error',
        `A ${label} is both excluded and required/included`,
        `Remove the overlap: ${[...requiredOverlap, ...includedOverlap].join(', ')}.`,
        [excluded, required, included]
      ));
    } else if (preferredOverlap.length) {
      issues.push(issue(
        `C10_${suffix.toUpperCase()}_PREFERENCE_CONTRADICTION`,
        'warning',
        `A ${label} is both excluded and preferred`,
        `A preference cannot take effect for an excluded value: ${preferredOverlap.join(', ')}.`,
        [excluded, preferred]
      ));
    }
  }

  const legacyPackKill = hasExpression(all, /\/\*\s*(?:ongoingseasonpack|.*hard season pack kill|.*kill ambiguous packs|.*kill multi-episode)/i);
  const latePackFallback = hasExpression(all, /\/\*\s*cb\s*\|\s*late pack fallback/i);
  if (legacyPackKill && latePackFallback) {
    issues.push(issue(
      'C11_LEGACY_AND_LATE_PACK_RULES',
      'error',
      'Legacy pack kills conflict with late pack fallback',
      'Legacy rules remove packs before the availability-aware fallback can preserve them. Remove the legacy pack-kill rules.',
      ['excludedStreamExpressions']
    ));
  }

  const uncachedPrecache = typeof config.precacheSelector === 'string' && /\buncached\s*\(/i.test(config.precacheSelector);
  const uncachedFailover = Boolean(config.nzbFailover?.enabled);
  if (config.excludeUncached === true && (uncachedPrecache || uncachedFailover)) {
    issues.push(issue(
      'C12_CACHED_ONLY_WITH_UNCACHED_BACKGROUND_ACTION',
      'info',
      'Cached-only display is combined with an uncached background action',
      'This can be intentional, but it is difficult to explain during support. Make the background behaviour visible in the Review screen.',
      ['excludeUncached', 'precacheSelector', 'nzbFailover']
    ));
  }

  if (remoteRankedScoring) {
    const sort = list(config.sortCriteria?.global).map(item => item?.key);
    if (!sort.includes('streamExpressionScore')) {
      issues.push(issue(
        'C15_REMOTE_SCORE_NOT_IN_SORT',
        'warning',
        'Remote ranked scoring is enabled but not present in global sort order',
        'Ranked stream expressions will not have the intended ordering effect until Stream Expression Score is added to global sorting.',
        ['syncedRankedStreamExpressionUrls', 'sortCriteria']
      ));
    }
  }

  const presetIds = new Set(enabledEntries(config.presets).map(preset => String(preset?.instanceId || '')).filter(Boolean));
  if (config.groups?.enabled) {
    const unknown = list(config.groups.groupings).flatMap(group => list(group?.addons))
      .map(id => String(id))
      .filter(id => id && !presetIds.has(id));
    if (unknown.length) {
      issues.push(issue(
        'C16_GROUP_REFERENCES_UNKNOWN_PRESET',
        'error',
        'A fetch group references an unavailable preset',
        `Group entries do not match enabled presets: ${[...new Set(unknown)].join(', ')}.`,
        ['groups', 'presets']
      ));
    }
  }

  return issues;
}

/**
 * Check the structural complexity budget for an output profile. This is not a
 * schema validator; callers should run normal AIOStreams/schema validation too.
 */
export function validateOutputProfileBudget(templateOrConfig, profile = 'stable') {
  const budget = OUTPUT_PROFILE_BUDGETS[profile];
  if (!budget) throw new Error(`Unknown output profile: ${profile}`);
  const complexity = inspectTemplateComplexity(templateOrConfig);
  const violations = [];

  const checks = [
    ['excludedExpressions', complexity.expressions.excluded, 'excluded SEL expressions'],
    ['includedExpressions', complexity.expressions.included, 'included SEL expressions'],
    ['preferredExpressions', complexity.expressions.preferred, 'preferred SEL expressions'],
    ['rankedExpressions', complexity.expressions.ranked, 'ranked SEL expressions'],
    ['inlineRankedRegex', complexity.regex.ranked, 'inline ranked regex patterns'],
    ['syncedSelUrls', complexity.remoteDependencies.syncedSelUrls, 'synced SEL URLs'],
    ['syncedRegexUrls', complexity.remoteDependencies.syncedRegexUrls, 'synced regex URLs'],
  ];

  for (const [key, actual, label] of checks) {
    if (budget[key] != null && actual > budget[key]) {
      violations.push({ key, actual, allowed: budget[key], message: `${actual} ${label}; ${budget[key]} allowed for ${profile}` });
    }
  }

  if (budget.groups != null && complexity.runtime.groupsEnabled !== budget.groups) {
    violations.push({ key: 'groups', actual: complexity.runtime.groupsEnabled, allowed: budget.groups, message: `groups must be ${budget.groups ? 'enabled' : 'disabled'} for ${profile}` });
  }
  if (budget.dynamicFetching != null && complexity.runtime.dynamicFetchingEnabled !== budget.dynamicFetching) {
    violations.push({ key: 'dynamicFetching', actual: complexity.runtime.dynamicFetchingEnabled, allowed: budget.dynamicFetching, message: `dynamic fetching must be ${budget.dynamicFetching ? 'enabled' : 'disabled'} for ${profile}` });
  }

  return { profile, budget, complexity, violations, ok: violations.length === 0 };
}
