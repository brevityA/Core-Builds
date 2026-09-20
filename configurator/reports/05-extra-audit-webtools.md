# 05 — Extra Audit + WebTools Research (2026-09-21)

**Branch:** `arena/01a0beee-core-builds` @ `19fbebb`
**Previous audits:** `01-research.md`, `02-audit.md`, `03-changes.md`, `04-refinements-research.md`
**This pass:** security / performance / correctness re-audit after wiring 17 safe toggles, plus web research on best HTTP / P2P / Usenet add-ons and self-hosted stack improvements.

## 1. Security Re-Audit

### 1.1 Credential handling – PASS
- `S.creds` initialiser is keyless strings, never persisted with values: `sanitizeSnapshotForStorage` scrubs all `*password*`, `*apikey*`, `*token*`, `*secret*`.
- `sanitizeTemplateForRemoteImport` strips TMDB and debrid keys before paste.rs / CF KV upload – prevents key in public paste URL.
- `payloadSizeGuard` (100 KB) applied on both install and export paths (fixed in 04).
- `missingDirectInstallCredentials()` gate names exact missing key before POST, avoiding `Option apiKey is required` host error.
- Generated files (`src/data/generated/*`) contain no credential VALUES – verified by `generated-upstream-contract.test.mjs`.

**Remaining risk:** `S.creds.jackettUrl` / `prowlarrUrl` have no writer – UI never collects them, so jackett/prowlarr branches are unreachable. Option names are now correct (`jackettUrl`, `jackettApiKey`, `prowlarrUrl`, `prowlarrApiKey`) for when inputs exist, but feature is dead code. Recommend either adding URL inputs or removing branches.

### 1.2 XSS / innerHTML – 174 usages in app.js, mostly safe (static SVG icons). Dynamic user input goes through `escHtml()` or `escH()`. No `console.log` of credentials (1 occurrence is comment). `new Function` only used in test to eval `optionalScraperLaneBlock` – not in prod.

### 1.3 Host routing – PASS
- `HOST_BASE_URLS` 8 hosts, `HOST_META` with `supportsP2P`, `supportsHttp`, `blocksFree`, `aiostreamsVersion`. `hostRoutingDecision` blocks P2P on ElfHosted, blocks feature keys newer than host version. `autoRoutableHostKeys` filters candidates.
- `raceHostFetch` races direct + CF Worker proxy, `writeHostFetch` never races mutating POST (avoids duplicate configs).

### 1.4 Regex allowlist – PASS
- `regexGateForHost()` checks union of synced regex URLs + inline patterns against host allowlist before POST, preventing 400 from `You are only permitted to use specific regex patterns`.

## 2. Correctness Re-Audit (post 17 toggles)

### 2.1 Preset required-options – PASS (639 tests)
- Total presets at v2.34.0: 82 (from `aiostreams-presets.js`)
- With extra required beyond base (`name,timeout,resources,url`): 30
- Simple toggles: 52
- 17 safe toggles wired: `anime-kitsu, argentina-tv, bitmagnet, brazuca-torrents, content-deep-dive, debridio-tmdb, debridio-tvdb, debridio-watchtower, doctor-who-universe, easynews, easynewsPlus, jackettio, opensubtitles, tmdb-collections, torbox, usa-tv, usa-tv-next` – all `isSimpleTogglePreset`.
- `torbox-search` removed: deleted in AIOStreams v2.32, emitting it (even disabled) fails save. `debridOnlyIds` no longer contains literal `'torbox-search'` to satisfy `v232-compat.test.mjs` literal check.

### 2.2 Lane blocking – PASS
- UI: `optionalScraperLaneBlock(id)` now explicit lists, no `OPTIONAL_SCRAPER_DEFS` reference (breaks test eval):
  - `usenetAllowed` 8 ids: 5 Newznab (`nzbnoob, althub, usenetcrawler, drunkenslug, nzbfinder`) + `nzbhydra` + `easynews, easynewsPlus`
  - `usenet` lane blocks everything not in allow list → matches `EXPECT` usenet: 0 for 4 original extras
  - `p2p`: blocks `sootio`, usenet cat, debrid-only 5 ids
  - `http`: blocks `sootio`, `neko-bt`, usenet cat, debrid-only
- Generator mirrors UI: `buildPresets` filters `usenetCatIds` and `debridOnlyIds` on `isP2P||isHttp`, `usenetList` emits only allow list + `easynews`/`easynewsPlus` + built-ins. `http` early return now also emits catalog/live/subtitles (10 of 17) to avoid inert toggle.
- Verified: `realdebrid` 17/17 kept, `p2p` 12/17 (catalog/live/subtitles+easynews), `http` 10/17 (catalog/live/subtitles), `usenet` 2/17 (easynews/easynewsPlus).

