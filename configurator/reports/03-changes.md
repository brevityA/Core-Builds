# 03 — Changes shipped

Branch `arena/01a057d1-core-builds`, base `d929aad`.
Upstream pinned at `Viren070/AIOStreams@f36d0f93ff088280526ebca1fe3c93e2740b6987`,
which is the commit tag `v2.33.2` resolves to.

No new runtime dependency was added. The app is still a static ES-module site and
the standalone single-file build still works (`configurator/index.html`,
1 020 938 characters after this change, was 997 605 — the figure `scripts/build.mjs`
prints; it counts string length, so the file is 1 025 558 bytes on disk).

---

## 1. Phase 3 — pinned upstream contract

**New:**
* `configurator/UPSTREAM.pin` — repo, SHA, version, and the five source files read.
* `configurator/scripts/sync-upstream.mjs` — the extractor CLI.
* `configurator/scripts/lib/upstream-extract.mjs` — pure extraction + emission.
* `configurator/src/data/generated/aiostreams-enums.js`
* `configurator/src/data/generated/aiostreams-presets.js`
* `configurator/src/config/generated/aiostreams-config-schema.js`
* `configurator/src/config/generated/aiostreams-sort-schema.js`
* `configurator/src/config/generated/upstream-snapshot.json`

Every generated file opens with
`// DO NOT EDIT — generated from AIOStreams d3ea9bba…`, names the version, and
says how to regenerate. **Extracted:** 153 config keys, 12 sort scopes, 25 sort
criteria, 7 score keys, the cached-split rule, every addon preset id, and 12
enums (resolutions, qualities, visual/audio tags, channels, encodes, stream
types, services, formatters, proxies, resources, passthrough stages).

**The pin must name a release.** `ref` has to be a tag and `sha` has to be the
commit that tag resolves to; `sync-upstream.mjs` proves this with `git ls-remote`
on every networked run and refuses a branch ref, and
`tests/generated-upstream-contract.test.mjs` enforces the offline half. This is
not hypothetical — the first version of this pin claimed `"version": "2.33.2"`
while its sha was a docs-only commit near the tip of `main`, which is three
config keys, two enum members and a preset *ahead* of the release
(`manifestNotice`, `linkedAccounts`, `PCM`, `MPEG-4`, `usa-tv-next`). Since every
generated header carries the sha, the entire contract was misattributed and the
drift report diffed against an arbitrary point instead of a release boundary.

**Flags:** `--accept`, `--check`, `--offline`, `--sha <sha>`,
`--from <local-checkout>`. Network path is HTTPS `fetch()` with a shallow
`git fetch --depth 1 origin <sha>` fallback (this sandbox blocks `fetch()`; see
02-audit §F2). It prints a per-key drift report against the previous pin with
member-level `+`/`-` for arrays, and **exits non-zero when the schema changed and
was not accepted**.

**npm scripts:** `sync:upstream` (regenerate + accept) and `sync:upstream:check`
(CI guard). Workflow documented in `configurator/README.md` → *Upstream sync*.

**Reproducibility, verified:** running `--accept` twice prints
`Generated files already byte-identical — nothing written`; `--check` prints
`Generated files match the pinned contract.`; `--offline --accept` produces the
same bytes as the live path (`sortedKeys()` makes the emission order-independent).

**Overrides are separate modules, merged at load** — nothing generated is ever
hand-edited. Today that is `src/data/host-capabilities.js`, consumed by
`src/core/host-capability-policy.js`.

## 2. Phase 4 — host-capability registry and gate

**New:** `src/data/host-capabilities.js`, `src/core/host-capability-policy.js`.

*Registry* (`host-capabilities.js`) records, per host key: label, kind
(community / private / nightly / vendor / self-hosted), disabled preset ids,
blocked stream types, `regexAccess` level, rate-limit flag, whether a probe is
required before the host can be trusted, and one-line reason strings. It also
holds `FEATURE_MIN_VERSIONS` (only entries datable from the upstream CHANGELOG:
`variants`/`activeVariants` 2.33.0, `variantSelectorLocation` 2.33.2),
`LEGACY_MIGRATED_CONFIG_KEYS`, and `KNOWN_DEAD_CONFIG_KEYS`.

*Policy* (`host-capability-policy.js`), pure and credential-free:
* `parseHostStatus(body)` — normalises `/api/v1/status`; returns `null` for a PWA
  manifest or anything unrecognised; copies no field it was not asked for.
