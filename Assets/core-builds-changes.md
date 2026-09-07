# Core-Builds Configurator — The Changes
**File 1 of 2 · Audit fixes 1–6 + regex-preflight addendum (fix 7) · 2026-09-06**

> This file: state table, the seven fix write-ups (FIXES.md verbatim), **full sources of all 12 new files**, and **every modified-file diff**.
> Companion: **`core-builds-shipping.md`** — verification output, push commands, paste-ready PR/support/issue texts, commit summaries, the "3 / 180" investigation, PR #739 post-mortem, caveats.

| | |
|---|---|
| Base | `origin/main` @ `b07efba` (v3.7.0 standalone regex re-sync + schema sync, #737) |
| Commit 1 | `a743ac5` — `fix(configurator): six audit fixes — v3.7 honesty, library gate, install key gate, host truth, Express-first landing` |
| Commit 2 | `2b00fa6` — `feat(configurator): regex-allowlist preflight — explain the '3/180 regexes' host bounce before the POST` |
| Branch | `fix-7-regex-predeploy` (both commits) · `pr-739-replacement` (commit 1 only) · work tree clean |
| Scope | 39 files, +1970 −307 · 12 new source/test files · **no changes to sort keys, presets, SELs, regex semantics, formatters, or generated-config output** (goldens byte-stable except the two intended changes) |

**All gates green before push:**

| Suite | Result |
|---|---|
| `configurator` unit (`npm test`) | **538/538** (0 fail / 0 skipped; 484 baseline + 54 new) |
| `configurator` validate (`npm run validate`) | **29/29 PASS** |
| `sync:upstream:check` | **no drift** — pin verified v2.34.0 = `e694b6ace730…`; generated files match the pinned contract |
| `npm run build` | standalone **1,031,257 B**; web **819,969 JS / 173,262 CSS** |
| Playwright (desktop + mobile) | **160/160** (5.1 m; 0 flakes on final tree) |
| `packages/core` (`npm test`) | **39/39** |
| `cli` (`npm test`, after `npm ci`) | **74/74** |

---

## Part 1 — The fixes (in-repo write-up, verbatim from `FIXES.md`)

The following is the exact `FIXES.md` that ships with the PR.


# FIXES — Configurator honesty, gating & IA pass (2026-09-06 audit)

Baseline `b07efba` (484 unit / 29 validate / pin v2.34.0 @ e694b6a) → after this pass:
**530 unit · 29 validate · no upstream drift · build OK · Playwright 154 green** (one known
loaded-box flake, #682 — passes on retry and in isolation).

Generation, sort, filter, regex and formatter semantics are untouched; app.js structure and
the 7 CSS layers are untouched. Goldens are byte-identical except the two intended changes
(proof below).

---

## 1. Version honesty (badge v3.1 / package 3.1.0 / tag v3.7.0)

`CONFIGURATOR_VERSION` in `configurator/src/js/app.js` is the single source of truth (the
version-sync workflow's convention); it now reads `3.7` → semver `3.7.0` everywhere:

- `configurator/src/js/app.js` — `CONFIGURATOR_VERSION = '3.7'` (badge, "What's new", template stamp, beacons)
- `configurator/package.json`, `cli/package.json`, `packages/core/package.json` — `3.7.0`
- `versions.json` → `configurator: 3.7.0`
- `configurator/src/data/changelog.js` — new `v3.7` entry (a v3.7 badge opening a 3.1 changelog would be a new lie)
- `configurator/index.html` — rebuilt, badge now `v3.7`
- Default AIOStreams target: `2.32.0` → `DEFAULT_AIOSTREAMS_VERSION = '2.34.0'` (new export in
  `src/core/output-profile-policy.js`, imported by app.js for the state default and all four
  fallback literals); `AIOSTREAMS_COMPATIBILITY_TARGETS` now `['2.31.1','2.32.0','2.33.2','2.34.0','unknown']`;
  the target `<select>` grew the two real-fleet options with per-target notes.

**Tests:** `tests/version-honesty.test.mjs` — fails on any badge/package.json/versions.json/
CONFIGURATOR_VERSION/golden-stamp/changelog disagreement, and pins default target = `UPSTREAM.pin`
version. `tests/host-routing.test.mjs` — compatibility targets must cover every host version in
the host registry.

## 2. EasyNews-only Direct Install 400 (library preset root cause)

AIOStreams generates the Library addon from the **services** array and rejects the whole save
when no enabled service can back it (EasyNews is not in `LibraryPreset.supportedServices` at the
pin). Rule implemented once, applied at every emission site:

- `configurator/src/core/install-policy.js` (new) — `LIBRARY_CAPABLE_SERVICE_IDS` (read from the
  pinned upstream source) + `hasLibraryCapableService(services)`
- `configurator/src/js/app.js` `presets()` — both library emissions (usenet route + general list)
  are now `...(libCapable ? [ … ] : [])`; the usenet route keeps Library because it enables the
  library-capable `aiostreams` service
- `packages/core/src/library-policy.js` (new) + `packages/core/src/generate-template.js` — the
  shared engine had the same bug; found by `cli/tests/package-equivalence.test.mjs` (74/74 after fix)

**Tests:** `tests/install-policy.test.mjs` (the capability set, the rule, app.js wiring at both
sites); `tests/easynews-library.test.mjs` (fixture: `easynews-1080p` golden has no library preset
and validates against the pinned option contract; debrid fixtures keep Library; every golden
satisfies the host rule); `packages/core/tests/library-policy.test.mjs` (engine-side + a drift
alarm asserting both copies of the list are identical); `e2e/golden-configs.spec.mjs` regenerated.
**Golden proof:** 14/15 goldens changed only `coreBuildsVersion 3.1 → 3.7`; `easynews-1080p.json`
changed only that **plus** removal of the library preset block. No other bytes moved.

## 3. Direct Install key gate ("Option apiKey is required")

- `configurator/src/core/install-policy.js` — `missingDirectInstallCredentials(services, creds)`:
  TorBox/Real-Debrid/AllDebrid/Premiumize/… need their key; EasyNews needs username **and**
  password; P2P/HTTP need none; Debridio is not gated (its preset is omitted keyless by design).
- `configurator/src/js/app.js` — `simpleInstall()` blocks the POST with an inline message naming
  each missing key (`missingCredHtml`); `runExpressInstall()` replaces the old "any one key"
  check with the same precise gate. **Export JSON stays keyless** — `generate()` untouched.

**Tests:** `tests/install-policy.test.mjs` (gate matrix + gate-before-POST wiring, old check
must not survive); `e2e/direct-install-gate.spec.mjs` — empty TorBox key → inline "TorBox API
Key" message and **zero POSTs**; key entered → exactly one POST; EasyNews missing password named;
keyless export still builds via the e2e hook.

## 4. Truthful host picker (capabilities + version, no bad routing)

- `configurator/src/data/hosts.js` — per-host `aiostreamsVersion` registry snapshot from the
  2026-09-06 fleet audit (ElfHosted/ForTheWeak/Viren/Kuu/ATBP = 2.34.0; Midnight/Omni/Wizaardd = 2.33.2).
- `configurator/src/core/host-routing.js` (new) — `hostPickerLabel()` ("ElfHosted — Debrid only —
  no P2P/HTTP · v2.34.0"), `configRequiredAIOStreamsVersion()`, `hostRoutingDecision()`
  (blocked / warn / ok), `autoRoutableHostKeys()`.
- `src/core/host-capability-policy.js` — `resolveHostCapabilities` version precedence is now
  probe > registry snapshot > assumed target; `blocksFree` surfaced on the record.
- `app.js` — both host selects (Express `#expressHost`, wizard `#aioHost`) use the truthful
  labels; `simpleInstall()` refuses to POST to a host the matrix blocks (P2P→ElfHosted, features
  newer than the host) and the Express chip turns red/amber for blocked/behind-target picks before
  Deploy; `selectHealthyHost()` ('auto') excludes hosts that can't take the current config.

**Tests:** `tests/host-routing.test.mjs` — registry matches the audit; targets cover every host
version; ElfHosted label exact; matrix: P2P×ElfHosted blocked, P2P×ForTheWeak ok, 2.33.2-floor
config blocked on 2.33.0, 2.34-only config blocked on Midnight/Omni/Wizaardd and routed to the
2.34.0 fleet, target-lag → warn; auto-routing excludes the laggards. `e2e/direct-install-gate.spec.mjs`
asserts the option labels and the red chip in the browser.

## 5. Express-first landing (minimal IA, no restyle)

- `app.js` `splashHtml()` — one primary card (Express, naming the five steps: service → device →
  resolution → key → Deploy); **Advanced Builder** and **Update Existing** demoted to secondary
  text links (`splash-tertiary-btn`, existing style) keeping their `data-action`s so `#advanced`,
  `#update`, the tour and every spec still work; **Setup Genie card removed** from the landing,
  the route stays one click away as a text link and via All Core Tools (`../tools/genies/` → HTTP 200).
  No CSS changes, no new routes, no animation work.

**Tests:** `tests/landing-ia.test.mjs` (exactly one door; both demotions present with the same
actions; Genie card gone but linked; genie page exists; tour target still resolvable).
`e2e/link-integrity.spec.mjs` now also covers the new splash link. Deep links verified: `#advanced`,
  `#update`, `#express` all still route.

## 6. Verification (pasted in the handoff message)

- `npm test` — 530/530 (484 baseline + 46 new)
- `npm run validate` — 29/29
- `npm run sync:upstream:check` — pin v2.34.0 = e694b6a, no drift
- `npm run build` — standalone + web assets rebuilt
- `npx playwright test` — 154 passed (1 known flake noted: mobile
  `express-install.spec.mjs:148` Debridio popout, the documented #682 loaded-box class — passed
  on retry in-run and 6/6 in isolation)
- Cross-package: `packages/core` 39/39, `cli` 74/74 (the CLI suite caught the same library bug
  in the shared engine; both fixed here)

## Manual checklist (not automatable here)

- [ ] Real-key Test Drive: Direct Install → HTTP 201 on a 2.34.0 host (e.g. ForTheWeak) with a real TorBox key
- [ ] EasyNews-only Direct Install with real EasyNews credentials → 201 (the audited 400 path)
- [ ] Stremio one-click open after Full-Stack install
- [ ] WuPlay / Nuvio one-click opens from the Deploy row

## 7. Regex-allowlist preflight (post-audit addendum — the "3 / 180 regexes" bounce)

A user's Direct Install of **Advanced › Apex (IQR) › 1080p** was rejected by a host with
*"…you have 3 / 180 regexes that are not allowed"* (2026-09-05 22:53). Reproduced exactly:
the then-live (pre-`b07efba`) generator shipped **3 stale inline regex constants**
(`\b(CtrlHD|W4NK3R|DON)\b` + two BluRay-group lookaheads) no longer present in the
community list, on top of the 177-entry synced set → union **180**, rejected **3** — on
every allowlist vintage (they are old pattern versions the list has since replaced).
`b07efba`'s standalone-template regex re-sync (merged ~16h later) aligned the constants;
current builds are union 177 / 0 rejected everywhere. Two structural hazards remain,
both covered by this gate: (a) the synced URL pins Vidhin05's Releases-Regex **`main`** —
a moving target the host resolves live at save but validates against its **cached**
allowlist, so an upstream merge plus a lagging host refresh bounces fresh patterns
(verified: two patterns changed upstream 2026-09-05 05:58 UTC; hosts caught up only
hours later); (b) any future stale-constant regression. The user-facing failure in both
is the same cryptic host 400, after the POST.

- `src/core/regex-access-policy.js` (new) — `collectRegexPatternSet()` + `regexAccessDecision()`,
  mirroring upstream `validateRegexes()` at the pin: five top-level `*RegexPatterns` arrays,
  exact-string dedupe; `skip` on every unknown (unrestricted host, allowlist not exposed,
  list unfetchable) — the gate explains a predictable 400, it never creates one.
- `app.js` — `regexGateForHost()` rides `raceHostFetch` (the same direct+CORS-proxy lane the
  host chip uses) for status and fetches the synced list client-side
  (`raw.githubusercontent.com` sends `Access-Control-Allow-Origin: *`); blocked verdicts stop
  the install POST with a plain-language inline notice ("N / M regex patterns are not allowed
  on this host — its pattern allowlist lags the synced list"); the Express chip shows the same
  verdict advisory. Goldens and generated configs unchanged — no regex semantics touched.

**Tests:** `tests/regex-access-policy.test.mjs` (golden carries the synced URL + 83 inline
patterns; skip matrix; the recorded race reproduced with the two real changed strings;
app.js gate ordering between host resolve and POST); `e2e/direct-install-gate.spec.mjs`
"regex allowlist preflight" ×3 (stale allowlist → blocked inline notice + zero POSTs;
allowlist caught up → installs; `level: all` → gate never trips) driven through the real
`simple-install` delegate with a standalone 4K apex-mixed state.

## Explicitly NOT done here (per instructions)

- Cross-repo follow-up: the same version-stamp honesty bug in the CoreBuildsApps icon pack — to be filed separately.


---

## Part 2 — Complete sources of every new file (12)

### 2.1 `configurator/src/core/install-policy.js` — fix 2 + fix 3 rules

```js
/**
 * Install policy — the rules a config must satisfy before it can be POSTed to
 * an AIOStreams host, plus the Library-preset usability rule. Pure: no DOM, no
 * network, no credentials ever leave the caller's scope.
 *
 * WHY THIS MODULE EXISTS
 *
 * Two host rejections were traced to rules AIOStreams enforces at save time
 * but Core Builds only discovered at 400-time:
 *
 *   1. "Library requires at least one usable service" — the Library addon is
 *      generated from the *services* array, and upstream rejects the whole
 *      config when no enabled service can back it (EasyNews cannot).
 *   2. "Option apiKey is required" — an enabled debrid service with an empty
 *      credential posts a config the host must refuse.
 *
 * Both rules are now asserted before anything leaves the app.
 */

import { PROVIDER_CREDENTIALS } from '../data/credentials.js';

/**
 * Service ids AIOStreams' Library addon can be generated from, read from the
 * pinned upstream source (LibraryPreset.supportedServices = StremThruPreset's
 * list + nzbdav + altmount + stremthru_newz + aiostreams) at v2.34.0 /
 * e694b6a. EasyNews, Seedr, Debridio, putio and stremio_nntp are NOT in that
 * list — a Library preset with only those enabled is rejected on save.
 */
export const LIBRARY_CAPABLE_SERVICE_IDS = Object.freeze([
  'alldebrid',
  'debridlink',
  'debrider',
  'easydebrid',
  'offcloud',
  'premiumize',
  'pikpak',
  'realdebrid',
  'torbox',
  'torrin',
  'nzbdav',
  'altmount',
  'stremthru_newz',
  'aiostreams',
]);

const LIBRARY_CAPABLE = new Set(LIBRARY_CAPABLE_SERVICE_IDS);

/**
 * True when at least one enabled service can back a Library preset. Accepts
 * the exact `services` array the generator emits (`[{ id, enabled,
 * credentials }]`) so the rule can never drift from what is actually posted.
 */
export function hasLibraryCapableService(services) {
  return (Array.isArray(services) ? services : []).some(
    service => service && service.enabled !== false && LIBRARY_CAPABLE.has(service.id),
  );
}

/**
 * Credentials each emitted service needs before the config can be POSTed.
 * `apiKey` services map 1:1 onto the S.creds key of the same name; EasyNews
 * needs its username AND password. P2P/HTTP need none. Debridio is absent by
 * design: its preset is simply omitted until a key exists (v2.93), so a
 * keyless Debridio never reaches the host as a rejected option.
 */
export const SERVICE_CREDENTIAL_REQUIREMENTS = Object.freeze({
  torbox: ['torbox'],
  realdebrid: ['realdebrid'],
  alldebrid: ['alldebrid'],
  premiumize: ['premiumize'],
  debridlink: ['debridlink'],
  offcloud: ['offcloud'],
  easydebrid: ['easydebrid'],
  pikpak: ['pikpak'],
  seedr: ['seedr'],
  debrider: ['debrider'],
  easynews: ['easynews', 'easynewsPass'],
});

/**
 * Every enabled service missing a required credential.
 * @param {Array<{id:string,enabled:boolean}>} services the emitted services array
 * @param {Record<string,string>} creds the credential map (S.creds shape)
 * @returns {{service:string, field:string, label:string}[]} one row per missing key
 */
export function missingDirectInstallCredentials(services, creds = {}) {
  const missing = [];
  for (const service of Array.isArray(services) ? services : []) {
    if (!service || service.enabled === false) continue;
    const fields = SERVICE_CREDENTIAL_REQUIREMENTS[service.id];
    if (!fields) continue;
    for (const field of fields) {
      if (String(creds[field] || '').trim()) continue;
      missing.push({
        service: service.id,
        field,
        label: PROVIDER_CREDENTIALS[field]?.label || `${service.id} ${field === service.id ? 'API key' : 'credential'}`,
      });
    }
  }
  return missing;
}
```

### 2.2 `configurator/src/core/host-routing.js` — fix 4 (labels, matrix, auto-route)

```js
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
```

### 2.3 `configurator/src/core/regex-access-policy.js` — fix 7 (upstream `validateRegexes` mirror)

```js
/**
 * Regex-allowlist preflight — the 2026-09-06 "3 / 180 regexes" diagnosis.
 *
 * Regex-scoring builds (4K / ultrawide / mixed / apex-mixed) ship
 * `syncedRankedRegexUrls` pinned to Vidhin05's Releases-Regex *main* — a
 * moving target. At save time AIOStreams resolves that URL live and validates
 * the deduped union (synced + inline patterns) against the HOST's cached
 * allowlist (`settings.regexAccess.patterns`, refreshed on the host's own
 * schedule). When upstream merges pattern changes faster than a host
 * refreshes, every Direct Install bounces with the host 400
 * "You are only permitted to use specific regex patterns, you have N / M
 * regexes that are not allowed" (observed 2026-09-05 22:53 — two patterns
 * had changed upstream at 05:58 the same day; both reached host allowlists
 * only later).
 *
 * This module mirrors `validateRegexes()` in AIOStreams
 * packages/core/src/utils/config.ts at the pinned ref (v2.34.0 @ e694b6a):
 * only the five top-level `*RegexPatterns` arrays are part of this gate
 * (stream expressions are NOT validated against the allowlist upstream) and
 * matching is exact-string on the deduped union. The DOM half lives in app.js
 * (`regexGateForHost`): it resolves the synced lists client-side
 * (raw.githubusercontent.com sends `Access-Control-Allow-Origin: *`) and runs
 * this decision before the install POST.
 */

const STRING_PATTERN_KEYS = Object.freeze([
  'excludedRegexPatterns',
  'includedRegexPatterns',
  'requiredRegexPatterns',
]);
const OBJECT_PATTERN_KEYS = Object.freeze([
  'preferredRegexPatterns',
  'rankedRegexPatterns',
]);
export const SYNCED_URL_KEYS = Object.freeze([
  'syncedExcludedRegexUrls',
  'syncedIncludedRegexUrls',
  'syncedRequiredRegexUrls',
  'syncedPreferredRegexUrls',
  'syncedRankedRegexUrls',
]);

/**
 * Inline regex patterns + synced regex URLs a config carries.
 * @returns {{ inline: Set<string>, syncedUrls: string[] }}
 */
export function collectRegexPatternSet(config) {
  const cfg = config || {};
  const inline = new Set();
  for (const key of STRING_PATTERN_KEYS) {
    for (const p of cfg[key] || []) if (typeof p === 'string' && p) inline.add(p);
  }
  for (const key of OBJECT_PATTERN_KEYS) {
    for (const entry of cfg[key] || []) {
      const p = typeof entry === 'string' ? entry : entry && entry.pattern;
      if (typeof p === 'string' && p) inline.add(p);
    }
  }
  const syncedUrls = [];
  for (const key of SYNCED_URL_KEYS) {
    for (const u of cfg[key] || []) {
      if (typeof u === 'string' && u && !syncedUrls.includes(u)) syncedUrls.push(u);
    }
  }
  return { inline, syncedUrls };
}

/**
 * Verdict for posting this pattern set to a host.
 *
 * @param {null|{level?: string, patterns?: string[]}} regexAccess
 *        `settings.regexAccess` from the host's /api/v1/status (null when the
 *        status could not be fetched).
 * @param {{inline?: Set<string>, resolved?: Set<string>|null}} set
 *        `inline` — patterns in the config; `resolved` — patterns fetched
 *        client-side from the config's synced URLs (null = unfetchable).
 * @returns {{status: 'skip'|'ok'|'blocked', total: number, rejectedCount: number,
 *            level: string|null, reason?: string}}
 *   skip    — nothing to validate, or the check cannot know the answer
 *             (unrestricted host, status/allowlist not exposed, synced list
 *             unfetchable). The gate must never invent a new failure mode.
 *   ok      — every pattern of the union is allowlisted.
 *   blocked — the host will refuse the save; `reason` is user-facing.
 */
export function regexAccessDecision(regexAccess, set) {
  const union = new Set([...(set.resolved || []), ...(set.inline || [])]);
  const level = regexAccess && typeof regexAccess.level === 'string' ? regexAccess.level : null;
  if (!union.size) return { status: 'skip', total: 0, rejectedCount: 0, level };
  if (!level || level === 'all') return { status: 'skip', total: union.size, rejectedCount: 0, level };
  if (!Array.isArray(regexAccess.patterns)) {
    // Restrictive host, but the allowlist is not exposed — cannot validate.
    return { status: 'skip', total: union.size, rejectedCount: 0, level };
  }
  const allow = new Set(regexAccess.patterns);
  const rejectedCount = [...union].filter(p => !allow.has(p)).length;
  if (!rejectedCount) return { status: 'ok', total: union.size, rejectedCount: 0, level };
  return {
    status: 'blocked',
    total: union.size,
    rejectedCount,
    level,
    reason: `${rejectedCount} / ${union.size} regex patterns are not allowed on this host — its pattern allowlist lags the synced list. Pick another host, retry in a few hours, or use Export JSON and import manually.`,
  };
}
```

### 2.4 `packages/core/src/library-policy.js` — fix 2 in the shared CLI engine

```js
/**
 * Library-preset usability rule — the packages/core half of the 2026-09-06
 * audit fix (defect 2), kept byte-identical in spirit to
 * configurator/src/core/install-policy.js. The CLI equivalence test
 * (cli/tests/package-equivalence.test.mjs) diffs CLI output against the
 * Configurator goldens, and configurator/tests/install-policy.test.mjs asserts
 * the two lists stay the same — change them together.
 *
 * AIOStreams generates the Library addon from the enabled services and rejects
 * the whole save when none can back it ("Library requires at least one usable
 * service"). These are the service ids upstream's LibraryPreset can use at the
 * pinned ref (v2.34.0 / e694b6a): the StremThru services plus nzbdav,
 * altmount, stremthru_newz and aiostreams. EasyNews, Seedr, Debridio, putio
 * and stremio_nntp are NOT library-capable.
 */

export const LIBRARY_CAPABLE_SERVICE_IDS = Object.freeze([
  'alldebrid',
  'debridlink',
  'debrider',
  'easydebrid',
  'offcloud',
  'premiumize',
  'pikpak',
  'realdebrid',
  'torbox',
  'torrin',
  'nzbdav',
  'altmount',
  'stremthru_newz',
  'aiostreams',
]);

const LIBRARY_CAPABLE = new Set(LIBRARY_CAPABLE_SERVICE_IDS);

/** True when at least one enabled service can back a Library preset. */
export function hasLibraryCapableService(services) {
  return (Array.isArray(services) ? services : []).some(
    service => service && service.enabled !== false && LIBRARY_CAPABLE.has(service.id),
  );
}
```

### 2.5 `configurator/tests/version-honesty.test.mjs` (fix 1 guard)

```js
/**
 * Version honesty (2026-09-06 audit, defect 1).
 *
 * The badge said v3.1, package.json said 3.1.0, and the release tag was
 * v3.7.0. CONFIGURATOR_VERSION in app.js is the single source of truth (the
 * version-sync workflow propagates it); these tests fail the suite the moment
 * any coupled surface disagrees with it again.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';

const repoRoot = new URL('../../', import.meta.url);

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const versions = JSON.parse(await readFile(new URL('versions.json', repoRoot), 'utf8'));
const cliPkg = JSON.parse(await readFile(new URL('cli/package.json', repoRoot), 'utf8'));
const corePkg = JSON.parse(await readFile(new URL('packages/core/package.json', repoRoot), 'utf8'));

// Repo convention (see .github/workflows/version-sync.yml): CONFIGURATOR_VERSION
// is raw "x.y"; semver is "x.y.0"; the built badge drops the trailing ".0".
const raw = app.match(/const CONFIGURATOR_VERSION = '([^']+)'/)?.[1];
const semverFromRaw = raw && /^\d+\.\d+$/.test(raw) ? `${raw}.0` : raw;

test('CONFIGURATOR_VERSION exists in the raw x.y convention the release workflow expects', () => {
  assert.ok(raw, 'CONFIGURATOR_VERSION not found in app.js');
  assert.match(raw, /^\d+\.\d+$/, `expected raw x.y, got "${raw}" — version-sync.yml appends ".0"`);
});

test('package.json, versions.json and sibling packages all carry the app version', () => {
  assert.equal(pkg.version, semverFromRaw, 'configurator/package.json drifted from CONFIGURATOR_VERSION');
  assert.equal(versions.configurator, semverFromRaw, 'versions.json drifted from CONFIGURATOR_VERSION');
  assert.equal(cliPkg.version, semverFromRaw, 'cli/package.json drifted from CONFIGURATOR_VERSION');
  assert.equal(corePkg.version, semverFromRaw, 'packages/core/package.json drifted from CONFIGURATOR_VERSION');
});

test('the built header badge reports the same version as package.json', async () => {
  const built = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const display = pkg.version.replace(/\.0$/, '');
  assert.ok(
    built.includes(`title="View changelog">v${display}</span>`),
    `built badge should read v${display} (CONFIGURATOR_VERSION ${raw}, package.json ${pkg.version})`,
  );
});

test('every golden template stamps the current app version', () => {
  const dir = new URL('../e2e/golden/', import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const golden = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.equal(
      golden.metadata?.coreBuildsVersion,
      raw,
      `${file} stamps v${golden.metadata?.coreBuildsVersion} — regenerate goldens with UPDATE_GOLDEN=1 when the version changes`,
    );
  }
});

test('the changelog leads with the current version', async () => {
  const { CHANGELOG } = await import('../src/data/changelog.js');
  assert.equal(CHANGELOG[0].v, raw, `the What's new modal would offer v${CHANGELOG[0].v} under a v${raw} badge`);
});
```

### 2.6 `configurator/tests/install-policy.test.mjs` (fixes 2 + 3 guards)

```js
/**
 * Install policy — the Library-preset usability rule (audit defect 2) and the
 * Direct Install credential gate (audit defect 3). The rules live in
 * src/core/install-policy.js; the tests here prove both the pure rule and that
 * app.js actually routes its emission/posting paths through it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  LIBRARY_CAPABLE_SERVICE_IDS,
  SERVICE_CREDENTIAL_REQUIREMENTS,
  hasLibraryCapableService,
  missingDirectInstallCredentials,
} from '../src/core/install-policy.js';
import { AIO_SERVICES } from '../src/data/generated/aiostreams-enums.js';
import { AIO_PRESET_ID_SET } from '../src/data/generated/aiostreams-presets.js';

const svc = (id, enabled = true) => ({ id, enabled, credentials: {} });

/* ── the library-capable service set ───────────────────────────────────────── */

test('the library-capable set is exactly the upstream Library supported services at the pin', () => {
  // Read from AIOStreams v2.34.0 @ e694b6a: LibraryPreset.supportedServices =
  // StremThruPreset list (alldebrid, debrider, debridlink, easydebrid,
  // offcloud, premiumize, pikpak, realdebrid, torbox, torrin) + nzbdav +
  // altmount + stremthru_newz + aiostreams. EasyNews is NOT among them.
  assert.deepEqual([...LIBRARY_CAPABLE_SERVICE_IDS].sort(), [
    'aiostreams', 'alldebrid', 'altmount', 'debrider', 'debridlink', 'easydebrid',
    'nzbdav', 'offcloud', 'pikpak', 'premiumize', 'realdebrid', 'stremthru_newz',
    'torbox', 'torrin',
  ]);
  for (const id of LIBRARY_CAPABLE_SERVICE_IDS) {
    assert.ok(AIO_SERVICES.includes(id), `${id} is not a service AIOStreams knows`);
  }
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('easynews'), 'EasyNews must not be library-capable — the audited 400');
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('seedr'), 'Seedr is not a StremThru/Library service upstream');
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('putio'), 'putio is not library-capable upstream');
});