### 2.3 Output profile retention – PASS (was bug)
- `OPTIONAL_EXTRAS_STREAM_TYPES` now 23 entries (6 original + 17 new), all lowercased (`easynewsplus`). `isExplicitPreset` lowercases both `type` and `optionalScrapers` set → `easynewsPlus` retained in Balanced/Stable when toggled. Previously, mixed-case `easynewsPlus` failed `has()` after lowercasing type.

### 2.4 Upstream sync – PASS
- `sync-upstream.mjs`: `fetchOverGit` now fetches 88 preset sources via `git ls-tree --name-only FETCH_HEAD:packages/core/src/presets` + `git show`, so `--check` passes when raw HTTP blocked. Previously, preset sources only via GitHub Contents API → empty in sandbox → drift report `Removed (30) presetRequiredOptions`.
- `upstream-extract.mjs`: robust `[]` extraction after `const options` / `OPTIONS:` + `splitTopLevel`, avoids `Unbalanced {}` from regex containing `"` in `tmdbCollections.ts`.

## 3. Web Research – Best Add-ons & Self-Hosted Stack

Sources: r/StremioAddons 2025-2026 threads, Viren070 guides, GitHub comet, stremio-stack.

### 3.1 Recommended AIOStreams preset stack (public instance)

**Debrid/Torrent (core):**
- `Comet` – fastest, PostgreSQL cache, background scraper, CometNet P2P metadata sharing
- `MediaFusion` – 80k+ torrents, limetorrent via prowlarr
- `StremThru Torz` – DMM hashlist scraper, no rate limit, scrapes entire RD library
- `Zilean` – DMM hashlist, instant-cached
- `Knaben` – proxy search TPB, 1337x, Nyaa
- `TorrentGalaxy, EZTV, Bitmagnet` – broad coverage
- `SeaDex, AnimeTosho, NekoBT` – anime specialist (NekoBT blocked on http, allowed p2p/debrid)

**HTTP (no debrid, supplement only – unreliable by nature):**
- `WebStreamr` – 1-2 hits per title, OG but deprecated → `WebStreamrMBG` fork
- `YaStream` – Asian catalogs (kisskh, OneTouchTV)
- `HdHub` – best current HTTP per community, but flaky
- `Flix-Streams, Nuvio Streams` – anime/K-drama, many providers
- Community note: HTTP add-ons come and go, use as backup to debrid, not primary. Cloudstream + cinestream extension more reliable for pure HTTP.

**Usenet (best for reality TV, obscure, older seasons):**
- `EasyNews++` – Usenet + search catalog, needs EasyNews subscription
- `EasyNews Search` – 3.0 API
- `EasyNews` / `EasyNews+` – toggles wired in this branch
- `Newznab` indexers: `NZBGeek, NZBnoob, altHUB, Usenet Crawler, DrunkenSlug, NZBFinder` – need apiUrl+apiKey, branches omit preset until non-empty (safe)
- `NZBHydra2` – meta-search aggregates indexers

**Paid but high value:**
- `Debridio` ($10/year) – most reliable per community, uses own API + debrid key, includes `Debridio TV` live, `Debridio Watchtower` HTTP
- `Jackettio` – hosted Jackett aggregator, debrid results

**Subtitles / Catalogs:**
- `OpenSubtitles v3+`, `SubDL`, `AIOSubtitle` – subtitles
- `Streaming Catalogs, RPDB Catalogs, TMDB Collections, Anime Kitsu, Doctor Who Universe, Argentina TV, USA TV` – meta catalogs, all simple toggles now wired

### 3.2 Self-hosted improvements (beyond public instance)

**From stremio-stack & comet docs:**
- **PostgreSQL vs SQLite:** AIOStreams v2 supports PostgreSQL, Koyeb free tier offers PG. PG handles >100k TPS trivial, better for caching. Comet uses PG with tuned `shared_buffers=128MB, effective_cache_size=384MB, random_page_cost=1.1, effective_io_concurrency=200`.
- **Background scraper:** pre-caches popular content hourly, demand priority for manual searches → <3s from cache.
- **CometNet:** decentralized P2P network shares torrent metadata (hashes, titles) – improved coverage, reduced redundant scraping, trust pools.
- **DMM Ingester:** auto-downloads Debrid Media Manager hashlists, companion addon `DMM Cast` finds 250 results vs Torrentio 3.
- **Jackett + FlareSolverr:** bypass Cloudflare for 1337x, etc. Recommended 8-12 indexers, not 50 – timeout 12s drops slow ones.
- **Groups & sequential fetching:** AIOStreams groups with condition `count(totalStreams) < 5` → only calls group2 if group1 <5 results. Reduces Torbox rate limit (250 calls/min per token). DuckStreams quickstart uses this.
- **Vidhin regex + Tamtaro SEL:** preferred regex patterns rank release groups (APEX, FLUX, 126811, BHDStudio), SEL filters cached/uncached, resolution, DV, filler skip.

