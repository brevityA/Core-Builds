/**
 * Dual-household template picker.
 *
 * AIOStreams cannot tell which device is asking. Mixed 4K TV + Fire Stick
 * houses need two accounts / two manifests. This module names both.
 *
 * Does not generate JSON configs. It points at existing templates.
 */
export const RAW = 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main';

export const TEMPLATES = Object.freeze({
  'stream-firestick': {
    id: 'stream-firestick',
    name: 'Core Nexus Stream Fire Stick',
    res: '1080p',
    dolbyVision: false,
    url: `${RAW}/Templates/Torbox/Single/core-nexus-stream-firestick.json`,
    note: '1080p SDR only. No AV1, no HDR/DV.',
  },
  stream: {
    id: 'stream',
    name: 'Core Nexus Stream',
    res: '1080p',
    dolbyVision: false,
    url: `${RAW}/Templates/Torbox/Single/core-nexus-stream.json`,
    note: '1080p first. Step up only after it plays clean.',
  },
  essential: {
    id: 'essential',
    name: 'Core Nexus Essential',
    res: '1080p',
    dolbyVision: false,
    url: `${RAW}/Templates/Torbox/Essential/core-nexus-essential.json`,
    note: '1080p Essential. Full coverage, not cache-only.',
  },
  'essential-4k': {
    id: 'essential-4k',
    name: 'Core Nexus 4K Essential',
    res: '4k',
    dolbyVision: true,
    url: `${RAW}/Templates/Torbox/Essential/core-nexus-4k-essential.json`,
    note: '4K with a bitrate cap. Not Apex. Not REMUX-first.',
  },
  apex: {
    id: 'apex',
    name: 'Core Nexus 4K Apex',
    res: '4k',
    dolbyVision: true,
    url: `${RAW}/Templates/Torbox/Single/core-nexus-4k-apex.json`,
    note: 'Shield / proven 4K path only.',
  },
  'samsung-tv': {
    id: 'samsung-tv',
    name: 'Core Nexus Samsung TV',
    res: '1080p',
    dolbyVision: false,
    url: `${RAW}/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json`,
    note: 'No Dolby Vision. Use on Samsung, TCL, Hisense, cheap 4K panels.',
  },
  'samsung-tv-4k': {
    id: 'samsung-tv-4k',
    name: 'Core Nexus Samsung TV 4K',
    res: '4k',
    dolbyVision: false,
    url: `${RAW}/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json`,
    note: '4K HDR10, no Dolby Vision.',
  },
  stable1080: {
    id: 'stable1080',
    name: 'Core Stable 1080p',
    res: '1080p',
    dolbyVision: false,
    url: `${RAW}/Templates/Stable/core-stable-torbox-1080p.json`,
    note: 'First install / troubleshooting baseline.',
  },
  stable4k: {
    id: 'stable4k',
    name: 'Core Stable 4K',
    res: '4k',
    dolbyVision: false,
    url: `${RAW}/Templates/Stable/core-stable-torbox-4k.json`,
    note: 'Conservative 4K baseline. No remote SEL sync.',
  },
});

const NO_DV = new Set([
  'samsung', 'samsung-tizen', 'tcl', 'tcl-google-tv', 'hisense',
  'firestick-hd', 'onn', 'generic-4k-hdr-tv',
]);

const STICK = new Set(['firestick-hd', 'firestick-4kmax', 'chromecast', 'android-mobile']);

/**
 * One device → one template. Conservative: 4K Max starts on Stream, not Apex.
 */
export function recommendForDevice(deviceId, { want4k = false, firstInstall = false } = {}) {
  if (firstInstall) return TEMPLATES[want4k ? 'stable4k' : 'stable1080'];
  if (deviceId === 'firestick-hd') return TEMPLATES['stream-firestick'];
  if (deviceId === 'firestick-4kmax') {
    return want4k ? TEMPLATES['essential-4k'] : TEMPLATES.stream;
  }
  if (NO_DV.has(deviceId)) {
    return want4k ? TEMPLATES['samsung-tv-4k'] : TEMPLATES['samsung-tv'];
  }
  if (deviceId === 'shield' && want4k) return TEMPLATES.apex;
  if (want4k) return TEMPLATES['essential-4k'];
  return TEMPLATES.stream;
}

/**
 * Mixed living room. Always returns two named seats even if they resolve
 * to the same template — the user still needs two accounts when the
 * devices differ.
 */
export function recommendHousehold({ tv, stick, want4k = true, firstInstall = false } = {}) {
  if (!tv && !stick) {
    throw new Error('recommendHousehold needs at least a tv or stick device id.');
  }
  const houseTv = recommendForDevice(tv || stick, { want4k, firstInstall });
  const houseStick = recommendForDevice(stick || 'firestick-hd', {
    want4k: false,
    firstInstall,
  });
  const mixed = Boolean(tv && stick && tv !== stick);
  return {
    mixed,
    needsTwoAccounts: mixed,
    house4k: {
      seat: 'TV',
      device: tv || stick,
      template: houseTv,
    },
    house1080: {
      seat: 'Stick / phone / tablet',
      device: stick || tv,
      template: houseStick,
    },
    note: mixed
      ? 'Two Stremio or Nuvio accounts. AIOStreams cannot tell which device is asking.'
      : 'One account is enough — both seats resolved to compatible templates.',
  };
}

export function isNoDv(deviceId) {
  return NO_DV.has(deviceId);
}

export function isStick(deviceId) {
  return STICK.has(deviceId);
}