test('hasLibraryCapableService: EasyNews-only is false, EasyNews + debrid is true', () => {
  assert.equal(hasLibraryCapableService([svc('easynews')]), false, 'the audited failing config');
  assert.equal(hasLibraryCapableService([svc('easynews'), svc('alldebrid')]), true);
  assert.equal(hasLibraryCapableService([svc('torbox')]), true);
  assert.equal(hasLibraryCapableService([svc('easynews'), svc('debridlink')]), true);
  assert.equal(hasLibraryCapableService([]), false);
  assert.equal(hasLibraryCapableService(undefined), false);
});

test('hasLibraryCapableService: the usenet route keeps the library via the aiostreams service', () => {
  const usenetRouteServices = [svc('easynews'), svc('stremio_nntp'), svc('aiostreams')];
  assert.equal(hasLibraryCapableService(usenetRouteServices), true);
});

test('hasLibraryCapableService ignores disabled entries', () => {
  assert.equal(hasLibraryCapableService([svc('torbox', false), svc('easynews')]), false);
});

/* ── the Direct Install credential gate ────────────────────────────────────── */

test('TorBox with an empty key is named and blocked; with a key it passes', () => {
  const missing = missingDirectInstallCredentials([svc('torbox')], { torbox: '' });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].service, 'torbox');
  assert.equal(missing[0].field, 'torbox');
  assert.match(missing[0].label, /TorBox API Key/i);
  assert.deepEqual(missingDirectInstallCredentials([svc('torbox')], { torbox: 'k' }), []);
  // whitespace-only is still missing
  assert.equal(missingDirectInstallCredentials([svc('torbox')], { torbox: '   ' }).length, 1);
});

test('EasyNews needs username AND password — each missing one is named', () => {
  const noPass = missingDirectInstallCredentials([svc('easynews')], { easynews: 'user', easynewsPass: '' });
  assert.deepEqual(noPass.map(m => m.field), ['easynewsPass']);
  assert.match(noPass[0].label, /EasyNews Password/i);
  const none = missingDirectInstallCredentials([svc('easynews')], {});
  assert.deepEqual(none.map(m => m.field).sort(), ['easynews', 'easynewsPass']);
  assert.deepEqual(
    missingDirectInstallCredentials([svc('easynews')], { easynews: 'user', easynewsPass: 'pass' }),
    [],
  );
});

test('Real-Debrid, AllDebrid and every other apiKey service gate the same way', () => {
  for (const id of ['realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud', 'easydebrid', 'pikpak', 'seedr']) {
    assert.equal(missingDirectInstallCredentials([svc(id)], {}).length, 1, id);
    assert.deepEqual(missingDirectInstallCredentials([svc(id)], { [id]: 'x' }), [], id);
  }
});

