# 03 — Changes Shipped

Upstream pinned at AIOStreams **v2.33.2** / `f36d0f93ff088280526ebca1fe3c93e2740b6987`.
All work is inside `configurator/` except one line added to the repo-root `.gitignore`.

---

## Summary

| Phase | Shipped | Verification |
| --- | --- | --- |
| **3** | Pinned upstream schema sync + generated modules + drift gate | Byte-for-byte reproducible; injected drift exits 2 |
| **4** | Host-capability registry, probing, and export gating | 26 unit tests + 576-combination sweep + 12 e2e |
| **5** | 4K-first default sort | 13 unit tests (>400 comparisons) + 6 e2e |
| **6** | Unit, sweep, formatter, and Playwright coverage | 435 unit · 152 e2e · `npm run release` clean |

**Test counts:** 378 unit before → **435 after** (+57). E2E 128 → **152** (+24). Zero failures.

---

## Files

### New

| File | Purpose |
| --- | --- |
| `UPSTREAM.pin` | The reviewed upstream commit everything is generated from |
| `scripts/sync-upstream.mjs` | Extracts upstream vocabulary → generated modules; drift report |
| `src/data/generated/aiostreams-schema.js` | Generated enums, preset IDs, formatter vocabulary, limits |
| `src/config/generated/upstream-guard.js` | Generated `validateAgainstUpstream()` + `validateFormatterTemplate()` |
| `src/data/overrides/host-capabilities.js` | Hand-written 8-host snapshot + `FEATURE_MIN_VERSION` |
| `src/core/host-capability.js` | Resolve / probe / gate |
| `tests/lib/upstream-sorter.mjs` | Port of upstream `sorter.ts` at the pinned SHA, for testing |
| `tests/sort-4k-first.test.mjs` | 13 tests — adversarial fixture matrix |
| `tests/host-capability.test.mjs` | 26 tests — host × option matrix + the ElfHosted gate |
| `tests/upstream-schema-sweep.test.mjs` | 12 tests — schema integrity + 576-combination sweep |
| `tests/formatter-vocabulary.test.mjs` | 7 tests — all 19 formatters vs the pinned vocabulary |
| `e2e/host-capability.spec.mjs` | 12 specs — host gating, export shape, 4K-first, credentials |
| `reports/0{1,2,3}-*.md` | Research, audit, this document |

### Modified

| File | Change |
| --- | --- |
| `src/core/sort-policy.js` | `UHD_TIER`, `isResolutionTierFirst()`, `resolutionTierRank()`, `hoistResolution()` |
| `src/js/app.js` | Host gating in `buildFinal()` + the e2e hook; probe on host change; capability note; removal reasons in preflight |
| `src/styles/06-features.css` | `.host-cap-*` styles, both themes |
| `package.json` | `sync:upstream`, `sync:upstream:write` |
| `README.md` | Sync workflow + host registry docs; version 2.97.0 → 2.99.0 |
| `e2e/golden/*.json` (4) | Re-recorded for the intended sort/gating changes |
| `../.gitignore` | Ignore `configurator/.upstream-cache/` |

---

## Phase 3 — Pinned schema sync

`scripts/sync-upstream.mjs` fetches upstream sources at a **40-character SHA** (never a branch),
caches by SHA under `.upstream-cache/`, and emits two modules with a
`DO NOT EDIT — generated from AIOStreams <SHA>` header.

Extracted: 25 sort keys, 10 sort buckets, 10 resolutions, 14 qualities, 18 services, 8 formatters,
**78 preset IDs**, 6 formatter field namespaces, **49 formatter modifiers**, 7 comparators, limits.

Flags `--write --accept --ref --offline`. Exit **0** no drift · **1** extraction error ·
**2** unreviewed drift.

**Verified:**
- Reproducible — two `--write` runs give identical md5s.
- Verify mode: *"No schema drift. Generated output matches the reviewed pin."*, exit 0.
- Injected a fake enum member → reported the drift, named the pinned SHA, exit **2**; restored → clean.

Two extraction bugs were found and fixed during this work:

1. **`replace` and `truncate` were missing.** They live in the `compileParameterised()` switch,
   not in any modifier object literal. The first extractor read only the literals, so it would
   have rejected nearly every formatter Core Builds ships. The extractor now reads both, with a
   sanity check that fails loudly if `replace` ever goes missing again.
