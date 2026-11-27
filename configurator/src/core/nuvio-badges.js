// Nuvio stream badges: which official Core badge pack to offer after a Nuvio install.
//
// Badges are not part of the AIOStreams config. Nuvio imports a badge pack from a URL
// (Settings → Streams → Fusion badge URLs) and keeps the rules on the device, so the
// configurator can only hand over the link. The Universal packs read ordinary release
// text and work with any stream-card formatter; the AIO Enhanced pack reads invisible
// markers, so it is offered only when the installed config carries them (v3.54).
import { DEVICE_PROFILES } from '../data/devices.js';

const PUBLISHED = 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/published/';

export const NUVIO_BADGE_PACKS = Object.freeze({
  universal: Object.freeze({ id: 'universal', label: 'Core Neon · Universal', url: `${PUBLISHED}core-neon-universal.json` }),
  noDv: Object.freeze({ id: 'noDv', label: 'Core Neon · No DV', url: `${PUBLISHED}core-nodv-universal.json` }),
  enhanced: Object.freeze({ id: 'enhanced', label: 'Core Neon · AIO Enhanced', url: `${PUBLISHED}core-neon-enhanced.json` }),
});

export const BADGE_BUILDER_PATH = '../tools/badges/';

// Quick install's legacy `samsung` id has no capability profile; Samsung panels never play DV.
const LEGACY_NO_DV = new Set(['samsung']);

/** True when the device is known to have no Dolby Vision support. Unknown devices are not assumed either way. */
export function deviceLacksDolbyVision(deviceId) {
  if (LEGACY_NO_DV.has(deviceId)) return true;
  return DEVICE_PROFILES[deviceId]?.video?.dolbyVision === false;
}

/**
 * The pack to offer: AIO Enhanced when the installed config carries its markers;
 * otherwise No DV where Dolby Vision is known to be unsupported, Universal elsewhere.
 * (A device without Dolby Vision filters DV streams out, so the Enhanced pack's DV
 * badge has nothing to label there.)
 */
export function nuvioBadgePack(deviceId, { enhanced = false } = {}) {
  if (enhanced) return NUVIO_BADGE_PACKS.enhanced;
  return deviceLacksDolbyVision(deviceId) ? NUVIO_BADGE_PACKS.noDv : NUVIO_BADGE_PACKS.universal;
}
