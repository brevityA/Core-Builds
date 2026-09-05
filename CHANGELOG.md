# Changelog

## 3.7.0 (2026-09-05)

### Changed
- **Standalone template regex sync (drift-fix release)** — every active standalone template's inline `rankedRegexPatterns`, `preferredRegexPatterns`, `excludedRegexPatterns` and `regexOverrides` copies were re-derived from the re-pinned Vidhin05 English ranked-regex snapshot (live upstream 2026-09-05, ETag `6ec5f06a`). Refreshed upstream slots: Anime LQ Groups, BR-DISK, LQ (Release Title) (Radarr), Radarr Bad Dual Groups, Radarr HD Bluray T1, Radarr HD Bluray T2, Sonarr Bad Dual Groups, TrueHD Exclude Groups. Prevents the ElfHosted "X/Y regexes are not allowed" import failure class on the 44 public-host-rejecting patterns that had gone stale between the 2026-08-29 pin and today. No filter/sort/formatter semantics changed; Legacy/ and Deprecated/ lanes untouched.
- **New upstream release available to review**: `FAND` (tier-2 group) added to the Vidhin05 list — reviewed-list membership stays human-gated (not adopted into `Filtering/ranked-regex-patterns.json`); revisit at the next curation pass.
- **Configurator schema data re-pinned to AIOStreams v2.34.0** (`configurator/UPSTREAM.pin` f36d0f9→e694b6a): adds `healthChecks`/`healthResults`/`autoVariants`/`manifestNotice`/`linkedAccounts` config keys, presets `the-pirate-bay`/`therarbg`/`anime-tosho-new`/`usa-tv-next`, `PCM` audio tag, `MPEG-4` encode, `DVD REMUX` quality, `DV Only`/`HDR Only`/`Upscaled` visual tags. `validate_templates.py` registry synced to the same pin (`health` SEL function included). No template adopts a new field in this release — additive sync only, so templates remain valid on v2.32.0+.
- **`aios-regen` contract snapshot re-pinned** to AIOStreams main `e694b6a` (was 2026-08-29): additive drift reviewed (3 presets, 3 schema keys, 2 SEL functions); no removals or new required options — no shipped-preset breakage.

### Fixed
- **Allowlist regeneration path repaired** — `configurator/src/data/regex-allowlist.js` advertises `scripts/sync_template_collection.py --regex-allowlist` as its generator; the flag did not exist. It is implemented now and reproduces the committed artifact byte-for-byte from the pinned snapshot, so drift re-pins and allowlist refresh are a two-command, zero-hand-edit flow.
- **Standalone re-sync is now a pipeline step**: `scripts/sync_ranked_regex.py` (new) regenerates the reviewed ranked list and every inline copy in active lanes from the snapshot (provenance-checked, idempotent, `--check` gate); `scripts/template_builder.py` remains scaffolding only.

### Docs
- **README now advertises the Configurator as the main product** — hero call-to-action button, a dedicated "Core Builds Configurator" section (routes, device-aware profiles, host compatibility gating, Direct Install soft-fail recovery, offline single-file use), a two-path Quick Start (Configurator recommended, pinned templates as the alternative), configurator pointer under the template decision tree, and `configurator/` + `tools/` added to the repository map.
- **`docs/configurator.mdx` CTA unfrozen** — the hand-written "Configurator v2.97" version line went stale against shipped v3.1; it now says "latest release, deployed from this repository" so it cannot rot again.

