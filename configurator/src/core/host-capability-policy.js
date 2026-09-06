/**
 * Host-capability policy — pure, no DOM, no network, no credentials.
 *
 * Three responsibilities:
 *   1. `resolveHostCapabilities()` merges the hand-written registry
 *      (src/data/host-capabilities.js) with whatever a live probe reported.
 *   2. `hostOptionGate()` turns those capabilities into a UI gate: which
 *      configurator options must be disabled/hidden, each with one reason line.
 *   3. `gateConfigForHost()` removes every key, preset and pattern the target
 *      host would reject or silently drop, and reports what it removed.
 *
 * `gateConfigForHost` is the last thing that touches a template before it is
 * exported or installed, so the emitted JSON can never contain an addon or key
 * the selected host refuses.
 */

import {
  HOST_CAPABILITY_OVERRIDES,
  FEATURE_MIN_VERSIONS,
  PRESET_MIN_VERSIONS,
  KNOWN_DEAD_CONFIG_KEYS,
  LEGACY_MIGRATED_CONFIG_KEYS,
} from '../data/host-capabilities.js';
import { HOST_META } from '../data/hosts.js';
import { AIO_CONFIG_KEY_SET } from '../config/generated/aiostreams-config-schema.js';
import { AIO_PRESET_ID_SET } from '../data/generated/aiostreams-presets.js';
import { isAllowed, hasLookbehind, REGEX_FIELDS } from './regex-whitelist.js';

const SYNCED_REGEX_FIELDS = Object.freeze([
  'syncedExcludedRegexUrls', 'syncedIncludedRegexUrls', 'syncedPreferredRegexUrls',
  'syncedRequiredRegexUrls', 'syncedRankedRegexUrls',
]);