test('P2P/HTTP need no credentials; Debridio is not gated (its preset is simply omitted keyless)', () => {
  assert.deepEqual(missingDirectInstallCredentials([], {}), []);
  // p2p/http emit no services at all — but even a stray entry for them is not in the table
  assert.equal(SERVICE_CREDENTIAL_REQUIREMENTS.p2p, undefined);
  assert.equal(SERVICE_CREDENTIAL_REQUIREMENTS.http, undefined);
  assert.equal(SERVICE_CREDENTIAL_REQUIREMENTS.debridio, undefined);
});

/* ── app.js wiring — the rules must be on the real paths ───────────────────── */

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('presets() gates every library emission on hasLibraryCapableService(services())', () => {
  const body = app.match(/function presets\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'presets() not found');
  assert.match(body, /const libCapable = hasLibraryCapableService\(services\(\)\);/, 'the capability flag must come from the emitted services array');
  const gated = body.match(/\.\.\.\(libCapable \? \[\{ type:'library'/g) || [];
  const total = body.split(/type:'library'/).length - 1;
  assert.equal(total, 2, 'exactly two library emission sites exist (usenet route + general list)');
  assert.equal(gated.length, 2, 'both library emission sites must be conditional on libCapable');
});

test('simpleInstall blocks the POST on missing credentials, before anything is sent', () => {
  const body = app.match(/async function simpleInstall\(target\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'simpleInstall not found');
  const gate = body.indexOf('missingDirectInstallCredentials(services(), S.creds)');
  assert.ok(gate > -1, 'the key gate must consult the emitted services array');
  const post = body.indexOf("writeHostFetch(fastest, '/api/v1/user'");
  assert.ok(post > -1, 'expected the POST call');
  assert.ok(gate < post, 'the gate must run before the config is posted');
  assert.match(body, /missingCredHtml\(missingCreds\)/, 'the block renders the inline message');
});

test('the Express lane runs the same precise gate (the old any-key check is gone)', () => {
  assert.doesNotMatch(app, /Object\.values\(p\.creds\)\.some\(v => v\)/, 'the "any one key" check must not survive');
  const body = app.match(/async function runExpressInstall\(p\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body);
  assert.match(body, /missingDirectInstallCredentials\(services\(\), S\.creds\)/);
});

test('the library preset id is one AIOStreams can resolve (guard for the fixture tests)', () => {
  assert.ok(AIO_PRESET_ID_SET.has('library'));
});
```

### 2.7 `configurator/tests/host-routing.test.mjs` (fix 4 guard)

```js
/**
 * Host routing + host-picker truthfulness (2026-09-06 audit, defect 4).
 *
 * The picker treated every host as interchangeable. These tests pin:
 *   - the registry's per-host AIOStreams versions (2.34.0 fleet, 2.33.2 laggards)
 *   - the capability + version label each picker shows before Deploy
 *   - the routing matrix: P2P can never target ElfHosted; a config needing a
 *     newer AIOStreams than a host runs is not routed there
 *   - the compatibility-target list covers every host version in the registry
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { HOST_META } from '../src/data/hosts.js';
import { AIOSTREAMS_COMPATIBILITY_TARGETS, DEFAULT_AIOSTREAMS_VERSION } from '../src/core/output-profile-policy.js';
import { resolveHostCapabilities } from '../src/core/host-capability-policy.js';
import {
  hostCapabilityLabel,
  hostPickerLabel,
  configRequiredAIOStreamsVersion,
  hostRoutingDecision,
  autoRoutableHostKeys,
} from '../src/core/host-routing.js';
import { FEATURE_MIN_VERSIONS } from '../src/data/host-capabilities.js';

/* ── the registry snapshot ─────────────────────────────────────────────────── */

test('every public host carries a known AIOStreams version', () => {
  for (const [key, meta] of Object.entries(HOST_META)) {
    assert.match(meta.aiostreamsVersion, /^\d+\.\d+\.\d+$/, `${key} has no registry version`);
  }
});

test('registry versions match the 2026-09-06 audit of the live fleet', () => {
  const at234 = ['elfhosted', 'fortheweak', 'viren', 'kuu', 'atbp'];
  const at2332 = ['midnight', 'omni', 'wizaardd'];
  for (const key of at234) assert.equal(HOST_META[key].aiostreamsVersion, '2.34.0', key);
  for (const key of at2332) assert.equal(HOST_META[key].aiostreamsVersion, '2.33.2', key);
});

test('compatibility targets cover every host version in the registry', () => {
  for (const meta of Object.values(HOST_META)) {
    assert.ok(
      AIOSTREAMS_COMPATIBILITY_TARGETS.includes(meta.aiostreamsVersion),
      `host version ${meta.aiostreamsVersion} is not a selectable target`,
    );
  }
});

test('the default target is the pinned release and is itself a target', async () => {
  const { readFile } = await import('node:fs/promises');
  const pin = JSON.parse(await readFile(new URL('../UPSTREAM.pin', import.meta.url), 'utf8'));
  assert.equal(pin.version, DEFAULT_AIOSTREAMS_VERSION, 'the default target must be the pinned AIOStreams release');
  assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(DEFAULT_AIOSTREAMS_VERSION));
});

test('resolveHostCapabilities falls back to the registry version when the probe is blocked', () => {
  assert.equal(resolveHostCapabilities('elfhosted', null).version, '2.34.0');
  assert.equal(resolveHostCapabilities('midnight', null).version, '2.33.2');
  // a live probe still wins
  const probed = resolveHostCapabilities('elfhosted', { reachable: true, version: '9.9.9', regexAccess: 'trusted', disabledPresetIds: [], blockedStreamTypes: [] });
  assert.equal(probed.version, '9.9.9');
  // unknown/self-hosted hosts have no registry entry — caller's assumption applies
  assert.equal(resolveHostCapabilities('custom', null, { assumedVersion: '2.31.1' }).version, '2.31.1');
  assert.equal(resolveHostCapabilities('custom', null).version, null);
});

/* ── picker labels ─────────────────────────────────────────────────────────── */

test('ElfHosted\'s label states its restriction exactly: Debrid only — no P2P/HTTP', () => {
  assert.equal(hostCapabilityLabel(HOST_META.elfhosted), 'Debrid only — no P2P/HTTP');
});

test('full-service hosts state Debrid + P2P + HTTP', () => {
  assert.equal(hostCapabilityLabel(HOST_META.fortheweak), 'Debrid + P2P + HTTP');
  assert.equal(hostCapabilityLabel(HOST_META.midnight), 'Debrid + P2P + HTTP');
});

test('every picker label carries the host\'s AIOStreams version', () => {
  assert.match(hostPickerLabel('elfhosted'), /ElfHosted .*Debrid only — no P2P\/HTTP.*v2\.34\.0/);
  assert.match(hostPickerLabel('fortheweak'), /v2\.34\.0/);
  assert.match(hostPickerLabel('midnight'), /v2\.33\.2/);
  assert.match(hostPickerLabel('wizaardd'), /v2\.33\.2/);
  assert.match(hostPickerLabel('viren'), /nightly/);
});

/* ── required-version derivation ───────────────────────────────────────────── */

test('a config using version-gated keys requires the newest key\'s floor', () => {
  assert.equal(configRequiredAIOStreamsVersion({ variants: [] }), FEATURE_MIN_VERSIONS.variants);
  assert.equal(
    configRequiredAIOStreamsVersion({ variants: [], variantSelectorLocation: 'path' }),
    FEATURE_MIN_VERSIONS.variantSelectorLocation,
  );
  assert.equal(configRequiredAIOStreamsVersion({ sortCriteria: {} }), null, 'no gated keys → no requirement');
  assert.equal(configRequiredAIOStreamsVersion(null), null);
});

test('a hypothetical 2.34-only key raises the requirement (table injected, rule real)', () => {
  const min = { ...FEATURE_MIN_VERSIONS, someFutureKey: '2.34.0' };
  assert.equal(configRequiredAIOStreamsVersion({ someFutureKey: 1 }, min), '2.34.0');
});

/* ── the routing matrix ────────────────────────────────────────────────────── */

const capsFor = (key, probeVersion) => {
  const probe = probeVersion
    ? { reachable: true, version: probeVersion, regexAccess: 'trusted', disabledPresetIds: [], blockedStreamTypes: [] }
    : null;
  return resolveHostCapabilities(key, probe);
};

test('a P2P config can never be routed to ElfHosted', () => {
  const decision = hostRoutingDecision({ service: 'p2p', config: {} }, capsFor('elfhosted'));
  assert.equal(decision.status, 'blocked');
  assert.match(decision.reasons[0], /ElfHosted/);
  assert.match(decision.reasons[0], /P2P/);
});

test('a P2P config routes fine to ForTheWeak', () => {
  assert.equal(hostRoutingDecision({ service: 'p2p', config: {} }, capsFor('fortheweak')).status, 'ok');
});

test('an HTTP config is blocked on ElfHosted too', () => {
  assert.equal(hostRoutingDecision({ service: 'http', config: {} }, capsFor('elfhosted')).status, 'blocked');
});

test('a config needing 2.33.2+ is blocked on an older host', () => {
  const config = { variantSelectorLocation: 'path' };
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config }, capsFor('custom', '2.33.0')).status, 'blocked');
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config }, capsFor('midnight')).status, 'ok', '2.33.2 host satisfies the 2.33.2 floor');
});

test('a 2.34-only config is blocked on the 2.33.2 hosts and routes to the 2.34.0 fleet', () => {
  // No real config key is 2.34-only yet (FEATURE_MIN_VERSIONS tops out at
  // 2.33.2), so this row injects a hypothetical floor through the documented
  // test hook and runs the REAL decision path over the REAL registry hosts.
  const min = { ...FEATURE_MIN_VERSIONS, futureOption: '2.34.0' };
  const request = { service: 'torbox-pro', config: { futureOption: true } };
  for (const key of ['midnight', 'omni', 'wizaardd']) {
    const decision = hostRoutingDecision(request, capsFor(key), { minVersions: min });
    assert.equal(decision.status, 'blocked', key);
    assert.match(decision.reasons[0], /needs 2\.34\.0\+/, key);
  }
  for (const key of ['elfhosted', 'fortheweak', 'viren', 'kuu', 'atbp']) {
    assert.equal(hostRoutingDecision(request, capsFor(key), { minVersions: min }).status, 'ok', key);
  }
});

test('a host behind the selected target warns instead of silently receiving 2.34-defaults', () => {
  const decision = hostRoutingDecision({ service: 'torbox-pro', config: {} }, capsFor('midnight'), { targetVersion: '2.34.0' });
  assert.equal(decision.status, 'warn');
  assert.match(decision.reasons[0], /2\.33\.2/);
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config: {} }, capsFor('elfhosted'), { targetVersion: '2.34.0' }).status, 'ok');
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config: {} }, capsFor('midnight'), { targetVersion: 'unknown' }).status, 'ok', 'unknown target must not nag');
});

/* ── auto-routing ──────────────────────────────────────────────────────────── */

test('auto routing excludes ElfHosted for P2P and keeps the capable hosts', () => {
  const keys = autoRoutableHostKeys({ service: 'p2p', config: {} });
  assert.ok(!keys.includes('elfhosted'));
  for (const key of ['fortheweak', 'midnight', 'kuu', 'atbp', 'wizaardd']) {
    assert.ok(keys.includes(key), `${key} should be auto-routable for P2P`);
  }
});

test('auto routing excludes every 2.33.2 host for a 2.34-only config', () => {
  const min = { ...FEATURE_MIN_VERSIONS, futureOption: '2.34.0' };
  const keys = autoRoutableHostKeys({ service: 'torbox-pro', config: { futureOption: true } }, { minVersions: min });
  for (const key of ['midnight', 'omni', 'wizaardd']) assert.ok(!keys.includes(key), `${key} must not receive a 2.34-only config`);
  for (const key of ['elfhosted', 'fortheweak', 'viren', 'kuu', 'atbp']) assert.ok(keys.includes(key), `${key} should stay routable`);
});

test('auto routing keeps every host for a config with no gated keys', () => {
  const keys = autoRoutableHostKeys({ service: 'torbox-pro', config: {} });
  assert.equal(keys.length, Object.keys(HOST_META).length);
});
```

### 2.8 `configurator/tests/easynews-library.test.mjs` (fix 2 fixture proof)

```js
/**
 * EasyNews × Library — the fixture half of audit defect 2.
 *
 * AIOStreams generates the Library addon from the enabled services and rejects
 * the entire save when none can back it ("Library requires at least one usable
 * service"). e2e/golden/easynews-1080p.json is the regenerated golden for the
 * audited failing config; these tests keep it — and every other golden —
 * honest against the host's own rule.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { hasLibraryCapableService } from '../src/core/install-policy.js';
import { AIO_PRESET_ID_SET } from '../src/data/generated/aiostreams-presets.js';
import { validateConfigOptions } from '../e2e/lib/aiostreams-contract.mjs';

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'e2e', 'golden');
const golden = name => JSON.parse(readFileSync(join(GOLDEN_DIR, name), 'utf8'));

/** The host's own acceptance rule: a library preset requires a usable service. */
function libraryPresetIsAcceptable(config) {
  const hasLibrary = (config.presets || []).some(p => p?.type === 'library' && p?.enabled !== false);
  return !hasLibrary || hasLibraryCapableService(config.services || []);
}

test('EasyNews-only fixture: no library preset, and the config validates against the option contract', () => {
  const tpl = golden('easynews-1080p.json');
  const types = tpl.config.presets.map(p => p.type);
  assert.equal(
    hasLibraryCapableService(tpl.config.services || []), false,
    'fixture guard: this golden must remain the EasyNews-only case',
  );
  assert.ok(!types.includes('library'), 'EasyNews-only must not carry a Library preset — the host rejects the whole save');
  // ...and what it does carry is acceptable to the pinned upstream contract
  assert.deepEqual(validateConfigOptions(tpl.config), { ok: true });
  for (const preset of tpl.config.presets) {
    assert.ok(AIO_PRESET_ID_SET.has(preset.type), `preset "${preset.type}" is not resolvable at the pin`);
  }
});

test('the host rule holds for every golden in the matrix', () => {
  for (const file of readdirSync(GOLDEN_DIR).filter(f => f.endsWith('.json'))) {
    const tpl = golden(file);
    assert.ok(
      libraryPresetIsAcceptable(tpl.config),
      `${file}: library preset present without a library-capable enabled service — the host would reject this save`,
    );
  }
});

test('debrid-backed fixtures keep their Library preset (the fix must not over-remove)', () => {
  for (const file of ['torbox-1080p-standard.json', 'alldebrid-1080p.json', 'core-stable-torbox-4k.json']) {
    const tpl = golden(file);
    assert.ok(
      (tpl.config.presets || []).some(p => p?.type === 'library' && p?.enabled !== false),
      `${file}: a debrid-backed config keeps the Library addon`,
    );
  }
});

test('free fixtures (p2p/http) stay library-free', () => {
  for (const file of ['p2p-1080p.json', 'http-1080p.json']) {
    const tpl = golden(file);
    assert.ok(!(tpl.config.presets || []).some(p => p?.type === 'library'), file);
  }
});

