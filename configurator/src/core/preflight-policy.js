/**
 * Pre-flight validation policy.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two independent checkers used to run before a direct install:
 * `preflightCheck()` and `templateHealthCheck()` in `src/js/app.js`. They test
 * overlapping conditions with differently-worded strings, and were merged with
 * `if (!warns.includes(w)) warns.push(w)` — an exact-string de-dupe that can
 * never fire across two different wordings. A TorBox / Fire Stick HD / 4K /
 * lossless / EasyNews-without-credentials configuration produced NINE bullets
 * for FOUR real problems, inside a native `confirm()`.
 *
 * See `configurator/reports/04-refinements-research.md` §CFG-P0-01.
 *
 * The fix is to key findings on a stable `id` instead of prose. One id per real
 * problem means de-duplication actually works, severities are comparable, and
 * the UI can decide what blocks versus what merely warns.
 *
 * CONTRACT
 * --------
 * This module is READ-ONLY over the generated template. It never mutates the
 * config, never contributes to generated JSON, and never reads, returns, logs
 * or serialises credential *values* — only their presence as a boolean.
 * `tests/preflight-json-fixture.test.mjs` proves generated output is unchanged.
 *
 * SEVERITIES
 * ----------
 *   'blocker'  — proceeding cannot produce a working setup. The UI must require
 *                an explicit override, and should not present it as routine.
 *   'warning'  — the setup will build, but a stated choice will not do what the
 *                user probably expects.
 *   'advisory' — informational consequence of a deliberate choice.
 */

export const PREFLIGHT_SEVERITIES = Object.freeze(['blocker', 'warning', 'advisory']);

const SEVERITY_RANK = Object.freeze({ blocker: 0, warning: 1, advisory: 2 });

/** AIOStreams refuses a config payload over 100 KB on save (issue #107). */
export const PAYLOAD_LIMIT_BYTES = 102400;
/** Warn before the wall, so the user can trim while it is still cheap. */
export const PAYLOAD_WARN_BYTES = 92160;

function finding(id, severity, title, detail, fix) {
  return Object.freeze({ id, severity, title, detail, fix: fix || '' });
}

/**
 * Byte length of the JSON payload, matching what `payloadSizeGuard` measures.
 * Falls back to string length where TextEncoder is unavailable (older embeds).
 */
export function payloadBytes(config) {
  let json;
  try {
    json = JSON.stringify(config);
  } catch {
    return 0;
  }
  if (typeof json !== 'string') return 0;
  try {
    return new TextEncoder().encode(json).length;
  } catch {
    return json.length;
  }
}

/**
 * Build the finding list for a configuration.
 *
 * @param {object} input
 * @param {string}   input.service          primary service id ('torbox', 'p2p', …)
 * @param {string[]} input.multiServices    additionally selected service ids
 * @param {string}   input.device           device profile id
 * @param {string}   input.resolution       '4k' | '1080p'
 * @param {string}   input.audio            'standard' | 'limited' | 'lossless'
 * @param {string}   input.outputProfile    'stable' | 'balanced' | 'advanced' | 'labs'
 * @param {string[]} input.subtitleAddons   enabled subtitle addon ids
 * @param {object}   input.credentialsPresent  id -> boolean. NEVER the values.
 * @param {string[]} input.requiredCredentialIds  ids the chosen services need
 * @param {object}   [input.config]         the built config, for structural checks
 * @param {string[]} [input.extraWarnings]  host/profile warnings from elsewhere
 * @param {Error|null} [input.buildError]   set when buildFinal() threw
 * @returns {ReadonlyArray<{id:string,severity:string,title:string,detail:string,fix:string}>}
 */
