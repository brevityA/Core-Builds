/**
 * Deterministic fetch-strategy model for reliability tests.
 *
 * This is deliberately a product-level timing mock, not an AIOStreams fetcher
 * replacement. It lets Core Builds prove what its UI promises: the Stable
 * product has no early exit, while any Dynamic/Groups strategy necessarily
 * trades coverage for speed and must say so.
 */

function nonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normaliseProvider(raw, index) {
  const id = String(raw?.id || `provider-${index + 1}`);
  return {
    id,
    assigned: raw?.assigned !== false,
    metadataMs: nonNegativeNumber(raw?.metadataMs),
    responseMs: nonNegativeNumber(raw?.responseMs),
    streamIds: Array.isArray(raw?.streamIds) ? raw.streamIds.map(String) : [],
  };
}

function dedupe(values) {
  return [...new Set(values)];
}

function providerCompletion(provider, startedAt = 0) {
  return startedAt + provider.metadataMs + provider.responseMs;
}

function baseResult(strategy) {
  return {
    strategy,
    returnedStreamIds: [],
    completedProviders: [],
    timedOutProviders: [],
    skippedProviders: [],
    warnings: [],
    earlyExit: false,
  };
}

function addCompleted(result, provider) {
  result.completedProviders.push(provider.id);
  result.returnedStreamIds.push(...provider.streamIds);
}

function markTimedOut(result, provider) {
  result.timedOutProviders.push(provider.id);
}

function assignedProviders(rawProviders, result) {
  const providers = rawProviders.map(normaliseProvider);
  for (const provider of providers) {
    if (!provider.assigned) result.warnings.push(provider.id);
  }
  return providers.filter(provider => provider.assigned);
}

function finish(result) {
  result.returnedStreamIds = dedupe(result.returnedStreamIds);
  result.completedProviders = dedupe(result.completedProviders);
  result.timedOutProviders = dedupe(result.timedOutProviders);
  result.skippedProviders = dedupe(result.skippedProviders);
  result.warnings = dedupe(result.warnings);
  return result;
}

function runDefault(providers, timeoutMs, result) {
  const ordered = providers
    .map(provider => ({ provider, at: providerCompletion(provider) }))
    .sort((left, right) => left.at - right.at || left.provider.id.localeCompare(right.provider.id));

  for (const { provider, at } of ordered) {
    if (at <= timeoutMs) addCompleted(result, provider);
    else markTimedOut(result, provider);
  }
  return finish(result);
}

function runDynamic(providers, timeoutMs, threshold, result) {
  const ordered = providers
    .map(provider => ({ provider, at: providerCompletion(provider) }))
    .sort((left, right) => left.at - right.at || left.provider.id.localeCompare(right.provider.id));

  for (let index = 0; index < ordered.length; index += 1) {
    const { provider, at } = ordered[index];
    if (at > timeoutMs) {
      markTimedOut(result, provider);
      continue;
    }
    addCompleted(result, provider);
    if (result.returnedStreamIds.length >= threshold) {
      result.earlyExit = true;
      for (const later of ordered.slice(index + 1)) result.skippedProviders.push(later.provider.id);
      return finish(result);
    }
  }
  return finish(result);
}

function runSequentialGroups(providers, groups, timeoutMs, threshold, result) {
  const providerById = new Map(providers.map(provider => [provider.id, provider]));
  const assignedInGroups = new Set();
  let elapsed = 0;

  for (const group of groups) {
    const current = [];
    for (const id of group) {
      const provider = providerById.get(String(id));
      if (provider) {
        current.push(provider);
        assignedInGroups.add(provider.id);
      } else {
        result.warnings.push(String(id));
      }
    }
    if (!current.length) continue;

    const completed = current
      .map(provider => ({ provider, at: providerCompletion(provider, elapsed) }))
      .sort((left, right) => left.at - right.at || left.provider.id.localeCompare(right.provider.id));

    for (const item of completed) {
      if (item.at <= timeoutMs) addCompleted(result, item.provider);
      else markTimedOut(result, item.provider);
    }
    elapsed = Math.max(elapsed, ...completed.map(item => Math.min(item.at, timeoutMs)));

    if (result.returnedStreamIds.length >= threshold) {
      result.earlyExit = true;
      const remainingGroupIds = groups
        .slice(groups.indexOf(group) + 1)
        .flat()
        .map(String);
      result.skippedProviders.push(...remainingGroupIds.filter(id => providerById.has(id)));
      return finish(result);
    }
    if (elapsed >= timeoutMs) break;
  }

  for (const provider of providers) {
    if (!assignedInGroups.has(provider.id)) result.warnings.push(provider.id);
  }
  return finish(result);
}

/**
 * Simulate one timing scenario without network access.
 *
 * Supported strategies: default, dynamic, groups-sequential.
 */
export function simulateFetchScenario(rawScenario = {}) {
  const strategy = String(rawScenario.strategy || 'default');
  const timeoutMs = nonNegativeNumber(rawScenario.timeoutMs, 6000);
  const result = baseResult(strategy);
  const providers = assignedProviders(Array.isArray(rawScenario.providers) ? rawScenario.providers : [], result);
  const threshold = Math.max(1, Math.floor(nonNegativeNumber(rawScenario.exitWhenStreamCountAtLeast, Number.POSITIVE_INFINITY)));

  if (strategy === 'default') return runDefault(providers, timeoutMs, result);
  if (strategy === 'dynamic') return runDynamic(providers, timeoutMs, threshold, result);
  if (strategy === 'groups-sequential') {
    const groups = Array.isArray(rawScenario.groups) ? rawScenario.groups.filter(Array.isArray) : [];
    return runSequentialGroups(providers, groups, timeoutMs, threshold, result);
  }
  throw new Error(`Unsupported mock fetch strategy: ${strategy}`);
}
