/**
 * IQR SEL policy — complete policy generator for the Apex IQR architecture.
 *
 * Returns full policy objects (PSEs + ESEs + result limits + dynamic addon fetching)
 * for 4K IQR and 1080p IQR configurations.
 *
 * No browser globals, no credentials, no UI state.
 */

import { buildApexIqr4kPses, buildApexIqr1080Pses } from './apex-policy.js';
import { assertSelPolicy } from './sel-policy.js';

const SCORE_IQR_GUARD = Object.freeze({
  enabled: true,
  expression: "/*Score IQR Guard*/ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>=8 ? streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,q1(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))-1.5*iqr(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))) : []"
});

function resolveResultLimits(resolution) {
  if (resolution === '4k') {
    return { global: 30, resolution: 12, mode: 'conjunctive' };
  }
  return { global: 35, resolution: 15, mode: 'conjunctive' };
}

function resolveDynamicAddonFetching(resolution, streamPool) {
  const pool = streamPool || 'normal';
  const timeout = pool === 'max' ? 10000 : pool === 'large' ? 8000 : 6000;

  if (resolution === '4k') {
    const c4k = pool === 'max' ? 25 : pool === 'large' ? 15 : 8;
    return { enabled: true, condition: `count(cached(resolution(totalStreams,'2160p')))>=${c4k} or totalTimeTaken>${timeout}` };
  }
  const c1k = pool === 'max' ? 45 : pool === 'large' ? 30 : 20;
  return { enabled: true, condition: `count(cached(resolution(totalStreams,'1080p')))>=${c1k} or totalTimeTaken>${timeout}` };
}

/**
 * Returns a validated 4K IQR policy with PSEs, IQR-specific ESEs,
 * result limits, and dynamic addon fetching.
 */
export function getIqr4kPolicy(input = {}, dependencies = {}) {
  const {
    dv = false,
    audio = 'limited',
    forceLimitedAudio = false,
    supportsAv1 = false,
    streamPool,
  } = input;

  const policy = {
    architecture: 'iqr',
    preferredStreamExpressions: buildApexIqr4kPses({ dv, audio, forceLimitedAudio, supportsAv1 }),
    includedStreamExpressions: [],
    excludedStreamExpressions: [{ ...SCORE_IQR_GUARD }],
    rankedStreamExpressions: [],
    resultLimits: resolveResultLimits('4k'),
    dynamicAddonFetching: resolveDynamicAddonFetching('4k', streamPool),
  };
  return assertSelPolicy(policy);
}

/**
 * Returns a validated 1080p IQR policy with PSEs, IQR-specific ESEs,
 * result limits, and dynamic addon fetching.
 */
export function getIqr1080pPolicy(input = {}, dependencies = {}) {
  const {
    audio = 'limited',
    forceLimitedAudio = false,
    supportsAv1 = false,
    streamPool,
  } = input;

  const policy = {
    architecture: 'iqr',
    preferredStreamExpressions: buildApexIqr1080Pses({ audio, forceLimitedAudio, supportsAv1 }),
    includedStreamExpressions: [],
    excludedStreamExpressions: [{ ...SCORE_IQR_GUARD }],
    rankedStreamExpressions: [],
    resultLimits: resolveResultLimits('1080p'),
    dynamicAddonFetching: resolveDynamicAddonFetching('1080p', streamPool),
  };
  return assertSelPolicy(policy);
}

export { SCORE_IQR_GUARD };