/** Numeric compare for `a.b.c` version strings; missing parts count as 0. */
export function compareVersions(a, b) {
  const pa = String(a || '0').split(/[.\-+]/);
  const pb = String(b || '0').split(/[.\-+]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const na = Number.parseInt(pa[i] ?? '0', 10) || 0;
    const nb = Number.parseInt(pb[i] ?? '0', 10) || 0;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

export function isVersionAtLeast(version, minimum) {
  return compareVersions(version, minimum) >= 0;
}

/** Every host key the registry knows about. */
export function knownHostKeys() {
  return Object.keys(HOST_CAPABILITY_OVERRIDES);
}

/**
 * Normalise a raw `/api/v1/status` body into the probe shape this module uses.
 * Returns null for anything that is not a recognisable AIOStreams status.
 * Nothing from the response is persisted and no credential field is read.
 */
export function parseHostStatus(body) {
  const data = body && typeof body === 'object' ? (body.data || body) : null;
  if (!data || typeof data.version !== 'string') return null;
  const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const regexAccess = settings.regexAccess && typeof settings.regexAccess === 'object' ? settings.regexAccess : {};
  const html = String(settings.customHtml || '');
  const disabledPresetIds = [];
  // The community instance announces its disabled addons in prose; match the
  // names conservatively so a wording tweak degrades to "no extra restriction"
  // rather than to a wrong one.
  if (/\bTorrentio\b[^.]*\bdisabled\b/i.test(html) || /\bdisabled\b[^.]*\bTorrentio\b/i.test(html)) disabledPresetIds.push('torrentio');
  if (/\bAnimeKitsu\b/i.test(html) && /\bdisabled\b/i.test(html)) disabledPresetIds.push('anime-kitsu');
  if (/\bTorrent Catalogs\b/i.test(html) && /\bdisabled\b/i.test(html)) disabledPresetIds.push('torrent-catalogs');
  const blockedStreamTypes = [];
  if (/P2P and HTTP streams are also disabled/i.test(html)) blockedStreamTypes.push('p2p', 'http');

  return {
    reachable: true,
    version: data.version,
    tag: typeof data.tag === 'string' ? data.tag : null,
    channel: typeof data.channel === 'string' ? data.channel : null,
    commit: typeof data.commit === 'string' ? data.commit : null,
    baseUrl: typeof settings.baseUrl === 'string' ? settings.baseUrl : null,
    regexAccess: typeof regexAccess.level === 'string' ? regexAccess.level : null,
    allowedRegexPatterns: Array.isArray(regexAccess.patterns) ? regexAccess.patterns.filter(Boolean) : [],
    // `level: 'none'` is NOT "no regex" — it means "only what this host has
    // published". The host ships two independent allowlists and upstream checks
    // them separately: patterns via isRegexAllowed(), synced URLs via
    // validateSyncedRegexUrls() -> RegexAccess.getAllowedUrls().
    allowedRegexUrls: Array.isArray(regexAccess.urls) ? regexAccess.urls.filter(Boolean) : [],
    disabledPresetIds,
    blockedStreamTypes,
    rateLimited: /rate limit/i.test(html) || null,
  };
}

/**
 * Merge registry defaults with a probe result.
 * `probe` may be null (offline / CORS-blocked) — the caller is then expected to
 * make the user confirm the host explicitly; `capabilities.confirmed` is false.
 */
export function resolveHostCapabilities(hostKey, probe = null, options = {}) {
  const key = String(hostKey || 'custom');
  const base = HOST_CAPABILITY_OVERRIDES[key] || HOST_CAPABILITY_OVERRIDES.custom;
  const probed = probe && probe.reachable ? probe : null;

  const disabledPresetIds = [...new Set([
    ...(base.disabledPresetIds || []),
    ...(probed?.disabledPresetIds || []),
  ])].sort();

  const blockedStreamTypes = [...new Set([
    ...(base.blockedStreamTypes || []),
    ...(probed?.blockedStreamTypes || []),
  ])].sort();

  // The stricter of registry vs probe wins, so a stale registry can never make
  // the gate more permissive than the live host.
  const rank = { none: 0, trusted: 1, all: 2 };
  const levels = [base.regexAccess || 'trusted', probed?.regexAccess].filter(level => level in rank);
  const regexAccess = levels.sort((a, b) => rank[a] - rank[b])[0] || 'trusted';

  // Version precedence: a live probe always wins; otherwise the registry's
  // last-verified version for that public host (data/hosts.js) so the gate
  // stays honest when a browser probe is CORS-blocked; otherwise the caller's
  // assumption.
  const registryVersion = HOST_META[key]?.aiostreamsVersion || null;

  return {
    key,
    label: base.label || key,
    kind: base.kind || 'unknown',
    version: probed?.version || registryVersion || options.assumedVersion || null,
    versionSource: probed?.version ? 'probe' : (registryVersion ? 'registry' : (options.assumedVersion ? 'assumed' : null)),
    channel: probed?.channel || (base.kind === 'nightly' ? 'nightly' : null),
    probed: Boolean(probed),
    // An unprobed host that the registry flags as owner-configured cannot be
    // trusted blind; the caller must ask the user to confirm.
    confirmed: Boolean(probed) || !base.requiresProbe,
    requiresProbe: Boolean(base.requiresProbe),
    unverified: Boolean(base.unverified),
    disabledPresetIds,
    blockedStreamTypes,
    regexAccess,
    allowedRegexPatterns: probed?.allowedRegexPatterns || [],
    // Union, not "probe wins": the registry carries URLs verified by hand from
    // the host's own status endpoint, and a browser probe is usually blocked by
    // CORS. `urlAllowlistIsComplete` records whether we have the host's full
    // list (only a live probe can tell us that) — the gate needs to know the
    // difference between "not on the list" and "we have no list".
    allowedRegexUrls: [...new Set([
      ...(base.allowedRegexUrls || []),
      ...(probed?.allowedRegexUrls || []),
    ])],
    urlAllowlistIsComplete: Boolean(probed),
    rateLimited: probed?.rateLimited ?? base.rateLimited ?? false,
    reasons: base.reasons || {},
    trustedUser: Boolean(options.trustedUser),
  };
}

function reasonFor(capabilities, kind, fallback) {
  return capabilities.reasons?.[kind] || fallback;
}

/**
 * UI gate: which configurator options the selected host cannot accept.
 * Returns `[{ option, scope, action, reason }]` — `action` is 'disable' for
 * things the user could otherwise pick, 'hide' for whole lanes.
 */
export function hostOptionGate(capabilities) {
  const gate = [];
  const label = capabilities.label;

  if (capabilities.blockedStreamTypes.includes('p2p')) {
    gate.push({
      option: 'service:p2p', scope: 'service', action: 'hide',
      reason: reasonFor(capabilities, 'streamType', `P2P streams are disabled on ${label}`),
    });
    gate.push({
      option: 'p2pEnabled', scope: 'preference', action: 'disable',
      reason: reasonFor(capabilities, 'streamType', `P2P streams are disabled on ${label}`),
    });
  }
  if (capabilities.blockedStreamTypes.includes('http')) {
    gate.push({
      option: 'service:http', scope: 'service', action: 'hide',
      reason: reasonFor(capabilities, 'streamType', `HTTP streams are disabled on ${label}`),
    });
  }
  for (const preset of capabilities.disabledPresetIds) {
    gate.push({
      option: `preset:${preset}`, scope: 'addon', action: 'hide',
      reason: reasonFor(capabilities, 'preset', `${preset} is disabled on ${label}`),
    });
  }
  if (capabilities.regexAccess === 'none' && !capabilities.trustedUser) {
    gate.push({
      option: 'customRegex', scope: 'filter', action: 'disable',
      reason: reasonFor(capabilities, 'regex', `${label} only accepts whitelisted regex patterns`),
    });
  }
  if (capabilities.version) {
    for (const [key, minimum] of Object.entries(FEATURE_MIN_VERSIONS)) {
      if (!isVersionAtLeast(capabilities.version, minimum)) {
        gate.push({
          option: `config:${key}`, scope: 'feature', action: 'disable',
          reason: `${label} runs AIOStreams ${capabilities.version}; ${key} needs ${minimum}+`,
        });
      }
    }
    for (const [presetId, minimum] of Object.entries(PRESET_MIN_VERSIONS)) {
      if (!isVersionAtLeast(capabilities.version, minimum)) {
        gate.push({
          option: `preset:${presetId}`, scope: 'addon', action: 'hide',
          reason: `${presetId} was added in AIOStreams ${minimum}; ${label} runs ${capabilities.version}`,
        });
      }
    }
  }
  if (!capabilities.confirmed) {
    gate.push({
      option: 'host', scope: 'host', action: 'confirm',
      reason: `Could not reach ${label} — confirm the host before installing, or export the JSON and import it manually`,
    });
  }
  return gate;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function patternOf(entry) {
  return typeof entry === 'string' ? entry : entry?.pattern;
}

/**
 * Strip everything the target host would reject or silently drop.
 *
 * Returns `{ config, removals, warnings }`. A *removal* was deleted from the
 * config; a *warning* was kept but may still be rejected by the host. Each is
 * `{ kind, target, reason }`. The input is never mutated.
 */
export function gateConfigForHost(rawConfig, capabilities, options = {}) {
  const config = clone(rawConfig || {});
  const removals = [];
  const warnings = [];
  const label = capabilities?.label || 'the selected host';

  // 1. Keys the pinned upstream schema does not define. AIOStreams strips these
  //    server-side, so shipping them just makes the template lie about itself.
  if (options.stripUnknownKeys !== false) {
    for (const key of Object.keys(config)) {
      if (AIO_CONFIG_KEY_SET.has(key)) continue;
      // Legacy keys AIOStreams still migrates before validating must survive.
      if (LEGACY_MIGRATED_CONFIG_KEYS.includes(key)) continue;
      removals.push({
        kind: 'key', target: key,
        reason: KNOWN_DEAD_CONFIG_KEYS.includes(key)
          ? 'not part of the AIOStreams config schema — silently dropped by every host'
          : 'unknown key for the pinned AIOStreams schema',
      });
      delete config[key];
    }
  }

  // 2. Keys that need a newer AIOStreams than the host runs.
  if (capabilities?.version) {
    for (const [key, minimum] of Object.entries(FEATURE_MIN_VERSIONS)) {
      if (!(key in config)) continue;
      if (isVersionAtLeast(capabilities.version, minimum)) continue;
      removals.push({ kind: 'feature', target: key, reason: `${label} runs ${capabilities.version}; ${key} needs ${minimum}+` });
      delete config[key];
    }
  }

  // 3. Presets the host refuses to resolve, preset types the pinned upstream
  //    does not know at all (PresetManager.fromId would throw), and built-ins
  //    that post-date the host's version (same throw, one release later).
  if (Array.isArray(config.presets)) {
    const disabled = new Set(capabilities?.disabledPresetIds || []);
    config.presets = config.presets.filter((preset) => {
      const type = String(preset?.type || '');
      if (disabled.has(type)) {
        removals.push({ kind: 'preset', target: type, reason: reasonFor(capabilities || {}, 'preset', `${type} is disabled on ${label}`) });
        return false;
      }
      if (type && !AIO_PRESET_ID_SET.has(type)) {
        removals.push({ kind: 'preset', target: type, reason: 'not a preset id AIOStreams can resolve at the pinned version' });
        return false;
      }
      const presetMinimum = PRESET_MIN_VERSIONS[type];
      if (presetMinimum && capabilities?.version && !isVersionAtLeast(capabilities.version, presetMinimum)) {
        removals.push({ kind: 'preset', target: type, reason: `${type} was added in AIOStreams ${presetMinimum}; ${label} runs ${capabilities.version}` });
        return false;
      }
      return true;
    });
    // Group references to a removed preset would leave an empty grouping.
    if (config.groups && Array.isArray(config.groups.groupings)) {
      const live = new Set(config.presets.map(p => p.instanceId).filter(Boolean));
      config.groups.groupings = config.groups.groupings
        .map(group => ({ ...group, addons: (group.addons || []).filter(id => live.has(id)) }))
        .filter(group => group.addons.length);
      if (!config.groups.groupings.length) config.groups = { enabled: false, groupings: [] };
    }
  }

  // 4. Stream types the host does not serve.
  for (const type of capabilities?.blockedStreamTypes || []) {
    const excluded = Array.isArray(config.excludedStreamTypes) ? config.excludedStreamTypes : [];
    if (!excluded.includes(type)) {
      config.excludedStreamTypes = [...excluded, type];
      removals.push({ kind: 'streamType', target: type, reason: reasonFor(capabilities || {}, 'streamType', `${type} streams are disabled on ${label}`) });
    }
    if (Array.isArray(config.preferredStreamTypes)) {
      config.preferredStreamTypes = config.preferredStreamTypes.filter(entry => entry !== type);
    }
  }

  // 5. Regex the host will not compile for an untrusted user. AIOStreams throws
  //    "You are only permitted to use specific regex patterns" and rejects the
  //    WHOLE config, so this is a hard save failure, not a soft drop.
  const unrestrictedRegex = capabilities?.regexAccess === 'all'
    || (capabilities?.regexAccess === 'trusted' && (capabilities?.trustedUser || config.trusted === true));
  if (!unrestrictedRegex) {
    const hostAllowed = new Set(capabilities?.allowedRegexPatterns || []);
    for (const field of REGEX_FIELDS) {
      if (!Array.isArray(config[field])) continue;
      const kept = [];
      for (const entry of config[field]) {
        const pattern = patternOf(entry);
        if (!pattern) { kept.push(entry); continue; }
        if (hostAllowed.has(pattern)) { kept.push(entry); continue; }
        if (!isAllowed(pattern)) {
          removals.push({ kind: 'regex', target: `${field}: ${entry?.name || pattern.slice(0, 48)}`, reason: reasonFor(capabilities || {}, 'regex', `${label} only accepts whitelisted regex patterns`) });
          continue;
        }
        if (hasLookbehind(pattern)) {
          removals.push({ kind: 'regex', target: `${field}: ${entry?.name || pattern.slice(0, 48)}`, reason: 'inline lookbehind is rejected by restricted hosts' });
          continue;
        }
        kept.push(entry);
      }
      if (kept.length !== config[field].length) config[field] = kept;
    }
    // Synced regex URLs are a SEPARATE allowlist from inline patterns, checked
    // by validateSyncedRegexUrls() against RegexAccess.getAllowedUrls(). A
    // restricted host still publishes URLs it permits — ElfHosted runs
    // `level: 'none'` and allows five, including the Vidhin05 ranked-regex feed
    // this configurator emits. Blanket-clearing the fields deleted a feature the
    // host explicitly supports, so filter against the allowlist instead.
    //
    // When we have no allowlist at all, remove nothing: absence of data is not
    // evidence of prohibition, and upstream's failure mode here is a loud
    // `Forbidden URL(s) in regex configuration: …` naming the offender, which is
    // far more recoverable than silently dropping a working sync.
    const allowedUrls = new Set(capabilities?.allowedRegexUrls || []);
    for (const field of SYNCED_REGEX_FIELDS) {
      if (!Array.isArray(config[field]) || !config[field].length) continue;
      const kept = [];
      for (const url of config[field]) {
        if (allowedUrls.has(url)) { kept.push(url); continue; }
        if (!capabilities?.urlAllowlistIsComplete) {
          // Unprobed host: keep it, but say so — the export may be rejected.
          warnings.push({
            kind: 'syncedRegex',
            target: `${field}: ${url}`,
            reason: `${label} restricts synced regex URLs and could not be probed — this URL may be rejected on save`,
          });
          kept.push(url);
          continue;
        }
        removals.push({
          kind: 'syncedRegex',
          target: `${field}: ${url}`,
          reason: `${label} does not list this URL as an allowed regex source`,
        });
      }
      if (kept.length !== config[field].length) config[field] = kept;
    }
  }

  return { config, removals, warnings };
}

/** Apply the gate to a whole `{ metadata, config }` template. */
export function gateTemplateForHost(template, capabilities, options = {}) {
  if (!template || typeof template !== 'object' || !template.config) {
    return { template, removals: [], warnings: [] };
  }
  const { config, removals, warnings } = gateConfigForHost(template.config, capabilities, options);
  return { template: { ...template, config }, removals, warnings };
}

/** One-line-per-removal summary for the UI and for the diagnostics report. */
export function describeRemovals(removals = []) {
  return removals.map(item => `${item.kind}: ${item.target} — ${item.reason}`);
}

/** Same shape for entries that were kept but are not guaranteed to be accepted. */
export function describeWarnings(warnings = []) {
  return warnings.map(item => `${item.kind}: ${item.target} — ${item.reason}`);
}