### CI
- **Configurator e2e goldens rebaselined for the v2.34.0 schema sync** — `torbox-4k-iqr`, `torbox-4k-apex-mixed` and `torbox-mixed-apex-mixed` generated output legitimately shifted with the regenerated `src/data/generated/*`; refreshed via the spec's documented `UPDATE_GOLDEN=1` flow. Other 12 goldens byte-identical (the delta is confined to the advanced/labs tag/quality tables), confirming this was intended drift, not pipeline breakage.
- **`configurator-e2e.yml` gained a dispatch-only golden rebaseline mode** (`updateGoldens` input): runs the golden spec with `UPDATE_GOLDEN=1` on the runner and uploads the refreshed goldens as an artifact, so contributors without browser access can rebaseline in CI; a human still reviews and commits the diff (nothing is auto-committed).
- **Quarantined the `security-sinks` C3 flake** flagged in #682 — skipped in-suite with `test.skip` referencing the issue; timing root-cause and un-quarantine tracked in #738. C1/C2 security coverage unaffected.
- **C3 flake root-caused and un-quarantined** (#738) — every recorded failure was a hydration race, never a security assertion. The fixed 900 ms/600 ms sleeps are replaced by explicit gates (`#pwdPrompt` visibility, content-poll for the rendered reason), the dialog handler attaches before navigation instead of after it, and the Express-lane open click is wrapped in `toPass` so a painted-but-unbound button is retried until `#expressLaneModal` actually renders. The `userPosts` proof-of-route and all inertness/legibility assertions are untouched; nothing was loosened to get green. DoD: 5 consecutive green CI runs on the PR signal.

## 3.6.2 (2026-08-22)

### Added
- **Core Badge Builder** (Configurator v2.97 · `tools/badges/`) — a no-code Nuvio Fusion badge configurator with 111 original Core badges, essentials-first progressive disclosure, Core Neon/monochrome/high-contrast themes, category colors, badge and group ordering, editable release preview, and selected-only JSON output. Detection rules stay internal; users never need to write regex or edit JSON.
- **Universal + AIO Enhanced badge modes** — Universal uses portable filename/parsed-metadata rules for any Nuvio source. AIO Enhanced generates exact invisible markers plus a bounded companion formatter for more reliable matching on sparse titles. A versioned, ten-minute, consume-once browser handoff passes that formatter to the existing Configurator for full-template generation without duplicating generator logic.
- **Badge install safety** — creating an import link downloads the JSON backup first, then uses the existing Worker → paste.rs → 365-day dpaste fallback. The result explains expiry and Nuvio's import-time local storage behaviour.

### Fixed
- **Custom formatter persistence** — valid imported/generated formatter fields now survive a Configurator reload; a saved `custom` selection without a valid bounded formatter safely falls back to Family v4.

## 3.6.1 (2026-08-13)

### Removed
- **Live instance-status cron retired** — the every-6-hours auto-check (host → STATUS.md + docs page) was retired after 25 consecutive push failures and a final-weeks correctness split with reality during the v2.33.x storm (hosts marked online that were DNS-dead). The docs page stays as a guidance snapshot; live per-host checks now live in Preflight (Tools page), which probes the exact host against the actual config — on demand, with a downloadable case bundle. Probe logic archived to `scripts/status_check.py` as reference for the planned fleet watcher.

## 3.6.0 (2026-08-11)

### Added
- **Preflight audit tool** (Configurator v2.92 · Tools page) — audits any template or live config offline with rules learned from observed host rejections, optionally live-dry-runs it against the chosen AIOStreams host with a bounded auto-heal loop (up to four rounds, re-posting until the instance accepts), proves complete writes with a manifest read-back, and triages existing installs ("worked yesterday" lane). Browser-side via the Core Builds proxy; nothing stored.
- **WuPlay Catalog Genie: consent-gated live auto-apply** — snapshot capture, per-step verified writes (hub/screen layouts, age gates), one-tap Undo replay, and honest guide fallback for anything the WuPlay API only accepts from its own configurator. PIN-locked profiles degrade to guided mode with an explicit receipt. Includes a browser handshake probe + diagnostics lane.
- **Express Install: visible "Streams shown" toggle** (Mixed / ⚡ Cached only) with an always-on install chorus line (service → app · profile · resolution · cache mode · host · full-stack), plus receipt clarity for the cache row in every mode.

### Fixed
- **juju-class cache confusion** — cache selection is now visible, stated in plain words, and protected from being silently overridden by profile defaults at install time.
- **Brisk-class config rejection at import** — presets requiring user credentials (Debridio/NZBGeek-type) now ship disabled until a key is added; the share-link sanitizer disables presets whose credentials were stripped; the update lane warns about presets it can't regenerate.
- **AIOStreams v2.33.1 same-day compatibility** — the host fleet hardened config validation on August 11. Generator+validator updated: torrentio carries useMultipleInstances, peerflix carries showTorrentLinks, SeaDex/Sootio gate behind a usable service, jackett/prowlarr emit their required instance URL, NZBHydra2 uses the api object shape.
- **Express honoring the explicit host pick on Nuvio** — compatible picks are used; incompatible picks produce a named, actionable error instead of a silent substitution.
- **e2e flake quarantine (#682)** — the Express full-stack chain gets bounded budgets + suite-level bounded retries; the Nuvio import spec now expresses the honored-host contract.

### Changed
- Tutorial completion and the legacy quick-install entry now land in the consolidated Express lane.
- Validator floors are evidence-cited (every rule quotes the live rejection it encodes) with a required-option matrix across 8 preset types; legacy snapshots stay exempt by design.

## 3.5.3 (2026-08-04)

### Fixed
- **Episode-pack availability** — multi-episode and season-pack streams were previously removed by an early exclusion filter before cache, quality, score, and result-limit filters had run. When those later filters eliminated the single-episode alternatives, valid TV episode requests could return zero streams. Late fallback rules now hide packs only after three playable standalone episode streams survive all prior filtering.
- **Core Tools hub restored** — a truncated generated deployment had removed several tool cards and the closing markup from the Core Tools page. The full page is restored with Template Builder, Addon Backup, Template Inspector, Health Score, Troubleshooter, Account Manager, and CLI Tool.

## 3.5.2 (2026-08-02)

### Added
- **Core Builds CLI published to npm** — `npm install -g core-builds` for generate, validate, diff, and info commands. Same `@core-builds/core` engine as the Configurator.
- **Account Manager mutations** — addon reorder, removal, backup restore, and bounded LIFO undo (max 10 snapshots) with stale-state detection and post-write reload verification.

## 3.5.1 (2026-07-31)

### Added
- **Capability-based device profiles** (Configurator v2.87) — Android Mobile, Android TV / Google TV, Samsung Tizen, LG webOS, Sony / Google TV, and Generic 4K HDR TV. Each profile includes device-specific capability warnings and expandable help text.
- **Matching Core Builds SVG device icons** — replaces temporary emoji icons with inline SVGs matching the existing Core Builds icon style (44×44 viewBox, feDropShadow, device-specific accent colours, cyan glass fill).
- **Expanded Playwright E2E coverage** — device card visibility, SVG icon rendering, keyboard selection, aria-checked state, and help text banner tests across desktop and mobile viewports.

### Fixed
- **Max File Size** (Configurator v2.87) — the selected limit was being used as the minimum size (e.g. 10GB → allowed 10–999999GB); now correctly caps at the selected maximum (e.g. 10GB → 1B–10GB).
- **Legacy unversioned local snapshots** no longer show a false "Update Available" banner.
- **Template updates** no longer mutate the active configuration before the user confirms.
- **Feedback messages** now report current live setup context instead of stale saved state.
- **Fine-Tune interaction and focus regressions** are now covered by browser tests.

### Changed
- SEL generation now uses shared Standard, IQR, Apex, and Apex Mixed policy modules.
- CodeQL now uses the repository configuration and excludes generated bundles while scanning source code.

## 3.5.0 (2026-07-29)

### Added
- **SEL Engine v2** (Configurator v2.86 + all 72 templates via synced expressions) — `perGroup()` QR balance replaces 8 verbose `slice()` expressions with 2, interleaving results round-robin across resolutions instead of dumping 9 REMUXes in a row. Device-aware limits: DV-capable TVs get 4 streams per group, others get 3.
- **Addon Diversity PSE** — `perGroup(cached(streams),'indexer',2)` caps each addon to 2 results in the preferred tier, preventing one scraper from flooding the results list.
- **Bitrate Anomaly Pin** — streams with bitrates below the IQR Tukey lower fence are pinned to the bottom (not removed). Still available if needed, never ranked first. Conservative approach to outlier handling.
- **Adaptive Score Floor** — replaces the static "Low SEL Score" ESE. Threshold scales with content age: `-50 + min(30, daysSinceRelease * 0.1)`. Strict on new releases where garbage is common, lenient on old/niche content where every stream counts. Fewer empty results on obscure titles.
- **Dynamic addon groups** (Configurator v2.86 + all 59 templates with groups) — groups now build from actual enabled presets using `instanceId` (not display names). Split 50/50 into Primary (always fires) and Secondary (conditional on `cached(totalStreams)` threshold). If fewer than 2 active presets, groups disable entirely instead of sending broken config.
- **Soft-fail addon recovery** (Configurator v2.86) — when AIOStreams rejects a config with "Failed to fetch manifest for {addon}: {reason}", the Configurator now parses the error, identifies the failing addon, and offers to save the config without it so the user can proceed. Auto-backups config to localStorage before retry.
- **`?simulateAddonFail=` self-test hook** — append `?simulateAddonFail=StremThru Torz TB:fetch failed` to the Configurator URL to test the recovery UI in-browser without a real addon failure.
- **Bandwidth Mbps cap** (Configurator v2.86) — new field in Fine-Tune: type your internet speed and the Configurator auto-limits bitrate to 80% of it (`Mbps × 1,000,000 × 0.8`). No more guessing which slider preset matches your connection.
- **Inspector direct import** (tools/inspector/) — drag & drop a `.json` file onto the Inspector or click 📁 Import JSON File. No more opening the file, selecting all, copying, switching tabs, and pasting. `unwrap()` normaliser auto-detects JSON shape (full template, bare config, array collection) so it validates regardless of export format.
- **Protect Library & SeaDex ISE** — single `passthrough(merge(library(streams), seadex(streams)), 'excluded')` shields personal library and SeaDex streams from ALL downstream ESE filters. Replaces 15+ repeated `negate(merge(library(streams),seadex(streams)), ...)` wrappers across individual expressions.
- **ID-Matched Trust ISE** — `passthrough(idMatched(streams), 'title', 'year', 'episode')` lets streams matched by external ID (Torznab ID search, SeaDex hash) skip filename-based title matching. Already verified correct, no second-guessing.
- **Smart Play Pin ISE** — `pin(message(streams, 'includes', '🎯'), 'top')` pins AIOStreams Smart Play flagged streams to the absolute top.
- **Low Seeder Cull ESE** — removes 0-seeder P2P/uncached streams, but only when 3+ healthy streams exist. Protects niche content from being nuked to zero results.
- **RD Copyright ESE** — conditionally filters WEB-DL/BDRip/HDRip/HDTV x264/x265 streams on RealDebrid (DMCA compliance). Only included when Real-Debrid service is selected.
- **Docs auto-sync** — `sync-docs.py` + `sync-docs.yml` auto-generate ROADMAP.md "Recently Completed" section and tools page "What's New" block from CHANGELOG.md via managed markers (`AUTO:ROOT_COMPLETED:*`, `AUTO:TOOLS_WHATSNEW:*`). `docs-changelog-gate.yml` blocks PRs that don't update the changelog.
- **Vidhin05 drift watch** — `upstream-drift-watch.yml` runs daily, compares upstream Vidhin05/Releases-Regex@main against local snapshots (174 regexes + 243 expressions), opens a GitHub issue with diff summary on drift.
- **Golden config snapshots** — 12 Playwright e2e fixtures covering service × resolution × architecture combinations. Any logic change that alters generated template output now fails CI.

### Fixed
- **"Every group must have at least one addon"** (Configurator v2.86 + 59 templates) — groups were referencing addons by display name ("Torrentio", "Comet") but AIOStreams expects internal `instanceId` ("23a", "1c5"). When names didn't match, groups appeared empty and the entire config was rejected. Now uses `instanceId` and filters against actual enabled presets. All 59 templates with groups rebuilt from their real preset lists.
- **Tools/account-tools links broken from Configurator** — relative links (`./tools/`, `./account-tools/`) resolved to `/configurator/tools/` (404) instead of `/tools/`. Fixed all 14 links to use `../tools/` and `../account-tools/`.
- **NC-17 label read backwards** — age rating option said "NC-17 — No Restriction" which is confusing because NC-17 is the most restrictive MPAA rating. Relabeled to "NC-17 — Adults Only" with clearer description.
- **instanceUrl unescaped in DOM** — custom instance URL was injected without HTML escaping (minor XSS vector). Now properly escaped with `escH()`.
- **CodeQL #158 — RADIO_ALLOWED** — added allowlist guard on radio input values to prevent DOM-based XSS via crafted share links.
- **UI layering** — Import Custom Format dialog opened behind the modal (z-index 10000→10050). Content Preference info cards clipped text with no scroll (added `overflow-y: auto`). Contact widget z-index placed below modals. Playwright e2e spec added for both fixes.
- **Dead deep-links** — `handleDeepLink()` now resolves `#troubleshooter` and `#health-score` anchors that previously went nowhere.

### Changed
- **All 72 templates** — synced expression files (`Filtering/core-builds-{pses,eses,ises}.json`) updated with SEL Engine v2 expressions. Templates pick up changes at runtime via `syncedPreferredStreamExpressionUrls` / `syncedExcludedStreamExpressionUrls` / `syncedIncludedStreamExpressionUrls` — no re-import needed.
- **Configurator version** — 2.85 → 2.86
- **Template Suite version** — 3.4.0 → 3.5.0

## 3.4.0 (2026-07-26)

### Added
- **Core Nexus Mixed template** (`Templates/Torbox/Single/core-nexus-mixed.json`) — adaptive multi-resolution build for niche and mixed libraries: no hard resolution caps, 4K → 1080p → 720p → 576p/480p PSE ladder, quality-before-resolution sort blend, UHD-class regex tiers, blended dynamic-fetch exit. Listed in the Torbox template directory.
- **Core Nexus 4K Apex Mixed (Nightly)** (`Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json`) — the Apex v0.9.0 IQR Tukey-fence stack with the Mixed adaptive resolution policy: `requiredResolutions` cap lifted (activating Apex's dormant 480p/240p fallback tiers), new 576p niche tier, cached × quality sort blend, and a blended 4K/1080p dynamic-fetch exit. Trial template — feedback in the Nightly thread before stable promotion.
- **Mixed · Adaptive resolution tier** (Configurator v2.85) — fourth resolution option generating the same policy: uncapped `requiredResolutions`, broad preferred ladder, dedicated PSE stack with SD niche fallback, 4K size/bitrate bounds, `PREFERRED_REGEX_4K` + UHD ranked patterns, and import round-trip detection for mixed configs.

### Fixed
- **Jackett & Prowlarr presets never generated** (Configurator v2.85) — the optional-scraper preset filter required `credKey && apiUrl`, but Jackett/Prowlarr have no `apiUrl`, silently dropping both scrapers from generated templates. Restores the `credKey && !apiUrl` guard from PR #557 that was lost in the v2.84 modular rewrite. New regression tests cover branch coverage for every optional scraper.
- **Template validator crash on bare run** — `validate_templates.py` no longer raises `AttributeError` on non-template JSON (e.g. `Filtering/` expression libraries), so `python3 validate_templates.py` works from the repo root without `--dir` arguments.

## 3.3.2 (2026-07-17)

### Added
- **Subtitle Picker** (Configurator v2.57) — choose subtitle sources (AIOSubtitle, OpenSubtitles v3+, SubDL) and select from 30 languages in the Fine-Tune panel
- **Catalog Presets** (Configurator v2.57) — add TMDB, Streaming, Anime, RPDB, and Torrent catalog addons from the Fine-Tune panel
- **Proxy Configuration** (Configurator v2.57) — enable MediaFlow proxy and select which debrid services to route through it
- **Dedup Merge / Failover** (Configurator v2.57) — toggle deduplicator merge mode to keep deduplicated streams as failover alternatives

## 3.3.1 (2026-07-17)

### Added
- **Free Tier Overhaul** (Configurator v2.56) — comprehensive improvements to P2P and HTTP template generation:
  - **New P2P presets** — Torrentio (primary scraper), Peerflix, Sootio, and HdHub now enabled by default for P2P templates
  - **New HTTP presets** — Sootio, Peerflix, and HdHub added to HTTP template stack
  - **3-tier addon grouping** — P2P/HTTP templates now cascade addons: Primary always runs, Secondary activates when <5 streams found, Fallback when <15 streams
  - **Smart auto-hide ESEs** — SD content excluded when enough 1080p+720p exists; 720p excluded when enough 1080p/4K exists
  - **minSeeders filter** — P2P templates set `minSeeders: 1` to filter dead torrents
  - **Deduplicator tuning** — free templates use `keep_all` for cached/uncached (no debrid cache to deduplicate)

## 3.3.0 (2026-07-16)

### Changed
- **Stream pool broadening** (Configurator v2.55 + all 31 active templates) — increased `maxResults`, `maxResultsPerResolution`, and `dynamicAddonFetching` exit thresholds across the entire fleet. Templates now wait for more cached streams before stopping and return more results to the user.
  - **4K Apex/Device:** maxResults 20→30, MRPR 8→12, DAF cached 2160p >=5→>=8, timeout 5s→6s
  - **4K Essential/AllDebrid:** added maxResults 30/MRPR 12 (previously uncapped), DAF 2160p >=10→>=15 or 1080p >=15→>=20
  - **1080p (Single/Essential/AllDebrid/Device):** maxResults 25→35, MRPR 10→15, DAF 1080p >=15→>=20
  - **Hybrid:** maxResults 30→50, MRPR 12→20, DAF 4K >=15→>=20, 1080p >=15→>=25
  - **EasyNews:** maxResults 30→50, MRPR 12→20, DAF thresholds doubled
  - **Anime:** added maxResults (4K 30/12, 1080p 35/15), DAF 4K >=6→>=10, 1080p >=12→>=18
  - **Configurator pool tiers:** Normal 30–35 results (was 20–25), Large 50 (was 30–35), Max 75 (was 50)
- Skipped: Flash (instant play), Speed/TorBox (lean), Nightly (parameterized), Deprecated

### Fixed
- **Build script CodeQL compliance** — replaced all regex-based HTML tag matching in `configurator/build.js` with string-based `indexOf`/`slice` operations. Resolves CodeQL `js/bad-tag-filter` alert that blocked CI.

## 3.2.9 (2026-07-15)

### Added
- **Template Migration Tool** (Configurator v2.49) — "Update Existing Template" now shows a full visual diff of every change (PSEs, ESEs, sort criteria, regex patterns, settings) before applying. Users can review Added/Removed/Changed counts per section, then click "Apply & Upgrade" or cancel.
- **Device detection on template import** (Configurator v2.49) — imported templates now auto-detect Samsung, Xiaomi (2nd/3rd Gen), Fire Stick, Apple TV, Shield, Google TV, and Windows device profiles from encode/audio/visual tag signatures and template name hints.

## 3.2.8 (2026-07-15)

### Fixed
- **REMUX ranking fix** (all 44 active templates) — BluRay REMUX files were consistently ranked below WEB-DL streams because three interacting factors inflated WEB-DL scores: (1) `audioTag` sort position above `encode` caused WEB-DL with Atmos to beat REMUX with DD+, (2) Audio Pinnacle bonus PSE added extra seScore to streams with premium audio tags regardless of quality tier, (3) `perGroup(streams, 'resolution', 3)` in Extra Cached ESEs randomly dropped REMUX based on addon arrival order. Reported by community member Tetelestai3-16.
  - **Global sort reordered** — `visualTag → encode → audioTag → audioChannel → language` (was `visualTag → audioTag → audioChannel → language → encode`). Encode type (REMUX/BluRay/WEB-DL) now breaks ties before audio tag preference.
  - **Audio Pinnacle PSE removed** — eliminated bonus seScore inflation that ranked WEB-DL with Atmos above REMUX with DD+. Audio preference is now handled purely by sort criteria position.
  - **HDR/DV Priority PSE removed** — redundant with `visualTag` already in sort criteria. Removed to simplify PSE stack and prevent unintended score inflation.
  - **Extra Cached perGroup increased** — `perGroup(streams, 'resolution', 3)` → `perGroup(streams, 'resolution', 5)` in Extra Cached HQ/LQ ESEs. Larger pool reduces random REMUX exclusion before PSE scoring.
- **`deduplicator.merge` schema fix** (all 43 templates) — removed `"merge": false` boolean that newer AIOStreams versions reject ("Invalid input: expected object, received boolean"). The field defaults to off when omitted.
- **Test Drive title rendering** — stream names containing unresolved formatter DSL (`{stream.X::operator[...]}`) are now cleaned client-side before display.
- **Configurator v2.48** — REMUX fixes + deduplicator.merge removal + Test Drive cleanup.
- **4K Apex bumped to v0.8.0.**

### Added
- **Xiaomi Mi Box S device profiles** (Configurator v2.48) — two new device options: **2nd Gen** (DV Profile 5, HDR10+, no AV1, no lossless, DD+ Atmos ceiling) and **3rd Gen** (same + AV1 hardware decode). Community request by Fée Deuspi.
- **Improved addon naming** — configurator-generated templates now use "Core Nexus" branding with device name and full service names instead of abbreviations. Example: `Core Nexus 4K · Samsung TV — TorBox` instead of `Core Builds 4K Multi (TB-Ess+PM)`.

## 3.2.7 (2026-07-11)

### Added
- **LABS v0.14.0 SEL expressions** (6 Labs templates) — seven new expression features across all Labs templates:
  - **Runtime-aware bitrate floors** — `(isAnime or 'Animation' in genres or (runtime > 0 and runtime < 25)) ? [] : [existing logic]` guard on Bitrate Floor ESEs. Animation and short-form content (< 25 min) legitimately encodes ~50% smaller; these now bypass the REMUX bitrate floors instead of being killed.
  - **Anime language passthrough ISE** — `isAnime ? passthrough(streams, 'language') : []` bypasses language filtering for anime queries. Anime fansub groups use non-standard language tagging that the standard language filter rejects.
  - **latestSeason-aware season pack kill** — `season >= latestSeason` guard added to the Season Pack Kill ESE. Prevents killing season packs on current-season shows where the pack is the only source.
  - **Subtitle preference PSE** — `subtitles(streams, 'English')` inserted before Codec Efficiency Booster. Prioritises streams with embedded English subtitles.
  - **`age` sort key** — `direction: "asc"` in `uncachedMovies` and `uncachedSeries` sort sections. Newer uncached torrents rank above older ones.
  - **`cachedAnime` sort section** — seadex at position 2, 16 keys. Dedicated anime-optimised cached sort.
  - **`uncachedAnime` sort section** — seadex at position 2, seeders promoted, age key, 17 keys. Anime-specific uncached sort with newer content ranked higher.
- **LABS templates updated:** 4K Apex Labs (v0.11.6 → **v0.14.0**), Stream Labs (v0.8.6 → **v0.10.0**), All-Rounder Labs (v0.2.6 → **v0.4.0**), 4K Essential Labs (v0.3.6 → **v0.5.0**), Essential Labs (v0.2.6 → **v0.4.0**), Anime 4K Labs (v0.1.5 → **v0.3.0**).

### Fixed
- **Configurator regex allowlist** — 2 of 103 patterns in `RANKED_REGEX_COMMON` were not present in Vidhin05's 174-entry allowlist, causing "2/176 regexes not allowed" errors on self-hosted AIOStreams instances. Removed: `Radarr HD Bluray T3 [B]` (LoRD group, score 40) and `Anime LQ Groups` (score −75). Configurator now generates templates with 101 ranked regex patterns, all verified against Vidhin05.
- **All-Rounder Labs addonName** — template had `"Core Nexus Stream Labs 🧪"` (copy-paste from Stream Labs) instead of `"Core Nexus All-Rounder Labs 🧪"`.

## 3.2.6 (2026-07-09)

### Added
- **Configurator v2.30** — 3 new debrid services: EasyDebrid, PikPak, Seedr (all using StremThru Store cache layer). Generated templates now include `nzbdav`, `altmount`, `stremthru_newz` service entries for full AIOStreams v2.30.6 service coverage.
- **Dedup tiebreakers** (3 Hybrid templates) — `config.deduplicator.tiebreakers` with `position: "after_addon"` for both `torrent_seeders` and `usenet_age`. TorBox-priority addon ordering now wins dedup ties instead of raw seeder counts overriding the intended service priority.
- **`davex` preset** (2 EasyNews templates) — usenet scraper via davex search profile adapter, disabled by default. Users with a self-hosted davex instance can enable it by setting their manifest URL.
- **`cachedAnime` / `uncachedAnime` sort criteria** (6 Anime templates) — granular cached/uncached sort keys for anime content. `cachedAnime` mirrors the existing `anime` sort (seadex at position 2); `uncachedAnime` promotes seeders after encode for better uncached stream ranking.

### Fixed
- **EasyNews++ preset type** — configurator generated `easynews-plus-plus` which doesn't match AIOStreams' `easynewsPlusPlus` case in `presetManager.ts`, causing "Preset not found" errors on import. Fixed to use the correct camelCase identifier.
- **Configurator v2.31** — formatter live previews: 12 of 17 formatters fell back to Apex V2's preview data, causing all expanded formatter cards to show identical content. Added unique preview data for all 17 formatters matching their actual DSL output. Also added all 17 formatters to the picker (was 6) and regenerated all 16 preview SVGs.
- **Configurator v2.32** — formatter picker redesigned from 17 stacked expandable cards to a compact `<select>` dropdown with featured card showing live preview. Manifest modal polished with gradient background, cyan accent border, and grouped URL/password card. Added Wizaardd AIOStreams instance (forthewizards.uk). HdHub preset disabled across all debrid templates (kept as backup).

## 3.2.5 (2026-07-03)

### Added
- **Template collection file** (`core-builds-template-collection.json`) — operator-facing template catalog for AIOStreams `TEMPLATE_URLS`. Contains 3 representative templates (4K Apex, Stream, Anime 4K) with all Core Builds synced URLs declared. When an instance operator adds this URL to their `TEMPLATE_URLS` env var, AIOStreams' `registerTrustedAccess()` auto-whitelists all Core Builds URLs — our ranked regex patterns file, ESEs, ISEs, and PSEs. This eliminates the need for operators to manually add URLs to `WHITELISTED_REGEX_PATTERNS_URLS` or `WHITELISTED_SEL_URLS`. Modelled after Tam-Taro's approach.

### Changed
- **Configurator v2.10** — Easy Setup now attempts direct API creation via `Promise.any()` across all 7 public AIOStreams hosts. If any host allows CORS, the manifest modal opens instantly with zero redirects. When CORS blocks all hosts (current production behavior), falls back gracefully to the enhanced paste-back flow: auto-generates a memorable password (displayed with copy button), opens AIOStreams via `?template=` deep link, and presents a manifest URL paste field. When the user returns and pastes their manifest URL, it's validated via `extractManifestParts()` and instantly opens the full Stremio install modal (App/Web/WuPlay/Nuvio tabs, QR code, copy buttons). A `visibilitychange` listener detects tab return and focuses the paste field. Credential reminder and instance chips remain as fallback. Future-proofed: when AIOStreams instances add CORS headers, the direct path activates automatically with no configurator update needed.

## 3.2.4 (2026-07-03)

### Changed
- **Sort criteria overhaul** (all 42 templates) — rebuilt the sort pipeline based on AIOStreams' stable multi-key sort architecture (position 1 = primary, subsequent keys only break ties). Key position now reflects actual impact instead of legacy ordering.
- **`seadex` added** — SeaDex curated-release signal inserted at position 4 (after `streamExpressionScore`) for all templates. For Anime templates, promoted to position 2 (right after `cached`) following Tam-Taro's recommendation — SeaDex is the strongest anime quality signal.
- **`regexScore` promoted** — moved from position 11 (effectively dead — ties rarely survive 10 prior comparisons) to position 7 (after `quality`), where release-group quality scoring actually influences results.
- **`visualTag` promoted in 4K global sort** — moved above `audioTag`/`audioChannel`/`language` for 4K templates. HDR10+/DV/HDR10 format is a primary quality differentiator at 4K; at 1080p the original position is retained since HDR is rare.
- **`bitrate` added as tiebreaker** — estimated bitrate sort key appended after `seeders`, giving a fine-grained quality differentiation when all other criteria tie.
- **`service` added to Hybrid templates** — debrid service priority sort key (after `seadex`) gives built-in TorBox-first tiebreaking alongside the existing PSE-level TorBox-priority twins.
- **Uncached sort sections** — new `uncachedMovies` and `uncachedSeries` sort sections promote `seeders` above audio/language criteria. When a stream isn't cached, seeder count directly affects download speed and reliability.
- Sort criteria count: 14 → 16 keys (standard), 17 keys (Hybrid). Sections: 5 → 7 per template (added `uncachedSeries`).

## 3.2.3 (2026-07-02)

### Changed
- **Configurator v2.9** — Easy Setup one-click button now opens AIOStreams directly via `?template=URL` deep link instead of calling the API. Template is uploaded to paste.rs (credentials stripped), then AIOStreams fetches it client-side — no CORS issues, works on every public instance. Popup-blocked users get fallback instance chips.
- **Configurator v2.9** — Addon groups replaced by dynamic addon fetching in configurator-generated templates. `groups` is now always `{ enabled: false, groupings: [] }` — eliminates the validation surface that caused "Every group must have at least one addon" errors. Dynamic exit (`totalTimeTaken > 5000` or cached stream count threshold) handles early stopping naturally.

## 3.2.2 (2026-07-02)

### Fixed
- **Configurator v2.8.1** — `groups.groupings` now omitted when groups are disabled, fixing "Every group must have at least one addon" validation error on non-TorBox-Pro services and when using parent/base configs
- **Configurator v2.8.1** — Easy Setup CORS fallback: when one-click creation fails (all hosts unreachable), automatically creates an import URL and shows instance chips with a 3-step guide instead of a dead-end error

## 3.2.1 (2026-07-02)

### Changed
- **Older-Show Pack Pass** (all 36 standard templates + shared `Filtering/core-builds-eses.json`) — refines the v3.2.0 Hard Season Pack Kill to eliminate its starvation trade-off. Packs are still killed whenever single episodes exist: recent/ongoing shows (last aired < 2 years ago) need just 1 single, any show with 3+ singles keeps the hard kill. But an ended show (2y+ since last airing) with fewer than 3 single-episode sources now keeps its season packs instead of returning zero results. Missing air-date metadata falls back to the 3-singles rule. Anime remains exempt throughout.

## 3.2.0 (2026-07-02)

### Added
- **Override scoring restored fleet-wide** (36 active templates + both Base configs) — the inline `rankedRegexPatterns` layer was silently lost in the v2.8.x template slimming, leaving `regexScore` a no-op across the fleet (all 174 synced Vidhin05 entries carry score 0). Restored via `syncedRankedRegexUrls` pointing to `Filtering/ranked-regex-patterns.json` — 149 scored patterns with a 10-tier system, every pattern string verbatim-matched against current Vidhin05 (elfhosted requirement), fortheweak-removed names and drifted Anime BD patterns excluded. Anime templates keep `[]`.
- **LABS: `rseMatched()` tier strategy** — ranked patterns now double as named matchers (score-independent, elfhosted-safe): `S+ Tier` micro-PSEs rank T1-matched remuxes above generic remuxes, `T1 Pattern Pin` pins pattern-verified elites beyond hand-listed groups, and `Bad 4k/1080P Bluray` kills are tier-guarded (spare encodes matching UHD Bluray T1–T3 / Remux T1/T2).
- **LABS: Adaptive Seeder Guard** — median-based fence kills bottom-quartile-seeded uncached torrents, only on titles ≤1 year old with deep pools (>10 streams ≥3 seeders); catalog titles exempt.
- **LABS: p10–p90 fences** (4K Apex Labs) — S-Tier 4K/1080p Remux tiers now use percentile(10)/percentile(90) windows at ≥8 peers, Tukey at 4–7, min/max at 1–3.
- **LABS: Unknown Resolution/Quality kills** — `Unknown`-tagged streams dropped only when 5+ known-good alternatives exist.
- **LABS: animation-exempt bitrate floors** — `isAnime or 'Animation' in genres` bypasses the REMUX bitrate floors (animation legitimately encodes ~50% smaller).

### Changed
- **Hard Season Pack Kill** (all standard templates — active + labs + Base; Anime templates exempt) — replaces the conditional `latestSeason >= 3` kill from v3.1.1: episode requests on non-anime series now never return season packs. Anime queries are exempt via `not isAnime` even on general templates (SeaDex batches preserved). Trade-off: shows whose only sources are packs return no episode results — deliberate.

### Fixed
- **Samsung RU7100** (v0.3.0) — the four Tamtaro-derived ESEs (`Bad 4k Anime`, `Upscaled 4k`, `Bad 4k/1080P Bluray`) referenced regex tier names from Tamtaro's German setup (`DE Bluray T1`, `BD T1`…) that don't exist in our Vidhin05 sync, so their protective guards never matched and the kills fired unconditionally. Rewritten with correct Vidhin05 names.
- **Base TorBox template** (v1.1.0) — `preferredEncodes` used invalid values (`H.265`, `H.264`, `MPEG-2`, `MPEG-4`); replaced with schema-valid `HEVC/AV1/AVC/Unknown`. Validator now passes with zero errors.

## 3.1.1 (2026-07-02)

### Changed
- **`latestSeason` guard on Kill Season Packs ESE** (all 44 active templates + shared `Filtering/core-builds-eses.json`) — the `Kill Season Packs When Episodes Exist` ESE previously fired whenever 3+ episode-level streams existed, regardless of how many seasons the show has. For a show in its first or second season, killing the season pack was often counterproductive — the pack *is* the full show and may be the best result. The guard `latestSeason >= 3` now allows season packs through for shows with ≤2 seasons, and keeps the episode-preference kill active only for long-running series (3+ seasons). Samsung and Apple TV templates, which use a `>= 10` episode threshold, received the same guard. Behaviour for movies is unchanged (season packs don't exist for movies so `seasonPack()` returns `[]` regardless).

### Reference
- **CLAUDE.md** — `floor`, `ceil`, `round`, `trunc` added to the confirmed available SEL Math functions list (from expr-eval).

---

## 3.1.0 (2026-07-01)

### Added
- **Base Config (parentConfig support)** (`configurator`) — new purple "Base Config" collapsible panel on the Review step. Enter the UUID (and optional password) of your imported `Core Builds Base — TorBox` config. When a valid UUID is provided, the generated template is wrapped in a `parentConfig` block and all shared fields are stripped from the child — reducing output size from ~65 KB to ~44 KB (111 → 24 config keys). The parent supplies formatter, sort criteria, presets, deduplicator, proxy, regex URLs, and category colours; the child retains only resolution, expressions, encodes, visual tags, and branding. Leaving the UUID blank generates a fully standalone template as before — no behaviour change for existing users.
- **`Templates/Base/core-nexus-base-torbox.json`** (v1.0.0) — new shared base template holding all 84 common fields across TorBox Pro templates. 13 presets: Library, Zilean, SeaDex, StremThru Torz, Meteor, Comet, MediaFusion, HdHub, EZTV, Torrent Galaxy, Knaben, AIOSubtitle, TorBox Search. Full tamtaro formatter, 12-key sort criteria, deduplicator with tiebreakers, autoPlay, MediaFlow proxy, Vidhin05 + Tamtaro regex URLs, and addon category colour map. Import once — all configurator-generated child templates inherit it automatically.
- **Configurator version badge** (`configurator`) — `v2.2` badge displayed next to "By Brevity" on the splash screen and in the top-right corner of the header on all wizard steps.

### Changed
- **`parentConfig` merge strategies** — `presets: extend` (child presets added on top of parent's 13), `services: inherit`, `filters: override` (child ESEs/ISEs/PSEs take full effect), `sorting: inherit`, `formatter: inherit`, `branding: override`, `proxy: inherit`, `metadata: inherit`, `misc: inherit`.

---

## 3.0.5 (2026-06-30)

### Added
- **Debrid.io service option** (`configurator`) — "Other Services" collapsible dropdown added below the main service list on step 1. Contains Debrid.io as a selectable service; generates a native `debridio` scraper preset with an optional API key baked in. The dropdown highlights in cyan and shows "Debrid.io ✓" when selected.
- **EasyNews in multi-debrid** (`configurator`) — EasyNews can now be combined with other debrid services in Multi mode. Username and password collected alongside other credentials; EasyNews++ and EasyNews Search presets injected separately (not wrapped in a `stremthruStore` slot). Multi name abbreviation: `EN` (e.g. `Core Builds Multi (RD+EN)`).
- **NZBGeek API key field** (`configurator`) — always-visible optional field in the APIs step. When filled, generates a `newznab` preset pointing at `api.nzbgeek.info`. Pairs with Meteor's `customSearchEngines: true` for full Usenet indexer coverage.
- **Fresh start UX** (`configurator`) — `?fresh` URL param clears localStorage and resets to a clean session. The splash screen always shows first (saved step no longer auto-restored). A "Continue where you left off" banner appears on the splash when a prior session exists, showing the saved step number and service name with Resume and Discard buttons.
- **Offcloud and P2P Free as standalone services** (`configurator`) — Offcloud (cloud debrid) and P2P Free (no subscription) added as first-class service options.

### Changed
- **Mode toggle moved to left side** (`configurator`) — the light/dark theme button is now fixed top-left, no longer overlapping the Reset button.
- **Light mode active button highlights** (`configurator`) — selected match mode, audio, and formatter options now render GitHub-blue (`rgba(9,105,218,…)`) background and border in light mode. Previously invisible against the light background. Implemented via `data-active` HTML attributes.
- **Reset clears without confirmation dialog** (`configurator`) — `clearState()` now navigates to `?fresh` instead of showing a `confirm()` dialog followed by `location.reload()`.

---

## 3.0.4 (2026-06-26)

### Changed
- **Configurator overhaul** (`configurator/index.html`) — series of UX refinements to the Core Builds wizard:
  - **Password show/hide toggle** — eye icon added to the password field so users can verify what they typed without a timed reveal
  - **UUID field links to ElfHosted configure page** — label now includes a direct clickable link to `aiostreams.elfhosted.com/stremio/configure`
  - **Tab consolidation** — "Direct Install" and "Get Manifest URL" tabs removed; both produced the same output (App + Web install buttons) so the distinction was moot; replaced with a single "Install to Stremio" action area
  - **Paste-manifest-URL shortcut** — new input at the bottom of the install section accepts an existing manifest URL and immediately renders App + Web install buttons with no API call, covering returning users who already have an AIOStreams account on any host
  - **ElfHosted error hint now links to configure page** — the inline hint shown when an ElfHosted CORS error occurs now links directly to the configure page instead of describing it
  - **Host switch clears result card** — switching hosts now clears any previously shown manifest / error card to avoid stale results

---

## 3.0.3 (2026-06-25)

### Added
- **Core Nexus Ultrawide** (`Device/Windows/core-nexus-ultrawide.json`, v0.1.0) — new Windows PC / ultrawide monitor template. 1080p-primary with 1440p and 4K fallback tiers; designed for ultrawide displays that upscale well but receive primary content at 1080p. Key differences from Stream:
  - `requiredResolutions: []` and no Hard Resolution Kill ESE — 1440p and 4K streams are shown when 1080p quality thresholds are not met
  - `excludedAudioTags: []` — full lossless audio unlocked (TrueHD, DTS-HD MA, DTS:X, FLAC, Atmos)
  - `preferredAudioChannels: ["7.1", "5.1", "2.0"]` — 7.1 surround added
  - `preferredVisualTags: ["HDR+DV", "DV", "HDR10+", "HDR10", "HDR", "HLG", "10bit", "SDR", "IMAX"]` — HDR-first ordering
  - 14-tier PSE stack: S/A/B/C 1080p tiers → 1440p tier → 4K REMUX / WEB-DL HDR / any 4K → 720p last resort → codec + audio + HDR boosters
  - VC-1 removed from `preferredEncodes`; AV1 retained (Windows hardware decode supported)

---

## 3.0.2 (2026-06-25)

### Fixed
- **Essential Labs full audit pass** — both `core-nexus-4k-essential-labs.json` (v0.2.3 → v0.2.4) and `core-nexus-essential-labs.json` (v0.1.12 → v0.1.13):
  - **`{{inputs.exitThreshold}}` / `{{inputs.maxWaitMs}}` restored** — PR #267 hardcoded these values, orphaning the import-time configuration UI and substituting wrong thresholds (10 cached streams / 5000 ms instead of the designed 5 / 4000 ms). The `inputs` section in both templates is now wired back to the `dynamicAddonFetching.condition` string.
  - **Dead Flood Guard replaced** — the ESE referenced Meteor, Comet RD, MediaFusion, EZTV, Knaben, and HdHub, none of which exist in these templates (only StremThru Torz + TorBox Search). Replaced with live caps: StremThru Torz ≤ 10, TorBox Search ≤ 5.
  - **Extra Cached ESEs → `perGroup()`** — verbose 20–35 clause `merge(slice(...))` chains replaced with `perGroup(..., 'resolution', 3)` expressions, matching the stable 3.0.0 pattern.
  - **Low resolutions removed from `preferredResolutions`** — 144p, 240p, 360p removed.
  - **AV1 and VC-1 removed from `preferredEncodes`** — these encodes ranked ahead of standard HEVC/AVC without device justification.
  - **`enableSeadex: false`** — neither template has a SeaDex preset; all `seadex(streams)` ESE calls were returning `[]`.
  - **`addonDescription` updated** — was stuck at `"Nightly Labs v0.1.0"` since initial creation.

---

## 3.0.1 (2026-06-24)

### Fixed
- **Essential Labs groups validation error** (`core-nexus-4k-essential-labs.json`, `core-nexus-essential-labs.json`). Both templates copied the `groups.groupings` block from the Apex family, referencing `nx-fix-01` and `nx-fix-02` (Comet and Meteor instanceIds). Neither preset exists in the Essential Labs templates — AIOStreams' group validator rejects imports when a grouping references an addon that isn't in the preset list. Fixed by disabling `groups` and clearing `groupings: []`. Essential-style templates use `dynamicAddonFetching` for conditional scraper fetching, not addon groups.
- **Essential Labs `dynamicAddonFetching` condition** — both templates had `{{inputs.exitThreshold}}` and `{{inputs.maxWaitMs}}` placeholder variables with no corresponding `inputs` section, causing the condition to fail at runtime. Replaced with hardcoded values matching the stable Essential 4K pattern: `>= 10 cached 2160p streams or > 5000 ms` (4K) and `>= 15 cached 1080p streams or > 5000 ms` (1080p).
  - `core-nexus-4k-essential-labs.json`: v0.2.0 → v0.2.3
  - `core-nexus-essential-labs.json`: v0.1.9 → v0.1.12

---

## 3.0.0 (2026-06-24)

### Added
- **Bad Dual Audio Groups ESE — all 28 stable non-Anime templates.** Excludes 27 known mislabelled dual-audio release groups: alfaHD, BAT, BiOMA, BlackBit, BNd, Cory, EXTREME, FF, FOXX, G4RiS, GUEIRA, LCD, N3G4N, PD, PTHome, RiPER, RK, SiGLA, Tars, TM, tokar86a, TURG, vnlls, WTV, Yatogam1, YusukeFLA, ZigZag, ZNM. These groups produce streams falsely labelled as dual-audio (English + original) when the English track is either absent or a low-quality dub. Inserted immediately after the Flood Guard ESE. Graduated from Labs.
- **Indexer Diversity ESE — all 28 stable non-Anime templates.** Caps results per scraper at 2 when the total cached+P2P pool exceeds 20 streams, using `perGroup(indexer)`. Prevents any single slow or noisy indexer from dominating the result list when faster scrapers have already found sufficient coverage. Inserted just before the CB hard-kill block. Graduated from Labs.
- **Score IQR Guard ESE — 5 IQR-architecture 4K templates.** When the eligible stream pool is ≥ 8, removes streams whose `seScore` falls below `q1(seScore) − 1.5×IQR(seScore)` — the Tukey lower fence applied to the PSE score distribution. Eliminates statistical outliers that the quality tiers ranked poorly relative to the rest of the pool. Only applied to templates where PSEs produce a meaningful score distribution (IQR architecture): 4K Apex (→ **v0.6.0**), 4K Apex TorBox (→ **v2.11.0**), 4K Hybrid (→ **v2.11.0**), 4K Essential (→ **v2.11.0**), 4K AllDebrid (→ **v0.3.0**). CB-style and Lite templates excluded — flat scores produce no IQR distribution. Graduated from Labs.
- **Core Builds Base Config** (`Templates/Core-Builds-Base-Config.json`). A draft parent config for AIOStreams' parent/child config architecture (v2.28.0+). Contains all 12 scraper presets with tuned timeouts, the full universal ESE layer, ISEs, standard sort criteria, formatter, and all Tamtaro/Vidhin05 synced URLs. Import into AIOStreams to get a UUID; child templates then reference it via `parentConfig` and only need to define their service preset, PSEs, and template-specific ESEs. Activating this is deferred until a permanent hosted AIOStreams instance is available — the file is included for reference and future use.

- **perGroup() Extra Cached dedup — 5 IQR 4K templates.** The Extra Cached HQ, Extra Cached LQ, and Extra Uncached ESEs previously used verbose 20–35 clause `merge(slice(...))` chains to cap per-resolution results. Replaced with `negate(perGroup(..., 'resolution', 3), ...)` — a single expression that caps 3 streams per resolution bucket regardless of quality tier, with no maintenance overhead as new resolutions are added. Applies to all 5 IQR templates (4K Apex, 4K Apex TorBox, 4K Hybrid, 4K Essential, 4K AllDebrid). Graduated from Labs.
- **Elite group pin PSEs — 5 IQR 4K templates.** Four new PSEs prepended to the PSE list using `pin()`:
  - **4K Remux elite pin** — FraMeSToR, DON, FLUX, HIFI, playBD, BMF, QxR, EPSiLON, BLURANiUM, PmP pinned to position 1 within the 2160p Remux tier.
  - **1080p Remux elite pin** — NTb, FLUX, KiNGS, NTG, BHDStudio, FraMeSToR, SiC, 126811 pinned within the 1080p Remux tier.
  - **LQ group pin bottom** — YIFY, RARBG, EVO, YTS, PSA, MeGusta, Tigole always appear last.
  - **IMAX pin** — any IMAX-tagged stream pinned to position 1 when present.
  Graduated from Labs (tested in 4K Apex Labs v0.9.x).

### Fixed
- **Flash template plain-string ESE.** Both Flash 4K and Flash had one ESE stored as a bare string (`(daysSinceRelease > 3 or daysSinceRelease < 0) ? uncached(streams) : []`) instead of the standard `{expression, enabled}` dict format. Converted.

---

## 2.9.9 (2026-06-24)

### Added
- **REPACK/PROPER Passthrough ISE — all templates.** A new ISE pins REPACK and PROPER releases ahead of limit filters and exclusion logic. Previously, a corrected re-encode could be suppressed if it fell outside the quality window or hit a result cap before being evaluated. It now bypasses those gates and always surfaces in the stream list. Applied via the shared ISE file — no per-template change required; all templates pick this up automatically.
- **Codec Efficiency Booster PSE — AllDebrid and Samsung TV templates.** HEVC and AV1 streams are prioritised over AVC at equivalent quality and bitrate. Previously this boost was Apex and 4K Hybrid only; now active on all 4 AllDebrid templates and all 3 Samsung TV templates.
- **Audio Pinnacle PSE — AllDebrid and Samsung TV templates.** Atmos/TrueHD → DTS-HD MA/DTS-X → EAC3 priority ordering within each quality tier. Same expansion as Codec Efficiency Booster.
- **HDR/DV Priority PSE — AllDebrid and Samsung TV templates.** Dolby Vision and HDR10+ surface above HDR10 and SDR within 4K results. Same expansion.

### Fixed
- **Apple TV 4K Nightly — SeaDex passthrough ISE.** The template had SeaDex enabled in its preset list and config but was missing the passthrough ISE that marks SeaDex-matched streams as exempt from limit and exclusion filters. SeaDex results were being filtered the same as everything else. Added — SeaDex streams now bypass those filters on Apple TV 4K.
- **Speed TorBox templates — broken dynamic group addon references** (`speed-4k`, `speed-4k-lite`, `speed`, `speed-lite`). The dynamic addon group was pointing at instanceIds `nx-fix-01` and `nx-fix-02` which do not exist in any of the templates. AIOStreams' group validation was failing silently on import. Fixed to reference the correct Zilean and StremThru Torz instanceIds. A disabled MediaFusion fallback preset also added so fresh imports pass validation before TorBox credentials are configured.
- **Anime BD T1 regex drift — 34 templates.** Vidhin05 updated `English/regexes.json`, removing ZR and NAN0 from the Anime BD T1 pattern. The old `preferredRegexPatterns` entry (which included `/\b(DemiHuman|FLE|Flugel|LYS1TH3A|ZR)\b|(?<=remux).*\b(NAN0)\b/`) no longer matched elfhosted's allowlist — causing a "1 regex not allowed" error on import. Updated to match Vidhin05's current pattern (without ZR/NAN0) across all 34 non-Anime templates. `regexOverrides` entries for Anime BD T1 also updated for consistency.

### Changed
- **NZBGeek preset disabled by default — Hybrid templates** (`4K Hybrid`, `Hybrid`, `Hybrid Lite`). On shared hosting (ElfHosted, fortheweak.cloud), AIOStreams search and NZB grab requests can originate from different IPs. NZBGeek detects this pattern as multi-IP access and bans the account. The NZBGeek (`newznab`) preset is now `enabled: false` on all three Hybrid templates. Users on ElfHosted can re-enable it after routing requests through the [Zyclops proxy](https://zyclops.elfhosted.com); self-hosted users with a single IP can enable it directly.

### Docs
- **NZBGeek shared-hosting guidance.** The Hybrid accordion in `importing.mdx` now explains the IP-mismatch ban mechanism, the Zyclops proxy workaround for ElfHosted, and the NZBHydra2 alternative for self-hosted instances. NinjaCentral (the only indexer to publicly confirm AIOStreams public-instance compatibility) documented as a no-restrictions alternative. Same guidance added to the NZBGeek troubleshooting accordion in `master-guide.mdx`.

---

## 2.9.7 (2026-06-22)

### Fixed
- **Meteor scraper timeout — 28 templates.** Meteor was set to 10000ms on every template that used it (excluding Samsung TV/4K which were already at 3000ms). For new or niche series, the secondary scraper group (Meteor + Comet RD) always fires because the primary group returns fewer than 3 cached streams. Meteor waiting up to 10 seconds in that group was causing total addon request times to exceed Nuvio's (and similar players') internal timeout, resulting in "addon request timed out" errors even when streams exist. Lowered to 6000ms across all 28 affected templates.

---

## 2.9.6 (2026-06-21)

### Added
- **TorBox-priority PSEs — Hybrid and Hybrid Lite.** TorBox-cached twin PSEs now precede their all-service counterparts in both 1080p Hybrid templates, completing the pattern already deployed in 4K Hybrid (v2.9.4).
  - **Hybrid** (v2.9.4 → **v2.9.5**): Two IQR-based TorBox-priority twins inserted — S-Tier 1080p Remux (IQR Tukey fence + min/max fallback, 8GB size floor) and A-Tier 1080p WEB-DL (IQR + min/max + pow() age-decay). Each returns `[]` if no TorBox streams match, falling through cleanly to the all-service tier.
  - **Hybrid Lite** (v2.9.2 → **v2.9.5**): Two CB-style TorBox-priority twins inserted — `service(resolution(quality(streams,'BluRay REMUX'),'1080p'),'torbox')` and `service(resolution(quality(streams,'WEB-DL'),'1080p'),'torbox')`. Consistent with the simpler quality-tier architecture of Lite templates.

---

## 2.9.5 (2026-06-21)

### Added
- **TorrentsDB scraper — 13 non-Lite templates.** `torrents-db` added as a backup scraper (flood guard cap ≤ 1, after Knaben in preset order). TorrentsDB is a Torrentio fork with 21+ indexed providers: YTS, 1337x, Nyaa, AnimeTosho, Rutor, Rutracker, Torrent9, Tamil trackers, and others. Native TorBox debrid support, no API key required. Affected templates: 4K Apex (→ 0.4.14), 4K Apex TorBox (→ 2.9.3), Stream (→ 2.9.5), Stream Firestick (→ 2.9.4), Essential (→ 2.9.4), 4K Essential (→ 2.9.3), Hybrid (→ 2.9.4), 4K Hybrid (→ 2.9.4), AllDebrid (→ 0.1.11), 4K AllDebrid (→ 0.1.11), Anime (→ 2.8.7), Anime 4K (→ 2.8.7), Anime Dub (→ 2.8.7).
- **TorrentsDB scraper — Samsung TV templates.** Same preset and flood guard configuration (cap ≤ 1) applied to all three Samsung device templates: Samsung TV (v0.2.12 → v0.2.13), Samsung TV 4K (v0.2.12 → v0.2.13), Samsung RU7100 4K (v0.2.14 → v0.2.15).

### Fixed
- **`useMultipleInstances: false` — TorrentsDB preset on all 16 affected templates.** Initial TorrentsDB deploy shipped without the `useMultipleInstances` field in `options`. AIOStreams v2.30.x requires this field and rejects any preset where it is absent — import returned "Option useMultipleInstances is required, got undefined". Added `"useMultipleInstances": false` to all templates in a follow-up batch.

---

## 2.9.4 (2026-06-20)

### Changed
- **MediaFusion enabled by default — all 28 non-Speed templates.** MediaFusion was previously opt-in (`enabled: false`) on every template. It is now on by default. Users who do not want it can toggle it off via the AIOStreams addon settings. The resources field (`["stream"]`) ensures no catalog bleed into Stremio Discover.
- **HdHub enabled by default — 14 full TorBox templates.** HdHub is a TorBox-native P2P scraper (`tb_only: true`, meaning it only serves results when TorBox is the active debrid service). Previously opt-in; now on by default on all full (non-Lite) TorBox templates. Lite, Flash, Speed, and AllDebrid templates unchanged.
- **StremThru Torz enabled by default — `core-nexus-4k-apex-torbox.json`.** The cached-only TorBox variant shipped with StremThru Torz disabled, which prevented any TorBox stream delivery. Now on by default; the cached-only design is preserved by the `excludeUncached: true` flag rather than by disabling the provider.

---

## 2.9.3 (2026-06-20)

### Fixed
- **`/*Upscaled 4k*/` ESE — WEB-DL/WEBRip exemption** (24 stable templates + `Nightly/Samsung/core-nexus-samsung-tv-4k.json`). The ESE blocked all 4K streams whenever a 1080p Bluray REMUX existed but no 4K REMUX was found. This incorrectly suppressed genuine 4K WEB-DL releases for new theatrical releases (e.g. Spider-Man: Brand New Day) where a streaming master exists but the Blu-ray hasn't shipped yet. Added `and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip')) == 0` as an additional gate — 4K WEB-DL and WEBRip streams are now preserved in this scenario.
- **`metadata.changelog` string field** removed from 6 templates (`core-nexus-4k-alldebrid-lite.json`, `core-nexus-4k-alldebrid.json`, `core-nexus-alldebrid-lite.json`, `core-nexus-alldebrid.json`, `core-nexus-samsung-tv-4k.json`, `core-nexus-samsung-tv.json`). AIOStreams schema requires `metadata.changelog` to be an array or absent — a plain string causes "Invalid input → at metadata.changelog" on import.

### Chore
- **`docs/template-directory.mdx` version sync** — all 38 template version numbers in the docs were stale. Synced to actual template `metadata.version` values.

---

## 2.9.2 (2026-06-19)

### Changed
- **Knaben and Torrent Galaxy demoted to backup scrapers — all 39 active templates.** Both confirmed slow and debrid-only (community Discussion #528). Demoted from peer scrapers to true backups:
  - Moved to end of preset list, after Meteor / Comet / MediaFusion / HdHub
  - Flood guard cap reduced from ≤ 3 → **≤ 1** result each (was equal to EZTV/HdHub; now a last-resort contribution)
  - All other caps unchanged: Meteor ≤ 5, Comet RD ≤ 5, MediaFusion ≤ 4, EZTV ≤ 3, HdHub ≤ 3

### Removed
- **`opensubtitles-v3-plus` preset — all 39 active templates.** AIOSubtitle covers the same subtitle sources. Removing one redundant subtitle call per request with no user-visible difference.
- **EZTV preset — Flash and EasyNews Speed templates** (`flash-4k`, `flash`, `speed-4k-plus`, `speed-easynews`). EZTV is a TV-series-only indexer; Flash and EasyNews Speed are cached-only templates where TV-series torrents from EZTV are unlikely to be cached. No coverage loss for cached content. EZTV remains on all full-scraper templates.

---

## 2.9.1 (2026-06-19)

### Added
- **Per-Addon Flood Guard ESE — AllDebrid and Samsung TV templates.** The flood guard already present in all v2.9.0 standard templates is now applied to the 6 templates that were missing it:
  - `AllDebrid/core-nexus-4k-alldebrid.json` v0.1.7 → **v0.1.8**
  - `AllDebrid/core-nexus-4k-alldebrid-lite.json` v0.1.5 → **v0.1.6**
  - `AllDebrid/core-nexus-alldebrid.json` v0.1.6 → **v0.1.7**
  - `AllDebrid/core-nexus-alldebrid-lite.json` v0.1.6 → **v0.1.7**
  - `Device/Samsung/core-nexus-samsung-tv-4k.json` v0.2.8 → **v0.2.9**
  - `Device/Samsung/core-nexus-samsung-tv.json` v0.2.8 → **v0.2.9**

  Guard caps per-addon on non-library, non-SeaDex streams: Meteor ≤ 5, Comet RD ≤ 5, MediaFusion ≤ 4, Torrent Galaxy / EZTV / Knaben / HdHub ≤ 3. Inserted at ESE position 0 (runs before quality gates). Pre-rollout audit confirmed exact `options.name` match across all 19 active non-Flash/Speed/Anime templates — zero name discrepancies.

---

## 2.9.0 (2026-06-19)

### Fixed
- **Regex compatibility — fortheweak whitelist** (`streams-nightly.fortheweak.cloud`). fortheweak's AIOStreams instance uses a stricter or different regex whitelist than elfhosted's. Eleven `rankedRegexPatterns` entries and 3 `excludedRegexPatterns` entries that pass elfhosted's Vidhin05-based check were still rejected on fortheweak. Removed from all 33 non-Anime templates:
  - **Ranked removed:** `Radarr Web T1`, `Sonarr Web T1`, `Radarr Bad Dual Groups`, `Sonarr Bad Dual Groups`, `hallowed`, `LQ (Radarr)`, `LQ (Radarr) [B]`, `LQ (Sonarr)`, `LQ (Sonarr) [B]`, `LQ (Release Title) (Radarr)`, `LQ (Release Title) (Sonarr)`
  - **Excluded removed:** LQ (Radarr) [B] large pattern, `iVy`-only pattern, LQ (Sonarr) [B] large pattern
  - **Preferred removed (1080p templates):** `Radarr Web T1`, `Sonarr Web T1`, `hallowed`
  - LQ streams remain excluded via Tamtaro's `syncedExcludedRegexUrls` and the remaining inline excluded entries. WEB-DL releases retain ranking via the generic `Web T1` ranked entry. Release group scoring is preserved through all other ranked tiers (Remux, Bluray, Anime variants, 126811/FLUX/SiC/TheFarm/BHDStudio).

## 2.8.9 (2026-06-18)

### Fixed
- **Regex whitelist sync — all 39 active templates.** Our pattern strings had drifted from Vidhin05's current `English/regexes.json` (174 entries). elfhosted's allowlist check is exact string equality against Vidhin05's `pattern` field values; any divergence causes "X/183 regexes not allowed" on import. Eight unique pattern strings were stale:
  - **`Radarr Web T1` / `Sonarr Web T1`** — missing `MADSKY` from the group lookahead list
  - **`Radarr Bad Dual Groups`** — missing `CYPHER|EniaHD|MLH|XiQUEXiQUE`
  - **`Sonarr Bad Dual Groups`** — missing `CYPHER|MLH|XiQUEXiQUE|EniaHD`
  - **`LQ (Radarr) [B]` / `LQ (Sonarr) [B]`** — had `R&H` that Vidhin05's current pattern omits (R&H moved to LQ Release Title)
  - **`LQ (Release Title) (Radarr)` / `LQ (Release Title) (Sonarr)`** — missing `R&H` (Vidhin05 moved it here)
  - **File extension `excludedRegexPatterns` entry** — `/\.(iso|img|bin|...)$/i` is not in Vidhin05's whitelist; removed from all templates. Hard ISO/archive exclusion is not needed in practice (AIOStreams streams are always direct video links; scraper results for these types are extremely rare).
  All pattern strings now exactly match Vidhin05's `English/regexes.json` v174 entries. Verified with automated comparison against the live file.

## 2.8.8 (2026-06-18)

### Fixed
- **Regex configuration correction — all 33 active non-Anime templates.** v2.8.6 and v2.8.7 incorrectly stripped regex configuration based on a wrong assumption about elfhosted's blocking mechanism. elfhosted's "Allowed Regex Patterns" whitelist is large and includes all Radarr/Sonarr quality-guide patterns with lookahead syntax — these were never blocked by syntax, only by missing entries. Reverted all changes from those versions and aligned to verified working configuration:
  - **`rankedRegexPatterns` restored** to full `{name, pattern, score}` entries — all 48 (4K) / 45 (1080p) entries with complete pattern content from Vidhin05/Radarr/Sonarr guide
  - **`preferredRegexPatterns` restored** — 7 entries for 4K (Radarr/Sonarr Remux T1, Radarr UHD Bluray T1 + DON, Anime BD T1 + [sam], FraMeSToR); 8 entries for 1080p (Radarr/Sonarr/Web T1, 126811, FLUX, SiC, hallowed, BHDStudio)
  - **`excludedRegexPatterns` restored to 12** — the 4 lookbehind patterns (Extras by year, Extras by season, Sing-Along, BR-DISK guard) reinstated; these are on elfhosted's whitelist
  - **`syncedExcludedRegexUrls` restored** to Tamtaro's file
  - **`[B]` variants retained** in `rankedRegexPatterns` — entries with full pattern fields are whitelisted by pattern content, not by name; `[B]` suffix does not cause rejection

## 2.8.7 (2026-06-18)

### Changed
- **Complete `rankedRegexPatterns` override set — all 33 active non-Anime templates.**
  Replaced the partial (36/39-entry) inline sets with comprehensive score-override sets
  against all quality-relevant Vidhin05 pattern names. `syncedRankedRegexUrls` supplies
  the pattern content (Vidhin05 at score 0); our entries override only the score.

  **1080p templates — 48 overrides** (was 36):
  - *New:* `Radarr Remux T3` (+40), `Radarr UHD/HD Bluray T3` (+40), `Web T1` / `Radarr Web T1` /
    `Sonarr Web T1` (+60), `Radarr Web T3` / `Sonarr Web T3` (+20), `Repack/Proper` (+10), `Repack2` (+5),
    `FraMeSToR` (+100) was present; `TheFarm` (+80), `Radarr/Sonarr Remux T2` (+60) added.

  **4K templates — 53 overrides** (was 39):
  - *New:* `Radarr Remux T1` (+100), `Sonarr Remux T1` (+100), `FraMeSToR` (+100),
    `Radarr UHD Bluray T1` (+80), `Radarr/Sonarr Remux T2` (+60), `Radarr Remux T3` (+40),
    `Radarr UHD/HD Bluray T3` (+40), `Radarr Web T3` / `Sonarr Web T3` (+20),
    `Repack/Proper` (+10), `Repack2` (+5).
  - These were previously left at Vidhin05's default score of 0.

  All override names verified to exist in Vidhin05's 174-pattern file; no inline `pattern`
  field on any entry — the synced URL provides all pattern content.

## 2.8.6 (2026-06-18)

### Fixed
- **Final elfhosted regex allowlist fix — all 33 active templates (+ Nightly).** Two remaining sources of inline lookahead/lookbehind regex were the cause of the persistent "X/N regexes not allowed" error on import, surviving the v2.8.5 `preferredRegexPatterns`/`[B]`-variant cleanup:
  - **`rankedRegexPatterns` pattern content stripped.** Each ranked entry carried the full Vidhin05 `pattern` field inline — 24 of 36 (1080p) / 24 of 39 (4K) patterns used `(?=...)`, `(?!...)`, `(?<=...)`, or `(?<!...)`, which elfhosted rejects in any regex field. Entries reduced to `{name, score}` score-override pairs only. **`syncedRankedRegexUrls` restored** to `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json` — the synced URL now supplies the actual pattern content (at score 0) while our inline name+score entries override the ranking. This is the same approach Tamtaro's templates use successfully on elfhosted.
  - **4 `excludedRegexPatterns` with lookbehind/lookahead removed** (`excludedRegexPatterns`: 12 → 8 per template): `/(?<=\b[12]\d{3}\b).*\b(Extras|Bonus|Extended[ ._-]Clip)\b/i`, `/(?<=\bS\d+\b).*\b(Extras|Bonus|Extended[ ._-]Clip)\b/i`, `/(?<=\b[12]\d{3}\b).*\b(Sing[-_. ]Along)\b/i`, and the negative-lookahead BR-DISK/non-Bluray guard. Coverage retained via `rankedRegexPatterns` scoring: Extras (Radarr/Sonarr) at −200, Sing-Along at −75, BR-DISK at −75.
- After this change **no template carries any inline lookahead/lookbehind regex in any field** — verified across all 39 active templates. All affected templates bumped a patch version.

---

## 2.8.5 (2026-06-18)

### Fixed
- **`preferredRegexPatterns: []` — all 33 active templates** — The 7–8 Radarr/Sonarr quality-guide patterns in `preferredRegexPatterns` use lookahead syntax (`(?=...)`) that is blocked by elfhosted's regex allowlist, causing "X/N regexes not allowed" errors on save. Cleared to `[]` on all non-Anime active templates. The `rankedRegexPatterns` inline set retains full scoring for these release groups via its A-tier and B-tier entries.
- **`[B]`-variant names removed from `rankedRegexPatterns` — all 33 active templates** — In v2.8.2, nine patterns with duplicate names were renamed with `[B]` suffixes (e.g. `"Radarr UHD Bluray T1 [B]"`). These names are not on elfhosted's allowlist (derived from Vidhin05's exact pattern names), causing a secondary "8/54 regexes not allowed" error even after `preferredRegexPatterns` was cleared. Removed all `[B]` variants: `Radarr UHD Bluray T1 [B]`, `Radarr HD Bluray T1 [B]`, `Sonarr HD Bluray T1 [B]`, `Anime BD T1 [B]`, `Anime BD T2 [B]`, `Anime Web T1 [B]`, `Generated Dynamic HDR [B]`, `LQ (Radarr) [B]`, `LQ (Sonarr) [B]`. Pattern counts: 4K templates 48 → 39, 1080p templates 45 → 36. Deprecated templates left unchanged.

### Nightly
- **Apex Labs v0.8.0 / Stream Labs v0.6.0** — `perGroup()` prototype ESEs: Extra Cached HQ, Extra Cached LQ, and Extra Uncached ESEs replaced with single-expression `perGroup(..., 'resolution', 3)` equivalents (old 20+15+35-clause merge/slice ESEs disabled for side-by-side comparison). Score IQR Guard ESE added (disabled — uses `values(streams, 'seScore')` IQR fence for adaptive low-score filtering). Indexer Diversity ESE added (disabled — `perGroup(..., 'indexer', 2)` caps per-scraper flooding). Both labs also receive Boost Cached Usenet PSE and full ESE parity with production (No Sootio Library, YouTube Kill, 3D Content Kill).

---

## 2.8.4 (2026-06-17)

### Added
- **Boost Cached Usenet PSE — all 27 TorBox templates** — Appended as the final PSE in every non-AllDebrid, non-Anime, non-EasyNews template:
  ```
  /*Boost Cached Usenet*/ merge(cached(merge(library(streams),seadex(streams),type(streams,'debrid','usenet','stremio-usenet'))))
  ```
  Cached TorBox Usenet streams that don't fit inside the quality-window PSEs (e.g. `Unknown` quality NZBs, bitrate outliers) previously fell through all PSEs and appeared after the `streamExpressionMatched: desc` sort as unmatched — below cached debrid with a PSE hit. This PSE catches any remaining cached usenet and gives it a PSE match, so it ranks above uncached/unmatched streams. Enabled by default. Templates affected: all Single, Essential, Flash, Speed/TorBox, Hybrid, Device/Samsung, and Nightly TorBox/Samsung/AppleTV templates.

---

## 2.8.3 (2026-06-17)

### Fixed
- **`seadexBestOnly: false` — 5 non-Anime templates** (`core-nexus-flash-4k.json`, `core-nexus-4k-hybrid.json`, `core-nexus-4k-apex-torbox.json`, `core-nexus-speed-4k-plus.json`, `Nightly/core-nexus-4k-apex-labs.json`) — `seadexBestOnly: true` silently dropped every stream not indexed by SeaDex for anime queries. SeaDex is an anime-only database; on general-purpose 4K templates it discarded results whenever coverage was thin. Set to `false` (same fix applied to 4K Apex in v0.4.3).
- **Hard resolution kill ESE — 13 1080p templates** — All explicitly 1080p templates now carry `resolution(streams, '2160p', '1440p', '720p', '576p', '480p')` as their first ESE. PSEs rank but do not exclude; without the hard kill, 4K streams can surface on 1080p-only devices. Templates fixed: `core-nexus-stream-lite`, `core-nexus-stream-firestick`, `core-nexus-stream-firestick-lite`, `core-nexus-essential`, `core-nexus-essential-lite`, `core-nexus-flash`, `core-nexus-hybrid`, `core-nexus-alldebrid`, `core-nexus-alldebrid-lite`, `core-nexus-speed`, `core-nexus-speed-lite`, `core-nexus-speed-easynews`, `core-nexus-speed-4k-plus` (seadexBestOnly only — 4K template, no kill added).
- **Vidhin05 stale URL removed — Speed/TorBox templates** (`core-nexus-speed-4k.json`, `core-nexus-speed-4k-lite.json`, `core-nexus-speed.json`, `core-nexus-speed-lite.json`) — `syncedRankedStreamExpressionUrls` still referenced `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/expressions.json` from before the v2.8.2 audit. The Speed/TorBox templates were added after that audit ran. Removed; these templates now carry zero synced expression URLs.

---

## 2.8.2 (2026-06-15)

### Changed
- **Regex scoring — 53 high-impact patterns inline (all 31 non-Anime templates)** — The <100KB approach used `syncedRankedRegexUrls` pointing to `Filtering/ranked-regex-patterns.json`. AIOStreams instances that block raw GitHub URLs throw a "Forbidden URL in regex configuration" error on import, leaving templates with zero scoring. Fixed by embedding 53 patterns with `|score| ≥ 50` directly inline (16 KB overhead). All templates under 100 KB except 4K Hybrid (105 KB). Retained tiers: S-tier (100), A-tier (80), B-tier (60), and penalised tiers (−50, −75, −200). Mid-tier score=0/20/40 patterns dropped — no meaningful ranking differentiation. `syncedRankedRegexUrls` key removed from all templates.
- **Anime templates — empty `rankedRegexPatterns`** — Anime templates (`core-nexus-anime*.json` × 6) retain `rankedRegexPatterns: []`. Live-action release group patterns don't match anime naming; SeaDex ISE and dedicated anime indexers handle quality selection.

### Fixed
- **`rseMatched` removed from PSEs in 6 templates** (`core-nexus-4k-hybrid.json`, `core-nexus-hybrid.json`, `core-nexus-hybrid-lite.json`, `core-nexus-4k-apex-torbox.json`, `core-nexus-4k-essential.json`, `core-nexus-4k-essential-lite.json`) — PSEs used `rseMatched(streams, 'tier_name_1', ...)` to filter by RSE tier names. These calls throw "Invalid stream expression" on any instance where the Vidhin05 RSE URL is blocked. Replaced with bare `streams` — the PSE size/bitrate windows still apply to all streams.
- **`rseMatched` replaced in ESEs across 23 templates (98 expressions)** — Four ESE patterns (Bad 4k Anime, Upscaled 4k, Bad 4k Bluray, Bad 1080P Bluray) all contained `and count(rseMatched(resolution(streams, '2160p'), 'tier1', ...)) == 0` guards. Same failure mode. Replaced with equivalent `count(seadex(...))` and `count(quality(..., 'Bluray REMUX'))` checks that work on any instance.
- **Samsung TV 4K audit fixes** (`core-nexus-samsung-tv-4k.json`, v0.2.1 → v0.2.2)
  - AV1 and VC-1 removed from `preferredEncodes`, added to `excludedEncodes` — Samsung Tizen (2018–2022 models: RU7100, RU8000, NU8000, Q60) has no hardware AV1 decoder; VC-1 is absent. Previously the template ranked AV1/VC-1 above HEVC, causing silent playback failures.
  - Dolby Vision, HDR+DV (dual-layer), and AI upscale removed from `preferredVisualTags` — DV streams are already excluded by the DV-Only Kill ESE. AI upscale is not a real HDR format.
  - `maxResults` → 20, `maxResultsPerResolution` → 8 (aligned with standard defaults).
- **Samsung TV 1080p audit fixes** (`core-nexus-samsung-tv.json`, v0.2.1 → v0.2.2) — same AV1/VC-1 exclusion, DV/AI visual tag, and result limit fixes as the 4K variant.
- **4K Apex audit fixes** (`core-nexus-4k-apex.json`, v0.4.2 → v0.4.3)
  - AI upscale removed from `preferredVisualTags`.
  - `2.0` added to `preferredAudioChannels` → `["7.1", "5.1", "2.0"]` — stereo streams were unranked.
  - `seadexBestOnly` set to `false` — was silently dropping non-SeaDex streams for anime queries.
  - `maxResults` → 20, `maxResultsPerResolution` → 8.
  - Duplicate `preferredRegexPatterns` entries renamed with `[B]` suffix.
  - Low resolutions (144p, 240p, 360p) removed from `preferredResolutions`.

---

## 2.8.1 (2026-06-14)

### Fixed
- **Core Nexus Stream strictly 1080p** (`core-nexus-stream.json`, v2.7.5 → v2.7.7) — PSEs rank but do not exclude non-matching streams. Without a hard resolution ESE, 4K/1440p/720p streams all appeared in results regardless of the 1080p-only PSE labels. Two changes:
  1. Hard resolution kill ESE at position 1: `resolution(streams, '2160p', '1440p', '720p', '576p', '480p')` — all non-1080p streams excluded before any other logic fires.
  2. Removed PSEs 5 and 6 (720p WEB-DL and 720p Any fallback tiers) — the template is 1080p-only and should not rank 720p content at all.

---

## 2.8.0 (2026-06-14)

### Added
- **AllDebrid template family** — Full suite of AllDebrid templates for users without a TorBox subscription. `stremthruStore` replaces `stremthruTorz`; all other presets, PSE logic, and filter stacks are carried over from their Essential counterparts.
  - **Core Nexus 4K AllDebrid** (`Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json`, v0.1.2) — Full 4K with IQR Tukey fence PSEs, DV/HDR priority, TrueHD/Atmos, AV1.
  - **Core Nexus AllDebrid** (`Templates/Torbox/AllDebrid/core-nexus-alldebrid.json`, v0.1.0) — 1080p AllDebrid with CB-style PSEs.
  - **Core Nexus 4K AllDebrid Lite** (`Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-lite.json`, v0.1.0) — 4K AllDebrid without IQR filtering (CB-style simple PSEs). Lighter alternative for users who prefer less complexity.
  - **Core Nexus AllDebrid Lite** (`Templates/Torbox/AllDebrid/core-nexus-alldebrid-lite.json`, v0.1.0) — 1080p AllDebrid Lite companion.
- **Core Nexus Apple TV 4K** (`Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json`, v0.1.0) — Nightly template for Apple TV 4K via Infuse. Dolby Vision Profile 5/8 native, DD+ Atmos preferred, AV1 hard-excluded (no hardware decoder on A15/A17), HEVC-only. Based on 4K Apex with Apple TV-specific codec constraints applied.
- **Samsung TV promoted to stable** — Both Samsung TV templates moved from `Nightly/Samsung/` to `Templates/Torbox/Device/Samsung/` (new `Device/` category). v0.1.1 → v0.2.0. Samsung templates are no longer tagged as Nightly; `Device/` is the long-term home for device-specific variants.
- **Hybrid TorBox-priority PSEs** (`core-nexus-4k-hybrid.json`, v1.2.0) — 4 new PSEs that prefer TorBox-cached streams within each quality tier before falling back to the all-service pool. Pairs each existing IQR tier with a `service(...,'torbox')` twin: S-Tier 4K Remux, A-Tier 4K WEB-DL, S-Tier 1080p Remux, A-Tier 1080p WEB-DL. TorBox users on the Hybrid template will now consistently see TorBox streams ranked above RealDebrid when both are present.

### Changed
- **`pow()` exponential age-decay window replaces hard 60-day cliff** — Five templates previously used a `daysSinceRelease<60` binary gate as the thin-pool fallback for quality tiers with fewer than 4 ranked streams. Day 59 content got a ±25% bitrate window; day 61 got nothing, falling to the E-Tier catch-all. Replaced with a smooth exponential decay using `pow(0.95, daysSinceRelease)`: ±40% at day 0, ±9% at day 30, ±2% at day 60, effectively zero by day 90. Content gradually ages out rather than hitting a cliff. Applied to 4 PSEs each in:
  - Core Nexus 4K Apex (v0.3.5 → **v0.4.0**)
  - Core Nexus 4K Apex TorBox (v0.1.4 → **v0.2.0**)
  - Core Nexus 4K Hybrid (v1.1.0 → **v1.2.0**)
  - Core Nexus 4K Essential (v2.7.5 → **v2.8.0**)
  - Core Nexus 4K AllDebrid (v0.1.0 → v0.1.1, bundled with initial release)
- **Core Nexus 4K Pro deprecated** — Superseded by 4K Apex (same IQR PSE stack, cleaner naming, active development). Moved to `Templates/Torbox/Deprecated/`. 4K Apex is the recommended replacement.

### Fixed
- **Samsung TV 4K missing audio exclusions** (`core-nexus-samsung-tv-4k.json`, v0.2.0 → v0.2.1) — `excludedAudioTags` was empty. DTS:X and TrueHD were preferred but never hard-excluded, meaning the template actively surfaced streams Samsung Tizen cannot decode. Fixed to match the 1080p template: `["TrueHD","DTS-HD MA","DTS:X","FLAC"]`. A user (Dom) reported streams playing for a few seconds then stuttering — this was the cause.
- **Samsung TV 1080p visual tag order** (`core-nexus-samsung-tv.json`, v0.2.0 → v0.2.1) — `preferredVisualTags` was ordered SDR → HLG → HDR → HDR10 → HDR10+, ranking SDR above HDR content. Samsung supports HDR10 and HDR10+ at 1080p. Fixed to HDR10+ → HDR10 → HDR → HLG → 10bit → SDR.
- **`addonLogo` URL in all stable templates** — 31 templates used `/main/Assets/` in the GitHub raw URL. Corrected to `/refs/heads/main/Assets/` per the CLAUDE.md spec. The old URL is a redirect that occasionally breaks on stale CDN caches.
- **Samsung 1080p `addonName`** — Was `"Core Nexus Stream"` (copied from the Stream template base and never updated). Corrected to `"Core Nexus Samsung TV"`.
- **Stream template CB tier labels** — PSE comment labels still used legacy `/* CB S-Tier 1080p */`, `/* CB A-Tier */` etc. from the original Community Builds naming. Renamed to `/* S-Tier 1080p | BluRay REMUX */` etc. to match the current naming convention.
- **AllDebrid 4K stale PSE labels** (v0.1.1 → v0.1.2) — PSEs 6, 9, 10, 11, 12 still read `ESSENTIAL` after the template was derived from `core-nexus-4k-essential.json`. Corrected to `ALLDEBRID`.

---

## 2.7.5 (2026-06-13)

### Added
- **`hdhub` preset added (12 full non-Lite templates)** — HdHub is a TorBox-native P2P scraper (`tb_only: true`) that serves movie, series, and anime streams. Added as a disabled-by-default preset with `resources: ["stream"]` (no catalog bleed), 5000ms timeout, and positioned before `torrent-galaxy` in the P2P block. Templates: 4K Pro, Stream, Stream FireStick, 4K Apex, 4K Apex TorBox, 4K Essential, Essential, Anime, Anime 4K, Anime Dub, 4K Hybrid, Hybrid. Enable via AIOStreams addon settings if your TorBox plan supports it.

### Fixed
- **Addon timeout tuning — all 33 active templates** — Every preset was set to a flat 3000ms regardless of addon characteristics. AIOStreams runs all addons in parallel and silently drops any addon that exceeds its timeout, so an undersized timeout causes silent result loss. Key fixes:
  - `meteor` + `newznab` (TorBox NZB): 3000ms → **10,000ms** — multi-hop usenet sources and Tor-routed paginated queries routinely take 3–8s; 3000ms was dropping nearly all usenet results silently
  - `comet`: 3000ms → **7,000ms** — cold scrapes for new/obscure titles regularly exceed 3s
  - `knaben`: 3000ms → **6,000ms** — public multi-indexer with variable load
  - `torrent-galaxy` + `eztv` + `animeTosho` + `nekobt`: 3000ms → **5,000ms** — public scrapers need headroom
  - `zilean` + `torbox-search` + `seadex` + subtitle addons: 3000ms → **4,000ms** — minor headroom increase; these are fast by nature
  - `library` + `stremthruTorz`: unchanged at 3000ms — direct API calls, consistently fast

### Changed
- **Dedup tiebreakers explicitly configured (all 33 templates)** — AIOStreams v2.30.3 introduced configurable deduplication tiebreakers. Added `torrent_seeders` (`before_addon`) and `usenet_age` (`before_addon`) to the `deduplicator` block in every active template. When two streams tie on all other criteria, P2P results now prefer higher seeder counts and usenet results prefer newer posts — before falling back to addon order. Behaviour matches the v2.30.3 defaults but is now explicit and documented in each template.

---

## 2.7.4 (2026-06-12)

### Changed
- **📖 Chapter badge added to formatter (all 33 active templates + standalone Elite, Apex-v2, Nexus Prime formatters)** — `{stream.hasChapters}` is now displayed as a `📖` badge in the stream description line, positioned after the container tag. BluRay REMUXes with embedded chapter markers are visually distinguished from encodes and WEB-DL sources that typically lack chapters. Badge only appears when chapters are present; no output when absent.

---

## 2.7.3 (2026-06-12)

### Fixed
- **`zilean` and `meteor` missing `resources: ['stream']` (all 33 active templates)** — Without this field, both scrapers were also exposing catalog and meta entries in Stremio. Users would see "scraper information" results and clicking them would navigate to the scraper's homepage (AIOStreams GitHub for Meteor) instead of playing a stream. This is a regression from the v2.4.5 fix that added `resources: ['stream']` to `comet` and `mediafusion` but missed `zilean` and `meteor`. Now applied to all active templates.

---

## 2.7.1 (2026-06-12)

### Fixed
- **Knaben moved to last P2P position (all 33 templates)** — Knaben is a slow, debrid-only indexer. Sitting mid-stack it blocked faster, broader indexers from being evaluated first. Now positioned last in the P2P block, immediately before subtitle addons, in every active template.
- **`torbox-search` disabled (all 33 templates)** — Renamed in AIOStreams v2.30.2; the old addon identifier no longer resolves. Was still present and enabled in 4 templates (`core-nexus-4k-hybrid`, `core-nexus-hybrid`, `core-nexus-hybrid-lite`, `core-nexus-4k-apex-torbox`), creating a broken addon slot. Disabled across the board.
- **AnimeTosho enabled in all 6 anime templates** — Was in the preset list but switched off. AnimeTosho is a primary high-quality anime indexer and should have been on from the start.
- **NekoBT enabled in all 6 anime templates** — Same as above; present but disabled. Now on alongside AnimeTosho.

---

## 2.7.0 (2026-06-12)

> **Version jump note — 2.6.x → 2.7.0**
>
> The 2.6.x series was entirely infrastructure and template additions (formatters, lazy-load, device templates, ESE fixes). 2.7.0 is the first release to change *how streams are evaluated* — IQR Tukey fence PSEs replace the previous `min×0.80 / max×1.20` approach with proper statistical outlier fencing. That's a meaningful behavioural change in the core filtering logic, warranting a minor version bump rather than another 2.6.x patch.

### Added
- **Core Nexus 4K Hybrid** (`Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json`) — New template combining TorBox debrid and NZBGeek Usenet as dual sources. Full 4K (2160p primary, 1080p fallback), no HDR restrictions, full lossless audio (TrueHD, Atmos, DTS:X, DTS-HD MA, FLAC), 7.1 channel support, AV1 allowed. Uses full IQR PSE stack (12 PSEs, "HYBRID" labels). Dynamic addon fetching fires when fewer than 15 cached 4K results exist. For users running both debrid and Usenet who want a single optimised template covering both.
- **Standalone PSE reference files** — `Expressions/apex-iqr-pses.md` (human-readable) and `Expressions/apex-iqr-pses.json` (machine-readable export of all 12 Apex IQR PSEs). Community can inspect, adapt, or import the expressions independently of the full template.

### Changed
- **IQR Tukey fence PSEs — Core Nexus 4K Apex (v0.3.0)** — Replaced the v0.2.0 `min×0.80 / max×1.20` bitrate gate with a full Q1−1.5×IQR / Q3+1.5×IQR Tukey fence across all 12 PSE tiers. The fence is adaptive: ≥4 ranked results uses IQR; 1–3 results falls back to min/max ×0.80/×1.20 (pool too thin for IQR to be stable); 0 results + title ≤60 days old clusters around the median; 0 results + older title passes through. Prevents a single outlier stream from corrupting the bitrate range for the entire tier.
- **IQR Tukey fence PSEs — Core Nexus 4K Pro (v2.7.0)** — Full 12-PSE IQR stack with "PRO" labels. Same three-tier adaptive fallback as Apex.
- **IQR Tukey fence PSEs — Core Nexus 4K Essential (v2.7.0)** — Full 12-PSE IQR stack with "ESSENTIAL" labels.
- **IQR Tukey fence PSEs — Core Nexus Hybrid 1080p (v2.7.0)** — 1080p-scoped IQR stack (PSEs 7–12 from Apex: S-Tier Remux IQR, A-Tier WEB-DL IQR, + 4 pass-throughs) with "HYBRID" labels. Hybrid covers 1080p as its primary quality tier.

---

## 2.6.4 (2026-06-10)

### Added
- **Core Nexus Samsung TV 4K** (`Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json`) — 4K variant of the Samsung TV Nightly template. DV-Only Kill ESE enabled by default — excludes DV-only streams; HDR10+, HDR10, HLG, SDR, and DV+HDR10 dual-layer content passes through normally. 2160p primary with 1080p fallback. HDR10+ visual priority (Samsung TVs support HDR10+). Full lossless audio enabled (TrueHD, Atmos, DTS:X, DTS-HD MA, FLAC) with 7.1 channel support. 4K PSE tier stack matching Core Nexus 4K Pro.

---

## 2.6.3 (2026-06-10)

### Changed
- **Updated addon logo** — new glowing gradient diamond icon. Hex outline retains cyan gradient with ambient glow; diamond transitions cyan → purple → orange. Version bump ensures AIOStreams update notification fires for all users on v2.6.2.

---

## 2.6.2 (2026-06-10)

### Added
- **Lazy-load groups on all 28 non-Flash templates** — Comet and Meteor are now placed in a `groups` block so they are only queried when the addons ahead of them (Library, Zilean, StremThruTorz) return fewer cached results than the threshold. If your Library already has enough cached results, Comet and Meteor are **never called** — eliminating their fetch time entirely for well-stocked libraries.
  - **Single / Essential / Hybrid / Anime**: condition `count(cached(previousStreams)) < 3` — skip heavy scrapers when 3+ cached results already exist
  - **Speed**: condition `count(cached(previousStreams)) < 2` — tighter threshold matching Speed's fast-fetch design intent
  - **Flash skipped** — DAF already fires at 2 cached results; groups would be redundant

---

## 2.6.1 (2026-06-10)

### Fixed
- **DV-Only Kill ESE — invalid `negate()` call corrected (all 31 templates)** — The ESE introduced in v2.6.0 contained a broken single-argument `negate()` call: `visualTag(negate(merge(...)), 'DV')`. AIOStreams requires two stream arrays — `negate(A, B)` returns items in A not in B. Corrected to `negate(visualTag(streams, 'DV'), merge(visualTag(streams, 'HDR10+'), ...))` — DV streams that don't also carry a fallback HDR layer. Without this fix, AIOStreams rejected the ESE on import with *"Both arguments of the negate function must be arrays of streams"*, causing the v2.6.0 update to fail to load on some instances.
- **Season pack threshold lowered: 10 → 3 (all 30 active templates)** — Streams were showing the correct episode label but playing wrong content (season packs served as individual episode matches). The previous threshold of 10 was unreachable in Flash templates which cap at 10 total results, meaning Flash users always saw season packs regardless of available individual streams.
- **Kill Ambiguous Packs ESE added to all 30 active templates** — This ESE (`count(negate(streams, seasonPack(streams))) > 0 ? negate(seasonPack(streams), episodePack(streams)) : []`) has been in the Core Builds shared filter file since v2.2.3 but was never applied to any template. Fires at just 1 individual episode stream and kills full season packs while preserving multi-episode ranges (e.g. S01E01-E03). Works alongside the threshold ESE for two-layer pack filtering.
- **Library timeout: 2000ms → 3000ms (Anime × 6, Essential × 2)** — Library is always the highest-quality source (user's own cached files) and should be given the same time budget as other critical addons. 2000ms was too short and could cause Library to time out before returning results on slower instances.

### Changed
- **StremThruTorz enabled in Flash × 2 and Speed × 10** — Was present in the preset list but switched off. StremThruTorz is the source that populates `stream.uSubtitleEmojis` — without it, the subtitle language flag badges shipped in v2.6.0 (🇬🇧 🇫🇷 🇩🇪) show nothing.
- **StremThruTorz added to Anime × 6** — Was missing from the preset list entirely. Anime users particularly benefit from accurate subtitle language data given the sub vs dub use case.
- **EZTV enabled in Speed × 10** — Was present but switched off. EZTV is a TV-specific indexer that improves series coverage on Speed builds. Not enabled in Flash (cached-only build — P2P indexer adds query overhead with no benefit when the dynamic stop fires at 2 cached results).

### Infrastructure
- **v2.6.1 version bump — update notification fix** — All fixes since the v2.6.0 bump landed at the same version number. Users who imported at v2.6.0 would never receive an update notification because `compareVersions(remote, local)` returned 0. This bump ensures the AIOStreams in-app update check fires correctly for all users currently on v2.6.0.

---

## 2.6.0 (2026-06-10)

### Added
- **Core Nexus Samsung TV** (`Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv.json`) — Device-specific Nightly template for Samsung smart TVs and other hardware without Dolby Vision support. Derived from Core Nexus Stream with the DV-Only Kill ESE enabled by default. DV-only streams are excluded; HDR10, HDR10+, HLG, and SDR content passes through normally.
- **DV-Only Kill ESE** — New optional ESE added to all 30 active templates (`enabled: false` by default). When toggled on, excludes streams where Dolby Vision is the only format tag with no HDR10/HDR10+/HLG/SDR fallback layer — the DV streams that cause black screens on non-DV devices. DV+HDR10 streams (dual-layer) are unaffected. `enabled: true` is pre-set in the Samsung TV Nightly template.
- **Core Nexus Stream (Fire Stick)** (`Templates/Torbox/Single/core-nexus-stream-firestick.json`) — 1080p SDR template tuned for Amazon Fire Stick and other low-RAM streaming devices. Reduced dynamic stop thresholds and lighter ESE stack optimised for the hardware constraints.
- **Core Nexus Stream (Fire Stick) Lite** (`Templates/Torbox/Single/core-nexus-stream-firestick-lite.json`) — Lite variant of the Fire Stick template with further relaxed filtering (12 ESEs).
- **Regional Content Guide** (`Guides/REGIONAL_CONTENT_GUIDE.md`) — How to surface non-English and regional-language content in Stremio's Discover section. Covers CINEMETA limitations, language-specific catalog addons, and TorBox passthrough behaviour.

### Changed
- **Formatter subtitle display — language flags replace generic badge** — All 30 active templates + standalone Core Nexus Elite formatter: `{stream.subbed::istrue["  📝 SUB"||""]}` replaced with `{stream.uSubtitleEmojis::exists["  📝 {stream.uSubtitleEmojis::join(' ')}"||""]}`. Users now see per-language subtitle emojis (🇬🇧 🇫🇷 🇩🇪 etc.) filtered to their configured language set, instead of a generic SUB badge. The badge only appears when accurate subtitle metadata is available (StremThru, nekoBT, Torznab sources with subtitle info).
- **Flash — uncached streams for new releases** — Both Flash templates: `excludeUncached` set to `false`; the hard-kill string ESE replaced with a conditional `(daysSinceRelease > 3 or daysSinceRelease < 0) ? uncached(streams) : []`. Uncached streams now surface for content released within the last 3 days; everything older and all unknown-release-date content continues to show cached-only. Maintains the instant-play character for back-catalogue while not blocking day-one drops.
- **Balanced preload selector** — All 28 non-Flash templates: `preloadStreams.selector` changed from `slice(cached(streams), 0, 3)` to `slice(perGroup(cached(streams), 'resolution', 2), 0, 4)`. Preloaded streams now include at most 2 per resolution group (4K, 1080p, etc.) rather than the top 3 by sort order, which previously could return 3× 4K with zero 1080p representation.
- **CHANGELOG format** — Added `# Changelog` h1 heading required by the AIOStreams `changelogUrl` parser.

### Fixed
- **Episode sort — global sort criteria updated in 7 templates** — Flash and Speed-family templates (Speed, Speed Lite, Speed+, Speed+ Lite, Speed EasyNews, Speed EasyNews Lite, Flash) had a stale 10-key global sort starting with `resolution`. Updated to the canonical 14-key sort used by all other templates: `cached → streamExpressionMatched → streamExpressionScore → resolution → quality → audio → language → …`. Ensures streams that matched any active expression rank above plain quality-sorted results — addresses the community-reported issue where wrong-season episode streams were outranking correct matches for niche shows.
- **Anime Non-Anime Query Guard** — Anime templates were sending non-anime queries to anime-specific scrapers (AnimeTosho, NyaaFH, BakaBT). Added `and not isAnime` guard to the Anime ISE so these sources are only queried for anime content. Previously, non-anime searches returned consistent 0-result noise from these indexers.
- **Flash template `addonName` mismatch** — Flash templates had incorrect `addonName` values inherited from a previous template generation pass. Corrected to match the addon configuration so stream source labels display accurately.
- **Formatter INSTANT/UNCACHED display on debrid streams** — AIOStreams does not evaluate nested `{expr}` conditionals inside the truthy branch of an outer conditional. The baked-in formatter description contained `{service.shortName::exists["{service.cached::istrue['🚀 INSTANT  '||'⚠️ UNCACHED  ']}"||""]}` which caused the inner expression to render as raw template text on any TorBox, RealDebrid, or other debrid-backed stream. Replaced with the flat two-expression form `{service.cached::istrue["🚀 INSTANT  "||""]}{service.cached::isfalse["⚠️ UNCACHED  "||""]}` — the form already used correctly by the Flash templates. Affects all 30 active templates (Single, 4K Pro, Essential, Flash, Speed, Anime, Hybrid — all variants). core-cipher was already correct and is unchanged.

### Infrastructure
- **GitHub Actions version pins corrected** — All workflows updated from non-existent `actions/checkout@v6` and `actions/github-script@v9` to current `@v4` and `@v7` respectively.
- **Link checker exit code comparison fixed** — `env.lychee_exit_code != 0` changed to `!= '0'`; GitHub Actions env vars are always strings, so the integer comparison never triggered the issue-creation step.
- **Auto-responder keywords refined** — Removed `real-debrid` and `realdebrid` from deprecated trigger keywords (the Hybrid template is an active TorBox+RD build). Auto-reply updated to mention Hybrid as the current TorBox+RD option.
- **Flash and Nightly labeler + label definitions added** — `template-flash` and `nightly` labels added to `labels.yml` and `labeler.yml`. Previously the labeler silently failed for Flash and Nightly PRs because the label definitions did not exist.
- **Release archive excludes Nightly** — `release.yml` updated to exclude `Templates/Torbox/Nightly/` from the release zip. Nightly builds are pre-release and should not appear in stable release archives.
- **Bug report template updated** — All current template variants added to the "Which template" dropdown, including Flash, Flash 4K, Hybrid Lite, all Speed Lite variants, Anime 4K, Anime Lite, Anime 4K Lite, Anime Dub, and Anime Dub Lite.
- **Welcome workflow links fixed** — `blob/refs/heads/main` corrected to `blob/main` in both guide links (were returning 404 on GitHub).
- **Issue template config links fixed** — Corrected broken `blob/refs/heads/main` URL and updated docs link from `Branding-Brevity/Core-Builds-By-Brevity` to `brevityA/Core-Builds`.
- **Discussion template links fixed** — FAQ and template-request discussion templates corrected to point to `brevityA/Core-Builds`.
- **Release changelog categories** — Added `template-flash` to "New Templates & Formatters" and a new `🌙 Nightly / Pre-release` category for `nightly`-labelled PRs.

### Documentation
- **IMPORT_GUIDE rewritten** — Replaced all pre-rename template filenames with current names. Added Flash tier section (was entirely absent). Added all Lite variants table. Fixed import navigation path. Added EasyNews Speed section.
- **WHICH_TEMPLATE rewritten** — All old template names replaced with current names. Removed deprecated Dual Core decision path. Added Flash tier, Fire Stick variant, and Lite recommendation step. Updated At-a-Glance table to cover all 16 standard templates with correct filenames.
- **DEVICE_PROFILES updated** — Removed all deprecated template references (`core-nexus-torbox-exclusive_rpdb`, `core-nexus-4k-dual-core`, `core-nexus-dual-core-1080p`). Replaced with current template names and corrected Hybrid template path.
- **README template count and Fire Stick entry** — Template count corrected to 30 (16 standard + 14 Lite). Core Nexus Stream (Fire Stick) added to the TorBox Pro table; Stream Fire Stick Lite added to the Lite table.
- **Templates/Torbox/README.md** — Core Nexus Stream (Fire Stick) added to the All Templates table.
- **FAQ stale content fixed** — Real-Debrid answer updated to reference Hybrid template and RB3 community template as current options. Dual Core "what happened" entry clarified.
- **TROUBLESHOOTING stale content fixed** — URL example updated from deprecated Dual Core path to current Single path. RD wall-of-red section rewritten to reflect RD's May 2026 server-side filter policy rather than deprecated dual-service templates.

---

## 2.5.1 (2026-06-05)

### Added
- **Core Nexus Flash** (`Templates/Torbox/Flash/core-nexus-flash.json`) — New Flash tier. Cached-only instant play at 1080p. `excludeUncached: true` — zero uncached results ever shown. 2-stream dynamic stop condition fires as soon as 2 cached results are found. The 0Cached ISE provides a title passthrough if nothing is cached, preventing a blank screen. Addon stack: Library → Zilean → Comet → Meteor → Knaben.
- **Core Nexus Flash 4K** (`Templates/Torbox/Flash/core-nexus-flash-4k.json`) — Flash tier at 4K. Same cached-only design with DV → HDR10+ → HDR visual priority and 2160p → 1080p fallback resolution order.
- **Local test environment** — `requirements.txt` added (`pytest` only dependency). Contributors can now spin up a Python virtual environment and run the full test suite locally with three commands. See CONTRIBUTING.md for setup instructions.

### Changed
- **CONTRIBUTING.md — Local Testing section added** — Documents `python3 -m venv`, `pip install -r requirements.txt`, `pytest`, and the direct validator CLI. Also documents the Docker AIOStreams path for live end-to-end testing.
- **Midnight's host — Meteor Rewrite V2 Beta noted** — STATUS.md instance notes and Guides/README.md host table updated to flag that Midnight's instance is running the Meteor V2 Beta. Some features incomplete (Your Media not yet available); users may need to reconfigure or override their manifest.
- **README badges switched to static** — BUILD and RELEASE badges replaced with static shields.io badges while GitHub Actions is suspended at account level. Eliminates "REPO OR WORKFLOW NOT FOUND" / "NO RELEASES OR REPO NOT FOUND" display errors.
- **Banner image fixed** — New clean `Assets/banner.svg` created at a fresh path. Original `core_builds_banner.svg` URL was permanently blocked by GitHub's Camo image proxy due to a prior Google Fonts `@import`. New file uses system fonts only, no external references — renders correctly on all GitHub README views.

---

## 2.5.0 (2026-06-04)

### Added
- **Lite template suite — 12 new templates** — Every active template now has a `-lite` variant with relaxed filtering. Quality gates removed: Low Bitrate, Low Seeders, Low SEL Score, Upscaled 4K, Bad 4K/1080P Bluray, Extra Cached (HQ/LQ), Extra Uncached, Final Limit. ESE count reduced from 24 → 12 per template. Result limits raised to global 30 / resolution 12. Hard safety kills retained (CAM, YouTube, 3D, Bad NZBs, Season Pack guard).
- **Core Nexus Anime 4K** (`core-nexus-anime-4k.json`) — 4K-first anime template. Resolution order: 2160p → 1080p fallback. Visual tag priority: DV → HDR10+ → HDR. Audio priority: Atmos → TrueHD → FLAC. PSE stack rebuilt with 4K S/A/B/C tiers above 1080p fallback. Size caps: 80 GB movies / 40 GB series.
- **Core Nexus Apex v2 formatter** — Score number in line 1 (✦ 94 instead of QUALITY label), bitrate before visual tags in line 2, per-language subtitle flags (📝 🇬🇧 🇫🇷) replacing binary SUB badge.
- **Core Nexus TV formatter** — Large-screen / 10-foot UI. UPPER CASE throughout, coloured resolution circles (🔴 4K · 🔵 1080P · 🟢 720P), 4-line layout with 🎬 / 🔊 / 🔌 section icons.
- **Core Nexus Speed EasyNews** (`core-nexus-speed-easynews.json`) — EasyNews-only instant play. No TorBox subscription required. Usenet-first with debrid fallback.

### Changed
- **Version bump to 2.5.0** on all templates.

---

## 2.4.7 (2026-06-03)

### Fixed
- **Anime template update detection** — `core-nexus-anime.json` was missing `"source": "external"` in metadata. AIOStreams uses this field to identify externally-managed templates eligible for update notifications. Anime users on 2.4.6 had no way to receive updates automatically; this restores update detection for all anime template users.

### Changed
- **Tamtaro & Vidhin recognition added** — `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, and `README.md` now explicitly credit Tamtaro (SEL Setup ISEs/ESEs/formatter type), Vidhin05 (ranked regex patterns), AIOStreams/Viren070 (platform), and midnightignite (Meteor endpoint). Attribution preservation is a stated requirement for all contributions.
- **Version bump to 2.4.7** on all 13 templates.

---

## 2.4.6 (2026-06-03)

### Added
- **Core Nexus Elite Formatter** — New high-contrast formatter shipped in all 13 templates. Features: colour-coded resolution circles (🟣 4K · 🔵 1080P · 🟢 720P · ⚫ 480P), smart HDR type detection in the stream title (👁️ DV · ✨ HDR¹⁰⁺ · 🌟 HDR¹⁰ · 🌤️ HLG — SDR shows nothing, keeping titles clean), quality source emojis (💎 REMUX · 💿 BLURAY · 🍿 WEB-DL · 📼 WEBRIP), audio emojis (🔮 ATMOS · 💎 TRUEHD · 🔷 DTS-HD MA), auto-detected 👑 PREMIER badge on elite release groups, 🎞️ IMAX filename detection, ⭐ SeaDex Best indicator, and seeders/freeleech/folderSize fields.

### Changed
- **`dynamicAddonFetching` thresholds raised** — Quality templates now require 15 cached 1080p streams (or 10 cached 4K streams) before stopping further addon queries. Previous threshold of 2–8 was too low — Meteor alone was satisfying the condition, meaning only one addon ever loaded. New thresholds ensure multiple scrapers consistently contribute results.
- **`checkOwned: false` on all 13 templates** — Removes the extra TorBox ownership verification API call made per title lookup. Users always have access to everything via their TorBox account; the check added latency with no benefit.
- **All timeouts capped at 3000ms** — Lowered all remaining 4000ms and 5000ms addon timeouts to 3000ms across all templates (including Nightly which had several at 5000ms). Ensures consistent cutoff behaviour and faster perceived load.
- **Version bump to 2.4.6** on all 13 templates.

---

## 2.4.5 (2026-06-02)

### Added
- **Meteor instance URL pinned** — All 13 templates now explicitly pin `"url": "https://meteorfortheweebs.midnightignite.me"` on Meteor preset. Ensures consistent Meteor experience across all AIOStreams hosts (Viren's, self-hosted, nightly builds). Meteor endpoint maintained by @midnightignite, the developer and TorBox community manager.

### Changed
- **Encode ranking** — `preferredEncodes` reordered to HEVC → VP9 → AV1 → AVC on all quality templates. HEVC is the UHD Blu-ray gold standard; VP9 is streaming standard (v2.4.6 AIOStreams spec).
- **Audio tag ranking** — `preferredAudioTags` unified across all 13 templates to prioritise Atmos → DTS:X → TrueHD → DTS-HD MA → FLAC → DTS-HD → DTS-ES → DD+ → DTS → DD → AC-4 → OPUS → AAC (v2.4.6 additions: AC-4, VP9).
- **Visual tag reordering** — IMAX moved before 10bit; AI moved last on all affected templates.
- **Speed 1080p templates** — `preferredVisualTags` switched to HDR-first (was SDR-first). Resolution order fixed to 1080p → 2160p → 1440p → 720p.
- **Speed template sort criteria** — Full rebuild with all keys in correct order including previously missing 'bitrate' field.
- **Resolution preference hierarchy** — 1440p moved to position 2 (between 2160p and 1080p) across all 13 templates.
- **Cached stream preload** — `preloadStreams.selector` increased from `slice(cached(streams), 0, 2)` to `slice(cached(streams), 0, 3)` on quality templates for better cached coverage.
- **Result limits** — `resultLimits.resolution` set to 15 across all quality templates (was 10–12).
- **4K Pro sizing** — `size.movies.max` set to 80GB (was missing).
- **Language filtering** — `requiredLanguages` cleared to `[]` on all 13 templates (was blocking untagged but valid streams).
- **Resolution inclusion/exclusion** — `includedResolutions` cleared to `[]`, `excludedResolutions` fixed to `['144p', '240p', '360p']` only across all templates.
- **Preset enhancements** — `stremthruStore` (primary fast-cached source) added to all 13 templates after library preset. `aiosubtitle` (quality templates only) added with locale support. All scraper presets now have `resources: ['stream']` to suppress duplicate catalog entries.
- **Anime metadata** — Added `metadata.category: 'Anime'` to anime template.
- **Quality template scrapers** — EZTV enabled (disabled on Speed templates). TorBox Search enabled on Hybrid with Usenet sources. Zilean timeout reduced from 5000ms → 3000ms. NZBGeek pagination enabled.
- **Template versions** — Updated from 2.4.4 → 2.4.6 to match AIOStreams specification level.

### Test Coverage
- Added unit tests for AC-4 and VP9 as valid audio/encode values
- Added metadata validation tests (name, description, author, category required fields)
- All 118 unit and integration tests passing
- Zero validator errors, 34 warnings (pre-existing titleMatching and ISE configuration notes)

---

## 2.4.4 (2026-05-30)

### Added
- **Tamtaro ISEs embedded** — All 6 Tamtaro ISEs now embedded directly in every template: `Part of Tamtaro SEL Setup`, `ISE v1.2.3*`, `Library`, `SeaDex` (anime-only), `digitalRelease Bypass`, `0Cached`. Synced URLs were not loading on some instances — direct embedding guarantees they fire.
- **Tamtaro standard ESEs embedded** — All 20 Tamtaro v1.2.8 standard ESEs embedded alongside Core Builds' 4 kill ESEs (24 total). Key additions: `Low SEL Score`, `Final Limit (All)`, `Extra Cached (HQ/LQ)`, `G's Low Bitrate`, `Bad 4K Anime`, `Upscaled 4K`, `Kill Dead Uncached Torrents`, `RD Copyright (per DMM)`, `Bad NZBs`.
- **Tamtaro excluded regex** — File archive pattern exclusion (`.iso`, `.img`, `.zip`, `.rar`, `.nfo` etc.) added to `excludedRegexPatterns` across all templates.

### Fixed
- **Formatter not applying** — Root cause of all "no formatting" reports. `formatter.definitions.overrides['core-nexus']` was not being resolved by AIOStreams. Correct structure is `formatter.definitions.name` and `formatter.definitions.description` directly. Core Syntax formatter now embedded correctly across all 10 templates.
- **`excludedResolutions` removing 50 valid streams** — `'Unknown'` was in `excludedResolutions`, silently dropping every stream where the scraper didn't tag a resolution. These are often legitimate releases with missing metadata. Removed from all templates.
- **`CB | Cached Streams Priority` ISE** — This ISE (`cached(streams)`) was acting as a final whitelist, restricting ALL output to only cached streams regardless of `onlyShowCachedStreams: False`. Every "no streams found" report traced back to this — scrapers found 857+ streams, all passed resolution and language filters, then this ISE reduced the final set to 5 Library cached items only. Removed entirely.

### Changed
- **`deduplicator`** — Expanded to match working template: `uncached: 'per_service'` (was `disabled`), `p2p: 'per_addon'` (was `disabled`), `smartDetectAttributes` full 14-attribute list added, `smartDetectRounding: 10`, `libraryBehaviour: 'prefer'`.
- **`preferredResolutions`** — Expanded from 3 items to full 10-item ranked list including 576p, 480p, 360p, 240p, 144p, Unknown, 1440p. Streams at unranked resolutions had no score weighting.
- **`preferredQualities`** — Expanded from 5 to all 13 qualities ranked. ESEs are the authoritative quality filter — `preferredQualities` is a scoring list only.
- **`excludedQualities`** — Cleared to empty. Double-filtering (ESEs + hard excludedQualities) was removing valid streams. Tamtaro ESEs handle quality blocking contextually.
- **Tamtaro synced PSE/ISE URLs added** — `syncedPreferredStreamExpressionUrls` and `syncedIncludedStreamExpressionUrls` pointing to Tamtaro's GitHub repo added as fallback for instances that do load synced URLs.
- **`tmdbAccessToken`** — Set to `<template_placeholder>` (was `null`). Separate from `tmdbApiKey` — the Access Token is the long JWT-style credential.
- **Inline audio PSEs removed** — 4–8 inline CB audio PSEs removed per template. Tamtaro's synced PSE stack handles audio scoring with better context-awareness.
- **`onlyShowCachedStreams` key removed** — Not present in the working template. Defaults correctly to `False` without the explicit key.
- **`showP2PStreams` and `enhancePosters` removed** — Extra keys not present in working template baseline.
- **`tmdbApiKey` sentinel** — `<template_placeholder>` confirmed as the correct AIOStreams sentinel value. `null` disables TMDB entirely; placeholder strings other than `<template_placeholder>` are validated against TMDB API causing 401 errors on import.

---

## 2.4.3 (2026-05-30)

### Added
- **Tamtaro synced PSE URL** — `syncedPreferredStreamExpressionUrls` added pointing to Tamtaro's maintained PSE stack. Replaces 19 inline audio PSEs with a live-maintained source.
- **Tamtaro synced ISE URL** — `syncedIncludedStreamExpressionUrls` added pointing to Tamtaro's ISE set.

### Changed
- **`deduplicator`** — Rebuilt to match working template structure with full `smartDetectAttributes` and `libraryBehaviour: 'prefer'`.
- **`preferredResolutions`** — All 10 resolutions ranked.
- **`preferredQualities`** — All 13 qualities ranked.
- **`excludedQualities`** — Cleared (ESEs are authoritative).
- **`tmdbAccessToken`** — Set to `<template_placeholder>`.
- **Removed `onlyShowCachedStreams`, `showP2PStreams`, `enhancePosters`** keys from all templates.

---

## 2.4.2 (2026-05-30)

### Fixed
- **Speed templates missed v2.4.1 hotfix** — All 4 Speed templates (Speed, Speed 4K, Speed+, Speed 4K+) still had `titleMatching: 0.85`, `seasonEpisodeMatching strict: True`, and `digitalReleaseFilter: enabled` from v2.4.0. Applied same fix as v2.4.1 across all 4.
- **`stremthruTorz` invalid option keys** — `torznabUrl`, `resources`, `mediaTypes` were not valid options for the `stremthruTorz` preset type. On strict AIOStreams instances (especially nightly builds) these caused schema validation failure and the entire addon failed to load.
- **`tmdbApiKey` 401 error** — Custom placeholder string was being validated against TMDB API on import. `<template_placeholder>` is the AIOStreams-recognised sentinel value that skips validation.
- **`dynamicAddonFetching` condition** — Tamtaro's `releaseGroup AND` condition leaked into 9/10 templates. Required 2+ cached streams from CtrlHD/Ember/Judas release groups — almost never met, so the condition never fired and all addons were always queried. Replaced with simple resolution-count conditions per tier.
- **Preset names missing** — `torrent-galaxy` and `eztv` had no `name` in options, appearing as empty required fields during template import. Set to `Torrent Galaxy` and `EZTV`.
- **MediaFusion disabled** — Developer recoding MediaFusion. Disabled across all 6 quality templates to prevent broken scraper affecting results.

---

## 2.4.1 (2026-05-30)

### Fixed
- **`titleMatching` threshold 0.85 → 0.75** — AIOStreams recently optimised the title match function, making 0.85 more strictly enforced than on previous versions. Alternate titles, romanization differences, and punctuation variations (e.g. "Gladiator II" vs "Gladiator 2") were failing the match and returning zero results. Relaxed to 0.75 across all quality templates.
- **`seasonEpisodeMatching strict: True` → `False`** — `strict: True` drops any stream without explicit S/E metadata in the filename. A significant portion of 4K REMUX and BluRay releases don't embed standard S/E naming — these were being silently dropped. Matching still filters by S/E when data is present; `strict: False` stops penalising streams where it's absent.
- **`digitalReleaseFilter` disabled** — Was blocking entire result sets when TMDB had missing or incorrect digital release date data. The Core Builds ESE set (CAM Kill, TS Kill, SCR Kill) already handles pre-release content. The filter was adding false positives on legitimate releases with bad metadata.

### Context
Both issues were caught by community members within hours of the v2.4.0 release:
- **frommypantry** (Reddit) — Speed template showing zero results (separate issue: cached-only design + API key required)
- **m4rkbr0wn** (Reddit) — 4K Pro showing no results after updating from prior version

Applied across all 6 quality templates: 4K Pro, 4K Essential, Essential, Stream, Hybrid, Anime.

---

## 2.4.0 (2026-05-29)

### Added
- **Tier-specific audio PSEs** — All 10 templates include inline audio stream expressions scored per tier. 4K: Atmos → TrueHD → DTS-HD MA → DTS:X → DD+ → DTS → DD → AAC. 1080p: DD+ → DTS-HD MA → Atmos → DTS → DD → AAC. Speed: DD+ → DD → AAC → DTS. Anime: FLAC → AAC → OPUS → DD+ → DTS → DD.
- **`metadata.changelog` embedded** — All 10 templates now carry an inline changelog array. AIOStreams shows in-app update notifications to users when a new version is detected. Users no longer need to check GitHub to know what changed.
- **`metadata.changelogUrl`** — Added to all templates pointing to the GitHub CHANGELOG.md as a fallback changelog source.
- **`metadata.sourceUrl`** — Confirmed on all 10 templates, pointing to the GitHub repo.
- **`precacheNextEpisode`, `preloadStreams`, `dynamicAddonFetching`, `checkOwned`** — Added to Anime template (was missing all four — built from scratch).
- **`cacheAndPlay` + torrent** — `'torrent'` added alongside `'usenet'` on Pro and Hybrid. TorBox now auto-caches uncached debrid torrents on click, not just Usenet NZBs.
- **Community template** — `core-nexus-kids-swedish.json` built for community member. Swedish-only, TorBox Pro + NZBGeek + NinjaCentral. `requiredLanguages: ['Swedish', 'Nordic', 'Multi', 'Dubbed', 'Unknown']`. `onlyShowCachedStreams: False` required for Usenet NZBs to appear.
- **Core Cipher** — Personal build created and hardware-optimised for Dangbei L007CM projector + JBL Bar 2.0 soundbar. TorBox Pro + NZBGeek + Debridio. Tuned audio (DD+/DD/AAC only — no Atmos/DTS-HD MA), AV1 unlocked (hardware decode supported), 2.0 channel stereo enforced.
- **`preferredSubtitles`** — `['English']` on all templates. Anime template: `['English', 'Japanese']`. v2.28 feature now utilised.
- **`digitalReleaseFilter`** — Tolerance standardised to 14 days across all 10 templates (was 7). Release date metadata is frequently off by 1–2 weeks; 14 days prevents false positives on legitimate releases near their digital drop window.
- **Debridio addon** — Added to Core Cipher via `debridio` preset type with API key placeholder.
- **GitHub automations** — `labeler.yml`, `stale.yml`, `welcome.yml`, `link-checker.yml`, `status-check.yml`, `status_check.py`, `PULL_REQUEST_TEMPLATE.md`, `dependabot.yml`, `CODEOWNERS`, `LICENSE`, `.gitignore` — full community-ready infrastructure.
- **STATUS.md** — Live host status file with `<!-- STATUS_STABLE_START/END -->` and `<!-- STATUS_NIGHTLY_START/END -->` markers. Auto-updated every hour by `status-check.yml` workflow.

### Changed
- **Sort order** — `streamExpressionScore` moved to position 3 (was 6+), `audioTag` moved to position 6 (was 9) on all 10 templates. Audio PSE scores now directly influence stream ranking.
- **`stremthruTorz` re-enabled** — Correct Torznab URL (`https://stremthru.13377001.xyz/v0/torznab`) confirmed from Tamtaro v1.5.0. Was disabled due to false Italian language parsing bug. Now active on all 5 quality templates.
- **MediaFusion enabled** on Anime template (was missing entirely).
- **Result limits raised** — 4K Pro/Hybrid: 20→30. 4K Essential: 20→25. Essential/Stream: 15→25. Anime: 20→30. Speed unchanged at 10.
- **`autoPlay` enabled** — All 10 templates (was `False`). Method: `matchingFile` with resolution + quality + encode + audioTags attributes.
- **`excludedResolutions`** — `1440p` added everywhere. Rare format consuming result slots.
- **`preferredResolutions`** trimmed to exact match of `includedResolutions` on all templates.
- **`autoRemoveDownloads: False`** set explicitly.
- **Timeouts** — `library: 2000ms`, `zilean: 2000ms`, `seadex: 3000ms`, `opensubtitles: 3500ms`, `knaben: 4500ms`.
- **Preset order** research-backed: `library → zilean → stremthruTorz → meteor → comet → mediafusion → knaben → torrent-galaxy`.
- **`onlyShowCachedStreams`** corrected — Pro, Stream, Essential, 4K Essential templates were incorrectly `True`. Now `False` on all quality templates. Speed tier remains `True` (intentional).
- **Template filenames renamed** — Full v2.3.0 naming system (4K Pro, Stream, Hybrid, Essential, Speed, Speed+, Anime).
- **`cacheAndPlay.streamTypes`** — Added `'torrent'` to Pro and Hybrid templates.

### Fixed
- **`onlyShowCachedStreams: True` on quality templates** — was silently hiding all uncached streams. New content returned "no streams" even with valid scrapers.
- **Anime template missing sort criteria** — `sortCriteria` was entirely absent. Streams returned in arbitrary scraper order.
- **`animeTosho` and `nekobt` import warnings** — Set to `enabled: False` (opt-in). Not available on all instances.
- **NZBGeek URL empty** — Newznab preset had API key but no `url` field. Queries silently failing. Fixed to `https://api.nzbgeek.info`.
- **`queryType` ESE invalid syntax** — Compound SEL expression removed from Anime template.
- **Stars badge** — Switched from shields.io (token pool errors) to `badgen.net`. Consistent display.
- **`release.yml` trigger** — Changed from `types: [published]` (too late — release immutable) to `types: [created]` (fires on draft creation before publish).
- **`softprops/action-gh-release@v3`** — Doesn't exist. Downgraded to confirmed `@v2`.
- **`dependabot.yml` label error** — Removed `labels: [dependencies]` (label didn't exist in repo).
- **`status-check.yml` frequency** — Reduced from every 30 min to hourly. Was using ~1,440 Action minutes/month (72% of free tier). Now ~720 minutes/month.

### Research Validated
- **Groups vs `dynamicAddonFetching`** — Tamtaro confirmed using ESEs (not Groups) for filtering. The AIOStreams community documented Groups as requiring manual tuning that's "basically impossible to do perfectly." `dynamicAddonFetching` is the validated simpler alternative — our implementation is correct.
- **`keyword()` SEL** — Valid in v2.29.6+ but not on all public instances. Skipped to maintain compatibility.
- **`nRegexScore` ESE** — Tamtaro switched to this approach but exact SEL syntax unconfirmed from public sources. Skipped to avoid breaking ESE pipeline.
- **STore preset** — Confirmed as first addon in Tamtaro's debrid stack but preset type string unconfirmed. Skipped until confirmed.

---

## 2.3.0 (2026-05-28)

### Added
- **Title Matching** — enabled across all 10 templates. Mode: `contains`, threshold `0.85`. Filters streams whose detected title doesn't match the requested content. Requires TMDB token (already present as `<template_placeholder>`).
- **Year Matching** — enabled across all 10 templates. Strict: off (avoids false positives on undated releases). `useInitialAirDate: true` for accurate anime/long-running series matching. Tolerance: `±2 years` to account for Japanese vs Western release date gaps.
- **Season/Episode Matching** — enabled with `strict: true` across all 10 templates. Only streams matching the specific S/E requested are shown. Critical for anime seasonals and multi-season series.
- **`deduplicator`** — proper schema applied across all templates. Keys: `filename + infoHash + smartDetect`. Cached mode: `single_result`. Removes duplicate stream entries from overlapping scrapers (Comet + Meteor + Knaben returning same hash).
- **Torrent Galaxy addon** (`torrent-galaxy`) — added to all quality templates as enabled. Stable after upstream AIOStreams fix. Good secondary scraping coverage.
- **EZTV addon** (`eztv`) — added to all templates as opt-in (off by default). TV show specific torrent search.
- **GitHub infrastructure** — `LICENSE` (MIT), `.gitignore`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`, `CODEOWNERS`, enhanced `validate.yml`.
- **Enhanced `validate.yml`** — Now validates 8 template integrity checks beyond JSON syntax: `formatter.id` enum, `instanceId` on all presets, `timeout` in all preset options, invalid SEL functions (`not()`, `or()`, `keyword()`), `preferredResolutions` subset of `includedResolutions`, `addonName` presence, `metadata.version` presence.
- **TorBox referral** — referral link and code added to README with call to action. 15 extra days free for new signups via code `d1ccddb0-f094-45ca-b52b-942a2635855e`.
- **Templates master README** (`Templates/Torbox/README.md`) — decision tree, full comparison table, per-template import URL cards, raw URL block.
- **Anime template README** (`Templates/Torbox/Anime/README_anime.md`) — full documentation for Core Nexus Anime.

### Fixed
- **`formatter.id: "core-nexus"` invalid** — `"core-nexus"` is not a valid AIOStreams formatter ID. Changed to `"custom"` which is the correct ID for user-defined formatter definitions. All 10 templates were failing to import cleanly.
- **`presets.instanceId` missing** — All presets require an `instanceId` string field. Templates built from scratch (Anime template, Speed templates with new addons) were missing this entirely, causing import errors. UUIDs generated and applied to all affected presets.
- **`preset.options.timeout` missing** — AIOStreams requires a `timeout` value in every preset's options object. Same templates were missing these, causing "Option timeout is required, got undefined" errors. Applied standard timeouts per addon type.
- **`opensubtitles-v3-plus` language format** — `"language": "English"` is invalid. Correct format is `"language": ["en"]`. Anime template also includes `"ja"`.
- **`opensubtitles-v3-plus` missing full options** — Anime template was built from scratch with only `timeout` in preset options. Full required options object applied: `resources`, `language`, `sources`, `includeAiTranslated`, `movieHashPlusAutoAdjustment`.
- **`queryType` ESE invalid syntax** — Compound condition `(A and B) AND C ? expr : []` is not valid AIOStreams SEL. ESE removed from Anime template. AIOStreams validates all ESEs on import regardless of enabled state.
- **`animeTosho` and `nekobt` not available on all instances** — Were enabled by default causing import warnings on instances without these addons. Set to `enabled: false` (opt-in). SeaDex + Zilean + Comet + Knaben cover the gap.
- **`preferredResolutions` bloated** — All templates had low resolutions (`576p`, `480p`, `360p`, `240p`, `144p`, `Unknown`) in `preferredResolutions` that were already hard-blocked by `includedResolutions`. Cleaned to exact match of `includedResolutions` on all 11 templates (10 Core Builds + friend's template).
- **`deduplication` wrong key/schema** — Previous entry used `deduplication: {mode: 'smartDetect'}`. Correct key is `deduplicator` with full schema including `keys`, `cached`, `uncached`, `p2p` fields.
- **Stars badge intermittent failure** — Added `&cacheSeconds=3600` to shields.io stars badge URL to reduce GitHub API calls and rely on cached counts, preventing "UNABLE TO SELECT NEXT GITHUB TOKEN FROM POOL" errors.
- **`dependabot.yml` label error** — `labels: [dependencies]` caused Dependabot PRs to fail as the label didn't exist. Label config removed.

### Changed
- **Template filenames renamed** to match new naming system — old filenames with plan/resolution suffixes replaced with clean identifiers:
  - `core-nexus-4k-ht-torbox.json` → `core-nexus-4k-pro.json`
  - `core-nexus-torbox-exclusive_rpdb.json` → `core-nexus-stream.json`
  - `core-nexus-tb-hybrid-1080p.json` → `core-nexus-hybrid.json`
  - `core-nexus-4k-essential-torbox.json` → `core-nexus-4k-essential.json`
  - `core-nexus-1080p-essential-torbox.json` → `core-nexus-essential.json`
  - `core-nexus-speed-4k.json` (EasyNews) → `core-nexus-speed-4k-plus.json`
  - `core-nexus-speed-4k-torbox.json` → `core-nexus-speed-4k.json`
  - `core-nexus-speed-1080p.json` (EasyNews) → `core-nexus-speed-plus.json`
  - `core-nexus-speed-1080p-torbox.json` → `core-nexus-speed.json`
- **Addon sequence updated** — Research confirmed Tamtaro v1.5.0 puts Meteor before Comet for quality templates (broader coverage first). Applied across all quality templates. Speed templates retain Comet-first order (speed over depth).
- **Timeouts optimised** — `library: 2000ms`, `zilean: 2000ms`, `seadex: 3000ms`, `comet/meteor: 5000ms`, `knaben: 4500ms`, `opensubtitles: 3500ms`. Fastest cached-lookup addons respond sooner.
- **SeaDex isolated to Anime template** — Disabled on all general templates. Was skewing results for non-anime content. Remains as opt-in on general templates.
- **PSEs simplified to 2-level max chaining** — 4-level deep chaining removed. `preferred*` config lists handle audio/visual tiebreaking. All expressions now use confirmed-valid SEL patterns from Tamtaro examples.
- **`meta.id` unique per template** — All 10 templates now carry unique `brevity.core-nexus-*` identifiers.
- **`sourceUrl` added** — All metadata now points back to the GitHub repo.
- **Version** — Bumped to `2.3.0` across all 10 templates.

---

## 2.2.9 (2026-05-27)

### Added
- **Core Nexus Anime template** — Dedicated anime build with SeaDex + AnimeTosho + NekoBT, FLAC/AAC audio priority, SDR-first visual preference, 1080p WEB-DL focus with 4K support for newer titles. Japanese + English + Dual Audio language support. No anti-anime ESEs.
- **Core Builds Filtering System** (`Filtering/`) — Custom ESE/PSE/ISE set hosted in-house at `Filtering/core-builds-eses.json`, `core-builds-pses.json`, `core-builds-ises.json`. No external whitelist dependency. Available as standalone synced URLs for self-hosters.
- **Core Nexus Uniform Formatter** — Clean, emoji-coded formatter baked into all 10 templates. Resolution + service badge in title. 🚀 INSTANT / ⚠️ UNCACHED status, SE score, release group, video/audio/language/file detail rows. Replaces Tamtaro formatter reference.
- **Torrent Galaxy addon** (`torrent-galaxy`) — Enabled on all quality templates after AIOStreams upstream fix. Adds stable secondary scraping coverage.
- **AnimeTosho addon** (`animeTosho`) — Added to Anime template as primary anime source. Mirrors Nyaa.si + TokyoTosho. Replaces invalid `nyaa` preset.
- **EZTV addon** (`eztv`) — Added to all templates as opt-in (off by default). TV show specific torrent search. Users with TV-heavy setups can enable manually.
- **`queryType` ESE on Anime template** — Optional ESE using `queryType != 'anime'` for smarter 4K handling. Off by default, ready for power users.

### Changed
- **Template naming overhaul** — All 10 templates renamed for immediate clarity:
  - 4K HT TorBox → **Core Nexus 4K Pro**
  - 4K Essential → **Core Nexus 4K Essential**
  - 1080p Essential → **Core Nexus Essential**
  - TorBox Exclusive RPDB → **Core Nexus Stream**
  - TB Hybrid 1080p → **Core Nexus Hybrid**
  - Speed 4K (EasyNews) → **Core Nexus Speed 4K+**
  - Speed 4K (TorBox) → **Core Nexus Speed 4K**
  - Speed 1080p (EasyNews) → **Core Nexus Speed+**
  - Speed 1080p (TorBox) → **Core Nexus Speed**
- **Addon sequence research-backed** — Tamtaro v1.5.0 finding: Meteor before Comet on quality templates (broader coverage first). Speed templates keep Comet first (fastest result first). All based on community testing.
- **SeaDex isolated to Anime template** — Removed from all general templates where it was skewing results for non-anime content. Remains as disabled opt-in on general templates.
- **PSEs simplified to 2-level max chaining** — Previous 4-level deep chaining (`resolution(audioTag(visualTag(quality(...))))`) replaced with safe 2-level patterns. `preferred*` config lists handle audio/visual tiebreaking. All PSEs now use confirmed-valid SEL patterns.
- **Formatter ID renamed** from `tamtaro` to `core-nexus` — Templates no longer carry Tamtaro's formatter identity.
- **`meta.id` unique per template** — All 10 templates now have unique `brevity.core-nexus-*` IDs. Previously most Speed templates shared `core-nexus-4k-dual-core`.
- **`sourceUrl` added to all metadata** — Points to GitHub repo.
- **`seadex` removed from sort criteria** — Removed from non-anime template sort keys since SeaDex preset is disabled.

### Fixed
- **`not()` → `negate()` in all season pack ESEs** — `not()` is not a valid SEL function. All season pack expressions now use `negate()` which matches confirmed-working Tamtaro patterns. Applied across all 10 templates and the `core-builds-eses.json` source file.
- **`language()` removed from ISEs** — `language()` is not a valid SEL function in stream expressions. Language filtering is handled by `requiredLanguages` config. Invalid ISE removed from all templates.
- **`or()` and `keyword()` removed from ESEs** — Both are invalid SEL functions. The Hard YouTube Kill ESE was rebuilt using only `type(streams, 'youtube', 'external')` which is confirmed valid.
- **addonName mismatches fixed** — Speed 1080p EasyNews was identified as "Core Nexus 4K Dual Core", 1080p Essential as "Core Nexus TB Exclusive". Both corrected.
- **4K PSEs in 1080p templates** — 1080p Essential, Speed+, Hybrid, and Stream templates had 4K scoring tiers embedded. Now 1080p templates carry 1080p-only PSEs.
- **`2160p` in 1080p `includedResolutions`** — Speed+ (EasyNews 1080p) was allowing 4K streams. Fixed to `['1080p', '720p']`.
- **Usenet settings in Essential/TorBox-only templates** — `cacheAndPlay` with `usenet` streamType, `nzbFailover: enabled: true`, and `usenet` in `preferredStreamTypes` removed from all TorBox Essential and Speed TorBox templates.
- **Duplicate `newznab` preset** — Hybrid template had two `newznab` entries after preset rebuild. Deduplicated.
- **`nyaa` invalid preset** — Replaced with `animeTosho` on Anime template. `nyaa` is not a standalone AIOStreams preset; Nyaa.si access is via Knaben and AnimeTosho.

### Removed
- **`tvdbApiKey`** — TVDB is no longer free. Removed from all templates.
- **`enhancePosters`, `enhanceResults`, `usePosterRedirectApi`, `usePosterServiceForMeta`** set to values inconsistent with working confirmed template — restored to match confirmed working 4K HT base.
- **Tamtaro synced ESE URLs from general templates** — `syncedExcludedStreamExpressionUrls` pointing to Tamtaro's extended ESE set cleared from all non-Hybrid templates. Tamtaro's `Bad 4k Anime` ESE was blocking all 4K anime (One Piece S01E01 confirmed affected). Hybrid retains Tamtaro URLs as it was built around them.

---

# Changelog

All notable changes to the **Core Builds** templates and formatters will be documented in this file.

> **Stability Notice:** Versions prior to `1.1.2` should be considered **unstable**. Early versions contained broken JSON, invalid enum values, non-functional stream expressions, and conflicting configuration systems. The first stable, publish-ready release across all four templates is `v1.1.2`.

---

## 2.2.6 (2026-05-24)

### Fixed
- **"Every group must have at least one addon" error (All Templates):** The `groups` config contained a reference to `"tam-mf"` (Tamtaro's MediaFusion preset ID) which was left over when MediaFusion was removed in v2.2.2. AIOStreams validated the group and found no matching addon, throwing a hard error on import. Groups disabled across all 9 active templates (`groups.enabled: false`). The grouping feature (dynamic addon switching based on cached stream count) can be re-enabled manually with a valid addon ID if needed.
- **Statistics display disabled (All Templates):** `statistics.enabled` set to `false` across all templates. The scrape summary cards were left enabled on 3 templates after the previous rebuild from the working base. Now consistently off.

### Changed
- **3 Working templates rebuilt from live base:** 4K Home Theater, TorBox Exclusive RPDB, and TB Hybrid 1080p were rebuilt using the confirmed-working GitHub versions as the base, with all v2.2.x fixes layered on top. This preserves `syncedIncludedStreamExpressionUrls` and `precacheSelector` values that were confirmed working, while applying all ESE, regex, timeout, service order, audio tag, encode, and size improvements from this session.

---

## 2.2.5 (2026-05-24)

### Deprecated
- **Dual Core Templates — all 3 builds deprecated.** Real-Debrid's May 2026 keyword filter ("filter-gate") combined with the MediaFlow proxy requirements introduced for multi-IP account protection have made dual-service builds inherently fragile. Symptoms included: zero results without a configured MediaFlow URL, RD streams being silently dropped at the proxy stage, copyright-flagged WEB-DL streams returning errors, and ongoing maintenance burden. The following templates are marked `[DEPRECATED]` in their metadata names and descriptions:
  - `core-nexus-4k-dual-core.json`
  - `core-nexus-dual-core-1080p.json`
  - `core-nexus-4k-essential-dual-core.json`

  The JSON files remain in the repository for advanced users who want to configure MediaFlow Proxy and accept the trade-offs. No further fixes will be issued. Migration paths to TorBox-only equivalents are listed in the README.

### Fixed
- **YouTube Kill ESE — triple-layered defense.** Reports of YouTube streams slipping through resulted in three new blocking layers: 1) ESE now checks `quality(streams, 'youtube')` in addition to type, external, and keyword; 2) `excludedStreamSources` now includes lowercase variants (`youtube`, `YOUTUBE`); 3) `excludedQualities` includes `youtube` and `YouTube` for streams where AIOStreams detects the quality field as YouTube.
- **`includedEncodes` — Unknown fallback added** to allow streams with unrecognised encode tags (common for older content) through the encode whitelist filter.
- **Size minimums lowered for TV series.** Global series minimum dropped from 1 GB to 100-150 MB to accommodate 25-minute TV episodes which are typically 150-400 MB at 720p and 500 MB-1.5 GB at 1080p.

---

## 2.2.4 (2026-05-24)

### Changed
- **Timeout Optimisation (All Standard Templates):** All 8 standard templates have had addon timeouts tightened to reduce maximum stream load time. Knaben was the primary bottleneck at 6000ms — every stream list waited up to 6 seconds for it regardless of other addons. Updated values:

  | Addon | Before | After |
  |---|---|---|
  | Library | 3000ms | 2000ms |
  | TorBox Search | 4000ms | 3500ms |
  | StremThru Torz | 4000ms | 3500ms |
  | Zilean | 5000ms | 3500ms |
  | SeaDex | 5000ms | 3500ms |
  | Meteor | 5000ms | 4000ms |
  | newznab | 5000ms | 4000ms |
  | OpenSubtitles V3+ | 4000ms | 3000ms |
  | Knaben | 6000ms | 4500ms |

  Maximum load time across any standard template is now 4500ms, down from 6000ms. Speed tier templates unchanged at 3500ms flat.

---

## 2.2.3 (2026-05-23)

### Removed
- **`Uncensored` Regex Pattern (All Universal Templates):** Removed from `rankedRegexPatterns` across all 12 universal templates. The pattern had a score of 0 (no ranking contribution), was exclusively associated with adult anime content, and added no benefit to any standard build. Also removed from `regexes-scored.json`.
- **AnimeTosho (All Templates):** Confirmed fully absent from all template preset lists. Previously disabled in v2.1.4, the preset entry has been cleaned from all templates.

### Fixed
- **Season Pack Episode Matching (All Templates):** Two new ESEs added to resolve wrong episode playback:
  - `Kill Ambiguous Season Packs` — blocks streams with only season info and no episode reference using `seasonPack(streams, 'onlySeasons')`. These are the primary cause of wrong episode playback where debrid services default to file 1.
  - `Kill Season Packs When Episode Streams Exist` — blocks full season pack streams when at least one episode-specific stream is available, using `seasonPack(streams, 'seasonPack')`.

---

## 2.2.2 (2026-05-23)

### Fixed
- **YouTube Kill Strengthened (All Templates):** The previous `type(streams, 'youtube')` expression only caught streams explicitly typed as youtube. In standard Stremio, YouTube links can arrive typed as `http` with a YouTube URL, bypassing the filter entirely. The expression now targets all three vectors: `type(streams, 'youtube')`, `keyword(streams, 'all', 'youtube.com', 'youtu.be', 'trailer')`, and a regex exclusion matching YouTube watch/embed URL patterns. Tested to block trailer and promo links in both Stremio and WuPlay.

### Removed
- **MediaFusion (All Templates):** Removed from all 18 templates. MediaFusion's public ElfHosted instance is currently broken and returning inconsistent or empty results. The addon slot has been freed -- users who self-host a working MediaFusion instance can re-add it manually in their addon settings.

---

## 2.2.6 (2026-05-24)

### Fixed
- **"Every group must have at least one addon" error (All Templates):** The `groups` config contained a reference to `"tam-mf"` (Tamtaro's MediaFusion preset ID) which was left over when MediaFusion was removed in v2.2.2. AIOStreams validated the group and found no matching addon, throwing a hard error on import. Groups disabled across all 9 active templates (`groups.enabled: false`). The grouping feature (dynamic addon switching based on cached stream count) can be re-enabled manually with a valid addon ID if needed.
- **Statistics display disabled (All Templates):** `statistics.enabled` set to `false` across all templates. The scrape summary cards were left enabled on 3 templates after the previous rebuild from the working base. Now consistently off.

### Changed
- **3 Working templates rebuilt from live base:** 4K Home Theater, TorBox Exclusive RPDB, and TB Hybrid 1080p were rebuilt using the confirmed-working GitHub versions as the base, with all v2.2.x fixes layered on top. This preserves `syncedIncludedStreamExpressionUrls` and `precacheSelector` values that were confirmed working, while applying all ESE, regex, timeout, service order, audio tag, encode, and size improvements from this session.

---

## 2.2.5 (2026-05-24)

### Deprecated
- **Dual Core Templates — all 3 builds deprecated.** Real-Debrid's May 2026 keyword filter ("filter-gate") combined with the MediaFlow proxy requirements introduced for multi-IP account protection have made dual-service builds inherently fragile. Symptoms included: zero results without a configured MediaFlow URL, RD streams being silently dropped at the proxy stage, copyright-flagged WEB-DL streams returning errors, and ongoing maintenance burden. The following templates are marked `[DEPRECATED]` in their metadata names and descriptions:
  - `core-nexus-4k-dual-core.json`
  - `core-nexus-dual-core-1080p.json`
  - `core-nexus-4k-essential-dual-core.json`

  The JSON files remain in the repository for advanced users who want to configure MediaFlow Proxy and accept the trade-offs. No further fixes will be issued. Migration paths to TorBox-only equivalents are listed in the README.

### Fixed
- **YouTube Kill ESE — triple-layered defense.** Reports of YouTube streams slipping through resulted in three new blocking layers: 1) ESE now checks `quality(streams, 'youtube')` in addition to type, external, and keyword; 2) `excludedStreamSources` now includes lowercase variants (`youtube`, `YOUTUBE`); 3) `excludedQualities` includes `youtube` and `YouTube` for streams where AIOStreams detects the quality field as YouTube.
- **`includedEncodes` — Unknown fallback added** to allow streams with unrecognised encode tags (common for older content) through the encode whitelist filter.
- **Size minimums lowered for TV series.** Global series minimum dropped from 1 GB to 100-150 MB to accommodate 25-minute TV episodes which are typically 150-400 MB at 720p and 500 MB-1.5 GB at 1080p.

---

## 2.2.4 (2026-05-24)

### Changed
- **Timeout Optimisation (All Standard Templates):** All 8 standard templates have had addon timeouts tightened to reduce maximum stream load time. Knaben was the primary bottleneck at 6000ms — every stream list waited up to 6 seconds for it regardless of other addons. Updated values:

  | Addon | Before | After |
  |---|---|---|
  | Library | 3000ms | 2000ms |
  | TorBox Search | 4000ms | 3500ms |
  | StremThru Torz | 4000ms | 3500ms |
  | Zilean | 5000ms | 3500ms |
  | SeaDex | 5000ms | 3500ms |
  | Meteor | 5000ms | 4000ms |
  | newznab | 5000ms | 4000ms |
  | OpenSubtitles V3+ | 4000ms | 3000ms |
  | Knaben | 6000ms | 4500ms |

  Maximum load time across any standard template is now 4500ms, down from 6000ms. Speed tier templates unchanged at 3500ms flat.

---

## 2.2.3 (2026-05-23)

### Removed
- **`Uncensored` Regex Pattern (All Universal Templates):** Removed from `rankedRegexPatterns` across all 12 universal templates. The pattern had a score of 0 (no ranking contribution), was exclusively associated with adult anime content, and added no benefit to any standard build. Also removed from `regexes-scored.json`.
- **AnimeTosho (All Templates):** Confirmed fully absent from all template preset lists. Previously disabled in v2.1.4, the preset entry has been cleaned from all templates.

### Fixed
- **Season Pack Episode Matching (All Templates):** Two new ESEs added to resolve wrong episode playback:
  - `Kill Ambiguous Season Packs` — blocks streams with only season info and no episode reference using `seasonPack(streams, 'onlySeasons')`. These are the primary cause of wrong episode playback where debrid services default to file 1.
  - `Kill Season Packs When Episode Streams Exist` — blocks full season pack streams when at least one episode-specific stream is available, using `seasonPack(streams, 'seasonPack')`.

---

## 2.2.2 (2026-05-23)

### Fixed
- **YouTube Kill ESE Strengthened (All Templates):** The existing `type(streams, 'youtube')` expression correctly blocked YouTube streams in WuPlay but failed to catch them in base Stremio where YouTube/trailer streams may be identified differently. Added extended keyword coverage: `youtu`, `yt.be`, `YouTube` (capital Y), `Official Trailer`, `Official Video`, `Watch on YouTube`, `HD Trailer`, `Teaser`, `Promo`, `youtube.com/watch`, `youtube.com/embed`. Any stream matching these patterns is now dropped before it reaches the sort step.

### Removed
- **MediaFusion (All Templates):** Removed from all 18 templates due to ongoing reliability issues. MediaFusion was set to `enabled: true` across standard templates. It is now absent from the preset list entirely. Users who wish to use MediaFusion can add it manually via the AIOStreams addon settings.

---

## 2.2.1 (2026-05-23)

### Added
- **Core Nexus 4K Essential (`core-nexus-4k-essential.json`):** Full-featured 4K build for TorBox Essential users with no Usenet access. Based on the 4K HT TorBox template with `newznab` removed, `preferredStreamTypes` set to `['debrid']` only, and `nzbFailover`/`cacheAndPlay` disabled. Full 9-addon stack retained. Targets 2160p with Dolby Vision, HDR10+, TrueHD/Atmos, 5-150 GB. SeaDex enforced for anime. Upload to `Templates/Torbox/Single/`.
- **Core Nexus 1080p Essential (`core-nexus-essential.json`):** Full-featured 1080p SDR build for TorBox Essential users with no Usenet access. Based on the TorBox Exclusive template with the same Essential modifications. Targets WEB-DL/WEBRip, blocks BluRay/Remux/4K/HDR, 1-25 GB. Full 9-addon stack retained. Upload to `Templates/Torbox/Single/`.

---

## 2.2.0 (2026-05-23)

### Added
- **Speed Tier — 4 New Templates:** A new template category for users prioritising instant autoplay (2-3 second stream load) over maximum source coverage. All four speed templates use only Library, TorBox Search, Comet, and Zilean — the four fastest scrapers — with 3500ms timeouts, 10 global results, 4 per resolution, and a 5-key sort. All other Core Builds features remain: scored regex ranking, Tamtaro ESEs, episode matching, `cacheAndPlay`, `hideErrors`, and `nzbFailover`.

  | Template | Resolution | Services |
  |---|---|---|
  | `Speed/EasyNews/core-nexus-speed-1080p` — **Core Nexus Speed 1080p (EasyNews)** | 1080p SDR | TorBox Essential + EasyNews |
  | `Speed/EasyNews/core-nexus-speed-4k` — **Core Nexus Speed 4K (EasyNews)** | 4K HDR | TorBox Essential + EasyNews |
  | `Speed/TorBox/core-nexus-speed-1080p-torbox` — **Core Nexus Speed 1080p** | 1080p SDR | TorBox Essential only |
  | `Speed/TorBox/core-nexus-speed-4k-torbox` — **Core Nexus Speed 4K** | 4K HDR | TorBox Essential only |

  4K speed templates include: Dolby Vision and HDR10+ priority, TrueHD/Atmos audio chain, 5-150 GB file range, SeaDex best-release for anime.
  1080p speed templates include: SDR only, BluRay and Remux blocked, 1-25 GB file range.
  TorBox-only variants set `preferredStreamTypes: [debrid]` and disable Usenet-specific failover.

---

## 2.1.8 (2026-05-23)

### Changed
- **Per-Resolution Regex Pattern Optimisation (1080p Templates):** The 18 regex patterns that can never match any stream in 1080p templates have been removed from `rankedRegexPatterns`. These are patterns for Remux T1/T2/T3, UHD BluRay T1/T2/T3, HD BluRay T1/T2/T3, and DV (Disk) -- all target qualities or resolutions that are explicitly excluded before regex evaluation runs, making them dead weight. 1080p templates now carry 131 patterns instead of 149. 4K templates retain all 149 -- everything is potentially relevant. File size reduction: ~9 KB per 1080p template.
- **`preferredRegexPatterns` Per-Resolution (1080p Templates):** Previous preferred patterns (Remux T1, UHD BluRay T1, FraMeSToR) were all for excluded qualities -- they could never boost any stream. Replaced with Web T1 patterns (Radarr, Sonarr, Web T1) and top web-relevant groups (126811, FLUX, SiC, hallowed, BHDStudio) -- groups that actually release the WEB-DL content these templates target.

---

## 2.1.7 (2026-05-23)

### Added
- **`seasonEpisodeMatching`:** Added across all 12 templates — `enabled: true, strict: true, requestTypes: [movie, series, anime]`. Ensures the correct episode is matched rather than a loose title-only match. Was missing entirely from all previous versions.
- **`nzbFailover`:** `enabled: true, position: last` -- automatic NZB failover when a Usenet download fails, falling back to the next available source. Particularly relevant for the Hybrid template.
- **`cacheAndPlay`:** `enabled: true, streamTypes: [usenet]` -- enables background caching of Usenet streams while playback begins. Prevents waiting for a full Usenet download before the stream starts.
- **`hideErrors: true`:** Suppresses error/info streams from the visible stream list. The GitHub redirect info entry that confused new users no longer appears.
- **`streamExpressionScore` in Sort Criteria:** Added after `streamExpressionMatched` in all sort sections across all 12 templates. `streamExpressionMatched` is boolean; `streamExpressionScore` is the numeric score from ranked expressions. Both are now used.
- **6 Missing Tamtaro ESEs added (all templates):**
  - `Low Seeders` -- filters low-seeder P2P and uncached streams when better options exist
  - `Extra Cached (HQ)` -- limits surplus high-quality cached streams beyond result caps
  - `Extra Cached (LQ)` -- limits surplus low-quality cached streams
  - `Extra Uncached (All)` -- limits surplus uncached streams
  - `Unknown Resolution` -- filters unknown-resolution streams when enough known-resolution results exist
  - `Unknown Quality` -- filters unknown-quality streams when enough known-quality results exist

### Changed
- **`bitrate.useMetadataRuntime: true`:** Added to bitrate config across all 12 templates. Uses actual video metadata runtime for more accurate bitrate calculation rather than estimated values.

---

## 2.1.6 (2026-05-23)

### Fixed
- **`regexScore` Added to Sort Criteria (All Templates):** `rankedRegexPatterns` was scoring streams but the score was never used in sorting -- `regexScore` was absent from `sortCriteria`. Added as a tiebreaker after `quality` in both global and series sort across all 12 templates. Release group ranking now actively influences stream ordering.
- **`titleMatching` Contradiction Resolved:** `mode: exact` with `similarityThreshold: 0.85` was contradictory -- exact mode ignores the threshold entirely. Corrected to `similarityThreshold: 1` to match the exact mode intent. Prevents false title matches on similarly named content.
- **`yearMatching` Tightened:** Reverted from `strict: false, tolerance: 2` back to `strict: true, tolerance: 1` (Tamtaro standard). A 2-year non-strict window was too permissive and could surface wrong-year releases for sequels and remasters.

### Changed
- **`stremthruTorz` Now Opt-In (All Templates):** Set to `enabled: false` across all 12 templates. StremThru Torz requires a StremThru instance which is not universally available. Users with StremThru (ElfHosted plans, self-hosted) can enable it in addon settings.
- **`preferredRegexPatterns` Populated:** The 7 highest-tier patterns (Remux T1, UHD BluRay T1, Anime BD T1, FraMeSToR -- score >= 90) added to `preferredRegexPatterns` as an additional boost signal alongside the full `rankedRegexPatterns` scoring.

---

## 2.1.5 (2026-05-23)

### Changed
- **Scored Regex Patterns Baked In (All Templates):** All 149 release group regex patterns are now inlined directly into `rankedRegexPatterns` across all six universal and six nightly templates. No synced URL or whitelist required. Scoring covers the full tier range: Remux T1 (+100), FraMeSToR (+100), Anime BD T1 (+95), UHD BluRay T1 (+90), Web T1 (+70) through LQ groups (-75), Upscaled (-80), BR-DISK (-90), Extras (-200), and 100+ other tiered entries. `syncedRankedRegexUrls` cleared on all templates -- the inline version supersedes the hosted URL approach.
- **Hard Exclusion Patterns Added:** The 11 most destructive patterns (score <= -70) are also added to `excludedRegexPatterns` as hard blocks: Upscaled, BR-DISK, Extras (Radarr/Sonarr), LQ groups (x4), Sing-Along, and Retags (Radarr/Sonarr). These streams are now filtered before reaching the sort step.

---

## 2.1.4 (2026-05-23)

### Changed
- **AnimeTosho and TorrentGalaxy Now Opt-In (All Templates):** Both addons have been set to `enabled: false` across all templates. AnimeTosho is anime-specific and returns 0 results for all other content, adding noise and confusion for general users. TorrentGalaxy is frequently blocked by Cloudflare, returning HTML instead of JSON and causing `Partial Success` errors in scrape summaries. Both remain available -- enable them in your addon settings if you specifically want them.

### Fixed
- **Formatter "Failed to parse JSON" (Core Zenith Diamond):** The JSON file is valid. This error is caused by a download encoding issue on the user's end, not a syntax problem in the file. Re-download directly from the GitHub releases page to resolve.

---

## 2.1.3 (2026-05-23)

### Changed
- **Synced URLs Removed (All Templates):** All five `synced*Urls` fields (`syncedExcludedStreamExpressionUrls`, `syncedPreferredStreamExpressionUrls`, `syncedExcludedRegexUrls`, `syncedRankedRegexUrls`, `syncedRankedStreamExpressionUrls`) have been cleared across all six templates. On stable AIOStreams instances (Kuu, ATBP, Omni, Midnight stable, self-hosted without whitelist env vars), these external URLs are not whitelisted, causing AIOStreams to return a 404 during import — even when importing directly from a local file. The critical Tamtaro stream expressions were already inline in all templates and remain fully intact. The primary losses are the live-sync of Tamtaro's filename junk regex and the full Vidhin05 release group ranking; a partial inline release group list remains. All templates now import successfully on every AIOStreams instance including stable builds.

---

## 2.1.2 (2026-05-22)

### Fixed
- **RD Infringing File Scrub -- `keyword()` Invalid Attribute:** The `keyword()` SEL function requires an attribute as its second argument (`filename`, `folderName`, `indexer`, `releaseGroup`, or `all`). The expression was passing keywords directly as the second argument, causing an `invalid attribute` import error on all three dual-service templates. Fixed by inserting `'all'` as the attribute, which searches across filename, folderName, indexer, and releaseGroup -- the most comprehensive match for catching streaming service tags. Affected templates: `core-nexus-4k-dual-core`, `core-nexus-dual-core-1080p`, `core-nexus-4k-essential-dual-core`.

---

## 2.1.1 (2026-05-22)

### Added
- **Core Nexus 4K Essential Dual Core:** New template (`core-nexus-4k-essential-dual-core.json`) for users on the TorBox Essential plan paired with Real-Debrid. Identical to the flagship 4K Dual Core in every respect -- Dolby Vision, HDR10+, TrueHD/Atmos priority, 5 GB-150 GB file range, SeaDex best-release enforcement, RD Infringing File Scrub, and full Tamtaro SEL stack -- with two changes: the `newznab` (TorBox Usenet) preset removed since Essential plan has no Usenet access, and `preferredStreamTypes` set to `['debrid']` only. Requested by community following the v2.1.0 Reddit release.

---

## 2.1.0 (2026-05-22)

### Fixed
- **`audioChannel` Sort Direction:** Corrected from `asc` to `desc` in both `global` and `cached` sort criteria across all five templates. Ascending order was ranking stereo (2.0) above surround (7.1), producing worst-audio-first results on every stream list. Now correctly prioritises 7.1 > 5.1 > 2.0.
- **Core Zenith Diamond — Multi-Language Hardcoded English:** The `::>1` language branch was hardcoded as `"ᴇɴɢʟɪsʜ🔹 🗣️ ᴍᴜʟᴛɪ"`, displaying "English" on every multi-language stream regardless of whether English was present. Corrected to `"🗣️ ᴍᴜʟᴛɪ"` — shows MULTI only.
- **Core Zenith Diamond — `stream.age` Double Suffix:** `{stream.age} Dᴀʏs` was producing `10d Dᴀʏs` because `stream.age` already returns with a `d` suffix in current AIOStreams versions. Removed the `Dᴀʏs` label.
- **Core Clean Stream — Four Formatter Bugs:**
  - `stream.quality::exists` — single `|` separator corrected to `||`
  - `stream.visualTags::exists` — single `|` separator corrected to `||`
  - `stream.languages::>1` false branch — was `"MULTI"` (identical to true branch), corrupting display on single-language and no-language streams. Corrected to `""`
  - Stray space between `==1` and `exists` language blocks removed
- **Core Clean Stream — `stream.age` Double Suffix:** `{stream.age}d` was producing `10dd`. Removed hardcoded `d` suffix — `stream.age` already includes the unit.
- **Core Clean Stream — P2P Stream Display:**
  - `ONLY` was showing with no service name on P2P/uncached streams (e.g. `[ 62.5 GB ] • ONLY`). Service label now conditional — hidden when no service is present
  - `[?]` bracket fallback on last line replaced with clean empty fallback — P2P streams no longer show `[?]` prefix

### Added
- **NekoBT Removed:** Dropped from all five templates. Not supported by AIOStreams hosts — was added in error and would fail silently on all hosted instances.
- **`seadexBestOnly: true` (4K templates):** Forces best-release-only for anime on the two 4K templates. On high-end hardware the difference between a mediocre encode and the SeaDex best release is significant. Left unset on 1080p templates where playback compatibility matters more than encode quality.
- **`excludeUncachedFromServices: ['realdebrid']` (dual templates):** Real-Debrid uncached is unreliable compared to TorBox's Usenet pipeline. The two dual-core templates now route all uncached traffic exclusively through TorBox, with RD serving cached streams only.

### Changed
- **Series Sort Criteria — Per-Template Differentiation:**
  - *4K templates:* Expanded from 3 keys to 11 — `cached → expressionMatched → seadex → resolution → quality → expressionScore → visualTag → audioTag → audioChannel → seeders → age`. TV shows on high-end hardware now receive the same quality-prioritised sort as movies.
  - *1080p templates:* Expanded from 3 keys to 7 — `cached → expressionMatched → resolution → quality → audioChannel → seeders → age`. Lighter stack appropriate for low-end playback hardware.
- **`cachedMovies` Sort — Size Tiebreaker (4K templates):** Added `size: desc` as the final tiebreaker in the `cachedMovies` sort criteria on both 4K templates. When two cached movies are equal in quality, visual tag, and audio, the larger file is preferred — on high-end hardware larger typically indicates a true REMUX rather than a compressed re-encode. Not applied to 1080p templates where smaller files improve buffering reliability.
- **NZBGeek Preset Hardened (Hybrid template):** API key placeholder updated from the silent `<nzbgeek_api_key>` to `"REQUIRED — paste your NZBGeek API key here"` for immediate visibility on import. Added `services: ['torbox']` to bind NZBGeek results to TorBox as the download service. Added `checkOwned: true` to check TorBox's owned files before searching, consistent with the TorBox Newznab preset behaviour.

---

## 2.0.0 (2026-05-22)

### Added
- **Tamtaro SEL Stack:** Live-synced filtering across all five templates via Tamtaro's maintained GitHub URLs. `syncedExcludedStreamExpressionUrls` (Extended ESE list), `syncedPreferredStreamExpressionUrls` (PSE list), and `syncedExcludedRegexUrls` (junk filename regex) are all now wired to Tamtaro's sources and update automatically.
- **Vidhin05 Ranked Regex + Expressions:** Added `syncedRankedRegexUrls` and `syncedRankedStreamExpressionUrls` pointing to Vidhin05's release group regex and scoring expressions across all five templates.
- **EZTV Preset:** Added TV show torrent search via EZTV as a built-in opt-in addon across all five templates, positioned after Knaben. Disabled by default.
- **Full 12-Service Roster:** All five templates now include the complete debrid service list — TorBox, Real-Debrid, AllDebrid, Premiumize, DebridLink, Offcloud, Put.io, EasyNews, EasyDebrid, PikPak, Seedr, Debrider. All set to `enabled: false` for user opt-in. Previously only 8 services were listed.
- **Per-Resolution Size Enforcement:** Replaced the flat global size cap with per-resolution floors and ceilings. 4K templates: movies 5 GB–150 GB global, 2160p up to 150 GB, 1080p capped at 30 GB, 720p capped at 12 GB. 1080p templates: movies 1 GB–60 GB global, 1080p capped at 25 GB, 720p capped at 10 GB. Prevents sub-gigabyte junk and prevents oversized files slipping through on wrong-resolution results.
- **3D / H-OU / H-SBS Block:** Added Tamtaro's glasses-required 3D visual tag exclusions to `excludedVisualTags` across all five templates, merged with any existing per-template exclusions.
- **SeaDex Enabled:** `enableSeadex: true` set explicitly across all templates.
- **Tamtaro Quality Ordering:** Applied Tamtaro's `preferredQualities`, `preferredEncodes`, and `preferredAudioTags` ordering where not already set — BluRay REMUX first, AV1 > HEVC > AVC encode priority, Atmos > TrueHD > DTS-HD MA audio chain.
- **Tamtaro Year + Title Matching:** Applied `yearMatching` (strict, tolerance 1, all content types) and `titleMatching` (exact mode, all content types) from Tamtaro's setup where not already present.
- **Hard CAM Kill + YouTube Kill ESEs:** Injected as top-priority excluded stream expressions on any template missing them.

### Changed
- **Template Suite Consolidated:** Any-Host templates (`core-nexus-anyhost-1080p`, `core-nexus-anyhost-1080p-dual`, `core-nexus-anyhost-4k`, `core-nexus-anyhost-4k-dual`) retired. Universal debrid support is now delivered via the full 12-service opt-in roster in all remaining templates. Suite reduced to five focused builds.
- **Peerflix Removed:** Dropped from all templates. Primarily a Spanish-language source (Mejortorrent, Wolfmax4K, Dontorrent, Bitsearch) — zero net gain for English debrid setups. Coverage already handled by Knaben, TorrentGalaxy, and Meteor.
- **RD Infringing File Scrub Expanded:** Extended keyword list in the Real-Debrid ESE to cover the full May 2026 RD blocklist: added `CR`, `PCOK`, `PMTP`, `ATVP`, `MAX`, `SHO`, `CRAV`, `STAN`, `BCORE`, `YTS`, `RARBG` alongside the existing `WEB-DL`, `WEBRip`, `AMZN`, `DSNP`, `HULU`, `NF`. BluRay REMUX intentionally exempt — disc rips are unaffected by RD's filter.
- **MediaFusion URL Pre-Configured:** Set to `https://mediafusion.elfhosted.com` across all five templates. Previously the URL field was empty, which would silently fail on instances without a default configured.
- **Deduplicator Upgraded:** Applied Tamtaro's full smartDetect deduplicator config — 13 attributes (size, resolution, quality, visualTags, audioTags, audioChannels, languages, encode, edition, network, remastered, bitrate, releaseGroup), `multiGroupBehaviour: aggressive`, `libraryBehaviour: prefer`.
- **Services All Set to Opt-In:** All services across all templates forced to `enabled: false`. Previously some templates preserved `enabled: true` on their primary service, which would require that specific service to work. Now all services are purely opt-in.
- **Hybrid Template Metadata Fixed:** `core-nexus-tb-hybrid-1080p` was incorrectly named and described as "Core Nexus Torbox Exclusive" — now correctly identified as "Core Nexus TB Hybrid 1080p" with an accurate description reflecting its TorBox + NZBGeek dual-indexer purpose.
- **Version Unified:** All five templates bumped to `v2.0.0`. Previous versions ranged inconsistently from `1.0.2` to `1.0.12`.

---

## 1.2.0 (2026-05-21)

### Added
- **Any Host Template Suite:** Four new universal debrid templates — `core-nexus-anyhost-1080p`, `core-nexus-anyhost-1080p-dual`, `core-nexus-anyhost-4k`, `core-nexus-anyhost-4k-dual`. All 8 supported debrid services enabled by default (TorBox, Real-Debrid, AllDebrid, Premiumize, DebridLink, Offcloud, Put.io, EasyDebrid). TorBox-specific presets removed. Users activate whichever service they have — the rest are ignored.
- **Dual-Account Device Profiles:** Documented a dual-Stremio-account strategy for multi-device households. AIOStreams cannot detect devices natively — the recommended approach is two separate Stremio accounts. Low-End Account (phones, tablets, budget TVs) → 1080p SDR templates. High-End Account (Shield, 4K TVs) → 4K Unleashed templates.
- **AnimeTosho Preset:** Added across all 8 templates. Mirrors most anime from Nyaa.si and TokyoTosho, filling coverage gaps that SeaDex misses.
- **TorrentGalaxy Preset:** Added across all 8 templates. Active, debrid-only indexer with good variety.
- **Peerflix Preset:** Added across all 8 templates. Works with both debrid and P2P, fast, useful as a fallback source.
- **Core Clean Stream Formatter:** New minimal formatter (`Core_Clean_Stream.json`) matching a screenshot-style layout. Plain text, no smallcaps unicode. Four-line structure: `Quality • Encode` → `AudioTags • Channels` → `Language` → `[ Size ] • Service ONLY`.

### Changed
- **Addon Tier Hierarchy Enforced:** All 8 templates now follow a strict 3-speed tier structure. Fast group (≤4000ms): Library, Comet, TorBox Search, StremThru Torz (TB builds only). Medium group (5000ms): Meteor, Zilean, SeaDex, AnimeTosho, Searchⁿᶻᵇ, MediaFusion. Slow/fallback group (6000ms): TorrentGalaxy, Knaben, Peerflix. Results load progressively — no waiting for all sources to complete before seeing results.
- **Torrentio Removed:** Removed from all templates. Replaced by TorrentGalaxy and Peerflix for equivalent coverage without the rate-limit instability.
- **Comet Timeout Reduced:** Lowered from 5000ms to 4000ms — confirmed as the fastest premium debrid scraper, now correctly placed in the fast group.

---

## 1.1.3 (2026-05-20)

### Added
- **Core Nexus TB Hybrid 1080p:** New template (`core-nexus-hybrid.json`) for TorBox users who want both cached and uncached stream access. Features `onlyShowCachedStreams: false`, `showP2PStreams: true`, and a `Low Seeders Uncached` ESE. Optimised for low-end hardware — SDR only, BluRay/Remux blocked, WEB-DL priority, 25Mbps bitrate cap, HEVC/AVC only, max 5.1 audio.
- **NZBGeek Integration:** Added NZBGeek as a dedicated newznab preset in the Hybrid template, positioned directly after Searchⁿᶻᵇ in the Usenet tier. Requires user API key to activate.
- **Torrentio Added:** Added Torrentio preset across all five templates for expanded index coverage at the time of this release (subsequently removed in v1.2.0).
- **Addon Tier Hierarchy Implemented:** All templates follow a 5-tier preset order — Tier 1 (Library, TorBox Search) → Tier 2 (StremThru Torz, Comet, Meteor) → Tier 3 (Zilean, SeaDex, Searchⁿᶻᵇ) → Tier 4 (Knaben, Torrentio, MediaFusion) → Tier 5 (OpenSubtitles V3+). Timeouts graded by tier (3000–6000ms).
- **4K TorBox Presets Completed:** Added Meteor, Comet, and Zilean to the 4K TorBox template — now on par with the 4K Dual Core for the first time.

### Fixed
- **`sortCriteria.series` Invalid Keys:** Removed `season` and `episode` from the series sort criteria across all five templates. These are not valid AIOStreams sort keys and were causing an `Invalid option` import error.
- **`groups.groupings` Undefined Condition:** Removed a broken grouping entry with an undefined `condition` field from all five templates, resolving the `groups.groupings.0.condition: Invalid input: expected string, received undefined` import error.

### Changed
- **Core Zenith Diamond Formatter Rebuilt:** Redesigned the formatter to mirror a screenshot-style structured layout. Service pool now shown as `[TB]` / `[RD]` using `::upper`. All quality and audio labels switched to uppercase. Description restructured into a clean 4-line hierarchy: age/type/addon → bitrate/size/seeds → video/encode/language → release/regex/seadex.
- **Stream Limits Raised:** `maxResults` increased to 25 (1080p) and 30 (4K). `maxResultsPerResolution` increased to 10 (1080p) and 12 (4K).
- **Year Matching Loosened:** `yearMatching.strict` set to `false`, tolerance widened from 1 to 2 years.
- **Digital Release Filter Widened:** Tolerance increased from 3 to 7 days.
- **Title Matching Threshold Lowered:** `similarityThreshold` reduced from `1.0` to `0.85`.
- **`preferredStreamTypes` Fixed (4K):** Both 4K templates corrected to `['usenet', 'debrid']` — consistent with 1080p templates and TorBox-first intent.

---

## 1.1.2 (2026-05-20)

### Stability Notice
> ⚠️ Versions prior to `1.1.2` should be considered **unstable**. Earlier releases contained broken JSON, incorrect enum values, non-functional YouTube block (`streamType` instead of `type`), conflicting sort systems, dead config fields, and broken grouping conditions. `1.1.2` is the first version verified stable and publish-ready across all four templates.

### Added
- **New Scrapers:** Added `seadex`, `knaben`, and `mediafusion` presets across all templates from community optimised builds, significantly increasing source coverage for movies and TV shows.

### Changed
- **Stream Limits Raised:** `maxResults` increased from 15→25 (1080p) and 20→30 (4K). `maxResultsPerResolution` increased from 5→10 (1080p) and 8→12 (4K).
- **Year Matching Loosened:** `yearMatching.strict` set to `false`, tolerance widened from 1→2 years — catches valid streams that were being blocked by overly strict year filtering.
- **Digital Release Filter Widened:** Tolerance increased from 3→7 days, reducing missed new releases.
- **Title Matching Threshold Lowered:** `similarityThreshold` reduced from `1.0` to `0.85` — captures title variants previously excluded by requiring a perfect match.
- **`preferredStreamTypes` Fixed (4K):** Both 4K templates corrected from `['debrid', 'usenet']` to `['usenet', 'debrid']` — consistent with 1080p templates and TorBox-first intent.

---

## 1.1.1 (2026-05-18)

### Added
- **Series-Aware Sort:** Added `sortCriteria.series` across all templates with episode-aware ordering — `cached → expressionMatched → seeders`. Note: `season` and `episode` were initially added as sort keys but are not valid in AIOStreams — corrected in v1.1.3.
- **`deduplicator.excludeAddons`:** Added missing field across all templates for schema completeness.

### Changed
- **1080p Dual Core Proxy Fixed:** Added `proxiedServices: ['realdebrid']` to MediaFlow proxy config, matching 4K Dual Core. Both dual-core templates now consistently route RD traffic through MediaFlow for account protection.
- **`seederRangeTypes` Cleared:** Removed `['p2p']` from all templates — dead setting since p2p streams are excluded entirely.
- **`excludeUncachedFromStreamTypes` Cleared:** Removed redundant `['p2p']` filter — `onlyShowCachedStreams: True` already handles this.
- **`autoPlay.attributes` Updated:** Changed from `['resolution', 'quality', 'releaseGroup']` to `['resolution', 'quality', 'audioTags']` — audio tag matching is more relevant for auto-play stream selection.
- **Version bumped to `1.1.1`** across all templates.

---

## 1.1.0 (2026-05-18)

### Added
- **Tamtaro Trusted Regex URL:** Added `syncedExcludedRegexUrls` pointing to Tamtaro's whitelisted GitHub source across all templates. Brings in a comprehensive junk file extension block without triggering ElfHosted's forbidden URL error.
- **`addonCategoryColors`:** Added colour coding for addon categories across all templates — Debrid=emerald, Usenet=lime, HTTP=cyan, P2P=orange, Subs=purple, Mix=indigo.
- **`usePosterServiceForMeta: true`:** Enabled RPDB poster service for metadata lookups across all templates.
- **`preferredSubtitles: ['English']`:** Added explicit English subtitle preference across all templates.
- **`Upscaled 4k` ESE:** Added to both 4K templates to block content upscaled from lower resolutions falsely labelled as native 4K.
- **`Bad 4k Anime` ESE:** Added to both 4K templates for anime-specific 4K quality filtering.
- **`mergedCatalogs`:** Added missing field across all templates.

### Changed
- **ESEs Refreshed (2026-05-18):** Replaced all stream expressions with the latest versions. Key fix: `/*Hard YouTube Kill*/` corrected from `streamType()` to `type()` — the previous function name was invalid and the YouTube block was not firing.
- **`preferredStreamTypes` Reordered:** Changed from `['debrid', 'usenet']` to `['usenet', 'debrid']` — Usenet now correctly ranks above standard debrid cache for TorBox-first builds.
- **Statistics Enhanced:** Added `position: bottom`, `timing` to `statsToShow`, and `showFilterStatsOnNoStreams: true` across all templates.
- **Version Bumped to `1.1.0`** across all templates.

---

## 1.0.10 (2026-05-18)

### Changed
- **Template Metadata Overhaul:** Updated the `name` and `description` fields across all four templates to accurately reflect their specific configurations, resolutions, and service dependencies.
- **Unique Template IDs Assigned:** Replaced shared, duplicate IDs with unique, hyphenated IDs for each file. All four templates can now be loaded simultaneously without conflicting.

### Fixed
- **Hard YouTube Kill ESE Corrected:** Replaced invalid `streamType(streams, 'youtube')` with the correct `type(streams, 'youtube')` across all four templates. `streamType` is not a recognised AIOStreams function — the expression was failing silently instead of blocking YouTube streams.
- **RD Infringing File Scrub ESE Corrected:** Replaced the invalid `filename()` function with the native `keyword()` text-matching function in the Real-Debrid infringement block. The previous expression was throwing an `undefined variable: filename` error and breaking list evaluation.

---

## 1.0.9 (2026-05-18)

### Added
- **YouTube Triple-Layer Block:** Added `/*Hard YouTube Kill*/` ESE and `excludedStreamSources: ['YouTube', 'AI Enhanced']` across all templates. AI-enhanced YouTube links were bypassing the existing `excludedStreamTypes` filter by registering under a different source — now blocked at all three layers.
- **Statistics Enabled:** Turned on `statistics` across all templates to allow users to self-diagnose stream and filter issues without needing support.
- **RD Library Catalog:** Added Real-Debrid library catalog to `catalogModifications` in the Dual Core 1080p template — previously only TorBox library was listed.

### Changed
- **Sort Conflict Resolved:** Removed `sortBy: rank` from all templates. `sortCriteria` (cached → expressionMatched → seeders → size) now handles sorting exclusively without conflict.
- **Digital Release Filter Tightened:** Reduced `digitalReleaseFilter.tolerance` from 8 days to 3 days across all templates for more accurate new release matching.
- **4K Preload Increased:** Updated `preloadStreams.selector` on both 4K templates to preload 2 cached streams instead of 1, improving playback start times for large 4K files.
- **Descriptions Updated:** Rewrote `addonDescription` for both 1080p templates to accurately reflect their low-end hardware focus, SDR-only output, and BluRay/Remux blocking.
- **Template Versions Bumped:** All `appliedTemplates` references updated to `1.0.9`.

---

## 1.0.8 (2026-05-17)

### Added
- **Hard CAM Kill ESE:** Added `/*Hard CAM Kill*/` as the first stream expression across all four templates, creating a double-layer block alongside `excludedQualities`. Catches `CAM`, `SCR`, `TS`, `TC`, and `HC HD-Rip` at the stream level before any other filter fires.
- **4K Dual Core Template:** Created `core-nexus-4k-dual-core.json` — a dedicated 4K template for TorBox + Real-Debrid users, branched from the 4K HT build with RD service, Meteor, Comet RD, and Zilean presets added, and the RD Infringing File Scrub ESE included.

### Changed
- **Language Matching Fixed (All Templates):** Tightened language settings across all four templates — `includedLanguages`, `requiredLanguages`, and `preferredLanguages` now explicitly enforce English-first with `Original`, `Dual Audio`, `Multi`, `Dubbed`, and `Unknown` as fallbacks. Removed null `prioritisedLanguages` field.
- **Dual Core 1080p Built:** Created `core-nexus-dual-core-1080p.json` from the optimised TorBox Exclusive base, adding Real-Debrid service, Library, Meteor, Comet RD, Zilean, and OpenSubtitles V3+ presets, and the RD Infringing File Scrub ESE.

---

## 1.0.7 (2026-05-17)

### Added
- **Tamtaro ESE Integration:** Added 5 stream expressions from Tamtaro's extended ESE set — `G's Low Bitrate`, `ongoingSeasonPack`, `Low Seeders`, `Extra SeaDex`, and `Final Limit (All)` — bringing the TorBox Exclusive template to 10 active expressions.
- **Missing Config Fields:** Added `externalDownloads: false`, `autoRemoveDownloads: false`, and `excludeUncachedMode: or` to align with Tamtaro's complete setup standard.

### Changed
- **Performance Optimisation:** Set `maxResults: 15`, `maxResultsPerResolution: 5`, `onlyShowCachedStreams: true`, and `showP2PStreams: false` for faster stream loading on low-end hardware.
- **Result Limit Aligned:** Corrected `resultLimits.global` from `45` to `15` to match `maxResults` — both result limiting systems are now consistent.
- **Timeout Reduction:** Reduced all preset timeouts from 7000–8000ms to 5000ms and subtitles to 4000ms for snappier stream list load times.
- **Service Trim:** Removed 15 disabled service entries, leaving only TorBox. Template now contains no dead service config.
- **Title Matching Hardened:** Switched `titleMatching` from `contains` (0.9 similarity) to `exact` (1.0 similarity) to eliminate false stream matches.
- **Deduplicator Upgraded:** Changed `multiGroupBehaviour` from `conservative` to `aggressive` for cleaner result deduplication.
- **Year Matching Expanded:** Extended `yearMatching` to cover `series` and `anime` request types in addition to `movie`.
- **Stream Type Cleanup:** Removed `p2p` from `preferredStreamTypes` and `torrent` from `cacheAndPlay.streamTypes` — now strictly `debrid` and `usenet` only.
- **Audio Channel Order Fixed:** Corrected `preferredAudioChannels` from `[2.0, 5.1]` to `[5.1, 2.0]` to properly prioritise surround sound.
- **Proxy Config Cleaned:** Removed dead MediaFlow proxy config that was not proxying any services or addons.
- **Template Metadata Updated:** `appliedTemplates` now correctly references `core-nexus-torbox-exclusive v1.0.6` instead of the legacy dual-debrid source template.
- **UX Polish:** Disabled `showChanges` and `areYouStillThere` prompts. Set `serviceWrap.reconfigureService` to `false`.

---

## 1.0.6 (2026-05-17)

### Removed
- **TVDB Integration:** Removed `tvdbApiKey` from the TorBox Exclusive template to streamline the configuration and eliminate an unused API dependency.
- **Custom Inline Regex Patterns:** Cleared `excludedRegexPatterns` from the TorBox Exclusive template to comply with ElfHosted's instance-level regex restrictions. Blu-ray and Remux filtering remains enforced via `excludedQualities` and `excludedStreamExpressions`.

### Changed
- **Quality Block Casing Fixed:** Corrected `Bluray` → `BluRay` and `Bluray REMUX` → `BluRay REMUX` in `excludedQualities` to match AIOStreams' accepted enum values. Removed invalid `Remux` entry which is not a recognised quality option.

---

## 1.0.5 (2026-05-17)

### Added
- **Hosted Regex Sync:** Created `Regex/excluded-regex-patterns.json` in the repository to serve as a trusted external regex source. The TorBox Exclusive template now pulls patterns via `syncedExcludedRegexUrls`, eliminating the untrusted regex warning on import.
- **Blu-ray & Remux Regex Block:** Added a case-insensitive regex pattern to the hosted excluded patterns file targeting all Blu-ray and Remux filename variants (`BluRay`, `Blu-ray`, `BDRip`, `BDRemux`, `BDMux`, `BD25/50/66/100`, `REMUX`, `COMPLETE.BLURAY`) for low-end hardware protection.
- **Hard Quality Block:** Added `Bluray`, `Bluray REMUX`, and `Remux` to `excludedQualities` and a top-priority `excludedStreamExpressions` kill rule in the TorBox Exclusive template to enforce the low-end hardware profile at both the quality and stream filtering layers.

### Changed
- **JSON Integrity Fixed:** Resolved invalid JSON errors across `core-nexus-stream.json` (trailing comma) and `core-nexus-dual-core-1080p.json` (trailing comma + ~90 duplicate keys). Both templates now pass clean validation.
- **Addon Cleanup:** Removed `NZBGeek`, `Debridio`, and all three StremThru-wrapped addons (`Debrid Search`, `Torrentio`, `Baguettio`) from the TorBox Exclusive template. Template reduced from 13 to 8 native presets.
- **README Banner Fixed:** Corrected broken image path in `Community-Templates/Templates/RB3/Readme.md` from a relative `./Assets/` reference to a full raw GitHub URL, ensuring the Auburn Tiger banner renders correctly from any folder depth.
- **Addon Description Updated:** Removed stale `Debridio` reference from the TorBox Exclusive `addonDescription` field.

---

## 1.0.4 (2026-05-17)

### Added
- **RD Safety Scrub:** Implemented custom `excludedStreamExpressions` logic in the Dual Core templates. This automatically hides `WEB-DL`, `WEBRip`, and streaming platform tags (`AMZN`, `NF`, `DSNP`, etc.) from Real-Debrid results, ensuring only safe, playable BluRay/Remux links are pulled.
- **MediaFlow Proxy Integration:** Hardcoded Real-Debrid traffic in the Dual Core templates to route through the MediaFlow proxy to protect account standing against IP bans.

### Changed
- **Safe Editions Created:** Replaced the standard Dual Core templates with the new `-safe.json` variants to directly mitigate the May 2026 RD "infringing file" errors.
- **Configuration Cleanup:** Removed legacy and unused service references (NZBGeek, Debridio) from the Dual Core structures for lighter template execution.

---

## 1.0.2 (2026-05-17)

### Added
- **Repository Organization:** Restructured the `/Templates` folder into `/Single-Service` and `/Dual-Service` subdirectories for better navigation.
- **Formatter Guide:** Added a new step-by-step guide for importing standalone UI layouts.

### Changed
- **README Update:** Updated all "Quick Start" raw import links to reflect the new folder hierarchy.

---

## 1.0.1 (2026-05-17)

### Removed
- **Scraper Debloat:** Removed `NZBGeek` and `Debridio` from all templates to ensure a frictionless, TorBox-exclusive experience.

### Changed
- **Setup Streamlined:** Updated the `IMPORT_GUIDE.md` and PDF to a simplified 3-step process.

---

## 1.0.0 (2026-05-17)

### Added
- **Initial Release:** Launched 1080p and 4K flagship templates for both Single-Service and Dual-Service users.
- **Visual Formatters:** Introduced the `Core Zenith Diamond` and `Auburn Tiger Edition` UI configurations.