2. **Phantom drift.** New fields were emitted but not read back for comparison, so every run
   reported `undefined -> value` — drift `--accept` could never clear, which trains people to
   ignore the gate. Fixed, plus a self-check that exits 1 if any emitted field is unread.

## Phase 4 — Host-capability registry

**Resolution order** (most trusted last): permissive default → recorded snapshot → live probe.

`applyHostCapability()` runs in **`buildFinal()`**, the single chokepoint for both JSON export and
direct install, so neither path can bypass it. It removes disabled addons, blocked stream types,
non-allowlisted regex/SEL URLs and patterns, version-gated keys, and over-cap counts — each with a
one-line reason surfaced in preflight warnings and under the host picker.

Three details that decide whether this is correct:

- **`DISABLED.disabled`, not list membership.** ElfHosted's `presets[]` *does* list `torrentio`.
  Reading the ID list gives the opposite of the truth. Pinned by a test.
- **The snapshot wins for stream types.** The status endpoint does not expose them, so a
  successful probe must not silently re-enable P2P on a host that refuses it.
- **`regexAccess: 'none'` is not a ban.** Upstream validates synced URLs against
  `regexAccess.urls` and inline patterns against `regexAccess.patterns` — both allowlists the
  host publishes. ElfHosted is level `'none'` yet allows 5 URLs (including the Vidhin05 feed
  Core Builds already emits) and 257 patterns. An earlier version of this gate treated the level
  as a blanket ban and stripped ~600 lines of legitimately-permitted config from four golden
  fixtures. Caught by the golden diffs; the gate now filters against the allowlists, and where a
  host publishes none, nothing is removed — absence of data is not evidence of prohibition.

Probing is best-effort: no host sends CORS headers, so browser probes fail and the snapshot stays
in force. `probeHost()` never throws, never sends credentials (`credentials: 'omit'`, asserted),
and has a 4 s timeout.

## Phase 5 — 4K-first default sort

Upstream `sorter.ts` compares sort keys **lexicographically**: the first differing key wins
outright. `resolution` previously sat at index 4–5 behind `cached` and `streamExpressionMatched`,
so a cached 1080p REMUX beat an uncached 2160p before resolution was ever consulted.

`resolution` is now hoisted to **index 0** for the 4K profile, applied through a `finish()`
wrapper on every return path so no branch can bypass it. Existing ordering within a tier is
preserved; all other keys keep their relative order.

Both halves of the guarantee are asserted, because hoisting alone is not enough — upstream ranks
resolution by **index into `preferredResolutions`**, so the ladder must also lead with `2160p`.

**Accepted side effect:** with `resolution` first, `cached` no longer is, so upstream's
cached/uncached split no longer triggers for 4K and an uncached 2160p outranks a cached 1080p.
That is the literal requirement, and the test name says so rather than hiding it.

**Unchanged:** `1080p` (still 1080p-first), `mixed`/`apex-mixed` (blending is the point), and
`ultrawide`. Users can opt out with `resolutionTierFirst: false`.

**`ultrawide` — a finding, not a fix.** An e2e assertion that passed in Node failed against the
real pipeline, exposing that `device-policies.js` (1080p-first), `output-profile-policy.js`
(4K-first) and the UI copy ("1080p → 1440p → 4K") all disagree, with `applyOutputProfile()`
running last and winning. Resolving that is a user-visible change to a tier this work was not
scoped to touch, so `ultrawide` keeps its existing chain, the no-change decision is pinned by
tests in both layers, and audit §2.8 records it. An earlier code comment justified the exclusion
on incorrect grounds; that comment has been corrected.

## Phase 6 — Tests

| Suite | Tests | Covers |
| --- | --- | --- |
| `sort-4k-first` | 13 | 5×3 fixture matrix × 9 profiles × all buckets, >400 comparisons via the upstream sorter port |
| `host-capability` | 26 | Registry shape, version gating, host × option matrix, probe failure modes, ElfHosted gate |
| `upstream-schema-sweep` | 12 | Pin/header integrity + **576** device × service × resolution × host combinations |
| `formatter-vocabulary` | 7 | All 19 shipped formatters vs the pinned field/modifier/comparator vocabulary |
| `e2e/host-capability` | 12 | Host gating, export payload shape, credential confinement, 4K-first through the browser |

