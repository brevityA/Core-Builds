// AIO Enhanced Nuvio badges (v3.54): invisible markers added to the chosen stream card.
//
// The Core Neon · AIO Enhanced pack matches zero-width marker codes instead of guessing
// from release text. AIOStreams writes those codes from its own parsed fields when the
// formatter carries the marker expressions, so they are put in front of whichever
// stream-card style the user picked (on its first line: a trailing blank line that
// AIOStreams drops would otherwise survive); the visible card is unchanged. The expressions come from the
// Badge Builder itself, for the same badge set the published Enhanced pack uses, so the
// pack and the formatter can never drift apart.
import { badgeMarkerExpressions, addBadgeMarkers } from '../../../tools/badges/core.mjs';
import { BADGES } from '../../../tools/badges/catalog.mjs';

export const ENHANCED_PACK_URL = 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/published/core-neon-enhanced.json';
export const ENHANCED_PACK_STATE = Object.freeze({
  mode: 'enhanced',
  theme: 'neon',
  selectedIds: Object.freeze(BADGES.filter(badge => badge.defaultEnabled).map(badge => badge.id)),
});
export const ENHANCED_MARKERS = Object.freeze(badgeMarkerExpressions(ENHANCED_PACK_STATE));

/**
 * The configurator's formatter ({name, d}) with the Enhanced markers in front of each field.
 * Returns { ok:true, name, d } or, when the markers do not fit beside this style,
 * { ok:false, name, d } with the formatter unchanged.
 */
export function withNuvioBadgeMarkers(formatter) {
  const name = String(formatter?.name || '');
  const d = String(formatter?.d || '');
  try {
    const out = addBadgeMarkers({ name, description: d }, ENHANCED_MARKERS, { position: 'start' });
    return { ok: true, name: out.name, d: out.description };
  } catch (err) {
    if (err instanceof RangeError) return { ok: false, name, d };
    throw err;
  }
}

/** Removes the Enhanced markers from an imported {name, description}; `found` says whether any were there. */
export function stripNuvioBadgeMarkers(fields) {
  let found = false;
  const strip = value => {
    let out = String(value || '');
    for (const expression of ENHANCED_MARKERS) {
      if (out.includes(expression)) { found = true; out = out.split(expression).join(''); }
    }
    return out;
  };
  const name = strip(fields?.name);
  const description = strip(fields?.description);
  return { name, description, found };
}

/**
 * Adds the markers to a built template's formatter, in place, after the output profile
 * has picked its stream card (Stable swaps in its own). Returns true when they were added.
 */
export function applyNuvioBadgeMarkers(template) {
  const config = template?.config || template;
  const overrides = config?.formatter?.definitions?.overrides;
  const key = overrides && Object.keys(overrides)[0];
  if (!key) return false;
  const current = overrides[key];
  if (stripNuvioBadgeMarkers(current).found) return true;
  const out = withNuvioBadgeMarkers({ name: current.name, d: current.description });
  if (!out.ok) return false;
  overrides[key] = { ...current, name: out.name, description: out.d };
  return true;
}
