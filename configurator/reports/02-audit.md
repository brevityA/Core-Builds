# 02 — Deep audit of `configurator/`

Audited at branch `arena/01a057d1-core-builds`, base commit `d929aad`.
Upstream reference: `Viren070/AIOStreams@d3ea9bba…` (**v2.33.2**), pinned in
`configurator/UPSTREAM.pin`.

Baseline before any change: `npm test` **378 pass / 0 fail**, `npm run validate`
**29 PASS**, `npm run build` standalone **997 605 bytes**.

Severity: **S1** wrong output the user cannot detect · **S2** wrong output the
user can detect · **S3** stale/dead but inert · **S4** cosmetic / UX.

---

## A. Sorting — the 4K profile does not sort 4K first

### A1 · S1 · Score keys outrank `resolution` in every generated 4K build
**Where:** `src/core/sort-policy.js:3` (pre-change, the single dense line).
**Upstream rule:** `packages/core/src/streams/sorter.ts` builds a numeric vector
per stream from `sortCriteria` and compares it **lexicographically** — the first
index that differs decides the result, and nothing after it is read.

**What was emitted** for the default 4K profile
(`qualityFirst=false, resolutionFirst=false, resolution='4k'`):

```
global: cached → streamExpressionMatched → streamExpressionScore → seadex
      → [service?] → resolution → quality → regexScore → visualTag → …
```

`resolution` is at **index 5**. `streamExpressionScore` at index 2 is a
per-stream number: a 1080p REMUX that scores higher there wins outright, and the
`resolution` key is never consulted.

**Repro (no browser needed):**
```bash
node -e "import('./src/core/sort-policy.js').then(m=>console.log(
  m.sortPolicy({service:'torbox-pro',resolution:'4k'}).global.map(e=>e.key).join(' > ')))"
```
Before the fix this printed `cached > streamExpressionMatched > streamExpressionScore > …`.

**Fix (shipped):** hoist `resolution`, then `quality`, to index 0 of every scope
when the 4K profile is active. `src/core/sort-policy.js` → `resolutionTierFirst()`
+ `applyTierFirst()`.

### A2 · S1 · The cached/uncached split silently voided most of the sort order
**Where:** `src/core/sort-policy.js` (scopes `cachedMovies` / `cachedAnime`),
against `streams/sorter.ts`.

Upstream consults the `cached*` / `uncached*` scoped lists **only when
`primary[0].key === 'cached'`** and the matching scoped list is non-empty. Core
Builds emitted `cached` first *and* populated `cachedMovies` / `cachedAnime` — so
for movie and anime requests, **everything after index 0** of `global` / `movies`
/ `anime` was dead code. `series` had no `cachedSeries`, so it silently behaved
differently from `movies`. That inconsistency alone is a bug.