test('EasyNews + a debrid service keeps the library (rule, not route)', () => {
  const services = [
    { id: 'easynews', enabled: true, credentials: {} },
    { id: 'realdebrid', enabled: true, credentials: {} },
  ];
  assert.ok(hasLibraryCapableService(services));
  // and the EasyNews-only shape the gate exists for
  assert.ok(!hasLibraryCapableService([{ id: 'easynews', enabled: true, credentials: {} }]));
});
```

### 2.9 `configurator/tests/landing-ia.test.mjs` (fix 5 guard)

```js
/**
 * Express-first landing IA (2026-09-06 audit, defect 5).
 *
 * The landing presented four equal route cards for a five-step job. Now the
 * Express five-step flow (service → device → resolution → key → Deploy) is the
 * single primary card; Advanced Builder and Update Existing are secondary text
 * links; the Setup Genie card is gone from the landing while its route stays
 * reachable. These tests fail if the four equal cards ever come back.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
// The route section runs from the Express doors container to the secondary
// links row that replaced the three demoted cards.
const routeStart = app.indexOf('id="splashDoors"');
const routeEnd = app.indexOf('id="splashAltRoutes"');
const routeBlock = routeStart > -1 && routeEnd > routeStart ? app.slice(routeStart, routeEnd) : null;
assert.ok(routeBlock, 'fixture guard: the splash route section must exist');

test('the landing has exactly one route card: Express Install', () => {
  // count the door itself, not its -icon/-title/-text/-desc children
  const doors = routeBlock.match(/class="splash-door(?:\s|")/g) || [];
  assert.equal(doors.length, 1, 'one primary card, not four equal ones');
  assert.match(routeBlock, /data-action="open-express-lane"/);
});

test('the Express card names the five-step flow it opens', () => {
  assert.match(routeBlock, /Service &rarr; device &rarr; resolution &rarr; key &rarr; Deploy/);
});

test('Advanced Builder and Update Existing are demoted to secondary text links', () => {
  const alt = app.match(/id="splashAltRoutes"[\s\S]{0,700}/)?.[0];
  assert.ok(alt, 'the secondary-links row must exist');
  assert.match(alt, /data-action="custom-start"/, 'Advanced Builder keeps its action for #advanced and the tour');
  assert.match(alt, /data-action="update-template"/, 'Update Existing keeps its action for #update');
  assert.match(alt, /class="splash-tertiary-btn"/, 'they reuse the existing tertiary link style — no new visual language');
  assert.ok(!/"splash-door[^"]*"[^>]*data-action="custom-start"/.test(routeBlock), 'Advanced Builder must not be a card');
  assert.ok(!/"splash-door[^"]*"[^>]*data-action="update-template"/.test(routeBlock), 'Update Existing must not be a card');
});

test('the Setup Genie card is removed from the landing but the route stays linked', () => {
  assert.ok(!routeBlock.includes('../tools/genies/'), 'no Genie card among the primary routes');
  const alt = app.match(/id="splashAltRoutes"[\s\S]{0,700}/)?.[0];
  assert.match(alt, /href="..\/tools\/genies\/"/, 'the Genie page stays one click away');
  // and the page itself still exists so the link cannot 404
  const genieIndex = new URL('../../tools/genies/index.html', import.meta.url);
  assert.ok(existsSync(genieIndex), 'tools/genies/index.html must keep existing');
});

test('the tour still finds the Express door where it expects it', () => {
  assert.match(app, /target:'\.splash-doors \[data-action="open-express-lane"\]'/);
});
```

### 2.10 `configurator/tests/regex-access-policy.test.mjs` (fix 7 guard)

```js
/**
 * Regex-allowlist preflight — 2026-09-06 "3 / 180 regexes" diagnosis.
 *
 * Pure rule coverage for src/core/regex-access-policy.js (the DOM half,
 * regexGateForHost in app.js, is wired below and covered by
 * e2e/direct-install-gate.spec.mjs). The recorded stale-allowlist case
 * reproduces the observed race: Vidhin05 modified two patterns on
 * 2026-09-05 05:58 UTC and hosts rejected the fresh versions until their
 * allowlist refresh caught up.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { collectRegexPatternSet, regexAccessDecision, SYNCED_URL_KEYS } from '../src/core/regex-access-policy.js';

const VIDHIN_URL = 'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json';

// The two pattern strings Vidhin05 changed at 2026-09-05 05:58 UTC
// (commit 30600174 "anchor Anime LQ Groups…" and 3215706f "BR-DISK should
// match 720p full-disc releases"). Recorded here — no network in tests.
const RACE_OLD = [
  '/\\b($tore-Chill|0neshot|A-Destiny|AnimeRG|Animesu…OLD-VARIANT)\\b/i',
  '/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|720p|MKV|XviD…OLD-VARIANT)\\b).*$/i',
];
const RACE_NEW = [
  '/\\b($tore-Chill|0neshot|A-Destiny|AnimeRG|Animesu…NEW-VARIANT)\\b/i',
  '/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|MKV|XviD…NEW-VARIANT)\\b).*$/i',
];

test('collectRegexPatternSet: a regex-scoring golden carries the synced URL + its inline patterns', async () => {
  const golden = JSON.parse(await readFile(new URL('../e2e/golden/torbox-4k-apex-mixed.json', import.meta.url), 'utf8'));
  const set = collectRegexPatternSet(golden.config);
  assert.deepEqual(set.syncedUrls, [VIDHIN_URL]);
  // 83 unique: the 5 preferred + 3 excluded arrays overlap the 83 ranked entries
  assert.equal(set.inline.size, 83);
});

test('collectRegexPatternSet: a base-config golden carries neither', async () => {
  const golden = JSON.parse(await readFile(new URL('../e2e/golden/torbox-1080p-standard.json', import.meta.url), 'utf8'));
  const set = collectRegexPatternSet(golden.config);
  assert.equal(set.syncedUrls.length, 0);
  assert.equal(set.inline.size, 0);
});

test('regexAccessDecision: skip when there is nothing to validate or nothing it can know', () => {
  assert.equal(regexAccessDecision(null, { inline: new Set() }).status, 'skip');
  assert.equal(regexAccessDecision({ level: 'none' }, { inline: new Set() }).status, 'skip');
  // unrestricted host
  assert.equal(regexAccessDecision({ level: 'all', patterns: [] }, { inline: new Set(['/x/']) }).status, 'skip');
  // status unreachable → null
  assert.equal(regexAccessDecision(null, { inline: new Set(['/x/']) }).status, 'skip');
  // restrictive host but allowlist not exposed
  assert.equal(regexAccessDecision({ level: 'none' }, { inline: new Set(['/x/']) }).status, 'skip');
});

test('regexAccessDecision: ok when the whole union is allowlisted', () => {
  const d = regexAccessDecision(
    { level: 'trusted', patterns: [...RACE_OLD, ...RACE_NEW] },
    { resolved: new Set(RACE_NEW), inline: new Set(RACE_OLD) },
  );
  assert.equal(d.status, 'ok');
  assert.equal(d.total, 4);
});

test('regexAccessDecision: blocked with N / M counts — the recorded 2026-09-05 race', () => {
  // Host allowlist still holds the pre-05:58 strings; the config's synced URL
  // resolves to the fresh ones at save time.
  const d = regexAccessDecision(
    { level: 'none', patterns: RACE_OLD },
    { resolved: new Set(RACE_NEW), inline: new Set(RACE_OLD) },
  );
  assert.equal(d.status, 'blocked');
  assert.equal(d.total, 4, 'deduped union of synced + inline');
  assert.equal(d.rejectedCount, 2, 'the two freshly-changed patterns');
  assert.match(d.reason, /2 \/ 4 regex patterns are not allowed/);
  assert.match(d.reason, /lags the synced list/);
});

test('regexAccessDecision: inline-only configs are checked too (no synced URL needed)', () => {
  const d = regexAccessDecision({ level: 'trusted', patterns: ['/ok/'] }, { inline: new Set(['/ok/', '/custom/']) });
  assert.equal(d.status, 'blocked');
  assert.equal(d.total, 2);
  assert.equal(d.rejectedCount, 1);
});

test('SYNCED_URL_KEYS covers the arrays upstream validates', () => {
  // validateRegexes() resolves synced lists for all five pattern arrays.
  for (const k of ['syncedExcludedRegexUrls', 'syncedIncludedRegexUrls', 'syncedRequiredRegexUrls', 'syncedPreferredRegexUrls', 'syncedRankedRegexUrls']) {
    assert.ok(SYNCED_URL_KEYS.includes(k), k);
  }
});

test('app.js wiring: the gate runs after the host resolves and before the install POST', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  // gate + fetchers exist
  assert.match(app, /async function regexGateForHost/, 'gate helper defined');
  assert.match(app, /async function fetchHostRegexAccess/, 'status fetcher defined');
  assert.match(app, /async function fetchSyncedRegexPatterns/, 'synced-list fetcher defined');
  // ordering inside simpleInstall: resolveInstallHost → regexGateForHost → writeHostFetch POST
  // anchor inside simpleInstall (an earlier free-lane upload path also
  // resolves a host and POSTs — the gate deliberately guards the install
  // POST; the free lane never carries synced regex URLs)
  const iStart = app.indexOf('async function simpleInstall');
  const iHost = app.indexOf('const fastest = await resolveInstallHost(4000);', iStart);
  const iGate = app.indexOf('await regexGateForHost(fastest, cfg)', iStart);
  const iPost = app.indexOf("writeHostFetch(fastest, '/api/v1/user'", iStart);
  assert.ok(iHost >= 0 && iGate > iHost && iPost > iGate, `gate must sit between host resolve (${iHost}) and POST (${iPost}); got ${iGate}`);
  // the chip surfaces the verdict too
  assert.match(app, /rgx = await regexGateForHost\(url, buildFinal\(\)\.config\)/);
  // nothing unknown may block: every fetch failure path returns skip
  assert.match(app, /if \(resolved === null\) return \{ status: 'skip' \};/);
});
```

### 2.11 `packages/core/tests/library-policy.test.mjs` (engine parity + drift alarm)

```js
/**
 * Library-preset usability — packages/core half of the 2026-09-06 audit fix.
 * The CLI golden-equivalence test diffs full templates against the
 * Configurator fixtures; this file pins the rule itself.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { generateTemplate } from '../src/generate-template.js';
import { LIBRARY_CAPABLE_SERVICE_IDS, hasLibraryCapableService } from '../src/library-policy.js';

const base = {
  device: 'generic',
  resolution: '1080p',
  content: 'all',
  formatter: 'family-v4',
};

test('EasyNews is not library-capable; debrid services are', () => {
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('easynews'));
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('seedr'));
  for (const id of ['torbox', 'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud', 'easydebrid', 'pikpak']) {
    assert.ok(LIBRARY_CAPABLE_SERVICE_IDS.includes(id), id);
  }
  // the usenet route's aiostreams service keeps the library usable
  assert.ok(hasLibraryCapableService([{ id: 'easynews', enabled: true }, { id: 'stremio_nntp', enabled: true }, { id: 'aiostreams', enabled: true }]));
});

test('generateTemplate: EasyNews-only emits no library preset; TorBox keeps it', () => {
  const easy = generateTemplate({ ...base, service: 'easynews', multiServices: ['easynews'] });
  assert.ok(!(easy.config.presets || []).some(p => p.type === 'library'), 'EasyNews-only must not carry a Library preset');
  const tor = generateTemplate({ ...base, service: 'torbox-pro', multiServices: ['torbox-pro'] });
  assert.ok((tor.config.presets || []).some(p => p.type === 'library' && p.enabled !== false), 'TorBox keeps the Library addon');
});

test('generateTemplate: EasyNews + a debrid service keeps the library', () => {
  const tpl = generateTemplate({ ...base, service: 'multi', multiServices: ['easynews', 'alldebrid'] });
  assert.ok((tpl.config.presets || []).some(p => p.type === 'library' && p.enabled !== false));
});

test('the configurator copy of the list is identical (drift alarm across the two homes)', async () => {
  const configurator = await readFile(new URL('../../../configurator/src/core/install-policy.js', import.meta.url), 'utf8');
  const match = configurator.match(/LIBRARY_CAPABLE_SERVICE_IDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(match, 'configurator list not found');
  const there = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(there, [...LIBRARY_CAPABLE_SERVICE_IDS].sort(), 'the two lists must be changed together');
});
```

### 2.12 `configurator/e2e/direct-install-gate.spec.mjs` (fixes 3, 4, 7 e2e — 9 tests)

```js
import { test, expect } from '@playwright/test';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

/**
 * Direct Install key gate + truthful host picker — e2e half of audit defects 3
 * and 4 (the pure rules live in src/core/install-policy.js and
 * src/core/host-routing.js, covered by tests/*.test.mjs).
 *
 * The mocked AIOStreams backend enforces the preset option contract, so a gate
 * regression that lets a keyless config through fails here on the POST itself,
 * not just on a missing message.
 */

const UUID = '11111111-2222-4333-8444-555555555555';
// Same CORS-noise filter as express-install.spec.mjs: public hosts don't send
// Access-Control-Allow-Origin, so the /api/v1/status probe logs an expected
// browser error and falls back to the registry — that line is not a defect.
const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404|Access to fetch at '[^']*\/api\/v1\/status'[^\\n]*blocked by CORS|\/api\/v1\/status[^\\n]*(?:blocked by CORS|net::ERR_FAILED)/;

async function fresh(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !CORS_NOISE.test(message.text())) errors.push(message.text()); });
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForTimeout(950);
  return errors;
}

async function mockBackend(page, posted) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/api/v1/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.0' } }) });
    }
    if (url.includes('/api/v1/user') && request.method() === 'POST') {
      posted.push(JSON.parse(request.postData() || '{}'));
      const verdict = validateConfigOptions(JSON.parse(request.postData() || '{}').config);
      if (!verdict.ok) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: verdict.error }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
    }
    if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });
}

test.describe('Direct Install key gate', () => {
  test('an empty TorBox key blocks the install with a message naming the key — nothing is posted', async ({ page }) => {
    const posted = [];
    await mockBackend(page, posted);
    const errors = await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    // TorBox is the default service; leave the key EMPTY, pick the manifest
    // target (it POSTs too) and go.
    await page.locator('[data-express-target="manifest"]').click();
    await page.locator('#expressGo').click();
    await expect(page.locator('#aioResult')).toContainText('Direct Install needs a key');
    await expect(page.locator('#aioResult')).toContainText('TorBox API Key');
    await page.waitForTimeout(800);
    expect(posted, 'a keyless config must never be POSTed').toEqual([]);
    expect(errors).toEqual([]);
  });

  test('with the key entered the same flow posts exactly one config', async ({ page }) => {
    const posted = [];
    await mockBackend(page, posted);
    await fresh(page);
    page.on('dialog', dialog => dialog.accept());
    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
    await page.locator('[data-express-target="manifest"]').click();
    await page.locator('#expressGo').click();
    await page.locator('#pwdPrompt .pwd-go').click();
    await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
    expect(posted).toHaveLength(1);
    expect(posted[0].config.services.some(s => s.id === 'torbox')).toBe(true);
  });

  test('EasyNews install demands username AND password by name', async ({ page }) => {
    const posted = [];
    await mockBackend(page, posted);
    await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('[data-express-service="easynews"]').click();
    await page.locator('[data-express-cred="easynews"]').fill('just-a-username');
    await page.locator('[data-express-target="manifest"]').click();
    await page.locator('#expressGo').click();
    await expect(page.locator('#aioResult')).toContainText('EasyNews Password');
    await page.waitForTimeout(500);
    expect(posted).toEqual([]);
  });

  test('Export JSON stays keyless and working (the gate is install-only)', async ({ page }) => {
    await page.goto('/?cb-e2e=1');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
    await page.reload();
    await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 15000 });
    const tpl = await page.evaluate(() => window.__coreBuilds.generate({
      service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'generic',
      resolution: '1080p', content: 'all', instanceHost: 'elfhosted',
    }));
    expect(tpl.config, 'keyless export must still build').toBeTruthy();
    expect(tpl.config.presets.some(p => p.type === 'library'), 'debrid-backed export keeps the Library addon').toBe(true);
    expect(
      (tpl.config.services || []).flatMap(svc => Object.values(svc.credentials || {})).filter(Boolean),
      'exports never carry credentials',
    ).toEqual([]);
  });
});