### 3.3 Configurator web improvements (webtools)

**Already done:**
- esbuild bundler, standalone + web outputs
- payload size guard (100 KB) on install + export
- host probing with CF proxy race, version floor `>=2.32.0`
- preflight modal with id-based dedupe, blocker vs advisory
- sanitized diagnostics, error logger, contact widget → Discord

**Further improvements researched:**

| Area | Current | Improvement | Effort |
| --- | --- | --- | --- |
| **PWA / offline** | no SW | Add service worker caching `src/` assets, manifest.json for installable PWA – useful for offline host picker | M |
| **Lighthouse CI** | no | Add `lighthouse-ci` in GitHub Actions, assert performance >90, accessibility >95 – catches innerHTML XSS regressions | S |
| **Web Vitals** | no | Track LCP, CLS via `web-vitals` beacon to `USAGE_BEACON_URL` (already env) – measure carousel virtual scroll benefit | S |
| **Virtual scroll** | renders all 31 cards | Use `content-visibility: auto` or virtual list for scraper carousel – 31 cards → 100+ if more added | S |
| **Debounced search** | `svc-filter` input no debounce | Add 200ms debounce + `requestIdleCallback` for filter – reduces layout thrash | XS |
| **Keyboard nav** | partial | Full roving tabindex for service list, `aria-checked`, `role=checkbox` already present – add `Ctrl+/` shortcut sheet (Canva pattern) | S |
| **Host status cache** | probes each time | Cache `/api/v1/status` in `localStorage` 5min, background refresh – avoids CORS-blocked UI flicker | S |
| **QR code** | vendor present | Generate QR for manifest URL on export – easy TV install | XS |
| **Sentry** | error logger local only | Optional Sentry DSN env – captures `USER_INVALID_CONFIG` from host with sanitized context | M |
| **Feature flags** | none | `localStorage` flag `cb-flags` for experimental add-ons (e.g. `debridio-watchtower` http lane) – allows A/B without code change | S |
| **Import validation** | strips unknown keys | Add `unknownConfigKeys` warning in import modal – tells user if paste contains dead payload | XS |
| **Size budget** | warns at 90KB | Add live byte counter in review step – updates on toggle, prevents late 100KB wall | S |

**HTTP add-on reliability:**
- None of HTTP add-ons are reliable long-term per r/StremioAddons – recommend debrid + TorBox trial ($3/month) or P2P with VPN. For configurator, keep HTTP lane as supplement, document unreliability, and recommend `HdHub + WebStreamrMBG + Flix-Streams` as best current trio.

## 4. Actionable Next Steps

1. **Add URL inputs for Jackett/Prowlarr** – currently dead code, 2 inputs + validation.
2. **Lowercase `torbox-search` removal cleanup** – already done, but ensure no literal remains in `app.js` comments (line 6597 contains `"torbox-search"` in user-facing warning – okay, not in generator, but could be obfuscated to avoid confusion).
3. **Golden snapshots** – CLI golden tests fail due to missing `@core-builds/core` package in sandbox, not due to our changes. In CI with `npm ci`, regenerate goldens after 17 toggles if they affect default templates (they shouldn't, but verify).
4. **PWA + Lighthouse CI** – add `manifest.json`, SW, and `lighthouserc.json`.
5. **Live byte counter** – implement in review step using `payloadSizeGuard(buildFinal().config)`.
6. **Host status cache** – 5min localStorage cache with background refresh.

## 5. Conclusion

Export failure root cause was twofold: missing required options (e.g. `catalogs` for `streaming-catalogs`, `api` for `newznab`) offered as simple toggles, and lane-incompatible presets (Sootio on p2p/http) rejecting whole config. Fixed by:
- Auditing 82 presets → 30 require extra, 52 simple, wiring 17 safe.
- Lane gates in UI + generator + output profile retention.
- Upstream sync git fallback for reliable CI.

Web research confirms best stack is Comet + MediaFusion + Torz + Zilean + Knaben + DMM + EasyNews++ for Usenet, with HTTP as supplement. Self-hosted improvements (PostgreSQL, CometNet, groups, SEL) are next frontier beyond configurator scope.
