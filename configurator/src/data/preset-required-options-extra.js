/**
 * Required options the upstream extractor does not see.
 *
 * `generated/aiostreams-preset-options.js` is produced by parsing each preset's
 * literal `METADATA.OPTIONS` array. Presets that build their options through a
 * shared helper or a base class instead — the whole Debridio family, jackett,
 * prowlarr, nzbhydra — contribute nothing to that parse, so their required
 * options are absent from the generated map. Eight presets are affected and
 * eleven required options go missing; the map is not wrong about what it lists,
 * it is silently incomplete.
 *
 * That gap is not cosmetic. `optional-scraper-required-options.test.mjs` exists
 * to prove no add-on is offered as a simple on/off toggle when it needs more
 * than {name,timeout,resources,url}. It read the generated map, so for these
 * eight presets it asked a source that had nothing to say and took the silence
 * as a pass — which is how debridio-tmdb, debridio-tvdb and debridio-watchtower
 * were classified "safe", shipped as keyless toggles, and produced configs the
 * host refused outright. A guard that reads the same incomplete source as the
 * thing it is guarding cannot fail.
 *
 * Verified against the live host contract (`/api/v1/status`,
 * settings.presets[].OPTIONS) on aiostreams.elfhosted.com v2.34.1, 2026-09-25:
 *
 *     node scripts/aios-regen/cli.mjs extract host https://aiostreams.elfhosted.com
 *
 * Every entry below is `required: true` with no upstream default, so a preset
 * emitted without it fails validation for the ENTIRE config, not just itself.
 *
 * Delete an entry here once the extractor learns to follow shared option
 * builders and the generated map covers it — `requiredOptionsFor()` merges the
 * two, so a duplicate is harmless but a stale entry is misleading.
 */
export const AIO_PRESET_REQUIRED_OPTIONS_EXTRA = Object.freeze({
  // Indexer bridges — URL and key are both required, and AIOStreams throws on
  // either being empty, which rejects the whole config rather than the preset.
  jackett: Object.freeze(['jackettUrl', 'jackettApiKey']),
  prowlarr: Object.freeze(['prowlarrUrl', 'prowlarrApiKey']),
  nzbhydra: Object.freeze(['api']),

  // Debridio family — every one of these needs the account API key. The three
  // marked "keyless-safe" in the v2.34.0 audit are the ones that shipped broken.
  debridio: Object.freeze(['debridioApiKey']),
  'debridio-tmdb': Object.freeze(['debridioApiKey']),
  'debridio-tvdb': Object.freeze(['debridioApiKey']),
  'debridio-watchtower': Object.freeze(['debridioApiKey']),
  // These two are partly covered by the generated map (it has the multi-select
  // and the select, but not the password) — merged, not replaced.
  'debridio-tv': Object.freeze(['debridioApiKey']),
  'debridio-ic4a': Object.freeze(['debridioApiKey']),
});

/** Merged view: generated map plus the gaps above, de-duplicated. */
export function mergeRequiredOptions(generatedMap, presetType) {
  const id = String(presetType || '');
  const generated = (generatedMap && generatedMap[id]) || [];
  const extra = AIO_PRESET_REQUIRED_OPTIONS_EXTRA[id] || [];
  return [...new Set([...generated, ...extra])].sort();
}