* `resolveHostCapabilities(key, probe, opts)` — merges registry + probe. **The
  stricter side always wins**, so a stale registry can never be more permissive
  than the live host. An unprobed owner-configured host resolves to
  `confirmed: false`.
* `hostOptionGate(caps)` — `[{ option, scope, action, reason }]`; `action` is
  `disable`, `hide`, or `confirm`. Every entry carries exactly one reason line.
* `gateConfigForHost(config, caps)` / `gateTemplateForHost(template, caps)` —
  returns `{ config, removals }`, never mutates the input, and is idempotent.

**Synced regex URLs are a second, independent allowlist.** `regexAccess: 'none'`
does not mean "no regex" — it means "only what this host publishes". Upstream
checks the two separately: inline patterns through `isRegexAllowed()`, synced
URLs through `validateSyncedRegexUrls()` → `RegexAccess.getAllowedUrls()`, and
the URL path **throws** `Forbidden URL(s) in regex configuration: …` rather than
quietly ignoring the entry. ElfHosted runs `'none'` and still allows five URLs,
one of which is the Vidhin05 ranked-regex feed this configurator emits in three
profiles. An earlier version of this gate cleared the synced fields wholesale on
any `'none'` host and so deleted a feature the host sanctions.

The gate now filters instead. `parseHostStatus` records
`regexAccess.urls`; the registry carries a hand-verified fallback list, because
ElfHosted sends no `Access-Control-Allow-Origin` and the browser probe therefore
fails in exactly the deployment that ships to users — probe-only data would
leave the gate at its most destructive there. When no allowlist is available at
all the gate **removes nothing** and raises a warning instead: absence of data is
not evidence of prohibition, and a named upstream rejection is far more
recoverable than a silent deletion. `gateConfigForHost` returns
`{ config, removals, warnings }`, and warnings render amber in the Host
Compatibility panel under *May be rejected on save*, visually distinct from
removals.

**What the gate removes:** keys absent from the pinned schema (except the six
legacy keys upstream still migrates); keys needing a newer AIOStreams than the
probed version; presets the host disables; presets upstream cannot resolve (this
catches `debrider`); blocked stream types (added to `excludedStreamTypes`,
removed from `preferredStreamTypes`); regex the host would reject, using the
union of the host's live `regexAccess.patterns` and the local allowlist; and
synced-regex URLs on a `regexAccess: 'none'` host. Removed presets are also
de-referenced from `config.groups.groupings`.

**Where it runs (`src/js/app.js`):** as the **last** step of `buildFinal()`,
after `applyOutputProfile()`, and in the `?cb-e2e=1` generation hook so the
goldens exercise the identical boundary. `buildFinal()` is the single source for
the full JSON download, every partial export, and
`sanitizeTemplateForRemoteImport(buildFinal())` for direct install — so all three
paths are gated by construction.

**Probing:** `probeHostCapabilities()` reuses the existing `raceHostFetch`
plumbing, is fire-and-forget on host change, caches per host key **in memory
only**, and never throws. When it fails, the registry defaults stand and the gate
emits a `confirm` entry asking the user to confirm the host — the
CORS/offline fallback the brief requires.

**UI:** blocked options render **in place but inert** — `.opt-host-blocked` +
an inline `Unavailable — <reason>` line, `input` disabled, `aria-disabled`,
`title` set. The currently-selected service is never disabled out from under the
user. A `hostGateHtml()` block inside the existing collapsible *Host
Compatibility* box lists the gate entries and everything the last build removed.
Styles are 9 rules appended to `src/styles/06-features.css` — layer 06 lands
after layer 05's `.opt` rules, so no `!important` and no cascade change.

## 3. Phase 5 — 4K-first sorting

> **Scope.** Everything in this section applies to the **4K, Mixed and Ultrawide**
> profiles. The **1080p** profile hard-excludes `2160p` and `1440p` through
> `applyNativeFilters()` (`output-profile-policy.js:326-333`) on the Stable and
> Balanced output profiles, so 4K never reaches the sorter and there is nothing
> here to reorder — a 1080p user sees no change from this work. That exclusion
> is pre-existing (byte-identical on `d929aad`, last touched by `2467612c`),
> intended, and left in place; §4 covers the disclosure added instead.

**`src/core/sort-policy.js`** — rewritten around the existing dense generator
rather than replacing it. New exported predicate `resolutionTierFirst(input)`:
true when `resolution === '4k'` and the user has not opted out with
`qualityFirst`. `applyTierFirst()` then hoists `resolution`, then `quality`, to
index 0 of **every** scope.

