import { generateNuvioTorboxInstantPolicy } from './nuvio-torbox-instant.js';

/** Apply the Nuvio TorBox Instant policy to an already generated template. */
export function applyNuvioTorboxInstantPolicy(template, input = {}, host = {}) {
  const policy = generateNuvioTorboxInstantPolicy(input, host);
  const result = structuredClone(template || { metadata:{}, config:{} });
  result.config ||= {};
  result.config.services = [];
  result.config.requiredServices = [];
  result.config.excludedStreamTypes = ['debrid'];
  result.config.presets = (result.config.presets || []).filter(p => !/debrid|realdebrid|premiumize|easynews|torbox/i.test(String(p.type || p.options?.name || '')));
  result.config.p2pEnabled = true;
  result.config.preferredStreamTypes = ['p2p'];
  result.metadata ||= {};
  result.metadata.name = result.metadata.name || 'Core Builds — Nuvio TorBox Instant';
  result.metadata.description = policy.warning;
  return { template: result, policy };
}
