/**
 * Shared SEL policy boundary.
 *
 * This is intentionally data-only: the browser adapter supplies the current
 * architecture-specific expression sets while the migration moves the
 * remaining Standard/IQR/Apex branches out of app.js.
 */

export const SEL_ARCHITECTURES = Object.freeze(['standard', 'iqr', 'apex', 'apex-mixed']);

export function normalizeSelPolicy(raw = {}) {
  const clean = value => Array.isArray(value)
    ? value.filter(x => x && typeof x === 'object' && typeof x.expression === 'string')
      .map(x => ({ enabled: x.enabled !== false, expression: x.expression.trim() }))
      .filter(x => x.expression.length > 0)
    : [];

  const architecture = SEL_ARCHITECTURES.includes(raw.architecture) ? raw.architecture : 'standard';
  return {
    architecture,
    preferredStreamExpressions: clean(raw.preferredStreamExpressions),
    includedStreamExpressions: clean(raw.includedStreamExpressions),
    excludedStreamExpressions: clean(raw.excludedStreamExpressions),
    rankedStreamExpressions: clean(raw.rankedStreamExpressions),
    resultLimits: raw.resultLimits && typeof raw.resultLimits === 'object' ? structuredClone(raw.resultLimits) : undefined,
    dynamicAddonFetching: raw.dynamicAddonFetching && typeof raw.dynamicAddonFetching === 'object'
      ? structuredClone(raw.dynamicAddonFetching)
      : undefined,
  };
}

export function assertSelPolicy(policy) {
  if (!SEL_ARCHITECTURES.includes(policy?.architecture)) throw new Error('Invalid SEL architecture');
  for (const key of ['preferredStreamExpressions','includedStreamExpressions','excludedStreamExpressions','rankedStreamExpressions']) {
    if (!Array.isArray(policy[key])) throw new Error(`Invalid SEL field: ${key}`);
    for (const entry of policy[key]) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.enabled !== 'boolean' ||
        typeof entry.expression !== 'string' ||
        !entry.expression.trim()
      ) {
        throw new Error(`Invalid SEL expression in ${key}`);
      }
    }
  }
  return policy;
}
