/**
 * Ranked stream expressions — the additive scoring layer.
 *
 * WHY THIS EXISTS
 *
 * `rankedStreamExpressions` is the ONLY writer of `stream.streamExpressionScore` in AIOStreams
 * (packages/core/src/streams/precomputer.ts — it zeroes the field, then adds the score of every
 * matching entry). Preferred stream expressions set `streamExpressionMatched` instead, which is
 * ordinal: a stream matches at most one PSE and sorts by that tier's index.
 *
 * Core Builds shipped two features that read the score and never provided one:
 *
 *   - the Adaptive Score Floor ESE, which culls on `streamExpressionScore(...)`
 *   - the `rseMatched()` tier guards
 *
 * `output-profile-policy.js#removeScoreDependentRules` correctly strips both when no ranked
 * expressions exist, so they were being deleted from every generated config. This module is the
 * missing score source that makes them live.
 *
 * WHY ADDITIVE SCORING EARNS ITS PLACE
 *
 * A PSE ladder is ordinal, so every combination of attributes needs its own rung in the right
 * order — which is why the 4K Apex ladder runs to 31 entries and Apex Mixed to 34. Scores
 * compose instead: eight orthogonal factors express what would otherwise be a combinatorial
 * ladder, and a 4K REMUX with Atmos from an elite group simply out-totals a plain 4K REMUX
 * without anyone hand-ordering that pair.
 *
 * SCALE
 *
 * Positive factors run +50..+330 and stack; penalties run to -200. The scale is chosen so the
 * Adaptive Score Floor's threshold (`-50 + min(30, daysSinceRelease * 0.1)`, i.e. -50..-20)
 * separates genuine junk from merely unremarkable releases: an LQ-group 1080p WEB-DL still
 * totals +50 and survives, while an LQ release with nothing else going for it lands at -150 and
 * is culled. Penalties have to reach past the floor or the floor stays decorative.
 *
 * COST
 *
 * Each entry is one full SEL evaluation over the stream list, so this set is deliberately small
 * and orthogonal rather than exhaustive. `cached` is not scored: it is already sort key #1, so
 * paying a pass to re-express it would buy nothing.
 *
 * HOST SAFETY
 *
 * Inline ranked expressions are not access-gated. AIOStreams' `validateSyncedSelUrls` only
 * checks `synced*StreamExpressionUrls` against the allowlist, so these ship on elfhosted and
 * fortheweak exactly like our inline PSEs do.
 */

/** Elite remux/encode groups — the provenance tier that survives every host's whitelist. */
const REMUX_GROUPS = ['FraMeSToR', 'BLURANiUM', 'BiZKiT', 'PmP', 'ZQ', 'CiNEPHiLES', 'ABBIE', 'AJP69', 'APEX', 'BLUTONiUM', 'NTb', 'NTG', 'RAWR', 'SiC', 'TEPES', 'FLUX', 'Kitsune', 'W4NK3R', 'HiFi'];
/** First-tier web groups. */
const WEB_T1_GROUPS = ['dB', 'Flights', 'MiU', 'monkee', 'MZABI', 'PHOENiX', 'playWEB', 'SbR', 'SMURF', 'TOMMY', 'XEBEC'];
/** Second-tier web groups — good, not elite. */
const WEB_T2_GROUPS = ['BLOOM', 'Dooky', 'GNOMiSSiON', 'HHWEB', 'NINJACENTRAL', 'NPMS', 'ROCCaT', 'SiGMA', 'SLiGNOME', 'SwAgLaNdEr'];
/** Groups whose releases are reliably low quality. Mirrors the LQ Pin Bottom PSE. */
const LQ_GROUPS = ['YIFY', 'RARBG', 'EVO', 'YTS', 'PSA', 'MeGusta', 'Tigole'];

const list = (groups) => groups.map(g => `'${g}'`).join(',');

/**
 * Build the ranked stream expression set for the current selection.
 *
 * @param {object} input             template input (resolution, audio, …)
 * @param {object} caps              device capabilities
 * @param {boolean} caps.dv          device handles Dolby Vision
 * @param {boolean} caps.limitedAudio device cannot take lossless tracks
 * @returns {{expression: string, score: number, enabled: boolean}[]}
 */
export function rankedSelPolicy(input = {}, caps = {}) {
  const res = input.resolution;
  const { dv = false, limitedAudio = false } = caps;
  const wants4k = res === '4k' || res === 'mixed' || res === 'ultrawide';
  const out = [];
  const add = (label, expression, score) => out.push({ enabled: true, expression: `/* ${label} */ ${expression}`, score });

  // Resolution and quality carry the most weight — they are what "better" means to most users,
  // and scoring them here is what lets the tiers below act as modifiers rather than rungs.
  if (wants4k) add('RSE 2160p', "resolution(streams,'2160p')", 330);
  add('RSE 1080p', "resolution(streams,'1080p')", 80);
  add('RSE Bluray REMUX', "quality(streams,'Bluray REMUX')", 300);
  add('RSE Bluray', "quality(streams,'Bluray')", 180);
  add('RSE WEB-DL', "quality(streams,'WEB-DL')", 120);

  // Visual tags are scored only where the device can actually play them back: rewarding DV on a
  // panel that cannot decode it ranks a stream the user will bounce off.
  if (dv) add('RSE Dolby Vision', "visualTag(streams,'DV','Dolby Vision')", 120);
  add('RSE HDR', "visualTag(streams,'HDR10+','HDR10','HDR')", 80);

  // Same gate for audio — a limited-audio device has lossless tags in excludedAudioTags, so
  // scoring them would rank streams that are filtered out downstream.
  add('RSE Atmos', "audioTag(streams,'Atmos','Dolby Atmos')", 150);
  if (!limitedAudio) add('RSE Lossless Audio', "audioTag(streams,'TrueHD','DTS-HD MA','DTS:X')", 150);
  add('RSE DD+', "audioTag(streams,'DD+','DDP')", 50);

  // Release-group provenance. Three tiers rather than one flat list so an elite remux outranks a
  // merely competent web encode without either needing its own PSE rung.
  add('RSE Elite Remux Groups', `releaseGroup(streams,${list(REMUX_GROUPS)})`, 250);
  add('RSE Web T1 Groups', `releaseGroup(streams,${list(WEB_T1_GROUPS)})`, 200);
  add('RSE Web T2 Groups', `releaseGroup(streams,${list(WEB_T2_GROUPS)})`, 150);

  // SeaDex is the anime provenance signal and already sorts high; the score keeps it ahead of
  // generic releases inside a tier too.
  add('RSE SeaDex', 'seadex(streams)', 200);

  // Penalties. These are the entries that give the Adaptive Score Floor something to cut — a
  // set of purely positive factors would leave every stream above the threshold and the floor
  // would be inert while looking active.
  add('RSE LQ Groups', `releaseGroup(streams,${list(LQ_GROUPS)})`, -150);
  add('RSE Upscaled', "keyword(streams,'all','upscale','upscaled','ai upscale')", -200);

  return out;
}

export default rankedSelPolicy;
