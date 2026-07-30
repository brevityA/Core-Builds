/**
 * Shared SEL policy boundary.
 *
 * Provides getSelPolicy() — the single entry point for PSE stack selection —
 * plus normalization and validation helpers.
 */

import { buildApexIqr4kPses, buildApexIqr1080Pses } from './apex-policy.js';
import { buildStandard4kPses, buildStandard1080Pses, buildMixedPses, buildDefaultPses } from './standard-policy.js';
import { APEX_MIXED_PSES } from './sel-policy-data.js';

export const SEL_ARCHITECTURES = Object.freeze(['standard', 'iqr', 'apex', 'apex-mixed']);

const ARCH_ALIASES = Object.freeze({ apex: 'iqr' });

export function getSelPolicy({ architecture, resolution, dv = false, audio = 'limited', forceLimitedAudio = false, supportsAv1 = false }) {
  const arch = ARCH_ALIASES[architecture] || architecture;
  if (!SEL_ARCHITECTURES.includes(arch) && arch !== architecture) {
    throw new Error(`Unknown SEL architecture: ${architecture}`);
  }
  if (!SEL_ARCHITECTURES.includes(arch)) {
    throw new Error(`Unknown SEL architecture: ${architecture}`);
  }

  let pses;
  if (arch === 'apex-mixed') {
    pses = APEX_MIXED_PSES.map(p => ({ ...p }));
  } else if (arch === 'iqr' && resolution === '4k') {
    pses = buildApexIqr4kPses({ dv, audio, forceLimitedAudio, supportsAv1 });
  } else if (arch === 'iqr' && resolution === '1080p') {
    pses = buildApexIqr1080Pses({ audio, forceLimitedAudio, supportsAv1 });
  } else if (resolution === '4k') {
    pses = buildStandard4kPses({ dv, audio, forceLimitedAudio, supportsAv1 });
  } else if (resolution === '1080p') {
    pses = buildStandard1080Pses({ audio, forceLimitedAudio, supportsAv1 });
  } else if (resolution === 'mixed') {
    pses = buildMixedPses({ audio, forceLimitedAudio, supportsAv1, dv });
  } else {
    pses = buildDefaultPses({ audio, forceLimitedAudio, supportsAv1, dv });
  }

  return {
    architecture: arch,
    preferredStreamExpressions: pses,
  };
}

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