This is the same trap the Tamtaro guide warns about verbatim: *"If `Cached` is
first item, the sort algorithm automatically goes to Cached & Uncached Sort
Order, nothing else after `Cached` matters in Global Sort Order."*
(<https://www.reddit.com/r/StremioAddons/comments/1n08b4t/>)

**Fix (shipped):** in the 4K profile `resolution` is index 0 in **every** scope,
which disables the split path entirely and makes all scopes behave identically.
`cached` moves to index 2, so cached still beats uncached *within* a tier.

**Documented trade-off:** with the split disabled, an **uncached 2160p now
outranks a cached 1080p**. That is the explicit intent of a 4K-first profile. A
user who prefers instant playback over resolution selects the 1080p profile or
ticks *Quality first*, both of which keep `cached` at index 0.

### A3 · S1 · The Stable output profile discarded the tier fix
**Where:** `src/core/output-profile-policy.js:174` `stableSortCriteria()`, applied
at `:389`.
The Stable profile **replaces** `config.sortCriteria` wholesale with its own
hard-coded `cached → resolution → quality → …` list, so a *Stable 4K* build would
have silently reverted to cached-first even after A1/A2 were fixed.
**Fix (shipped):** `stableSortCriteria()` now applies the same
`resolutionTierFirst(context)` rule, and `outputProfileContext()` was extended to
carry `qualityFirst` / `resolutionFirst` so the opt-out survives.

### A4 · S2 · `1440p` sorted below `720p` in the 4K profile
**Where:** `src/core/device-policies.js:10`.
`preferredResolutions: ['2160p','1080p','720p','Unknown']` omitted `1440p`, and
`excludedResolutions` did not exclude it either. Upstream scores an absent value
`-Infinity`, so every 1440p result sorted **below everything**, including 720p.
**Fix (shipped):** `['2160p','1440p','1080p','720p','Unknown']`.
**Regression guard:** `tests/schema-fixture-sweep.test.mjs` now asserts that in
the 4K profile every value in `AIO_RESOLUTIONS` is either preferred or excluded.

---

## B. Host assumptions

### B1 · S1 · Non-whitelisted regex is HARD-REJECTED, and the app shipped it anyway
**Where:** `src/js/app.js:44-48` — `EXCLUDED_REGEX`, `PREFERRED_REGEX_4K`,
`PREFERRED_REGEX_1080P`, `RANKED_REGEX_COMMON`, `RANKED_REGEX_UHD` are large
hard-coded pattern arrays emitted into every build.
**Upstream rule:** `packages/core/src/utils/config.ts:893-910` collects patterns
from `excluded/required/preferred/ranked` (plus synced) and calls
`RegexAccess.isRegexAllowed`. At `access: 'none'` with an untrusted user, any
non-whitelisted pattern **throws**:
`"You are only permitted to use specific regex patterns, you have N / M regexes that are not allowed…"`.
The **whole save fails** — it is not a soft strip. (Sync *URLs* are different:
`RegexAccess.validateUrls` filters them silently.)

ElfHosted community reports `regexAccess.level: "none"`. So the default Core
Builds 4K template could not be saved there at all.

`src/core/regex-whitelist.js` and `src/data/regex-allowlist.js` already existed
but were wired only as a **UI advisory** (`app.js:5973`) and a manual
`strip-regex` button (`app.js:2737`) — i.e. the app already believed these
patterns were rejected, and shipped them anyway unless the user noticed a warning
and clicked a button.

**Fix (shipped):** `gateConfigForHost()` strips them automatically at the
export/install boundary, using the union of the host's live
`regexAccess.patterns` and the local allowlist snapshot — strictly more
permissive than the pre-existing advisory check, never less.

### B2 · S1 · Torrentio could be exported to a host that refuses it
**Where:** `src/js/app.js:3861-3990` (`build()`), `:3515-3655` (`presets()`),
`src/core/output-profile-policy.js:74`.
`presets()` derives purely from `S.service` / `S.multiServices`. There was **no
host-capability filter anywhere**. `torrentio` and `peerflix` are emitted for the
P2P lane, and ElfHosted disables Torrentio, AnimeKitsu and Torrent Catalogs plus
all P2P and HTTP streams (its own `customHtml`, quoted in 01-research §4).
**Fix (shipped):** the host gate removes disabled presets, de-references them
from `config.groups.groupings`, and adds blocked stream types to
`excludedStreamTypes`.

### B3 · S3 · `debrider` is emitted as a preset upstream cannot resolve
**Where:** `src/js/app.js` `presets()`.
`debrider` is not in the pinned `PRESET_LIST`, so `PresetManager.fromId` cannot
resolve it. **Fix (shipped):** the gate drops any preset whose `type` is absent
from the generated `AIO_PRESET_ID_SET`, on every host.

### B4 · S3 · Version floors are stale
**Where:** `src/data/hosts.js:8` `MIN_AIOSTREAMS_VERSION = '2.32.0'`;
`src/js/app.js:232` `S.aiostreamsVersion = '2.32.0'`;
`src/core/output-profile-policy.js:18`
`AIOSTREAMS_COMPATIBILITY_TARGETS = ['2.31.1','2.32.0','unknown']`.
Every live public host runs **2.33.2**. The floor is only a *minimum*, so it is
permissive rather than wrong, and `AIOSTREAMS_COMPATIBILITY_TARGETS` is asserted
verbatim by existing tests and by the v2.31.1 migration lane.
**Decision: not changed in this pass.** Changing the compatibility targets is a
behavioural change to the legacy migration lane that deserves its own change with
its own fixtures. The host gate now derives min-version behaviour from
`FEATURE_MIN_VERSIONS` and the *probed* version instead, which is the part that
actually affects emitted output. `[UNVERIFIED]` — whether any user is still on a
2.31.1/2.32.0 host; no live host was found on either.

### B5 · S4 · `/manifest.json` is the wrong probe endpoint
An AIOStreams host serves the **PWA** manifest at `/manifest.json`, not an addon
manifest. The correct capability endpoint is `/api/v1/status`. The existing
`checkHostVersion` / `probeHostDetail` already use it; the new
`probeHostCapabilities()` follows suit. Recorded so nobody "fixes" it backwards.

---

## C. Stale / dead / duplicated data

### C1 · S3 · Six emitted config keys do not exist in `UserDataSchema`
`UserDataSchema` (`packages/core/src/db/schemas.ts:504`) is a plain `z.object`
with **153 keys**; unknown keys are **stripped**, not rejected. These Core Builds
keys have zero upstream hits:

| Key | What the user thinks it does | Reality |
| --- | --- | --- |
| `maxResults` | caps total results | dropped; upstream uses `resultLimits` |
| `maxResultsPerResolution` | caps per resolution | dropped; upstream uses `resultLimits` |
| `minSeeders` | seeder floor | dropped; upstream uses `requiredSeederRange` |
| `enhanceResults` | — | dropped |
| `seadexBestOnly` | — | dropped; upstream uses `enableSeadex` |
| `excludedStreamSources` | — | dropped |

**Fix (shipped):** the gate removes them, so the exported JSON matches what the
host will actually store. Migrating `minSeeders → requiredSeederRange` and
`maxResults* → resultLimits` would change filtering behaviour and is deliberately
**out of scope**; it is the highest-value follow-up.

### C2 · S2 · `nzbFailover` is migrated upstream — do not strip it
`packages/core/src/utils/config.ts:719-731` rewrites `nzbFailover` into
`failover { enabled, maxAttempts, position, contentTypes, allowCrossType, parallel }`
*before* `UserDataSchema.safeParse`. An earlier draft of the gate deleted it as
"unknown" and silently lost the user's failover setting.
**Fix:** `LEGACY_MIGRATED_CONFIG_KEYS` in `src/data/host-capabilities.js`
whitelists the six keys upstream still migrates. `addonPassword` and `accessToken`
are migrated upstream too but are **deliberately excluded** — they are
credentials and must never ride along in an export.
**Separate, still open:** the configurator carries `S.maxFailoverNzbs` but emits
`nzbFailover` without a `count`, so the migrated `failover.maxAttempts` is
`undefined` and falls back to the schema default. `[UNVERIFIED]` what the default
is; the user's chosen attempt count is not reaching the host either way.

### C3 · S3 · The upstream contract was restated by hand in ~6 places
Enum values, preset ids, sort keys and config keys were spread across
`src/data/*.js`, `src/core/*.js` and `src/js/app.js` with no link to a specific
upstream version. **Fix (shipped):** Phase 3 — `scripts/sync-upstream.mjs` emits
them from a pinned SHA into `src/data/generated/` and `src/config/generated/`,
and `tests/generated-upstream-contract.test.mjs` fails if they drift.

### C4 · S3 · `ALLOWED_MIGRATION_FIELDS` was never checked against the schema
`src/core/assemble-template.js:3` — ~40 field names, hand-maintained.
The fixture sweep now validates every key that survives the pipeline against the
generated 153-key set, so an entry that stops existing upstream surfaces as a
test failure rather than as a dropped setting.

### C5 · S3 · Unconditional third-party sync URL
`src/core/output-profile-policy.js` (`standaloneOnly`) unconditionally emits
`syncedRankedRegexUrls: ['https://raw.githubusercontent.com/Vidhin05/…']`.
On a `regexAccess: none` host this URL is not on the allowlist and resolves to
nothing, while the template implies a live sync.
**Fix (shipped):** the gate empties the synced-regex URL fields on a
`regexAccess: 'none'` host and reports the removal.

---

## D. Validation gaps

### D1 · S3 · `schema-guard.js` guards two enums out of 153 keys
`src/config/schema-guard.js` is 16 lines and only sanitises
`autoPlay.attributes` and `cacheAndPlay.streamTypes`.
**Fix (shipped):** the generated `unknownConfigKeys()` and `invalidSortCriteria()`
helpers plus the host gate now cover the whole config surface at the emission
boundary. `schema-guard.js` itself is untouched — no behaviour depended on
widening it, and doing so would change output for every existing golden.

### D2 · S2 · No test asserted the product's headline claim
There was no test anywhere that a 4K build actually ranks 4K first.
**Fix (shipped):** `tests/sort-4k-first.test.mjs` runs a **95 256-comparison**
cross product through `tests/helpers/aiostreams-sorter-model.mjs`, a port of the
upstream lexicographic comparator.

### D3 · S3 · Nothing validated emitted enum values against upstream
**Fix (shipped):** `tests/schema-fixture-sweep.test.mjs` sweeps
**host × device × service × resolution** (3 264 combinations) and checks every
emitted resolution / quality / tag / channel / encode / stream-type value against
the generated enums.

---

## E. Data & UX defects

### E1 · S2 · The `tv` formatter emits an unbalanced placeholder
**Where:** `src/data/formatters.js:53`.
```
{stream.resolution::exists["…"||"📺 HD  "]{service.cached::istrue[…
                                         ^ missing }
```
The `{stream.resolution::exists[…]` placeholder is never closed — the only one of
the 19 formatters with this defect. **Fix (shipped):** `]` → `]}`.
**Regression guard:** `tests/schema-fixture-sweep.test.mjs` brace-balances every
formatter `name` and `description`.

### E2 · S4 · Incompatible options gave no reason, only a warning after the fact
`hostCompatCheck()` (`app.js:5938`) produced a good report, but only *after* the
user had already built the config, and it never disabled the offending control.
**Fix (shipped):** blocked options now render inert in place with an inline
`Unavailable — <reason>` line (`.opt-host-blocked` / `.opt-host-note`, added to
layer `06-features.css` so no `!important` is needed and the 7-layer cascade is
preserved). The currently-selected service is never disabled out from under the
user — the panel explains it instead, and the export gate still strips whatever
the host rejects.

### E3 · S4 · Mobile — the gate note is the only new UI, and it wraps
The gate adds one inline line per blocked option and rows inside the existing
collapsible `.hc-box`. No new layout, no new breakpoint, no redesign. Verified by
reading the layer-05 `.opt` rules; **`[UNVERIFIED]` on a real device** — the
mobile Playwright project could not be run here (see F1).

### E4 · S4 · The P2P/HTTP goldens targeted a host that blocks P2P/HTTP
`e2e/golden-configs.spec.mjs` MATRIX pinned every fixture to `elfhosted`,
including `p2p-1080p` and `http-1080p` — a combination ElfHosted refuses.
**Fix (shipped):** those two fixtures now use `fortheweak`.

---

## F. Environment limitations found while auditing

### F1 · Playwright browsers cannot be installed in this sandbox
`npx playwright install chromium` and `chromium-headless-shell` both fail with
`Download failure, code=1` (and `--with-deps` additionally cannot resolve the
font packages). Consequence: the **15 checked-in goldens could not be
regenerated here**, and no e2e spec could be executed. `npm run release` does not
include e2e and is fully green. See 03-changes §"Required follow-up".

### F2 · `curl` and Node's global `fetch()` are blocked; `git fetch` works
This is why `scripts/sync-upstream.mjs` falls back to a shallow
`git init` + `git fetch --depth 1 origin <sha>` + `git show FETCH_HEAD:<path>`,
and why it also accepts `--from <local-checkout>` and `--offline`.