export function preflightFindings(input = {}) {
  const {
    service = '',
    multiServices = [],
    device = '',
    resolution = '',
    audio = '',
    outputProfile = '',
    subtitleAddons = [],
    credentialsPresent = {},
    requiredCredentialIds = [],
    config = null,
    extraWarnings = [],
    buildError = null,
    devicesForcingLimitedAudio = [],
    deviceMaxResolution = {},
  } = input;

  const found = new Map();
  const add = (f) => { if (!found.has(f.id)) found.set(f.id, f); };

  const has = (id) => Boolean(credentialsPresent && credentialsPresent[id]);
  const selected = (id) => service === id || (Array.isArray(multiServices) && multiServices.includes(id));
  const freeService = service === 'p2p' || service === 'http';

  // ── A blocked build is not something a user can knowingly continue past. ──
  if (buildError) {
    add(finding(
      'template-build-failed', 'blocker',
      'Template could not be generated',
      `The configurator hit an internal error while assembling this template: ${buildError.message || buildError}`,
      'Copy a Safe Feedback Report from Tools and open an issue — this is a bug, not a setting.',
    ));
    // Nothing downstream is trustworthy once the build threw.
    return sortFindings([...found.values()]);
  }

  if (!service) {
    add(finding(
      'no-service', 'blocker',
      'No service selected',
      'A debrid or free-streaming service determines which scrapers and presets the template uses.',
      'Go back to step 1 and pick a service.',
    ));
  }

  // ── Credentials: one finding per service, not one per field. ──
  const missingRequired = (Array.isArray(requiredCredentialIds) ? requiredCredentialIds : [])
    .filter((id) => !has(id));
  if (!freeService && requiredCredentialIds.length && missingRequired.length === requiredCredentialIds.length) {
    add(finding(
      'no-debrid-credentials', 'blocker',
      'No API key entered',
      'Without a key the service cannot be reached, so no streams will load at all.',
      'Add the API key for your service, or switch to Free P2P / Free HTTP which need no account.',
    ));
  }

  if (selected('easynews') && !(has('easynews') && has('easynewsPass'))) {
    const parts = [];
    if (!has('easynews')) parts.push('username');
    if (!has('easynewsPass')) parts.push('password');
    add(finding(
      'easynews-credentials', 'warning',
      'EasyNews is missing its credentials',
      `EasyNews is selected but its ${parts.join(' and ')} ${parts.length > 1 ? 'are' : 'is'} empty, so Usenet results will not load.`,
      'Enter the EasyNews credentials, or deselect EasyNews.',
    ));
  }

  for (const [id, label] of [['nzbgeek', 'NZBGeek'], ['debridio', 'Debridio'], ['debrider', 'Debrider']]) {
    if (selected(id) && !has(id)) {
      add(finding(
        `${id}-credentials`, 'warning',
        `${label} is missing its API key`,
        `${label} is selected but has no key, so its preset is omitted from the generated template.`,
        `Add the ${label} API key, or deselect ${label} to remove it cleanly.`,
      ));
    }
  }

  if (selected('streamnzb') && !has('streamnzb')) {
    add(finding(
      'streamnzb-credentials', 'warning',
      'StreamNZB is missing its manifest URL',
      'StreamNZB is selected but has no manifest URL, so its preset is omitted.',
      'Paste the StreamNZB manifest URL, or deselect it.',
    ));
  }

  if (Array.isArray(subtitleAddons) && subtitleAddons.includes('subdl') && !has('subdl')) {
    add(finding(
      'subdl-credentials', 'warning',
      'SubDL is missing its API key',
      'SubDL subtitles are enabled but have no key, so SubDL subtitles will not load.',
      'Add the SubDL API key, or turn SubDL off.',
    ));
  }

  // ── Device capability. One finding, whichever wording triggered it. ──
  const deviceCap = deviceMaxResolution && deviceMaxResolution[device];
  if (resolution === '4k' && deviceCap && deviceCap !== '4k') {
    add(finding(
      'device-cannot-play-4k', 'warning',
      'This device cannot play 4K',
      `The selected device profile tops out at ${deviceCap}, so 2160p streams will be fetched and then fail to play.`,
      'Switch the resolution to 1080p, or pick a device profile that supports 2160p.',
    ));
  }

  if (audio === 'lossless' && Array.isArray(devicesForcingLimitedAudio) && devicesForcingLimitedAudio.includes(device)) {
    add(finding(
      'lossless-audio-unsupported', 'warning',
      'Lossless audio is not reliable on this device',
      'This device profile does not reliably pass through TrueHD / DTS-HD MA, so lossless tracks may play silently or not at all.',
      'Set audio to Standard, or choose a device profile with confirmed passthrough.',
    ));
  }

  // ── Resolution consequence. The best-sourced community confusion. ──
  // See 04-refinements-research.md §2 need 6: users repeatedly report "no
  // results" that turn out to be their own resolution filter deleting the tier.
  if (resolution === '1080p' && (outputProfile === 'stable' || outputProfile === 'balanced')) {
    add(finding(
      'resolution-4k-excluded', 'advisory',
      '4K will not appear at all',
      'On the Stable and Balanced profiles, 1080p excludes 2160p and 1440p outright rather than ranking them lower — higher-resolution releases are removed before you see them.',
      'Want 4K when it exists? Choose Mixed · Adaptive, which ranks 1080p first without deleting higher tiers.',
    ));
  }

  // ── Structural checks over the built config. ──
  if (config) {
    if (!Array.isArray(config.presets)) {
      add(finding(
        'missing-presets', 'blocker',
        'Generated template has no preset list',
        'The template is missing its `presets` array, so AIOStreams has nothing to fetch from.',
        'Copy a Safe Feedback Report from Tools and open an issue.',
      ));
    } else {
      const names = config.presets.map((p) => p && p.name).filter(Boolean);
      const duplicates = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
      if (duplicates.length) {
        add(finding(
          'duplicate-preset-names', 'warning',
          'Two addons share a name',
          `Duplicate preset names detected: ${duplicates.slice(0, 3).join(', ')}. AIOStreams may reject the save or collapse them.`,
          'Deselect one of the duplicated addons.',
        ));
      }
    }

    // Size is checked here — before the password prompt and on the export path —
    // rather than only immediately before the network write. Issue #107 is the
    // failure mode of an EXPORTED file being imported by hand.
    const bytes = payloadBytes(config);
    if (bytes > PAYLOAD_LIMIT_BYTES) {
      add(finding(
        'payload-too-large', 'blocker',
        'Config is too large for AIOStreams',
        `${Math.round(bytes / 1024)} KB exceeds the 100 KB (102,400-byte) save limit, so AIOStreams will refuse it.`,
        'Trim optional scrapers or filters, or start from a Lite template.',
      ));
    } else if (bytes > PAYLOAD_WARN_BYTES) {
      add(finding(
        'payload-near-limit', 'advisory',
        'Config is close to the size limit',
        `${Math.round(bytes / 1024)} KB of the 100 KB AIOStreams save limit is used. Adding more addons or filters may push it over.`,
        'Consider trimming optional scrapers before adding anything else.',
      ));
    }
  }

  // ── Warnings raised elsewhere (host gate, output-profile budget, conflicts). ──
  // These already arrive de-duplicated and pre-worded; give each a stable id so
  // repeated calls stay idempotent.
  for (const text of Array.isArray(extraWarnings) ? extraWarnings : []) {
    const message = String(text || '').trim();
    if (!message) continue;
    add(finding(`external:${message.slice(0, 80)}`, 'warning', message, '', ''));
  }

  return sortFindings([...found.values()]);
}

function sortFindings(list) {
  return Object.freeze(
    list.slice().sort((a, b) => (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || a.id.localeCompare(b.id)),
  );
}

/** True when at least one finding makes a working setup impossible. */
export function hasBlockers(findings) {
  return (findings || []).some((f) => f.severity === 'blocker');
}

/** Counts per severity, for headline copy. */
export function summarise(findings) {
  const out = { blocker: 0, warning: 0, advisory: 0, total: 0 };
  for (const f of findings || []) {
    if (out[f.severity] !== undefined) out[f.severity] += 1;
    out.total += 1;
  }
  return out;
}

/**
 * Back-compatible flat string list, so existing call sites and their tests keep
 * working while the richer shape is adopted incrementally.
 */
export function findingsAsMessages(findings) {
  return (findings || []).map((f) => (f.detail ? `${f.title} — ${f.detail}` : f.title));
}
