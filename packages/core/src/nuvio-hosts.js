/** Host capability policy for the Nuvio + TorBox Instant route. */
export function isNuvioInstantHost(host = {}) {
  return host.supportsNuvioInstant === true && host.supportsP2P === true;
}

export function requireNuvioInstantHost(host = {}) {
  if (!isNuvioInstantHost(host)) throw new Error('Host does not support Nuvio TorBox Instant P2P mode');
  return host;
}
