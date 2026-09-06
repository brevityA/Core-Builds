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

## Explicitly NOT done here (per instructions)

- Cross-repo follow-up: the same version-stamp honesty bug in the CoreBuildsApps icon pack — to be filed separately.
