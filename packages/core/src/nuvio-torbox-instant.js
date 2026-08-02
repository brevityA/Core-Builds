/** Pure Nuvio + TorBox Instant policy. No credentials or network access. */

export const NUVIO_ADDONS = Object.freeze(['torrentio', 'comet', 'mediafusion', 'meteor', 'stremthruTorz']);

export function validateNuvioHost(host = {}) {
  if (!host || host.supportsNuvioInstant !== true || host.supportsP2P !== true) {
    throw new Error('Selected AIOStreams host does not support Nuvio TorBox Instant');
  }
  return true;
}

export function generateNuvioTorboxInstantPolicy(input = {}, host = {}) {
  validateNuvioHost(host);
  return {
    route: 'nuvio-torbox-instant',
    service: null,
    credentials: {},
    host: host.id || host.url || null,
    p2pEnabled: true,
    requiredServices: [],
    excludedStreamTypes: ['debrid'],
    addons: [...NUVIO_ADDONS, ...(input.optionalScrapers || [])],
    device: input.device || 'generic',
    resolution: input.resolution || '1080p',
    formatter: input.formatter || 'family-v4',
    warning: 'Connect TorBox in Nuvio Connected Services. Do not enter a TorBox API key in AIOStreams.',
  };
}
