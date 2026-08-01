/**
 * Apex IQR policy — PSE stack builder for the Apex (IQR) architecture.
 *
 * Exports component-level builders and a composed assembler.
 * Each function is pure: no browser globals, no credentials, no UI state.
 */

import { iqrExpression } from './iqr-expression.js';

// ── Pins ──

export const PIN_4K_ELITE = Object.freeze({ enabled:true, expression:"/* Elite 4K REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'2160p'),'FraMeSToR','DON','FLUX','HIFI','playBD','BMF','QxR','EPSiLON','BLURANiUM','PmP'),'top')" });
export const PIN_1080_ELITE = Object.freeze({ enabled:true, expression:"/* Elite 1080p REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'1080p'),'NTb','FLUX','KiNGS','NTG','BHDStudio','FraMeSToR','SiC','126811'),'top')" });
export const PIN_LQ = Object.freeze({ enabled:true, expression:"/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')" });

// ── Audio priority ──

export function audioPriority(audio, forceLimited) {
  if (audio === 'limited' || forceLimited) return [];
  if (audio === 'dolby') return [{ enabled:true, expression:"/* Audio Pinnacle */ audioTag(streams,'TrueHD','Atmos')" }];
  return [{ enabled:true, expression:"/* Audio Pinnacle */ audioTag(streams,'TrueHD','Atmos','DTS-HD MA','DTS:X','FLAC')" }];
}

// ── Codec booster ──

export function codecBooster(supportsAv1) {
  const expr = supportsAv1
    ? "/* Codec Efficiency Booster */ encode(streams,'HEVC','AV1')"
    : "/* Codec Efficiency Booster */ encode(streams,'HEVC')";
  return { enabled:true, expression:expr };
}

// ── Static components ──

export const HDR_DV_PRIORITY = Object.freeze({ enabled:true, expression:"/*HDR/DV Priority*/ merge(visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'DV','HDR10+','HDR+DV'),visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'HDR10','HDR'))" });
export const IMAX_PIN = Object.freeze({ enabled:true, expression:"/*IMAX pin*/ count(visualTag(streams,'IMAX'))>0 ? pin(visualTag(streams,'IMAX'),'top') : []" });
export const CACHED_USENET_BOOST = Object.freeze({ enabled:true, expression:"/* Boost Cached Usenet */ type(cached(streams),'usenet','stremio-usenet')" });
export const BITRATE_ANOMALY_PIN = Object.freeze({ enabled:true, expression:"/* Bitrate Anomaly Pin */ count(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))>=4?pin(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'),0,q1(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))),'bottom'):[]" });

// ── Slice limits ──

export function sliceLimits4k(dv) {
  const qrLimit = dv ? 4 : 3;
  return [
    { enabled:true, expression:`/* QR Balance — HQ */ perGroup(quality(streams,'Bluray REMUX','Bluray','WEB-DL'),'resolution',${qrLimit},'2160p','1080p','720p')` },
    { enabled:true, expression:"/* QR Balance — LQ */ perGroup(quality(streams,'WEBRip','HDTV','HDRip'),'resolution',2,'1080p','720p','480p')" },
    { enabled:true, expression:"/* Addon Diversity */ perGroup(cached(streams),'indexer',2)" },
  ];
}

export function sliceLimits1080() {
  return [
    { enabled:true, expression:"/* QR Balance — HQ */ perGroup(quality(streams,'Bluray REMUX','Bluray','WEB-DL'),'resolution',3,'1080p','720p')" },
    { enabled:true, expression:"/* QR Balance — LQ */ perGroup(quality(streams,'WEBRip','HDTV','HDRip'),'resolution',2,'720p','480p')" },
    { enabled:true, expression:"/* Addon Diversity */ perGroup(cached(streams),'indexer',2)" },
  ];
}

// ── IQR quality tiers ──

export function iqrTiers4k(dv) {
  const tiers = [];
  if (dv) {
    tiers.push(iqrExpression('S-Tier 4K REMUX DV — IQR Tukey fence', "visualTag(quality(resolution(streams,'2160p'),'BluRay REMUX'),'DV','HDR+DV')", '15GB', false));
  }
  tiers.push(
    iqrExpression('S-Tier 4K REMUX — IQR Tukey fence', "resolution(quality(streams,'BluRay REMUX'),'2160p')", '15GB', false),
    iqrExpression('A-Tier 4K WEB-DL HDR — IQR + linear decay', "resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p')", null, true, '5Mbps'),
    iqrExpression('B-Tier 4K WEB-DL SDR — IQR + linear decay', "resolution(quality(streams,'WEB-DL'),'2160p')", null, true, '5Mbps'),
    iqrExpression('C-Tier 4K WEBRip HDR — IQR + linear decay', "resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p')", null, true, '5Mbps'),
    iqrExpression('D-Tier 4K WEBRip SDR — IQR', "resolution(quality(streams,'WEBRip'),'2160p')", null, false),
    { enabled:true, expression:"/* E-Tier Any 4K */ resolution(streams,'2160p')" },
  );
  return tiers;
}

export function iqrTiers1080() {
  return [
    iqrExpression('S-Tier 1080p REMUX — IQR Tukey fence', "resolution(quality(streams,'BluRay REMUX'),'1080p')", '8GB', false),
    iqrExpression('A-Tier 1080p WEB-DL — IQR + linear decay', "resolution(quality(streams,'WEB-DL'),'1080p')", null, true, '1Mbps'),
    { enabled:true, expression:"/* B-Tier 1080p WEBRip or BluRay */ quality(resolution(streams,'1080p'),'WEBRip','BluRay')" },
    { enabled:true, expression:"/* C-Tier Any 1080p */ resolution(streams,'1080p')" },
  ];
}

// ── Composed stacks ──

export function buildApexIqr4kPses({ dv, audio, forceLimitedAudio, supportsAv1 }) {
  return [
    PIN_4K_ELITE, PIN_1080_ELITE, PIN_LQ,
    ...iqrTiers4k(dv),
    ...iqrTiers1080(),
    ...audioPriority(audio, forceLimitedAudio),
    codecBooster(supportsAv1),
    HDR_DV_PRIORITY,
    CACHED_USENET_BOOST,
    IMAX_PIN,
    ...sliceLimits4k(dv),
    BITRATE_ANOMALY_PIN,
  ];
}

export function buildApexIqr1080Pses({ audio, forceLimitedAudio, supportsAv1 }) {
  return [
    PIN_1080_ELITE, PIN_LQ,
    ...iqrTiers1080(),
    { enabled:true, expression:"/* 720p WEB-DL Fallback */ quality(resolution(streams,'720p'),'WEB-DL','WEBRip')" },
    { enabled:true, expression:"/* 720p Any Fallback */ resolution(streams,'720p')" },
    ...audioPriority(audio, forceLimitedAudio),
    codecBooster(supportsAv1),
    CACHED_USENET_BOOST,
    IMAX_PIN,
    ...sliceLimits1080(),
  ];
}
