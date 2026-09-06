/**
 * Host routing — which hosts a given config may be sent to, and what the host
 * picker must say up front. Pure: no DOM, no network.
 *
 * The 2026-09-06 host audit found the picker presented every host as
 * interchangeable when it is not: ElfHosted refuses P2P/HTTP ("Addon Torrentio
 * p2p is disabled: Private instances only"), and three hosts (Midnight, Omni,
 * Wizaardd) still run AIOStreams 2.33.2 while 2.34-only options can be
 * defaulted towards them. Two surfaces fix that:
 *
 *   - `hostPickerLabel()` puts capability + live-known version on the picker
 *     itself, before anything is deployed.
 *   - `hostRoutingDecision()` is the machine-checkable version of the same
 *     matrix: blocked hosts never receive the config, lagging hosts warn.
 */

import { HOST_BASE_URLS, HOST_LABEL_MAP, HOST_META } from '../data/hosts.js';
import { FEATURE_MIN_VERSIONS } from '../data/host-capabilities.js';
import { isVersionAtLeast } from './host-capability-policy.js';

/**
 * One-line capability summary for a HOST_META entry, e.g.
 * "Debrid only — no P2P/HTTP" (ElfHosted) or "Debrid + P2P + HTTP".
 */
export function hostCapabilityLabel(meta) {
  const serves = [
    meta?.supportsDebrid ? 'Debrid' : null,
    meta?.supportsP2P ? 'P2P' : null,
    meta?.supportsHttp ? 'HTTP' : null,
  ].filter(Boolean);
  if (serves.length === 1 && serves[0] === 'Debrid') return 'Debrid only — no P2P/HTTP';
  if (!serves.length) return 'No stream sources';
  return serves.join(' + ');
}

/**
 * Full host-picker option label: name — capability · AIOStreams version
 * (channel), e.g. "ElfHosted — Debrid only — no P2P/HTTP · v2.34.0".
 * The version is the registry snapshot from HOST_META; a live probe supersedes
 * it in the health chip, not in this static label.
 */
export function hostPickerLabel(hostKey) {
  const meta = HOST_META[hostKey];
  if (!meta) return HOST_LABEL_MAP[hostKey] || String(hostKey || '');
  const parts = [
    `${HOST_LABEL_MAP[hostKey] || hostKey} — ${hostCapabilityLabel(meta)}`,
    meta.aiostreamsVersion ? `v${meta.aiostreamsVersion}` : 'version unknown',
  ];
  if (meta.channel === 'nightly') parts.push('nightly');
  return parts.join(' · ');
}

/**
 * The oldest AIOStreams that understands every version-gated key in `config`
 * (see FEATURE_MIN_VERSIONS). null when the config uses none — the common case.
 * `minVersions` is injectable so tests can prove the rule against a
 * hypothetical future key without inventing schema entries.
 */
export function configRequiredAIOStreamsVersion(config, minVersions = FEATURE_MIN_VERSIONS) {
  let required = null;
  for (const [key, minimum] of Object.entries(minVersions || {})) {
    if (!config || !(key in config)) continue;
    if (required === null || !isVersionAtLeast(required, minimum)) required = minimum;
  }
  return required;
}

/**
 * Can this config be sent to this host?
 *
 * @param {{service?: string, config?: object}} request the config about to leave the app
 * @param {object} capabilities a resolveHostCapabilities() record
 * @param {{targetVersion?: string|null, minVersions?: object}} [options] the
 *        selected compatibility target; an optional floor table override so
 *        tests can prove the rule against a hypothetical future key
 * @returns {{status: 'ok'|'blocked'|'warn', reasons: string[]}}
 *   blocked — never send: the host refuses this request class outright
 *   warn    — send only as an explicit user pick: the host lags the selected
 *             target, so options newer than it are unavailable
 *   ok      — no known objection
 */
export function hostRoutingDecision(request, capabilities, options = {}) {
  const reasons = [];
  const label = capabilities?.label || 'the selected host';
  const service = request?.service;

  // Stream types the host does not serve at all. ElfHosted disables P2P and
  // HTTP streams instance-wide; a free/P2P config sent there is refused with
  // "Addon Torrentio p2p is disabled: Private instances only".
  const isFreeRoute = service === 'p2p' || service === 'http';
  if (isFreeRoute && (capabilities?.blocksFree || (capabilities?.blockedStreamTypes || []).includes(service))) {
    reasons.push(`${label} does not serve ${String(service).toUpperCase()} streams — pick a host that does, or use a debrid service`);
    return { status: 'blocked', reasons };
  }

  // Feature keys older hosts drop or reject (FEATURE_MIN_VERSIONS).
  const required = configRequiredAIOStreamsVersion(request?.config, options.minVersions);
  if (required && capabilities?.version && !isVersionAtLeast(capabilities.version, required)) {
    reasons.push(`${label} runs AIOStreams ${capabilities.version}; this config needs ${required}+ and would be rejected or degraded`);
    return { status: 'blocked', reasons };
  }

  // The host is only behind the selected target: nothing in this config is
  // actually newer than it, but 2.34-only options must not be silently
  // defaulted towards a 2.33.2 host — say so instead.
  const target = options.targetVersion && options.targetVersion !== 'unknown' ? options.targetVersion : null;
  if (target && capabilities?.version && !isVersionAtLeast(capabilities.version, target)) {
    reasons.push(`${label} runs AIOStreams ${capabilities.version}, behind the ${target} target — options added after ${capabilities.version} are not available on this host`);
    return { status: 'warn', reasons };
  }

  return { status: 'ok', reasons };
}

/**
 * Registry hosts eligible for auto-routing this request (the 'auto' picker and
 * the self-heal fallback). Hosts the decision would block are excluded;
 * warn-only hosts stay eligible because their lag does not affect this
 * particular config. `options.minVersions` is the same test hook as above.
 */
export function autoRoutableHostKeys(request, options = {}) {
  const required = configRequiredAIOStreamsVersion(request?.config, options.minVersions);
  const isFreeRoute = request?.service === 'p2p' || request?.service === 'http';
  return Object.keys(HOST_BASE_URLS).filter(key => {
    const meta = HOST_META[key];
    if (!meta) return false;
    if (isFreeRoute && (meta.blocksFree || !meta.supportsP2P)) return false;
    if (required && meta.aiostreamsVersion && !isVersionAtLeast(meta.aiostreamsVersion, required)) return false;
    return true;
  });
}