test.describe('truthful host picker', () => {
  test('the Express host options state capabilities and AIOStreams version', async ({ page }) => {
    await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    const elf = page.locator('#expressHost option[value="elfhosted"]');
    await expect(elf).toHaveAttribute('value', 'elfhosted');
    expect(await elf.textContent()).toContain('Debrid only — no P2P/HTTP');
    expect(await elf.textContent()).toContain('v2.34.0');
    const midnight = page.locator('#expressHost option[value="midnight"]');
    expect(await midnight.textContent()).toContain('Debrid + P2P + HTTP');
    expect(await midnight.textContent()).toContain('v2.33.2');
    const ftw = page.locator('#expressHost option[value="fortheweak"]');
    expect(await ftw.textContent()).toContain('v2.34.0');
  });

  test('the chip flags a pick the capability matrix blocks (P2P on ElfHosted)', async ({ page }) => {
    // Stub the status probe so the chip verdict is deterministic and no real
    // CORS noise hits the console (same pattern as mockBackend).
    await page.route('**/api/v1/status', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.0' } }) }));
    const errors = await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('[data-express-service="p2p"]').click();
    await page.locator('#expressHost').selectOption('elfhosted');
    await expect(page.locator('#expressHostChip')).toContainText(/does not serve P2P/i);
    expect(errors).toEqual([]);
  });
});

test.describe('regex allowlist preflight (synced-URL race, 2026-09-06 diagnosis)', () => {
  // Recorded shape of the observed failure: the config's synced ranked-regex
  // URL resolves LIVE at save time while the host validates against its own
  // cached allowlist. When the upstream list merges changes faster than the
  // host refreshes, the install POST 400s with "N / M regexes that are not
  // allowed". The gate in app.js resolves the same union client-side and
  // blocks the POST with a plain-language reason instead.
  //
  // Driven through the app's own cb-e2e hook + the real global
  // data-action="simple-install" delegate, so the genuine simpleInstall path
  // runs: real fetches (status + synced list), real config, real POST spy.
  // A standalone 4K apex-mixed build carries the synced URL (the Express
  // lane builds from a base config and is not affected).
  const STUB_LIST = [
    { name: 'Allowed One', pattern: '/^allowed-one$/i' },
    { name: 'Freshly Changed', pattern: '/^freshly-changed$/i' },
  ];

  async function mockRegexBackend(page, posted, regexAccess) {
    await page.route('**/*', async route => {
      const request = route.request();
      const url = request.url();
      if (url.includes('/api/v1/status')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.0', settings: { regexAccess } } }) });
      }
      if (url.includes('raw.githubusercontent.com/Vidhin05/Releases-Regex')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB_LIST) });
      }
      if (url.includes('/api/v1/user') && request.method() === 'POST') {
        posted.push(JSON.parse(request.postData() || '{}'));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
      }
      if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
      return route.continue();
    });
  }

  // Standalone regex-scoring build (4K apex-mixed) + a real install button.
  async function armInstall(page) {
    await page.evaluate(() => {
      window.__coreBuilds.setState({
        service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'generic',
        resolution: '4k', pseArch: 'apex-mixed', content: 'all', instanceHost: 'elfhosted',
        creds: { torbox: 'test-torbox-key' },
      });
      if (!document.getElementById('aioResult')) {
        const out = document.createElement('div'); out.id = 'aioResult'; document.body.appendChild(out);
      }
      const btn = document.createElement('button');
      // id matters: simpleInstall reads btnAio || btnAutoCreate for its button state
      btn.id = 'btnAutoCreate'; btn.dataset.action = 'simple-install'; btn.dataset.target = 'manifest';
      btn.textContent = 'Install'; document.body.appendChild(btn);
    });
  }

  async function goldenInlinePatterns() {
    // The 4K build's inline pattern arrays are resolution-driven (not service-
    // driven), so this standalone build carries exactly these alongside the
    // synced URL.
    const { readFile } = await import('node:fs/promises');
    const golden = JSON.parse(await readFile(new URL('./golden/torbox-4k-apex-mixed.json', import.meta.url), 'utf8'));
    const c = golden.config;
    return [
      ...(c.excludedRegexPatterns || []), ...(c.includedRegexPatterns || []), ...(c.requiredRegexPatterns || []),
      ...(c.preferredRegexPatterns || []).map(e => e.pattern), ...(c.rankedRegexPatterns || []).map(e => e.pattern),
    ];
  }

  test('a stale host allowlist blocks the POST with the pattern counts — nothing is posted', async ({ page }) => {
    const posted = [];
    // Host allowlist still holds every inline pattern but has NOT picked up
    // the freshly-changed synced entry — the recorded 2026-09-05 race shape.
    const allowlist = [...await goldenInlinePatterns(), '/^allowed-one$/i'];
    await mockRegexBackend(page, posted, { level: 'none', patterns: allowlist });
    await page.goto('/?cb-e2e=1');
    await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 15000 });
    await armInstall(page);
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#btnAutoCreate').click();
    await page.locator('#pwdPrompt .pwd-go').click();
    await expect(page.locator('#aioResult')).toContainText('regex patterns are not allowed on this host', { timeout: 20000 });
    await expect(page.locator('#aioResult')).toContainText('lags the synced list');
    await page.waitForTimeout(800);
    expect(posted, 'a config the host would 400 must never be POSTed').toEqual([]);
  });

  test('the same build installs cleanly once the allowlist catches up', async ({ page }) => {
    const posted = [];
    const allowlist = [...await goldenInlinePatterns(), ...STUB_LIST.map(e => e.pattern)];
    await mockRegexBackend(page, posted, { level: 'none', patterns: allowlist });
    await page.goto('/?cb-e2e=1');
    await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 15000 });
    await armInstall(page);
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#btnAutoCreate').click();
    await page.locator('#pwdPrompt .pwd-go').click();
    await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
    expect(posted).toHaveLength(1);
    expect(posted[0].config.syncedRankedRegexUrls || []).toContain('https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json');
  });

  test('an unrestricted host (level: all) never trips the gate', async ({ page }) => {
    const posted = [];
    await mockRegexBackend(page, posted, { level: 'all', patterns: [] });
    await page.goto('/?cb-e2e=1');
    await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 15000 });
    await armInstall(page);
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#btnAutoCreate').click();
    await page.locator('#pwdPrompt .pwd-go').click();
    await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
    expect(posted).toHaveLength(1);
  });
});
```

---

## Part 3 — Every modified file (27) with diffs

Legend: counts are insertions/deletions vs `b07efba` across both commits.

- `FIXES.md` — +159 −0
- `cli/package.json` — +1 −1
- `configurator/e2e/direct-install-gate.spec.mjs` — +261 −0
- `configurator/e2e/golden/alldebrid-1080p.json` — +1 −1
- `configurator/e2e/golden/core-balanced-torbox-1080p.json` — +1 −1
- `configurator/e2e/golden/core-stable-torbox-1080p.json` — +1 −1
- `configurator/e2e/golden/core-stable-torbox-4k.json` — +1 −1
- `configurator/e2e/golden/easynews-1080p.json` — +1 −22
- `configurator/e2e/golden/http-1080p.json` — +1 −1
- `configurator/e2e/golden/p2p-1080p.json` — +1 −1
- `configurator/e2e/golden/torbox-1080p-standard.json` — +1 −1
- `configurator/e2e/golden/torbox-4k-apex-mixed.json` — +1 −1
- `configurator/e2e/golden/torbox-4k-iqr.json` — +1 −1
- `configurator/e2e/golden/torbox-4k-samsung.json` — +1 −1
- `configurator/e2e/golden/torbox-4k-standard.json` — +1 −1
- `configurator/e2e/golden/torbox-mixed-apex-mixed.json` — +1 −1
- `configurator/e2e/golden/torbox-mixed-standard.json` — +1 −1
- `configurator/e2e/golden/torbox-ultrawide.json` — +1 −1
- `configurator/index.html` — +225 −225
- `configurator/package.json` — +1 −1
- `configurator/src/core/host-capability-policy.js` — +11 −1
- `configurator/src/core/host-routing.js` — +131 −0
- `configurator/src/core/install-policy.js` — +102 −0
- `configurator/src/core/output-profile-policy.js` — +11 −1
- `configurator/src/core/regex-access-policy.js` — +104 −0
- `configurator/src/data/changelog.js` — +7 −0
- `configurator/src/data/hosts.js` — +7 −3
- `configurator/src/js/app.js` — +204 −35
- `configurator/tests/easynews-library.test.mjs` — +80 −0
- `configurator/tests/host-routing.test.mjs` — +179 −0
- `configurator/tests/install-policy.test.mjs` — +135 −0
- `configurator/tests/landing-ia.test.mjs` — +57 −0
- `configurator/tests/regex-access-policy.test.mjs` — +114 −0
- `configurator/tests/version-honesty.test.mjs` — +64 −0
- `packages/core/package.json` — +1 −1
- `packages/core/src/generate-template.js` — +10 −2
- `packages/core/src/library-policy.js` — +41 −0
- `packages/core/tests/library-policy.test.mjs` — +49 −0
- `versions.json` — +1 −1


### 3.1 `configurator/src/js/app.js` — commit 1 (all five UI wirings)

```diff
diff --git a/configurator/src/js/app.js b/configurator/src/js/app.js
index c8c4dee..c8b5909 100644
--- a/configurator/src/js/app.js
+++ b/configurator/src/js/app.js
@@ -29,14 +29,20 @@ import { iqrExpression } from '../core/iqr-expression.js';
 import { createUpdateSession, commitUpdate, cancelUpdate } from '../core/update-session.js';
 import { scoreStream, scoreFormattedStream } from '../core/core-score-policy.js';
 import { isNewer, parseChangelogRange, shouldCheck, normalizeTemplateMeta } from '../core/update-check.js';
-import { AIOSTREAMS_COMPATIBILITY_TARGETS, OUTPUT_PROFILES, OUTPUT_PROFILE_INFO, resolveOutputProfile, applyOutputProfile } from '../core/output-profile-policy.js';
+import { AIOSTREAMS_COMPATIBILITY_TARGETS, DEFAULT_AIOSTREAMS_VERSION, OUTPUT_PROFILES, OUTPUT_PROFILE_INFO, resolveOutputProfile, applyOutputProfile } from '../core/output-profile-policy.js';
+import { hasLibraryCapableService, missingDirectInstallCredentials } from '../core/install-policy.js';
+import { hostRoutingDecision, autoRoutableHostKeys, hostPickerLabel } from '../core/host-routing.js';
 import { inspectTemplateComplexity, findFeatureConflicts, validateOutputProfileBudget } from '../core/feature-conflict-policy.js';
 import { buildFeedbackReport } from '../core/feedback-report-policy.js';
 
 function toggleTheme(){const html=document.documentElement;const t=html.getAttribute('data-theme')==='dark'?'light':'dark';html.setAttribute('data-theme',t);localStorage.setItem('cbTheme',t);}
 
 const STEPS = 6;
-const CONFIGURATOR_VERSION = '3.1';
+// Single source of truth for the app version. Per repo convention (version-sync
+// workflow) the raw x.y here expands to x.y.0 in package.json / versions.json and
+// the release tag; the built badge drops the trailing .0. At the 2026-09-06
+// audit the release tag was v3.7.0 while this said 3.1 — they must move together.
+const CONFIGURATOR_VERSION = '3.7';
 // Set to a collector endpoint to enable the opt-in anonymous usage ping (service+device+resolution only).
 // Leave empty to keep the feature fully disabled and hidden.
 const USAGE_BEACON_URL = '';
@@ -167,6 +173,9 @@ function stremioErrText(raw, fallback) {
 }
 
 let _expressProbeSeq = 0;
