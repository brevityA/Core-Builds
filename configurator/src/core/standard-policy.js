/**
 * Standard policy — PSE stack builders for Standard, Mixed, and Default architectures.
 *
 * Reuses shared components from apex-policy.js (pins, audio, codec, etc.).
 * Each function is pure: no browser globals, no credentials, no UI state.
 */

import {
  PIN_4K_ELITE, PIN_1080_ELITE, PIN_LQ,
  audioPriority, codecBooster,
  HDR_DV_PRIORITY, IMAX_PIN, CACHED_USENET_BOOST,
  sliceLimits4k, sliceLimits1080,
} from './apex-policy.js';

// ── Standard quality tiers ──

const DV_4K_REMUX = { enabled:true, expression:"/* S-Tier 4K REMUX DV */ visualTag(quality(resolution(streams,'2160p'),'BluRay REMUX'),'DV','HDR+DV')" };

export function standardTiers4k() {
  return [
    { enabled:true, expression:"/* S-Tier 4K BluRay REMUX */ quality(resolution(streams,'2160p'),'BluRay REMUX')" },
    { enabled:true, expression:"/* A-Tier 4K WEB-DL HDR */ visualTag(quality(resolution(streams,'2160p'),'WEB-DL'),'DV','HDR+DV','HDR10+','HDR10','HDR')" },
    { enabled:true, expression:"/* B-Tier 4K WEB-DL */ quality(resolution(streams,'2160p'),'WEB-DL')" },
    { enabled:true, expression:"/* C-Tier Any 4K */ resolution(streams,'2160p')" },
  ];
}

export function standardTiers1080() {
  return [
    { enabled:true, expression:"/* S-Tier 1080p BluRay REMUX */ quality(resolution(streams,'1080p'),'BluRay REMUX')" },
    { enabled:true, expression:"/* A-Tier 1080p WEB-DL */ quality(resolution(streams,'1080p'),'WEB-DL')" },
    { enabled:true, expression:"/* B-Tier 1080p WEBRip or BluRay */ quality(resolution(streams,'1080p'),'WEBRip','BluRay')" },
    { enabled:true, expression:"/* C-Tier Any 1080p */ resolution(streams,'1080p')" },
  ];
}

export function fallback720() {
  return [
    { enabled:true, expression:"/* 720p WEB-DL Fallback */ quality(resolution(streams,'720p'),'WEB-DL','WEBRip')" },
    { enabled:true, expression:"/* 720p Any Fallback */ resolution(streams,'720p')" },
  ];
}

// ── Composed stacks ──

export function buildStandard4kPses({ dv, audio, forceLimitedAudio, supportsAv1 }) {
  const pses = [PIN_4K_ELITE, PIN_1080_ELITE, PIN_LQ];
  if (dv) pses.push(DV_4K_REMUX);
  pses.push(
    ...standardTiers4k(),
    ...standardTiers1080(),
    ...audioPriority(audio, forceLimitedAudio),
    codecBooster(supportsAv1),
    HDR_DV_PRIORITY,
    CACHED_USENET_BOOST,
    IMAX_PIN,
    ...sliceLimits4k(dv),
  );
  return pses;
}

export function buildStandard1080Pses({ audio, forceLimitedAudio, supportsAv1 }) {
  return [
    PIN_1080_ELITE, PIN_LQ,
    ...standardTiers1080(),
    ...fallback720(),
    ...audioPriority(audio, forceLimitedAudio),
    codecBooster(supportsAv1),
    CACHED_USENET_BOOST,
    IMAX_PIN,
    ...sliceLimits1080(),
  ];
}

export function buildMixedPses({ audio, forceLimitedAudio, supportsAv1, dv }) {
  return [
    PIN_LQ,
    ...standardTiers4k(),
    ...standardTiers1080(),
    ...fallback720(),
    { enabled:true, expression:"/* 576p/480p Niche Fallback */ resolution(streams,'576p','480p')" },
    ...audioPriority(audio, forceLimitedAudio),
    codecBooster(supportsAv1),
    HDR_DV_PRIORITY,
    CACHED_USENET_BOOST,
    IMAX_PIN,
    ...sliceLimits4k(dv),
  ];
}

export function buildDefaultPses({ audio, forceLimitedAudio, supportsAv1, dv }) {
  return [
    PIN_1080_ELITE, PIN_LQ,
    ...standardTiers1080(),
    { enabled:true, expression:"/* 1440p Any Quality */ quality(resolution(streams,'1440p'),'BluRay REMUX','BluRay','WEB-DL','WEBRip')" },
    { enabled:true, expression:"/* 4K Fallback BluRay REMUX */ quality(resolution(streams,'2160p'),'BluRay REMUX')" },
    { enabled:true, expression:"/* 4K Fallback WEB-DL HDR */ visualTag(quality(resolution(streams,'2160p'),'WEB-DL'),'DV','HDR+DV','HDR10+','HDR10','HDR')" },
    { enabled:true, expression:"/* 4K Fallback Any */ resolution(streams,'2160p')" },
    ...fallback720(),
    ...audioPriority(audio, forceLimitedAudio),
    codecBooster(supportsAv1),
    HDR_DV_PRIORITY,
    CACHED_USENET_BOOST,
    IMAX_PIN,
    ...sliceLimits4k(dv),
  ];
}