Three tests exist specifically to stop the others passing vacuously: the fixtures *would* fail
ungated; `validateAgainstUpstream` *does* reject each thing it claims to; the formatter
vocabulary *is* non-empty.

Two assertions were corrected after checking the source rather than forcing the code to match:

- **Credentials.** The exported template *must* carry the user's keys or the config cannot
  authenticate. The real constraint — verified — is that keys never reach metadata, presets,
  expression strings, the analytics beacon, or localStorage. The test now asserts that.
- **Size caps.** The 150 GB 4K cap looked like a violation of `MAX_SIZE`, but upstream's Zod
  schema enforces only `min(0)`; `MAX_SIZE` is a slider bound. It is now a **warning**, not an
  error — flagging it as invalid would block configs hosts accept.

---

## Self-check gates

| # | Gate | Result |
| --- | --- | --- |
| 1 | 2160p outranks higher-bitrate 1080p REMUX in every fixture | ✅ >400 comparisons |
| 2 | 1080p profile still defaults to 1080p-first | ✅ unit + e2e |
| 3 | ElfHosted export can never contain Torrentio or a rejected key | ✅ unit + 576-sweep + e2e |
| 4 | `sync-upstream.mjs` reproduces byte-for-byte; drift names the pinned SHA | ✅ identical md5s; injected drift exits 2 |
| 5 | `npm run release` zero failures | ✅ below |
| 6 | Every competitor/user claim backed by a fetched URL | ✅ report 01; unreachable sources marked `[UNVERIFIED]` |

---

## `npm run release` — full output

```
> core-builds-configurator@2.99.0 release
> npm test && npm run validate && npm run build

> core-builds-configurator@2.99.0 test
> node --test tests/*.test.mjs

TAP version 13
...
# tests 435
# suites 0
# pass 435
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5029.060166

> core-builds-configurator@2.99.0 validate
> node scripts/validate.mjs

PASS single current release
PASS version consistency
PASS host metadata coverage
PASS minimum host version
PASS device defaults
PASS device grid layout
PASS Apple TV AV1 conservative
PASS ONN DV conservative
PASS schema guard wired
PASS remote import credential sanitizer wired
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

Built standalone: 1020604 bytes
Built web assets: 809247 JS bytes, 173328 CSS bytes
```

**435 unit tests · 29 validation checks · build clean · exit 0.**

Playwright (run separately, `npm run test:e2e`): **152 passed** across desktop and mobile.

---

## Not shipped (documented in audit 02)

Each of these is a real defect left deliberately, because fixing it is a user-visible behaviour
change outside this work's scope and belongs in its own reviewed commit:

- **§2.3** `debrider` is emitted as a preset type but is not in upstream's `PRESET_LIST` — invalid
  on every host. Now detectable by `validateAgainstUpstream()`.
- **§2.4** Every `pin()` Core Builds emits is inert: `filterer.ts` collects pin instructions only
  from the excluded/required selectors, never from Preferred SELs.
- **§2.5** `MIN_AIOSTREAMS_VERSION` is `2.32.0` and `AIOSTREAMS_COMPATIBILITY_TARGETS` has no
  2.33.x, while all 8 hosts run 2.33.2.
- **§2.6** `'Bluray REMUX'` vs upstream `'BluRay REMUX'` in three modules.
- **§2.8** The `ultrawide` ladder contradiction described above.
- **§2.10** The 150 GB 4K cap (warning-level; imports fine).

## `[UNVERIFIED]`

- **Duck Tools / QuackStart** — `duck-tools.app` returns 404; no capability claims made.
- **`quality()` case-sensitivity** — Tamtaro's widely-used PSEs also write `'Bluray REMUX'`, which
  suggests matching is case-insensitive, but I did not confirm this in the expression engine.
- **Live-probe path in a real browser** — exercised in Node and by unit tests; not observed
  succeeding from a browser origin, since no host sends CORS headers. The snapshot fallback is
  what runs in practice, and that path is tested.