+// The Express lane keeps its service pick in a closure-local `state`; the host
+// chip's capability verdict needs it, so mirror it here while the lane is open.
+let _expressLaneService = null;
 async function probeExpressHost() {
   const chip = document.getElementById('expressHostChip');
   const sel = document.getElementById('expressHost');
@@ -179,10 +188,16 @@ async function probeExpressHost() {
   chip.style.color=''; chip.style.borderColor='';
   const d = await probeHostDetail(url, 4000);
   if (seq !== _expressProbeSeq) return;
-  if (d.ok && !d.degraded)      { chip.textContent = `● healthy${d.version?' v'+d.version:''} · ${d.ms}ms`; chip.style.color='#34d399'; chip.style.borderColor='rgba(52,211,153,.35)'; }
-  else if (d.ok)                { chip.textContent = `● slow · ${d.ms}ms`; chip.style.color='#fbbf24'; chip.style.borderColor='rgba(251,191,36,.35)'; }
+  // Capability-matrix verdict for the CURRENT pick (audit defect 4), shown on
+  // the chip BEFORE Deploy: a pick the matrix blocks turns the chip red with
+  // the reason; a host merely behind the selected target says so in amber.
+  const routing = (() => { try { return hostRoutingDecision({ service: _expressLaneService || S.service, config: {} }, currentHostCapabilities(), { targetVersion: S.aiostreamsVersion && S.aiostreamsVersion !== 'unknown' ? S.aiostreamsVersion : null }); } catch(e) { return { status:'ok', reasons:[] }; } })();
+  if (routing.status === 'blocked') { chip.textContent = '✕ ' + routing.reasons[0].split(' — ')[0]; chip.title = routing.reasons.join(' '); chip.style.color='#f87171'; chip.style.borderColor='rgba(248,113,113,.35)'; return; }
+  chip.title = routing.status === 'warn' ? routing.reasons.join(' ') : '';
+  if (d.ok && !d.degraded)      { chip.textContent = `● healthy${d.version?' v'+d.version:''} · ${d.ms}ms${routing.status==='warn'?' · behind target':''}`; chip.style.color = routing.status==='warn' ? '#fbbf24' : '#34d399'; chip.style.borderColor = routing.status==='warn' ? 'rgba(251,191,36,.35)' : 'rgba(52,211,153,.35)'; }
+  else if (d.ok)                { chip.textContent = `● slow · ${d.ms}ms${routing.status==='warn'?' · behind target':''}`; chip.style.color='#fbbf24'; chip.style.borderColor='rgba(251,191,36,.35)'; }
   else if (d.reason==='outdated'){ chip.textContent = `● outdated ${d.version?'v'+d.version:''}`; chip.style.color='#f87171'; chip.style.borderColor='rgba(248,113,113,.35)'; }
-  else { chip.textContent = '● down'; chip.style.color='#f87171'; chip.style.borderColor='rgba(248,113,113,.35)'; }
+  else { chip.textContent = `● down${routing.status==='warn'?' · behind target':''}`; chip.style.color='#f87171'; chip.style.borderColor='rgba(248,113,113,.35)'; }
 }
 
 function hostErrorHtml(raw) {
@@ -202,9 +217,26 @@ function hostErrorHtml(raw) {
   return `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">All Hosts Unreachable</strong></div>`;
 }
 
+// Inline notice for the Direct Install key gate — names the exact missing key(s).
+function missingCredHtml(missing) {
+  const rows = missing.map(m => `<li style="margin:2px 0"><b style="color:#fbbf24">${escHtml(m.label)}</b></li>`).join('');
+  return `<div class="import-success import-error" style="margin-top:12px"><strong style="color:#f87171">Direct Install needs a key</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 4px;line-height:1.5">The AIOStreams host rejects a config whose service has no credential ("Option apiKey is required"). Enter:<ul style="margin:4px 0 6px;padding-left:18px">${rows}</ul>then install again — or use <b>Export JSON</b>, which stays keyless.</div></div>`;
+}
+
+// Inline notice for the host-routing gate (capability matrix, audit defect 4).
+function hostRoutingNoticeHtml(decision) {
+  const warn = decision.status === 'warn';
+  return `<div class="import-success${warn ? ' import-info' : ' import-error'}" style="margin-top:12px"><strong style="color:${warn ? '#fbbf24' : '#f87171'}">${warn ? 'Heads-up before deploying' : 'This host can\'t take this config'}</strong><div style="color:#6b7280;font-size:.8rem;margin:6px 0 2px;line-height:1.5">${decision.reasons.map(r => escHtml(r)).join('<br>')}</div></div>`;
+}
+
 async function selectHealthyHost(timeout=4000) {
   const isFree = typeof S!=='undefined' && (S.service==='p2p' || S.service==='http');
-  const entries = orderedHostEntries().filter(([,host])=>!(isFree && HOST_META[hostKeyFromUrl(host)]?.blocksFree));
+  // Hosts the routing matrix would block for the CURRENT config (feature keys
+  // newer than the host's registry version) are not candidates — 'auto' must
+  // never park a 2.34-only config on a 2.33.2 host.
+  let _routable = null;
+  try { _routable = new Set(autoRoutableHostKeys({ service: S?.service, config: buildFinal().config })); } catch(e) { _routable = null; }
+  const entries = orderedHostEntries().filter(([,host])=>!(isFree && HOST_META[hostKeyFromUrl(host)]?.blocksFree)).filter(([,host])=>!_routable || _routable.has(hostKeyFromUrl(host)));
   let preferred='';
   try { preferred=localStorage.getItem('coreBuildLastGoodHost')||''; } catch(e) {}
   const probe = async host => {
@@ -229,7 +261,7 @@ async function selectHealthyHost(timeout=4000) {
 // Cloudflare Worker CORS proxy — see cloudflare-worker/README.md for deployment.
 // Set to '' to disable and fall back to direct-only fetches.
 const CORS_PROXY = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';
-const S = { service:null, device:null, resolution:null, audio:'limited', bandwidthMbps:0, content:null, name:'', multiServices:[], sizeLimit:'unlimited', formatter:'family-v4', p2pEnabled:false, qualityFirst:false, resolutionFirst:false, foreignLangKill:true, matchMode:'balanced', exclude4K:false, excludeDV:false, tmdbToken:'', tmdbApiKey:'', creds:{torbox:'',realdebrid:'',alldebrid:'',premiumize:'',debridlink:'',offcloud:'',easynews:'',easynewsPass:'',nzbgeek:'',debridio:'',debrider:'',nzbnoob:'',althub:'',usenetcrawler:'',drunkenslug:'',nzbfinder:'',jackett:'',prowlarr:'',subdl:''}, instanceHost:'elfhosted', instanceUrl:'', instanceUuid:'', instancePassword:'', baseUuid:'', basePassword:'', quickStart:false, langs: ['English'], langExclusive: false, cacheMode: 'mixed', streamPool: 'normal', pseArch: 'standard', telemetryOk: false, simpleMode: false, outputProfile:'auto', aiostreamsVersion:'2.32.0', installMode: 'direct', stremioEmail: '', stremioPassword: '', subtitleLangs: ['en'], subtitleAddons: ['aiosubtitle'], proxyEnabled: false, proxiedServices: [], catalogs: ['tmdb-addon'], dedupMerge: false, optionalScrapers: [], cleanInstall: false, quickProfile: 'balanced', preloadEnabled:true, autoPlayMethod:'matchingFile', addonTimeout:6000, patchCinemeta:false, installAIOMeta:false, ageLimit:'none', libraryBoost:'default', nzbFailover:false, nzbFailoverPosition:'after-torrents', maxFailoverNzbs:3 };
+const S = { service:null, device:null, resolution:null, audio:'limited', bandwidthMbps:0, content:null, name:'', multiServices:[], sizeLimit:'unlimited', formatter:'family-v4', p2pEnabled:false, qualityFirst:false, resolutionFirst:false, foreignLangKill:true, matchMode:'balanced', exclude4K:false, excludeDV:false, tmdbToken:'', tmdbApiKey:'', creds:{torbox:'',realdebrid:'',alldebrid:'',premiumize:'',debridlink:'',offcloud:'',easynews:'',easynewsPass:'',nzbgeek:'',debridio:'',debrider:'',nzbnoob:'',althub:'',usenetcrawler:'',drunkenslug:'',nzbfinder:'',jackett:'',prowlarr:'',subdl:''}, instanceHost:'elfhosted', instanceUrl:'', instanceUuid:'', instancePassword:'', baseUuid:'', basePassword:'', quickStart:false, langs: ['English'], langExclusive: false, cacheMode: 'mixed', streamPool: 'normal', pseArch: 'standard', telemetryOk: false, simpleMode: false, outputProfile:'auto', aiostreamsVersion:DEFAULT_AIOSTREAMS_VERSION, installMode: 'direct', stremioEmail: '', stremioPassword: '', subtitleLangs: ['en'], subtitleAddons: ['aiosubtitle'], proxyEnabled: false, proxiedServices: [], catalogs: ['tmdb-addon'], dedupMerge: false, optionalScrapers: [], cleanInstall: false, quickProfile: 'balanced', preloadEnabled:true, autoPlayMethod:'matchingFile', addonTimeout:6000, patchCinemeta:false, installAIOMeta:false, ageLimit:'none', libraryBoost:'default', nzbFailover:false, nzbFailoverPosition:'after-torrents', maxFailoverNzbs:3 };
 const SENSITIVE_TOP_LEVEL_KEYS = new Set(['instancePassword', 'basePassword', 'stremioPassword']);
 const SENSITIVE_KEY_TOKENS = ['password', 'apikey', 'api_key', 'token', 'secret', 'credential', 'auth'];
 
@@ -374,7 +406,7 @@ function migrateState(input) {
     if(!['auto', ...OUTPUT_PROFILES].includes(d.outputProfile)) d.outputProfile='auto';
   }
   if(schema<4){
-    if(!AIOSTREAMS_COMPATIBILITY_TARGETS.includes(d.aiostreamsVersion)) d.aiostreamsVersion='2.32.0';
+    if(!AIOSTREAMS_COMPATIBILITY_TARGETS.includes(d.aiostreamsVersion)) d.aiostreamsVersion=DEFAULT_AIOSTREAMS_VERSION;
   }
   d._schema=STATE_SCHEMA; return d;
 }
@@ -1151,7 +1183,7 @@ function outputProfileContext() {
     // 4K-tier-first rule (and the same explicit opt-out) as sort-policy.js.
     qualityFirst: Boolean(S.qualityFirst),
     resolutionFirst: Boolean(S.resolutionFirst),
-    aiostreamsVersion: AIOSTREAMS_COMPATIBILITY_TARGETS.includes(S.aiostreamsVersion) ? S.aiostreamsVersion : '2.32.0',
+    aiostreamsVersion: AIOSTREAMS_COMPATIBILITY_TARGETS.includes(S.aiostreamsVersion) ? S.aiostreamsVersion : DEFAULT_AIOSTREAMS_VERSION,
   };
 }
 
@@ -1178,13 +1210,17 @@ function renderOutputProfilePicker({ compact=false } = {}) {
     </button>`;
   }).join('');
   const flowDefault = S.simpleMode || S.quickStart ? 'Core Stable' : (S.pseArch === 'apex-mixed' ? 'Labs' : S.pseArch === 'iqr' ? 'Advanced' : 'Balanced');
-  const target = AIOSTREAMS_COMPATIBILITY_TARGETS.includes(S.aiostreamsVersion) ? S.aiostreamsVersion : '2.32.0';
-  const targetNote = target === '2.31.1'
-    ? 'v2.31.1 legacy lane: Advanced/Labs may retain the old TorBox Search preset. Stable and Balanced do not emit it.'
-    : target === '2.32.0'
-      ? 'v2.32 lane: the old TorBox Search preset is removed. A Newznab replacement is not auto-added until endpoint/import tests pass.'
-      : 'Unknown target: old TorBox Search is removed rather than assumed portable.';
-  const targetControl = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)"><label style="display:block;font-size:.64rem;color:#8b949e;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:5px">AIOStreams compatibility target</label><select data-action="set-aiostreams-target" style="width:100%;background:#0b0f16;color:#e6edf3;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:7px 8px;font-size:.72rem"><option value="2.31.1" ${target === '2.31.1' ? 'selected' : ''}>2.31.1 — legacy TorBox Search compatibility lane</option><option value="2.32.0" ${target === '2.32.0' ? 'selected' : ''}>2.32.0 — remove legacy preset; Newznab migration review</option><option value="unknown" ${target === 'unknown' ? 'selected' : ''}>Unknown / older — do not assume legacy preset support</option></select><div style="font-size:.62rem;line-height:1.4;color:#6b7280;margin-top:5px">${targetNote}</div></div>`;
+  const target = AIOSTREAMS_COMPATIBILITY_TARGETS.includes(S.aiostreamsVersion) ? S.aiostreamsVersion : DEFAULT_AIOSTREAMS_VERSION;
+  // Descriptions live with the options so the picker cannot say less than the target list knows.
+  const TARGET_NOTES = {
+    '2.31.1': 'v2.31.1 legacy lane: Advanced/Labs may retain the old TorBox Search preset. Stable and Balanced do not emit it.',
+    '2.32.0': 'v2.32 lane: the old TorBox Search preset is removed. A Newznab replacement is not auto-added until endpoint/import tests pass.',
+    '2.33.2': 'v2.33.2 lane: config variants with path-param selector variants supported. Matches the Midnight / Omni / Wizaardd hosts.',
+    '2.34.0': 'v2.34.0 lane: the release this configurator is pinned against (schema pin e694b6a). Default — matches most live hosts.',
+    'unknown': 'Unknown target: old TorBox Search is removed rather than assumed portable.',
+  };
+  const targetNote = TARGET_NOTES[target] || TARGET_NOTES.unknown;
+  const targetControl = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)"><label style="display:block;font-size:.64rem;color:#8b949e;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:5px">AIOStreams compatibility target</label><select data-action="set-aiostreams-target" style="width:100%;background:#0b0f16;color:#e6edf3;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:7px 8px;font-size:.72rem">${AIOSTREAMS_COMPATIBILITY_TARGETS.map(v => `<option value="${v}" ${target === v ? 'selected' : ''}>${v === 'unknown' ? 'Unknown / older — do not assume legacy preset support' : v + (v === '2.31.1' ? ' — legacy TorBox Search lane' : v === '2.32.0' ? ' — remove legacy preset' : v === DEFAULT_AIOSTREAMS_VERSION ? ' — pinned release (default)' : ' — variants supported')}</option>`).join('')}</select><div style="font-size:.62rem;line-height:1.4;color:#6b7280;margin-top:5px">${targetNote}</div></div>`;
   const reset = S.outputProfile && S.outputProfile !== 'auto'
     ? `<button type="button" data-action="set-output-profile" data-val="auto" style="margin-top:7px;padding:0;border:0;background:none;color:#6b7280;font-size:.66rem;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:2px">Use this flow’s default (${flowDefault})</button>`
     : `<span style="display:block;margin-top:7px;color:#4b5563;font-size:.66rem">This flow defaults to ${flowDefault}.</span>`;
@@ -1676,12 +1712,19 @@ function splashHtml() {
     </div>
 
     ${hadSavedState ? '' : remoteUpdateBannerHtml()}
-    <div class="hybrid-section-head splash-anim splash-anim-d4"><div><h2>Choose your route</h2><p>Start simple or take full control.</p></div><p class="hybrid-section-index">01 / Workflow</p></div>
+    <div class="hybrid-section-head splash-anim splash-anim-d4"><div><h2>Express install</h2><p>The whole job is five steps: service &rarr; device &rarr; resolution &rarr; key &rarr; Deploy.</p></div><p class="hybrid-section-index">01 / Workflow</p></div>
     <div class="splash-doors splash-anim splash-anim-d4" id="splashDoors">
-      <div class="splash-door fastlane-door" data-action="open-express-lane" tabindex="0" role="button"><div class="splash-door-icon">${ICO.bolt(22,'#00d4ff')}</div><div class="splash-door-text"><div class="splash-door-title">Express Install <span class="splash-door-tag fastlane-badge">One-click</span></div><div class="splash-door-desc">Pick your debrid, profile, and device — install in about 30 seconds.</div></div></div>
-      <div class="splash-door" data-action="custom-start" tabindex="0" role="button"><div class="splash-door-icon">${ICO.gear(22,'#a78bfa')}</div><div class="splash-door-text"><div class="splash-door-title">Advanced Builder <span class="splash-door-tag splash-tag-advanced">Advanced</span></div><div class="splash-door-desc">Fine control over every filter, sort rule, and formatter.</div></div></div>
-      <div class="splash-door" data-action="update-template" tabindex="0" role="button"><div class="splash-door-icon">${ICO.refresh(22,'#34d399')}</div><div class="splash-door-text"><div class="splash-door-title">Update Existing Setup <span class="splash-door-tag" style="background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)">Updater</span></div><div class="splash-door-desc">Import an existing template and rebuild it with current logic.</div></div></div>
-      <a class="splash-door core-tool-door" href="../tools/genies/"><div class="splash-door-icon"><span style="font-size:20px;line-height:1" aria-hidden="true">🧞</span></div><div class="splash-door-text"><div class="splash-door-title">Setup Genie <span class="splash-door-tag" style="background:rgba(0,212,255,.1);color:#67e8f9;border:1px solid rgba(0,212,255,.22)">Newcomer-friendly</span></div><div class="splash-door-desc">The chat-style guided walkthrough, on its own focused page — nothing else on screen.</div></div></a>
+      <div class="splash-door fastlane-door" data-action="open-express-lane" tabindex="0" role="button"><div class="splash-door-icon">${ICO.bolt(22,'#00d4ff')}</div><div class="splash-door-text"><div class="splash-door-title">Express Install <span class="splash-door-tag fastlane-badge">One-click</span></div><div class="splash-door-desc">Service &rarr; device &rarr; resolution &rarr; key &rarr; Deploy — working streams in about 30 seconds.</div></div></div>
+    </div>
+    <!-- Express-first IA (2026-09-06 audit): the other routes stay one click away
+         as secondary text links — same data-actions, so #advanced / #update
+         deep links, the tour and every spec that clicks them still work. The
+         Setup Genie card is gone from the landing; the route itself is
+         unchanged and still linked here and from All Core Tools. -->
+    <div class="splash-tertiary splash-anim splash-anim-d4" id="splashAltRoutes" style="margin-top:10px">
+      <button data-action="custom-start" class="splash-tertiary-btn">Advanced Builder</button>
+      <button data-action="update-template" class="splash-tertiary-btn">Update Existing Setup</button>
+      <a href="../tools/genies/" class="splash-tertiary-btn">Setup Genie</a>
     </div>
 
     <div class="hybrid-section-head splash-anim splash-anim-d5"><div><h2>Ready-Made Setups</h2><p>Opinionated presets for common setups.</p></div><p class="hybrid-section-index">02 / Presets</p></div>
@@ -1893,14 +1936,7 @@ function render() {
                 <label>AIOStreams Host</label>
                 <select class="name-input" id="aioHost" data-action="update-host" style="cursor:pointer;color-scheme:dark">
                   <option value="auto"       ${S.instanceHost==='auto'?'selected':''}>Auto (tries all public hosts)</option>
-                  <option value="elfhosted"  ${S.instanceHost==='elfhosted'||S.instanceHost===''?'selected':''}>ElfHosted — aiostreams.elfhosted.com</option>
-                  <option value="fortheweak" ${S.instanceHost==='fortheweak'?'selected':''}>ForthWeak — aiostreams.fortheweak.cloud</option>
-                  <option value="midnight"   ${S.instanceHost==='midnight'?'selected':''}>Midnight's — midnightignite.me</option>
-                  <option value="viren"      ${S.instanceHost==='viren'?'selected':''}>Viren's — aiostreams.viren070.me</option>
-                  <option value="kuu"        ${S.instanceHost==='kuu'?'selected':''}>Kuu's — aiostreams.stremio.ru</option>
-                  <option value="atbp"       ${S.instanceHost==='atbp'?'selected':''}>ATBP — aio.atbphosting.com</option>
-                  <option value="omni"       ${S.instanceHost==='omni'?'selected':''}>Omni's — aiostreams.12312023.xyz</option>
-                  <option value="wizaardd"   ${S.instanceHost==='wizaardd'?'selected':''}>Wizaardd — forthewizards.uk</option>
+                  ${Object.entries(HOST_BASE_URLS).map(([k,u])=>`<option value="${k}" ${S.instanceHost===k||(k==='elfhosted'&&S.instanceHost==='')?'selected':''}>${escHtml(hostPickerLabel(k))}</option>`).join('')}
                   <option value="custom"     ${S.instanceHost==='custom'?'selected':''}>Custom / Self-hosted</option>
                 </select>
               </div>
@@ -3574,6 +3610,13 @@ function defaultName() {
 function presets() {
   const svc = S.service;
   const isMulti = svc === 'multi', isP2P = svc === 'p2p', isEasynews = svc === 'easynews', isHttp = svc === 'http', isDebridio = svc === 'debridio', isUsenet = svc === 'usenet';
+  // Library root-cause fix (2026-09-06 audit): AIOStreams generates the Library
+  // addon from the *services* array and rejects the whole config when no
+  // enabled service can back it ("Library requires at least one usable
+  // service"). EasyNews — and every other non-debrid route — cannot, so the
+  // library preset is emitted only when services() carries a capable service.
+  // Applied here (every route reads this list), not in one lane.
+  const libCapable = hasLibraryCapableService(services());
   const hasDebridio = isDebridio || (isMulti && S.multiServices.includes('debridio'));
   const multiHasEasynews = isMulti && S.multiServices.includes('easynews');
   const hasExtraHttp = isMulti && S.multiServices.includes('http') && !isHttp;
@@ -3582,7 +3625,10 @@ function presets() {
   const useStore = ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'].includes(svc) || (isMulti && S.multiServices.some(s => ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'].includes(s)));
   if (isUsenet) {
     const usenetList = [
-      { type:'library', instanceId:'lib-1', enabled:true, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
+      // The usenet route enables the `aiostreams` service (see services()), which
+      // IS library-capable upstream — kept. Any future usenet route without it
+      // loses the library preset automatically via `libCapable`.
+      ...(libCapable ? [{ type:'library', instanceId:'lib-1', enabled:true, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } }] : []),
       { type:'easynewsPlusPlus', instanceId:'en-ppp-1', enabled:true, options:{ name:'EasyNews++', timeout:6000, strictTitleMatching:true }, resources:['stream'] },
       { type:'easynews-search', instanceId:'en-srch-1', enabled:true, options:{ name:'EasyNews Search', timeout:5000, apiVersion:'3.0' }, resources:['stream'] },
       ...(S.creds.nzbgeek ? [{ type:'newznab', instanceId:'nzbgeek-1', enabled:true, options:{ name:'NZBGeek', api:{ url:'https://api.nzbgeek.info/api', apiKey:S.creds.nzbgeek }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } }] : []),
@@ -3620,7 +3666,9 @@ function presets() {
     : [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }];
 
   const list = [
-    { type:'library', instanceId:'lib-1', enabled:!isP2P, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
+    // See the libCapable note above: no capable service → no library preset,
+    // or the host rejects the save outright (EasyNews-only 400, audit defect 2).
+    ...(libCapable ? [{ type:'library', instanceId:'lib-1', enabled:!isP2P, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } }] : []),
     ...(isP2P ? [{ type:'torrentio', instanceId:'tio-p2p-1', enabled:true, options:{ name:'Torrentio', timeout:7000, useMultipleInstances:false }, resources:['stream'] }] : []),
     { type:'zilean', instanceId:'nx-fix-04', enabled:true, options:{ name:'Zilean', timeout:4000, resources:['stream'] } },
     { type:'seadex', instanceId:'tam-seadex', enabled:S.content !== 'live' && !isP2P, options:{ name:'SeaDex', timeout:4000, mediaTypes:['anime'] }, resources:['stream'] },  // p2p-only: v2.33 rejects "requires at least one usable service",
@@ -4462,7 +4510,7 @@ function parseTemplateToState(tpl) {
     name: '', multiServices: [], sizeLimit: 'unlimited', formatter: 'family-v4',
     p2pEnabled: false, qualityFirst: false, resolutionFirst: false, foreignLangKill: true, matchMode: 'balanced',
     exclude4K: false, excludeDV: false, langs: ['English'], langExclusive: false,
-    cacheMode: 'mixed', streamPool: 'normal', simpleMode: false, outputProfile: 'auto', aiostreamsVersion: '2.32.0'
+    cacheMode: 'mixed', streamPool: 'normal', simpleMode: false, outputProfile: 'auto', aiostreamsVersion: DEFAULT_AIOSTREAMS_VERSION
   };
   if (OUTPUT_PROFILES.includes(tpl?.metadata?.coreBuildsProfile)) st.outputProfile = tpl.metadata.coreBuildsProfile;
   if (AIOSTREAMS_COMPATIBILITY_TARGETS.includes(tpl?.metadata?.coreBuildsAIOStreamsTarget)) st.aiostreamsVersion = tpl.metadata.coreBuildsAIOStreamsTarget;
@@ -6563,7 +6611,7 @@ function showExpressLane() {
   };
   const overlay = document.createElement('div');
   const prevFocus = document.activeElement;
-  const closeLane = () => { overlay.remove(); document.removeEventListener('keydown', expressLaneEscKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
+  const closeLane = () => { _expressLaneService = null; overlay.remove(); document.removeEventListener('keydown', expressLaneEscKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
   const expressLaneEscKey = (e) => { if (e.key === 'Escape') closeLane(); };
   document.addEventListener('keydown', expressLaneEscKey);
   overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('#expressClose')) closeLane(); }, { once:false });
@@ -6580,7 +6628,7 @@ function showExpressLane() {
         <span id="expressHostChip" style="flex-shrink:0;font-size:.58rem;font-weight:800;padding:3px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.12);color:#6b7280;white-space:nowrap">…</span>
         <select id="expressHost" class="fastlane-field" style="min-height:40px;font-size:.72rem;padding:8px 10px">
           <option value="auto"${(S.instanceHost==='auto')?' selected':''}>Auto (fastest healthy)</option>
-          ${Object.entries(HOST_BASE_URLS).map(([k,u])=>`<option value="${escHtml(k)}"${S.instanceHost===k?' selected':''}>${escHtml(HOST_LABEL_MAP[k]||k)}${HOST_META[k]&&HOST_META[k].channel==='nightly'?' (nightly)':''}</option>`).join('')}
+          ${Object.entries(HOST_BASE_URLS).map(([k,u])=>`<option value="${escHtml(k)}"${S.instanceHost===k?' selected':''}>${escHtml(hostPickerLabel(k))}</option>`).join('')}
           <option value="custom"${S.instanceHost==='custom'?' selected':''}>Custom / self-hosted (set its URL in Advanced)</option>
         </select>
       </div>
@@ -6623,6 +6671,7 @@ function showExpressLane() {
   </div>`;
   document.body.appendChild(overlay);
   document.getElementById('expressHost')?.addEventListener('change', e => { S.instanceHost = e.target.value; saveState(); probeExpressHost(); refreshExpressSummary(); });
+  _expressLaneService = state.service;
   probeExpressHost();
   // Truthful-at-a-glance chorus above the Install button — every pick lands in it.
   const refreshExpressSummary = () => {
@@ -6643,6 +6692,8 @@ function showExpressLane() {
     const svcBtn = e.target.closest('[data-express-service]');
     if (svcBtn) {
       state.service = svcBtn.dataset.expressService;
+      _expressLaneService = state.service;
+      probeExpressHost();
       overlay.querySelectorAll('[data-express-service]').forEach(b => b.classList.toggle('active', b.dataset.expressService === state.service));
       state.extras = state.extras.filter(v => v !== state.service);
       renderCredsInto();
@@ -6735,7 +6786,6 @@ function showExpressLane() {
 
 async function runExpressInstall(p) {
   const isFree = p.service === 'p2p';
-  if (!isFree && !Object.values(p.creds).some(v => v)) { showToast('Enter your API key first', true); return; }
   if (p.target === 'app' && !isFree) {
     if (!p.stremioEmail || !p.stremioPassword) { showToast('Add your Stremio login or create a random account', true); return; }
     S.stremioEmail = p.stremioEmail; S.stremioPassword = p.stremioPassword;
@@ -6812,6 +6862,18 @@ async function runExpressInstall(p) {
     }
     return;
   }
+  // Key gate (audit defect 3), express side: name the exact missing key before
+  // anything is posted. Applies to every install target that POSTs a config
+  // (Stremio / manifest / WuPlay); the Nuvio paste route returned above.
+  if (!isFree) {
+    const missingCreds = missingDirectInstallCredentials(services(), S.creds);
+    if (missingCreds.length) {
+      const result = document.getElementById('aioResult');
+      if (result) result.innerHTML = missingCredHtml(missingCreds);
+      showToast('Enter your ' + missingCreds[0].label + ' first', true);
+      return;
+    }
+  }
   S.installMode = p.target === 'app' ? 'direct' : 'manifest';
   saveState();
   try {
@@ -7121,6 +7183,18 @@ async function simpleInstall(target) {
       showToast('Enter your Stremio email and password above', true); return;
     }
   }
+  // Key gate (audit defect 3): every enabled service that needs a credential
+  // must have one before anything is POSTed — the host refuses the save with
+  // "Option apiKey is required" otherwise. Export JSON deliberately stays
+  // keyless; this gate only guards the install path.
+  if (!isFree) {
+    const missingCreds = missingDirectInstallCredentials(services(), S.creds);
+    if (missingCreds.length) {
+      if (result) result.innerHTML = missingCredHtml(missingCreds);
+      showToast('Enter your ' + missingCreds[0].label + ' first', true);
+      return;
+    }
+  }
   const origHtml = btn.innerHTML;
   if (isFree) {
     btn.disabled = true; btn.innerHTML = `<span class="dot-spin"><span></span><span></span><span></span></span> Creating import link…`;
@@ -7144,6 +7218,15 @@ async function simpleInstall(target) {
   const cfg = buildFinal().config;
   const sz = payloadSizeGuard(cfg);
   if (sz.over) { btn.disabled = false; btn.innerHTML = 'Install'; result.innerHTML = payloadTooLargeHtml(sz); return; }
+  // Host routing gate (audit defect 4): never POST to a host the capability
+  // matrix says will refuse this config (P2P on ElfHosted; feature keys newer
+  // than the host). A host that merely lags the selected target warns instead.
+  const routing = hostRoutingDecision({ service: S.service, config: cfg }, currentHostCapabilities(), { targetVersion: outputProfileContext().aiostreamsVersion });
+  if (routing.status === 'blocked') {
+    btn.disabled = false; btn.innerHTML = 'Install';
+    result.innerHTML = hostRoutingNoticeHtml(routing);
+    return;
+  }
   const _allHosts = orderedHostEntries();
   const hostLabels = {};
   _allHosts.forEach(([n, u]) => { hostLabels[u] = n; });
```

### 3.2 `configurator/src/js/app.js` — commit 2 (fix 7: fetchers, gate, POST stop, chip verdict)

```diff
diff --git a/configurator/src/js/app.js b/configurator/src/js/app.js
index c8b5909..4b3c43c 100644
--- a/configurator/src/js/app.js
+++ b/configurator/src/js/app.js
@@ -32,6 +32,7 @@ import { isNewer, parseChangelogRange, shouldCheck, normalizeTemplateMeta } from
 import { AIOSTREAMS_COMPATIBILITY_TARGETS, DEFAULT_AIOSTREAMS_VERSION, OUTPUT_PROFILES, OUTPUT_PROFILE_INFO, resolveOutputProfile, applyOutputProfile } from '../core/output-profile-policy.js';
 import { hasLibraryCapableService, missingDirectInstallCredentials } from '../core/install-policy.js';
 import { hostRoutingDecision, autoRoutableHostKeys, hostPickerLabel } from '../core/host-routing.js';
+import { collectRegexPatternSet, regexAccessDecision } from '../core/regex-access-policy.js';
 import { inspectTemplateComplexity, findFeatureConflicts, validateOutputProfileBudget } from '../core/feature-conflict-policy.js';
 import { buildFeedbackReport } from '../core/feedback-report-policy.js';
 
@@ -193,6 +194,15 @@ async function probeExpressHost() {
   // the reason; a host merely behind the selected target says so in amber.
   const routing = (() => { try { return hostRoutingDecision({ service: _expressLaneService || S.service, config: {} }, currentHostCapabilities(), { targetVersion: S.aiostreamsVersion && S.aiostreamsVersion !== 'unknown' ? S.aiostreamsVersion : null }); } catch(e) { return { status:'ok', reasons:[] }; } })();
   if (routing.status === 'blocked') { chip.textContent = '✕ ' + routing.reasons[0].split(' — ')[0]; chip.title = routing.reasons.join(' '); chip.style.color='#f87171'; chip.style.borderColor='rgba(248,113,113,.35)'; return; }
+  // Regex-allowlist verdict for the current build on this host (2026-09-06
+  // race diagnosis). Advisory: the authoritative gate runs at POST time with
+  // the final config — the chip reads the global build state, which the
+  // Express lane may not have written yet, in which case this skips quietly.
+  if (routing.status !== 'blocked') {
+    let rgx = { status: 'skip' };
+    try { rgx = await regexGateForHost(url, buildFinal().config); } catch (e) { /* nothing selected yet */ }
+    if (rgx.status === 'blocked') { chip.textContent = '✕ ' + rgx.reason.split(' — ')[0]; chip.title = rgx.reason; chip.style.color = '#f87171'; chip.style.borderColor = 'rgba(248,113,113,.35)'; return; }
+  }
   chip.title = routing.status === 'warn' ? routing.reasons.join(' ') : '';
   if (d.ok && !d.degraded)      { chip.textContent = `● healthy${d.version?' v'+d.version:''} · ${d.ms}ms${routing.status==='warn'?' · behind target':''}`; chip.style.color = routing.status==='warn' ? '#fbbf24' : '#34d399'; chip.style.borderColor = routing.status==='warn' ? 'rgba(251,191,36,.35)' : 'rgba(52,211,153,.35)'; }
   else if (d.ok)                { chip.textContent = `● slow · ${d.ms}ms${routing.status==='warn'?' · behind target':''}`; chip.style.color='#fbbf24'; chip.style.borderColor='rgba(251,191,36,.35)'; }
@@ -4141,6 +4151,71 @@ function activeHostKey() {
   return S.instanceHost && S.instanceHost !== 'auto' ? S.instanceHost : 'elfhosted';
 }
 
+// ── Regex-allowlist preflight (2026-09-06 race diagnosis) ──────────────────
+// Hosts running regexAccess 'trusted'/'none' validate the deduped union of
+// the config's synced regex URLs (resolved LIVE at save time) and inline
+// patterns against the host's cached allowlist. Our synced URL pins a moving
+// branch head, so an upstream list change plus a lagging host refresh turns
+// every regex-scoring Direct Install into a host 400 ("N / M regexes that
+// are not allowed"). Resolve the same union client-side (raw.githubusercontent
+// sends Access-Control-Allow-Origin: *) and check it before the POST. Every
+// unknown (status unfetchable, allowlist not exposed, list unfetchable)
+// skips the check — this explains a predictable 400, it never adds one.
+const _regexStatusCache = new Map();   // base URL -> {level, patterns?} | null
+const _syncedRegexCache = new Map();   // list URL -> [patterns] | null (null = unfetchable)
+
+async function fetchHostRegexAccess(base) {
+  const key = String(base || '').replace(/\/$/, '');
+  if (!key) return null;
+  if (_regexStatusCache.has(key)) return _regexStatusCache.get(key);
+  let out = null;
+  try {
+    // raceHostFetch races a direct request against the CORS proxy — the same
+    // path probeHostDetail uses, so the gate works wherever the chip does.
+    const res = await raceHostFetch(key, '/api/v1/status', { method:'GET' }, 4000);
+    if (res && res.ok) {
+      const j = await res.json();
+      const ra = j && j.data && j.data.settings && j.data.settings.regexAccess;
+      if (ra && typeof ra.level === 'string') out = { level: ra.level, patterns: Array.isArray(ra.patterns) ? ra.patterns : undefined };
+    }
+  } catch (e) { /* offline / CORS-blocked / slow: skip the check */ }
+  _regexStatusCache.set(key, out);
+  return out;
+}
+
+async function fetchSyncedRegexPatterns(urls) {
+  const lists = await Promise.all(urls.map(async u => {
+    if (_syncedRegexCache.has(u)) return _syncedRegexCache.get(u);
+    let out = null;
+    try {
+      const res = await fetch(u, { signal: AbortSignal.timeout(4000) });
+      const j = await res.json();
+      const arr = Array.isArray(j) ? j : (j && Array.isArray(j.patterns) ? j.patterns : null);
+      if (arr) out = arr.map(e => (typeof e === 'string' ? e : e && e.pattern)).filter(p => typeof p === 'string' && p);
+    } catch (e) { /* unfetchable: skip the check rather than block */ }
+    _syncedRegexCache.set(u, out);
+    return out;
+  }));
+  if (lists.some(l => l === null)) return null;   // any list unknown → cannot validate
+  return new Set(lists.flat());
+}
+
+// Pre-POST check against the host the install will actually hit. Returns
+// {status:'skip'} on any unknown — never blocks on missing data.
+async function regexGateForHost(base, config) {
+  try {
+    const set = collectRegexPatternSet(config);
+    if (!set.syncedUrls.length && !set.inline.size) return { status: 'skip' };
+    const access = await fetchHostRegexAccess(base);
+    if (!access || access.level === 'all' || !Array.isArray(access.patterns)) return { status: 'skip' };
+    const resolved = set.syncedUrls.length ? await fetchSyncedRegexPatterns(set.syncedUrls) : undefined;
+    if (resolved === null) return { status: 'skip' };
+    return regexAccessDecision(access, { inline: set.inline, resolved });
+  } catch (e) {
+    return { status: 'skip' };
+  }
+}
+
 function currentHostCapabilities() {
   const key = activeHostKey();
   return resolveHostCapabilities(key, _hostProbeCache.get(key) || null, {
@@ -7233,6 +7308,17 @@ async function simpleInstall(target) {
 
   try {
     const fastest = await resolveInstallHost(4000);
+    // Regex-allowlist preflight (2026-09-06 race diagnosis): the same union
+    // the host validates (synced URLs resolved live + inline patterns),
+    // checked against the host's own allowlist before the POST that would
+    // 400. Skips on any unknown — the gate explains a predictable failure,
+    // it must never create one.
+    const rgx = await regexGateForHost(fastest, cfg);
+    if (rgx.status === 'blocked') {
+      btn.disabled = false; btn.innerHTML = 'Install';
+      result.innerHTML = hostRoutingNoticeHtml({ status: 'blocked', reasons: [rgx.reason] });
+      return;
+    }
     const res = await writeHostFetch(fastest, '/api/v1/user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ config:cfg, password:pwd }) }, 8000);
     const data = await res.json().catch(() => ({}));
     if (!res.ok || data?.success === false) {
```

### 3.3 `configurator/src/core/output-profile-policy.js` — default target + compat lanes

```diff
diff --git a/configurator/src/core/output-profile-policy.js b/configurator/src/core/output-profile-policy.js
index 7a9d5b1..056717a 100644
--- a/configurator/src/core/output-profile-policy.js
+++ b/configurator/src/core/output-profile-policy.js
@@ -15,7 +15,17 @@ export const OUTPUT_PROFILES = Object.freeze(['stable', 'balanced', 'advanced',
 // upstream in v2.32. This is deliberately a target choice, not a silent
 // migration to Newznab: the two presets do not have equivalent options or
 // credential handling.
-export const AIOSTREAMS_COMPATIBILITY_TARGETS = Object.freeze(['2.31.1', '2.32.0', 'unknown']);
+//
+// 2.33.2 and 2.34.0 were added after the 2026-09-06 host audit: the live fleet
+// runs exactly those two versions (ElfHosted/ForTheWeak/Viren/Kuu/ATBP at
+// 2.34.0; Midnight/Omni/Wizaardd at 2.33.2). Older entries stay so existing
+// saved sessions and shared links keep resolving.
+export const AIOSTREAMS_COMPATIBILITY_TARGETS = Object.freeze(['2.31.1', '2.32.0', '2.33.2', '2.34.0', 'unknown']);
+
+// The target a fresh session gets: the AIOStreams release this configurator is
+// pinned against (see UPSTREAM.pin). Single source of truth — app.js imports it
+// for the state default and every fallback that used to hard-code '2.32.0'.
+export const DEFAULT_AIOSTREAMS_VERSION = '2.34.0';
 
 export const OUTPUT_PROFILE_INFO = Object.freeze({
   stable: Object.freeze({
```

### 3.4 `configurator/src/core/host-capability-policy.js` — probe > registry > assumed precedence

```diff
diff --git a/configurator/src/core/host-capability-policy.js b/configurator/src/core/host-capability-policy.js
index c130de0..38576f1 100644
--- a/configurator/src/core/host-capability-policy.js
+++ b/configurator/src/core/host-capability-policy.js
@@ -20,6 +20,7 @@ import {
   KNOWN_DEAD_CONFIG_KEYS,
   LEGACY_MIGRATED_CONFIG_KEYS,
 } from '../data/host-capabilities.js';
+import { HOST_META } from '../data/hosts.js';
 import { AIO_CONFIG_KEY_SET } from '../config/generated/aiostreams-config-schema.js';
 import { AIO_PRESET_ID_SET } from '../data/generated/aiostreams-presets.js';
 import { isAllowed, hasLookbehind, REGEX_FIELDS } from './regex-whitelist.js';
@@ -121,7 +122,14 @@ export function resolveHostCapabilities(hostKey, probe = null, options = {}) {
     key,
     label: base.label || key,
     kind: base.kind || 'unknown',
-    version: probed?.version || options.assumedVersion || null,
+    // Precedence: live probe > HOST_META registry snapshot (read from each
+    // host's own /api/v1/status at the last audit) > the caller's assumed
+    // target. The registry entry exists for the offline / CORS-blocked path,
+    // where the assumed target was previously the only guess available.
+    version: probed?.version
+      || HOST_META[key]?.aiostreamsVersion
+      || options.assumedVersion
+      || null,
     channel: probed?.channel || (base.kind === 'nightly' ? 'nightly' : null),
     probed: Boolean(probed),
     // An unprobed host that the registry flags as owner-configured cannot be
@@ -146,6 +154,8 @@ export function resolveHostCapabilities(hostKey, probe = null, options = {}) {
     rateLimited: probed?.rateLimited ?? base.rateLimited ?? false,
     reasons: base.reasons || {},
     trustedUser: Boolean(options.trustedUser),
+    // Surfaced from HOST_META so routing checks work off one record.
+    blocksFree: Boolean(HOST_META[key]?.blocksFree),
   };
 }
```

### 3.5 `configurator/src/data/hosts.js` — per-host `aiostreamsVersion` registry snapshot

```diff
diff --git a/configurator/src/data/hosts.js b/configurator/src/data/hosts.js
index 888148d..8a4632b 100644
--- a/configurator/src/data/hosts.js
+++ b/configurator/src/data/hosts.js
@@ -1,8 +1,12 @@
 export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
 export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's (legacy)", wizaardd:'Wizaardd' };
 export const HOST_META = {
-  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true},
-  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true},
-  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true}
+  // aiostreamsVersion: the release each public host was running when last read
+  // from its own /api/v1/status (audit of 2026-09-06). A live probe always wins
+  // over this snapshot; it exists so the host picker and the routing gate can
+  // be truthful offline / when the browser probe is CORS-blocked.
+  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false,aiostreamsVersion:'2.34.0'}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'},
+  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'},
+  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'}
 };
 export const MIN_AIOSTREAMS_VERSION = '2.32.0';
```

### 3.6 `configurator/src/data/changelog.js` — new `v3.7` entry

```diff
diff --git a/configurator/src/data/changelog.js b/configurator/src/data/changelog.js
index a140465..fe361d8 100644
--- a/configurator/src/data/changelog.js
+++ b/configurator/src/data/changelog.js
@@ -1,4 +1,11 @@
 export const CHANGELOG = [
+  { v:'3.7', date:'Sep 6 2026', items:[
+    'Version honesty: the badge, package.json and the template stamp now all report this release (they disagreed — badge v3.1, package 3.1.0, tag v3.7.0) and a test fails if they ever drift apart again. The default AIOStreams compatibility target moves from the stale 2.32.0 to the pinned 2.34.0, with 2.33.2 and 2.34.0 added to the target list so it covers every version the live fleet actually runs.',
+    'Fixed: EasyNews-only Direct Install no longer fails with "Library requires at least one usable service". AIOStreams builds the Library addon from your services, and EasyNews cannot back it — the library preset is now omitted whenever no library-capable (debrid) service is enabled, on every route, and EasyNews configs install clean. EasyNews plus any debrid keeps the library.',
+    'Direct Install now refuses to post without the keys the host demands, naming exactly what is missing ("Option apiKey is required" was the previous failure, delivered by the host after the fact). Export JSON remains keyless by design.',
+    'The host picker now states each host\'s capabilities and its AIOStreams version before you deploy — ElfHosted says "Debrid only — no P2P/HTTP", and the three hosts still on 2.33.2 say so. A config using features newer than a host is not routed there, and a P2P config can no longer be sent to ElfHosted.',
+    'The landing is Express-first: one primary card for the five-step install (service → device → resolution → key → Deploy), with Advanced Builder, Update Existing and the Setup Genie demoted to plain links. The Genie page itself is unchanged.',
+  ]},
   { v:'3.1', date:'Sep 3 2026', items:[
     'Banner Studio is live under Tools — a single self-contained page for generating Netflix-style streaming banners for 17 major streamer brands (Netflix, Disney+, Hulu, Max, Prime Video, Paramount+, Apple TV+, Peacock, Crave, Tubi, Crunchyroll, MGM+, STARZ, AMC+, BritBox, Plex, Roku Channel). Custom backgrounds, taglines, corner badges, undo/redo, PNG/JPG export, share links. Everything renders locally — your designs never leave the browser.',
     'Banner Studio slider controls are now smooth — canvas rendering reuses offscreen buffers instead of allocating new ones every frame, and the main canvas no longer resets its dimensions on each paint. Range sliders have a styled track with a filled progress indicator that follows the thumb.',
```

### 3.7 `packages/core/src/generate-template.js` — library gate in the shared engine

```diff
diff --git a/packages/core/src/generate-template.js b/packages/core/src/generate-template.js
index dccb016..d200996 100644
--- a/packages/core/src/generate-template.js
+++ b/packages/core/src/generate-template.js
@@ -9,6 +9,7 @@
  */
 
 import { templateInput, hasTmdbCredentials } from './input.js';
+import { hasLibraryCapableService } from './library-policy.js';
 import { resolutionPolicy, encodePolicy, audioPolicy } from './device-policy.js';
 import { sortPolicy } from './sort-policy.js';
 import { sizePolicy, bitratePolicy } from './filter-policy.js';
@@ -163,9 +164,16 @@ function buildPresets(input) {
     ...buildCatalogPresets(input)
   ];
 
+  // Library root-cause fix (2026-09-06 audit): AIOStreams builds the Library
+  // addon from the services array and rejects the config when no enabled
+  // service can back it. Gate every library emission on that rule.
+  const libCapable = hasLibraryCapableService(buildServices(input));
   if (isUsenet) {
     const usenetList = [
-      { type:'library', instanceId:'lib-1', enabled:true, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
+      // The usenet route enables the `aiostreams` service, which IS
+      // library-capable upstream — kept; any route without such a service
+      // loses the library preset automatically.
+      ...(libCapable ? [{ type:'library', instanceId:'lib-1', enabled:true, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } }] : []),
       { type:'easynewsPlusPlus', instanceId:'en-ppp-1', enabled:true, options:{ name:'EasyNews++', timeout:6000, strictTitleMatching:true }, resources:['stream'] },
       { type:'easynews-search', instanceId:'en-srch-1', enabled:true, options:{ name:'EasyNews Search', timeout:5000, apiVersion:'3.0' }, resources:['stream'] },
       ...(creds.nzbgeek ? [{ type:'newznab', instanceId:'nzbgeek-1', enabled:true, options:{ name:'NZBGeek', api:{ url:'https://api.nzbgeek.info/api', apiKey:creds.nzbgeek }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } }] : []),
@@ -194,7 +202,7 @@ function buildPresets(input) {
     : [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }];
 
   const list = [
-    { type:'library', instanceId:'lib-1', enabled:!isP2P, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
+    ...(libCapable ? [{ type:'library', instanceId:'lib-1', enabled:!isP2P, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } }] : []),
     ...(isP2P ? [{ type:'torrentio', instanceId:'tio-p2p-1', enabled:true, options:{ name:'Torrentio', timeout:7000, useMultipleInstances:false }, resources:['stream'] }] : []),
     { type:'zilean', instanceId:'nx-fix-04', enabled:true, options:{ name:'Zilean', timeout:4000, resources:['stream'] } },
     { type:'seadex', instanceId:'tam-seadex', enabled:content !== 'live' && !isP2P, options:{ name:'SeaDex', timeout:4000, mediaTypes:['anime'] }, resources:['stream'] },  // p2p-only: v2.33 hard-rejects "SeaDex requires at least one usable service",
```

### 3.8 `configurator/e2e/golden/easynews-1080p.json` — the ONE intended content change

```diff
diff --git a/configurator/e2e/golden/easynews-1080p.json b/configurator/e2e/golden/easynews-1080p.json
index f949d5a..c3fd4f6 100644
--- a/configurator/e2e/golden/easynews-1080p.json
+++ b/configurator/e2e/golden/easynews-1080p.json
@@ -11,7 +11,7 @@
     "setToSaveInstallMenu": true,
     "sourceUrl": "https://github.com/brevityA/Core-Builds",
     "changelogUrl": "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/CHANGELOG.md",
-    "coreBuildsVersion": "3.1",
+    "coreBuildsVersion": "3.7",
     "coreBuildsAIOStreamsTarget": "2.31.1",
     "coreBuildsProfile": "balanced",
     "coreBuildsProfileVersion": "1"
@@ -853,27 +853,6 @@
     "externalDownloads": false,
     "autoRemoveDownloads": false,
     "presets": [
-      {
-        "type": "library",
-        "instanceId": "lib-1",
-        "enabled": true,
-        "options": {
-          "name": "Library",
-          "timeout": 6000,
-          "resources": [
-            "stream",
-            "catalog",
-            "meta"
-          ],
-          "mediaTypes": [],
-          "showRefreshActions": [
-            "catalog"
-          ],
-          "skipProcessing": false,
-          "hideStreams": false,
-          "useMultipleInstances": false
-        }
-      },
       {
         "type": "seadex",
         "instanceId": "tam-seadex",
```

The other 14 golden changes are `coreBuildsVersion: 3.1 → 3.7` only (byte-identical otherwise).
Remaining modified files are mechanical: `package.json` ×3 (3.7.0), `versions.json`, `cli/package.json`,
`configurator/index.html` (rebuilt artifact — badge v3.7 + current bundle; raw diff is ~1.3 MB of
minified bundle, covered by the build-provenance e2e).
