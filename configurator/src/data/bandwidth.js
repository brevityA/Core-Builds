/**
 * Bandwidth-based bitrate limit calculator.
 *
 * Asks the user for their internet speed and calculates safe bitrate limits
 * to prevent buffering. Formula: speed * 0.8 / 1.2 (80% of bandwidth, 1.2x safety margin).
 */

export const SPEED_TIERS = [
  { speed: 25,  label: '25 Mbps',  desc: 'Basic broadband',  maxBitrate: 17 },
  { speed: 50,  label: '50 Mbps',  desc: 'Standard home',    maxBitrate: 33 },
  { speed: 100, label: '100 Mbps', desc: 'Fast broadband',   maxBitrate: 67 },
  { speed: 200, label: '200 Mbps', desc: 'Very fast',        maxBitrate: 133 },
  { speed: 500, label: '500 Mbps', desc: 'Fibre / gigabit',  maxBitrate: 333 },
  { speed: 0,   label: 'Custom',   desc: 'Enter your speed', maxBitrate: null },
];

/**
 * Calculate safe max bitrate from internet speed.
 * @param {number} speedMbps - Download speed in Mbps
 * @returns {{ maxBitrate: number|null, label: string, description: string }}
 */
export function calculateBitrateLimit(speedMbps) {
  if (!speedMbps || speedMbps <= 0) {
    return { maxBitrate: null, label: 'Unlimited', description: 'No bitrate cap — streams of any size' };
  }

  const safeMbps = speedMbps * 0.8;
  const maxBitrate = Math.round(safeMbps / 1.2);

  let label, description;
  if (maxBitrate <= 5) {
    label = 'Very Low';
    description = `${maxBitrate} Mbps cap — 720p WEB-DL only, very small files`;
  } else if (maxBitrate <= 15) {
    label = 'Low';
    description = `${maxBitrate} Mbps cap — 1080p WEB-DL, no Remux`;
  } else if (maxBitrate <= 35) {
    label = 'Medium';
    description = `${maxBitrate} Mbps cap — 1080p Remux or 4K WEB-DL`;
  } else if (maxBitrate <= 65) {
    label = 'High';
    description = `${maxBitrate} Mbps cap — 4K Remux at moderate bitrate`;
  } else if (maxBitrate <= 130) {
    label = 'Very High';
    description = `${maxBitrate} Mbps cap — 4K Remux, no practical limit`;
  } else {
    label = 'Unlimited';
    description = `${maxBitrate} Mbps cap — no practical limit for any content`;
  }

  return { maxBitrate, label, description };
}

/**
 * Device-specific bandwidth recommendations.
 */
export const DEVICE_BANDWIDTH_HINTS = {
  'firestick-hd':    { recommended: 25,  reason: 'HD stick — 1080p max, typical WiFi limit' },
  'firestick-4kmax': { recommended: 50,  reason: '4K stick — WiFi 6, moderate throughput' },
  'samsung':         { recommended: 50,  reason: 'Smart TV — WiFi varies, Ethernet recommended' },
  'lgtv':            { recommended: 50,  reason: 'Smart TV — WiFi varies, Ethernet recommended' },
  'sony':            { recommended: 50,  reason: 'Smart TV — WiFi varies, Ethernet recommended' },
  'onn':             { recommended: 25,  reason: 'Budget box — WiFi 5, moderate throughput' },
  'googletv':        { recommended: 50,  reason: 'Google TV Streamer — WiFi 6' },
  'chromecast':      { recommended: 25,  reason: 'Chromecast — WiFi 5, moderate throughput' },
  'roku':            { recommended: 25,  reason: 'Roku — WiFi varies by model' },
  'shield':          { recommended: 100, reason: 'Shield — Ethernet + WiFi 6, excellent throughput' },
  'windows':         { recommended: 200, reason: 'PC — typically wired Ethernet' },
  'ipad':            { recommended: 50,  reason: 'iPad/iPhone — WiFi 6' },
  'xiaomi':          { recommended: 50,  reason: 'Xiaomi Box — WiFi 5' },
  'xiaomi-3rd':      { recommended: 50,  reason: 'Xiaomi Box — WiFi 6' },
  'projector':       { recommended: 25,  reason: 'Projector — WiFi varies' },
  'generic':         { recommended: 50,  reason: 'Standard — conservative default' },
};