Hoisting every scope is not optional: upstream picks `sortCriteria.movies` /
`.anime` over `.global` for those request types and, when `cached` leads, ignores
the primary list entirely in favour of `.cachedMovies` / `.uncachedMovies`.
Hoisting only `global` would have been a no-op for movie and anime queries.

**`src/core/output-profile-policy.js`** — `stableSortCriteria()` applies the same
rule, so a *Stable 4K* build cannot revert to cached-first.
`outputProfileContext()` in `app.js` now carries `qualityFirst` /
`resolutionFirst` so the opt-out reaches it.

**`src/core/device-policies.js`** — the 4K profile's `preferredResolutions` gains
`1440p` between `2160p` and `1080p` (02-audit §A4).

**Result** for the default 4K profile:
```
resolution → quality → cached → streamExpressionMatched → streamExpressionScore → …
```
1080p profile is untouched (`cached → …`, `preferredResolutions[0] === '1080p'`),
and `resolutionFirst` there remains an explicit user choice.

**This is the template/sort layer, not a UI reorder.** `config.sortCriteria` *is*
what AIOStreams evaluates; it is emitted by the same generator that produces the
`Expressions/` and `Filtering/` payloads and travels in the exported JSON.
A duplicate score-based tier term in the ranked-expression layer was considered
and rejected: `streamExpressionScore` is compared by the same lexicographic
walk, so a score-based guard would be fighting the exact mechanism the criteria
order already settles, while inflating the payload and colliding with the
existing IQR scoring.

**Documented trade-off:** disabling the cached split means an **uncached 2160p
outranks a cached 1080p** in a 4K build. `cached` sits at index 2, so cached
still wins *within* a tier. Users who prefer instant playback pick the 1080p
profile or *Quality first*.

## 4. Other fixes

* **`src/data/formatters.js:53`** — the `tv` formatter's opening
  `{stream.resolution::exists[…]` placeholder was never closed (`]` → `]}`).
  It was the only unbalanced template of the 19.
* **The 1080p hard lock is now disclosed** (`src/js/app.js` `resolutionLockNote()`).
  `applyNativeFilters()` adds `2160p`/`1440p` to `excludedResolutions` for a
  1080p build on Stable and Balanced, so 4K is discarded before sorting. That is
  intended — the card says *"Hard lock · 2160p excluded"* and bandwidth-capped
  users rely on it — but it was reported on 2026-08-31 as *"the show isn't giving
  any 4k results"*, and the ranking work in this PR cannot help. An amber note on
  the resolution step and on the review step names **Mixed · Adaptive** as the
  route to "1080p first, 4K when it exists". Two things worth recording: the lock
  is **profile-scoped** (Advanced and Labs keep 4K), which is why the reporter's
  Stable→Balanced switch changed nothing; and `requiredResolutions` is **not** a
  second exclusion path, because `applyOutputProfile` resets it to `[]` first.
  Covered by `tests/resolution-lock-disclosure.test.mjs` (7 tests), which pins
  both the lock and the disclosure.
* **`e2e/golden-configs.spec.mjs`** — the `p2p-1080p` and `http-1080p` fixtures
  now target `fortheweak` instead of `elfhosted`, which disables P2P and HTTP.

## 5. Phase 6 — tests

`npm test`: **378 → 484** (`+106`), 0 failures.

| New file | Tests | Covers |
| --- | --- | --- |
| `tests/generated-upstream-contract.test.mjs` | 19 | pin shape, DO-NOT-EDIT headers, no credential values, generated dir contents, module ⇄ snapshot equality, internal consistency, `unknownConfigKeys` / `invalidSortCriteria` / `isKnownPresetId`, and that no state the sort policy can reach emits an invalid criterion |
| `tests/sort-4k-first.test.mjs` | 18 | the tier guarantee, incl. a **95 256-comparison** 2160p × 1080p cross product over quality × HDR × audio × bitrate × size × seeders × SEL score × regex score × cached, plus tier partitioning, within-tier ordering, the 1080p profile, the `qualityFirst` opt-out, the free lanes, `libraryBoost`, and the Stable profile |
| `tests/schema-fixture-sweep.test.mjs` | 13 | device × service × resolution × host = **7 480** gated combinations (11 × 10 × 17 × 4) validated against the pinned enums and the 153-key schema; formatter ids, placeholder balance and credential shapes; size/bitrate range shapes |
| `tests/host-capability-policy.test.mjs` | 49 | version compare, probe parsing, registry merge, a 13-row host × option gate matrix, one-line reasons, the export gate (unknown keys, legacy keys, presets, stream types, regex, synced URLs), idempotence, and — over the 15 real golden configs × 5 hosts — that nothing a host rejects can survive |
| `tests/helpers/aiostreams-sorter-model.mjs` | — | port of the upstream lexicographic comparator; throws on any criterion it does not implement, so it cannot silently drift |
| `e2e/host-capability.spec.mjs` | 7 | ElfHosted export contains no Torrentio / dead key, a permissive host keeps what ElfHosted blocks, the disabled-with-reason UI, 4K tier-first and 1080p cached-first end to end, direct-install payload shape, no credential in a generated template |

