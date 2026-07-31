/** Pure policy helpers used by template generation.
 * No DOM, browser state, network, or persistence dependencies.
 */

export function hasTmdbCredentials(input = {}) {
  return Boolean(String(input.tmdbToken || '').trim() || String(input.tmdbApiKey || '').trim());
}

export function tmdbFeaturePolicy(input = {}) {
  const hasTmdb = hasTmdbCredentials(input);
  return {
    hasTmdb,
    bitrate: { useMetadataRuntime: hasTmdb },
    digitalReleaseFilter: { enabled: hasTmdb },
    titleMatching: { enabled: hasTmdb },
    yearMatching: { enabled: hasTmdb },
  };
}

export function bandwidthCapMbps(mbps, fallback = 150_000_000) {
  const value = Number(mbps);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value * 1_000_000 * 0.8);
}

export function templateInput(input = {}) {
  const pseArch = String(input.pseArch || input.architecture || 'standard');
  return {
    service: String(input.service || 'torbox'),
    device: String(input.device || 'generic'),
    resolution: String(input.resolution || '1080p'),
    architecture: pseArch,
    pseArch,
    tmdbToken: String(input.tmdbToken || '').trim(),
    tmdbApiKey: String(input.tmdbApiKey || '').trim(),
    bandwidthMbps: Number(input.bandwidthMbps) || 0,
    sizeLimit: input.sizeLimit === 'unlimited' || input.sizeLimit == null ? 'unlimited' : String(input.sizeLimit).replace(/GB$/i, ''),
  };
}