## 6. `npm run release` — full output

```
> core-builds-configurator@2.99.0 release
> npm test && npm run validate && npm run build

> core-builds-configurator@2.99.0 test
> node --test tests/*.test.mjs

… 484 subtests …
1..484
# tests 484
# suites 0
# pass 484
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5691.536023

> core-builds-configurator@2.99.0 validate
> node scripts/validate.mjs

PASS schema guard
PASS device policies
PASS host registry
PASS sort policy
PASS filter policy
PASS addon policy
PASS template assembly
PASS output profiles
PASS feature conflicts
PASS import template
PASS update check
PASS regex whitelist
PASS SEL policy
PASS IQR expression
PASS core score policy
PASS credential registry
PASS quick install key links
PASS quick install optional TMDB
PASS TMDB-free config compatibility
PASS Quick Install manifest lifecycle
PASS Fine-Tune pop-out lifecycle
PASS Advanced extras carousel
PASS advanced playback controls
PASS partial exports
PASS Core Tools links
PASS cache-busted web assets
PASS version badge placeholder
PASS module shell
PASS Cinebye fallback allowed by CSP
PASS external source CSS
PASS balanced CSS
PASS tutorial runtime
PASS multi-provider quick install
PASS e2e golden generation hook

> core-builds-configurator@2.99.0 build
> node scripts/build.mjs

Built standalone: 1020938 bytes
Built web assets: 809648 JS bytes, 173262 CSS bytes
```
Exit code **0**.

```
$ node scripts/sync-upstream.mjs --check
No schema drift. Generated files are already up to date.

Generated files match the pinned contract.
```

## 7. Self-check gates

| Gate | Result |
| --- | --- |
| 2160p outranks a higher-bitrate 1080p REMUX in every fixture | ✅ 95 256 comparisons, 0 inversions |
| The 1080p profile still defaults to 1080p-first | ✅ asserted |
| An ElfHosted-community export can never contain Torrentio or a rejected key | ✅ asserted over all 15 goldens |
| Re-running `sync-upstream.mjs` reproduces the generated files byte-for-byte and the drift report names the pinned SHA | ✅ verified in `--accept`, `--check` and `--offline` modes; the pin is additionally proven to be the `v2.33.2` tag commit |
| `npm run release` — zero failures | ✅ 484/484, 29 PASS, build OK, exit 0 |
| Every competitor and user claim backed by a fetched URL | ✅ see 01-research; the one unreachable tool is marked `[UNVERIFIED]` |
| No credential logged, persisted, or written to a generated file or report | ✅ asserted by tests in three suites |

## 8. The e2e goldens — refreshed in-branch

**Done.** All 15 files in `configurator/e2e/golden/` have been regenerated and
committed. They are regenerated output, and the sort, device-policy and
host-gate changes above alter them by design (+287 / −724 lines).

Playwright's browser CDN is unreachable from this sandbox (`npx playwright
install chromium` → `Download failure, code=1`), so a Chromium build was
obtained from the npm registry instead (`@sparticuz/chromium`) and driven
through a config that only overrides `launchOptions.executablePath`. Everything
else — `playwright.config.mjs`, the global setup, the web server, the specs —
is the repository's own. To reproduce on a normal machine:

```bash
cd configurator
npm ci && npx playwright install chromium
npm run build
UPDATE_GOLDEN=1 npx playwright test e2e/golden-configs.spec.mjs --project=desktop
npx playwright test                # full e2e, incl. e2e/host-capability.spec.mjs
```

What changed in the goldens, and why:

| Change | Count | Cause |
| --- | --- | --- |
| `maxResults`, `maxResultsPerResolution`, `seadexBestOnly`, `excludedStreamSources` removed | 15 files each | keys with zero hits in upstream `UserDataSchema` — stripped by the host gate |
| `enhanceResults` removed | 13 | same |
| `excludedStreamTypes` added | 13 | the supported replacement for `excludedStreamSources` |
| `minSeeders` removed | 1 | same class of unknown key |
| regex `pattern`/`name` entries removed | 72 | ElfHosted-class hosts run `regexAccess: none`; unwhitelisted patterns make upstream **reject the whole save** |
| `score` entries removed | 66 | dependents of the removed regex rules |
| `sortCriteria` reordered to `resolution, quality, …` | all 4K profiles | Phase 5 |
| `preferredResolutions` gains `1440p` | all 4K profiles | audit finding §B3 |
| `nzbFailover` **kept** | — | upstream migrates it (`utils/config.ts:719-731`), so it is legal input |
| `syncedRankedRegexUrls` **kept** | 3 | the Vidhin05 feed is on ElfHosted's published allowlist; an earlier build wrongly cleared it |

The 1080p profiles are correctly unchanged in sort shape: `global[0]` is still
`cached` and `preferredResolutions` is still `1080p, 720p, Unknown`.

### Full e2e result

**Green on CI, with a caveat worth reading.** The `Configurator Playwright E2E`
job runs 142 tests across the `desktop` and `mobile` projects. Run
`33404883715` (5m06s) reports **139 passed, 3 flaky, 0 failed** — the job is
green and all 11 PR checks pass, but "flaky" means the spec failed its first
attempt and passed on the single CI retry:

* `[desktop] express-install.spec.mjs:100` — Express Install → Stremio push
* `[mobile] express-install.spec.mjs:71` — Express door splash route
* `[mobile] security-sinks.spec.mjs:44` — C3, remote error renders a reason
  message, never markup or `[object Object]`

None of these three files was modified by this branch, and the two runs before
it reported no flakes at all on the same specs — the set varies per run, which
points at CI timing rather than a defect. `security-sinks.spec.mjs:44` was run
three times locally against this build and passed every time. But the `github`
reporter that surfaces this was only added in this PR, so **there is no
historical flake data for `main` to compare against, and I cannot prove these
were flaky before this branch.** Treat it as an open question, not a cleared
one. Flake rate is worth watching over the next few merges.

Two things had to change to get there, both real:

1. `e2e/stability.spec.mjs:82` clicked the `p2p` extras card, which the new
   host-capability gate correctly renders inert on the default ElfHosted host.
   The spec now selects `debridio` — a source that host does serve — and
   additionally asserts the gated cards remain present and unselectable.
2. The gate was only wired into the `std()` option renderer. P2P and HTTP are
   offered as `.opt-scraper-card` entries in the extras carousel, which bypassed
   it entirely, so a user could still pick a source ElfHosted refuses and have
   it silently stripped at export. The carousel, the additional-services
   overlay, and the service rows now all render the gate.

Locally in the authoring sandbox six of those runs fail on
`expect(errors).toEqual([])` collecting `net::ERR_CONNECTION_CLOSED` — there is
no outbound network there, so every external asset fetch fails. Confirmed
environmental by running the same three specs against the unmodified base
commit `d929aad` in a separate worktree: identical failures. CI, which has
network, passes them.

`playwright.config.mjs` now also loads the `github` reporter under CI, so a
failing spec is annotated onto the PR diff instead of being reachable only by
downloading the HTML report artifact.

`npm run release` is `test → validate → build` and does **not** include e2e, so
the release gate is green as pasted above independently of this.

## 8b. Release

Configurator **2.99 → 3.0**, dated Sep 1 2026. A major bump because the 4K sort
default changes ranking for every existing 4K user rather than adding an opt-in.

`scripts/validate.mjs:81` ("version consistency") couples four files, and the
15 goldens embed the number in `metadata.coreBuildsVersion`:

| File | Change |
| --- | --- |
| `src/js/app.js:39` | `CONFIGURATOR_VERSION` `'2.99'` → `'3.0'` (also feeds `TEMPLATE_VERSION`) |
| `src/data/changelog.js` | new 7-item `v:'3.0'` entry at the head |
| `configurator/package.json` | `2.99.0` → `3.0.0` |
| `versions.json` (repo root) | `configurator` → `3.0.0` — outside `configurator/`, but `validate.mjs` reads it and fails otherwise |
| `e2e/golden/*.json` | 15 files, version stamp only (+15/−15) |

**Deliberately not touched.** `tools/index.html` and `docs/changelog.mdx` carry
the same notes but sit inside `AUTO:TOOLS_WHATSNEW` / `AUTO:RECENT_RELEASES`
markers regenerated by `scripts/sync-docs.py`, whose workflow triggers on
`configurator/src/data/changelog.js` — hand-editing them would be overwritten.
`cli/package.json` and `packages/core/package.json` also read `2.99.0`, but they
are separately published packages whose contents this PR does not change, and
nothing enforces that they track the configurator; bumping them would assert a
release that did not happen.

`templateSuite` stays **3.6.2** and root `CHANGELOG.md` is unchanged — this is a
configurator-only release.

### The version bump exposed a break that had been invisible since commit 1

`.github/workflows/supporting-js-ci.yml` only runs on `account-tools/**`,
`cli/**`, `packages/core/**`, `cloudflare-worker/**` or `versions.json`. Every
commit before this one touched **only** `configurator/**`, so that workflow had
never fired on this branch. Bumping `versions.json` fired it, and it went red.

The cause was not the version. `packages/core/` is a hand-maintained duplicate
of the configurator's generator that the CLI consumes, and
`cli/tests/package-equivalence.test.mjs` diffs CLI output against **these same
15 golden fixtures**. Regenerating the goldens in commit 1 therefore broke the
CLI contract immediately — the CLI was still emitting cached-first sorting, a
4K list without `1440p`, the five dead keys and the ungated regex set. Merging
would have put a red `supporting-js-ci` on `main` for the next person to touch
`cli/`.

Ported into `packages/core/`, mirroring the configurator module for module:

| Change | Files |
| --- | --- |
| 4K tier-first sorting | `sort-policy.js` (now byte-identical to the configurator's) |
| `1440p` in both copies of the 4K resolution list | `device-policy.js`, `output-profile-policy.js` |
| Stable-profile tier-first | `output-profile-policy.js` |
| Host-capability gate | new `host-capability-policy.js`, `host-capabilities.js`, `regex-whitelist.js`, `regex-allowlist.js`, `generated/{aiostreams-config-schema,aiostreams-presets}.js` |

`cli/index.js` applies the gate at the same point `buildFinal()` does and reports
each removal on stderr. The CLI has no host state, so it defaults to the host the
wizard defaults to and steps off it when that host cannot serve the requested
source — ElfHosted disables P2P and HTTP, so a `--service p2p` build would
otherwise have had its own addons stripped. An explicit `--host` governs the gate.
The choice is resolved from the capability registry, not hardcoded.

Two CLI tests asserted `minSeeders`, which is not a key in the pinned
`UserDataSchema` and never reached the instance. They now assert it is absent,
and the P2P one additionally asserts the build still ranks on `seeders` — the
behaviour that assertion was really protecting.

Full suite after the port: pytest **290**, `packages/core` **35**, `cli` **74**,
`account-tools` **62**, worker **42**, configurator **484**, e2e **142**.

Note for whoever runs it: `npm run release` is `test → validate → build`, so on a
version bump the version-badge test reads the *previous* build and fails. Run
`npm run build` once first. Pre-existing ordering quirk; it only bites on a bump.

## 9. Remaining `[UNVERIFIED]` / out of scope

* `npm run release` (484/484) and the e2e job are green on CI, but three e2e
  specs passed only on retry in the green run and there is no pre-branch flake
  baseline to compare against (§8).
* Mobile rendering of the new gate note was reasoned about, not observed on a
  device (02-audit §E3).
* TorBox-hosted AIOStreams capability details — no publicly readable status
  endpoint was found; the registry marks it `unverified` and `requiresProbe`.
* Duck Tools "QuackStart" — the successor domain 404s; no feature claim is made.
* `minSeeders → requiredSeederRange` and `maxResults*  → resultLimits` migrations
  (02-audit §C1) would change filtering behaviour and were left out deliberately.
  Highest-value follow-up.
* `maxFailoverNzbs` never reaches the host (02-audit §C2).
* `MIN_AIOSTREAMS_VERSION` / `AIOSTREAMS_COMPATIBILITY_TARGETS` remain at
  2.31.1/2.32.0 (02-audit §B4). Whether any user is still on such a host is
  `[UNVERIFIED]`; no live host was.
