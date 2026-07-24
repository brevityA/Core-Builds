# Core Builds — Claude Context

This is **brevityA/Core-Builds**, the canonical repo for Core Builds by Brevity — a configurator and template suite for [AIOStreams](https://github.com/Viren070/AIOStreams).

---

## Workflow Rules

- **Create a new PR for every task.** After committing and pushing changes, always open a pull request — even for small or experimental changes.
- **Build and test before push.** Run `npm run build && npm test && npm run validate` in `configurator/` before pushing configurator changes.
- **Version consistency.** When bumping `CONFIGURATOR_VERSION` in `app.js`, also update `configurator/package.json`, `versions.json`, `configurator/src/data/changelog.js`, and `configurator/scripts/validate.mjs`.

---

## What This Repo Is

Two products:

1. **Configurator** (`configurator/`) — a web app that generates optimised AIOStreams template JSON through a guided UI. Deployed to GitHub Pages. This is the main product.
2. **Template Suite** (`Templates/`) — 46+ pre-made AIOStreams templates for TorBox, AllDebrid, EasyNews, Hybrid, Anime, and device-specific profiles.

Templates control how streams are filtered, sorted, deduplicated, and formatted inside [AIOStreams](https://github.com/Viren070/AIOStreams).

---

## Repo Structure

```
configurator/               — Web app (main product)
  src/js/app.js             — 6000+ line core logic
  src/data/                 — Data modules (devices, hosts, services, scrapers, formatters, changelog, etc.)
  src/styles/               — 7 CSS cascade layers (01-core through 07-menu-parity)
  src/config/schema-guard.js — AIOStreams enum sanitization
  scripts/build.mjs         — esbuild bundler
  scripts/validate.mjs      — 25 static validation checks
  tests/                    — Node test runner unit tests (29 tests)
  e2e/                      — Playwright E2E tests
  index.html                — Built output (standalone, deployed to Pages)
  package.json              — v2.82.0

tools/                      — Tools hub
  inspector/                — Template Inspector (paste JSON for instant validation)
  debug/                    — Debug utilities
account-tools/              — Addon Backup (read-only Stremio addon backup)
cli/                        — CLI tool (planned)
cloudflare-worker/          — CORS proxy (Cloudflare Worker for cross-origin requests)
AIOMetadata/                — AIOMetadata configs (movies+TV, full)

Templates/Torbox/
  Single/                   — TorBox Pro templates (4K Apex, Stream + Lite variants)
  Essential/                — TorBox Essential templates
  Flash/                    — Cached-only instant play
  Speed/TorBox/             — Fast cached play
  Speed/EasyNews/           — EasyNews dual-source variants
  Anime/                    — Anime-optimised templates
  Hybrid/                   — TorBox + RD hybrid templates
  AllDebrid/                — AllDebrid variants
  Device/Samsung/           — Samsung TV device templates
  Device/Xiaomi/            — Xiaomi Android TV device templates
  Device/Windows/           — Windows PC device templates
  Nightly/                  — Pre-release / nightly builds
  Deprecated/               — Retired templates
Templates/Personal/         — Personal/experimental — do not document or expose
Community-Templates/        — Community-contributed templates
Formatters/                 — 19 custom stream layout formatters
Filtering/                  — Shared filter expression files (ESEs, ISEs, PSEs, ranked regex)
Regex/                      — Excluded regex pattern lists
Assets/                     — Banners, icons, formatter preview images
Guides/                     — Import guide, troubleshooting, device profiles, FAQ, CHANGELOG
core-builds-template-collection.json — Operator template catalog for TEMPLATE_URLS
versions.json               — Version tracking (configurator, templateSuite, minimumAIOStreams)
tests/                      — pytest test suite (233 tests — template validation, integration)
.github/                    — Workflows, issue templates, discussion templates
scripts/                    — One-off maintenance scripts
```

---

## Configurator Architecture

### Source → Build → Deploy

- **Source:** `configurator/src/js/app.js` + data modules + CSS layers
- **Build:** `node scripts/build.mjs` → esbuild bundles into standalone `index.html` + web assets (`dist/web/`)
- **Deploy:** `deploy-configurator.yml` builds and pushes to GitHub Pages
- **Version:** `CONFIGURATOR_VERSION` in app.js (currently `'2.82'`), mirrored in `package.json` and `versions.json`

### State Management

- **`S` object** (line 82) — global state with all user selections (service, device, resolution, audio, formatters, credentials, etc.)
- **`SHARE_KEYS`** (line 183) — subset of S keys included in shareable config links
- **`saveState()`** — persists S to `localStorage`
- **`sanitizeSharedConfig()`** — validates and strips credentials from imported/shared configs
- **`schema-guard.js`** — sanitizes AIOStreams enum arrays against known-valid values

### Template Generation

`S` → `build()` → `buildFinal()` → JSON template output

The `build()` function (line ~3400) assembles the full AIOStreams config from current state: presets, ESEs, ISEs, PSEs, sort criteria, formatter, regex patterns, deduplicator, groups, and metadata.

### Key Modules

| File | Purpose |
|---|---|
| `src/data/devices.js` | 20+ device profiles with AV1/DV/HDR/audio capabilities |
| `src/data/hosts.js` | AIOStreams host metadata (elfhosted, fortheweak, self-hosted) |
| `src/data/services.js` | Debrid/usenet service definitions |
| `src/data/scrapers.js` | Scraper addon definitions with credentials |
| `src/data/formatters.js` | 19 built-in formatter definitions |
| `src/data/credentials.js` | `PROVIDER_CREDENTIALS` registry (18+ providers) |
| `src/data/changelog.js` | Version changelog displayed in UI |
| `src/config/schema-guard.js` | AIOStreams enum validation |

---

## Tools Suite

| Tool | Location | Status |
|---|---|---|
| **Template Builder** | `configurator/` | Live — the configurator |
| **Template Inspector** | `tools/inspector/` | Live — paste/upload/fetch JSON for instant validation, health score, host compatibility |
| **Addon Backup** | `account-tools/` | Live — read-only Stremio addon backup |
| **Account Manager** | planned | Locked |
| **CLI** | `cli/` | Planned |
| **CORS Proxy** | `cloudflare-worker/` | Live — Cloudflare Worker for cross-origin config push |

---

## Recent Features (v2.78–v2.82)

- **family-v4 formatter** — new default with bitrate, release group, seeders, age, indexer, season pack info
- **Debrider service** — multi-debrid aggregator support
- **Knaben, Zilean, Jackett, Prowlarr scrapers** — additional scraper addons
- **Health Score** — 0–100 template quality score with A–F grading in Review step
- **Template Versioning** — auto-update banner when saved template is outdated
- **Full Stack Install** — AIOMetadata + Cinemeta patch + addon ordering in one click
- **CORS proxy** — Cloudflare Worker for cross-origin config reliability
- **Template Inspector** — standalone validation tool with host compatibility checks
- **Addon Backup** — read-only Stremio addon backup
- **Quick Install** — one-page guided setup flow
- **Device-aware profiles** — 20+ devices with AV1/DV/HDR handling
- **IQR PSE Architecture** — statistical bitrate filtering with Tukey fences
- **Host compatibility checking** — pre-deploy validation for elfhosted/fortheweak
- **Troubleshooter** — interactive decision tree for common issues
- **Diagnostics modal** — sanitized issue reports
- **Backup timeline** — 20-entry local backup with restore
- **Library Boost** — three modes: Default, Strong (top priority), None (disabled)
- **Bandwidth Estimator** — device-aware bandwidth suggestion with manual override
- **Age Limit** — content age filter with 7d/30d/90d/1y/2y presets
- **NZB Failover** — configurable position (before/after torrents) and max NZB count
- **Patch Cinemeta** — automatic by default (hides Cinemeta catalogs, uses Cinebye)

---

## Testing

| Suite | Count | Runner | What it covers |
|---|---|---|---|
| pytest | 233 tests | `pytest tests/` | Template validation, JSON schema, integration, regex patterns |
| npm test | 29 tests | `node --test` in `configurator/` | Unit tests (credentials, device profiles, schema guard, UI lifecycle) |
| Static validation | 25 checks | `npm run validate` in `configurator/` | Version consistency, host metadata, device defaults, module wiring |
| Playwright E2E | varies | `configurator/e2e/` | Browser-based stability tests |

---

## CI/CD

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-configurator.yml` | push to main | Builds configurator, deploys to GitHub Pages |
| `configurator-ci.yml` | PRs | Runs `npm test` + `npm run validate` |
| `configurator-e2e.yml` | PRs | Playwright E2E tests |
| `validate.yml` | PRs | Template JSON validation |
| `tests.yml` | PRs | pytest suite |
| `status-check.yml` | PRs | Aggregate status check |
| `link-checker.yml` | scheduled | Dead link detection |
| `sync-upstream.yml` | scheduled | Upstream AIOStreams sync |

---

## Formatters

19 formatters in `Formatters/`. Most use `id: "tamtaro"` with `definitions.overrides['tamtaro']`. Some use `id: "custom"`.

| Formatter | ID | Notes |
|---|---|---|
| `family-v4.json` | tamtaro | Current default — bitrate, release group, seeders, age, indexer |
| `core-nexus-apex-v2-formatter.json` | tamtaro | Premium 4K formatting |
| `core-nexus-elite-formatter.json` | tamtaro | Elite variant |
| `nexus-prime-formatter.json` | tamtaro | Prime variant |
| `core-nexus-apex-formatter.json` | tamtaro | Original apex |
| `core-nexus-ultra-formatter.json` | tamtaro | Ultra detail |
| `core-nexus-sigma-formatter.json` | tamtaro | Sigma variant |
| `core-nexus-minimal-formatter.json` | tamtaro | Minimal/clean |
| `core-nexus-uniform-formatter.json` | tamtaro | Uniform layout |
| `core-nexus-tv-formatter.json` | tamtaro | TV-optimised |
| `core-clean.json` | tamtaro | Clean minimal |
| `core-syntax-formatter.json` | tamtaro | Syntax-highlighted |
| `core-syntax-v3.json` | tamtaro | Syntax v3 |
| `core-zenith-auburn-tiger-edition.json` | tamtaro | Zenith Auburn Tiger |
| `core-zenith-diamond.json` | tamtaro | Zenith Diamond |
| `midnight-slate.json` | tamtaro | Dark theme |
| `omni-diamond-v2.2.0.json` | custom | Omni Diamond |
| `rb3-clean-v4-formatter.json` | custom | Community (RB3) |
| `rb3-formatter.json` | custom | Community (RB3) |

Import via AIOStreams → Formatter → Import icon → paste raw URL.

---

## Security

- Real API keys must **NEVER** be committed
- Personal templates are in `Templates/Personal/` — do not document or expose
- `instancePassword` is stored in `localStorage` (unencrypted)
- `stremioPassword` is correctly excluded from `saveState()` — never persisted
- `sanitizeSharedConfig()` strips credentials from share links
- The CORS proxy (`cloudflare-worker/`) does not log credentials
- Template import URLs strip credentials before upload
- `PROVIDER_CREDENTIALS` in `credentials.js` defines per-provider credential structure — never stores actual values
- All import URLs use `brevityA/Core-Builds` — NOT the `Branding-Brevity` repo

---

## Competitive Landscape

| Product | What it does | Core Builds differentiator |
|---|---|---|
| **Duck Tools** (QuackStart, Account Cloner, Time Machine) | Stremio addon management | Core Builds focuses on template generation, not addon management |
| **TVFlix Builder** | Template builder with age limits, visual styles, bandwidth hints | Core Builds has deeper PSE architecture (IQR, pow() decay), more device profiles |
| **Tam-Taro SEL** | Template wizard, synced URLs, library boost | Core Builds has standalone configurator, health scoring, host compatibility |
| **CrispyFormat** | Visual formatter builder | Core Builds has 19 built-in formatters + family-v4 default |
| **AIOStreams configure page** | Built-in AIOStreams config UI | Core Builds replaces this with guided wizard + advanced features |

---

## Template Format

Templates are JSON files validated against the AIOStreams schema. Key fields:

- `metadata` — id, name, version, description, sourceUrl, changelog
- `config.sortCriteria.global` — array of `{ key, direction }` objects (`"asc"` or `"desc"`)
- `config.addonLogo` — must use `raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/core_icon.svg`
- `config.sourceUrl` — must use `raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/...`
- All import URLs use `brevityA/Core-Builds` — NOT the main `Branding-Brevity` repo

## Known Validator Rules

- `sortCriteria` entries must use `"direction"` (not `"order"`) — AIOStreams rejects `"order"` on import
- `addonLogo` URL must use `/refs/heads/main/` not `/main/` — the short form breaks on stale CDN caches
- `stremthruTorz` is TorBox-specific; `stremthruStore` is for other debrid services (AllDebrid, RD)
- `torbox-search` is a valid TorBox-wrapped search addon — it is not removed or broken
- `syncedRankedRegexUrls` is **allowed** on public instances (elfhosted, fortheweak.cloud) and is used to serve `rankedRegexPatterns` content from Vidhin05. The real elfhosted blocker is **inline lookahead/lookbehind regex** (`(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`) in any regex field — keep inline patterns lookahead-free

## Known Preset Types

Preset `type` values confirmed in AIOStreams source (as of v2.31.0+):

**Preset categories:** `streams`, `subtitles`, `meta_catalogs`, `misc` (enum `PresetCategory`)

**Debrid/service:** `stremthruTorz`, `stremthruStore`, `torbox-search`, `sootio`, `peerflix`
- `torbox` — **DEPRECATED** (removed/disabled v2.30.2); use `torbox-search`

**Scrapers:** `comet`, `mediafusion`, `jackettio`, `prowlarr`, `jackett`, `knaben`, `torrentio`, `debridio`, `meteor`, `torrent-galaxy`, `zilean`, `hdhub`, `eztv`, `torrents-db`, `streamfusion`, `baguettio`, `flix-streams`, `brazuca-torrents`, `yastream`, `bitmagnet`, `dmm-cast`, `torznab`, `nuvio-streams`

**HTTP stream / direct-play:** `webstreamr` (multi-language HTTP streams), `nuvio-streams` (Showbox/VidSrc/VidZee), `flix-streams` (50+ provider aggregator, paid tier), `astream` (Anime-Sama, French), `streamasia` (Asian drama/movies), `debridio-watchtower` (HTTP stream provider)

**Live TV:** `usa-tv` (US channels), `argentina-tv` (Argentine channels), `debridio-tv` (live streaming channels), `debridio-ic4a` (IPTV-backed livestreams via Debridio)

**Usenet:** `newznab`, `easynews`, `easynewsPlus`, `easynewsPlusPlus`, `easynews-search`, `streamnzb`, `usenet-streamer`, `nzbhydra`, `davex` (usenet via davex search profile)

**Google Drive / personal media:** `stremio-gdrive` (Google Drive integration, builtin — requires OAuth setup)
- `orion` — Orionoid aggregator; **TorBox deliberately excluded** from supported services
- `annatar` — **does not exist** in current codebase (no preset file); remove from any config
- `mediafusion-public` — not a separate preset file; likely a config option on `mediafusion`, not a distinct type
- `torrentio` — TorBox supported but **blocked on elfhosted public instance** by developer request; unstable hosting (March 2026 suspension)

**Anime-specific:** `seadex`, `animetosho`, `neko-bt`, `yastream`, `astream`, `fkstream`

**Catalog/meta (META_CATALOGS):** `tmdb-addon` (TMDB metadata), `streaming-catalogs` (streaming service catalogs), `anime-catalogs` (MAL/AniDB/AniList/Kitsu/etc.), `anime-kitsu` (Kitsu anime catalog), `torrent-catalogs` (top seeded torrents), `rpdb-catalogs` (RPDB release tracking), `tmdb-collections` (TMDB collections), `debridio-tmdb` (Debridio TMDB catalogs), `debridio-tvdb` (Debridio TVDB catalogs), `marvel-universe`, `star-wars-universe`, `dc-universe`, `doctor-who-universe` (franchise catalogs)

**AI-powered (META_CATALOGS/MISC):** `ai-companion` (AI movie/series recommendations), `ai-search` (Gemini-powered search), `more-like-this` (recommendation engine), `content-deep-dive` (comprehensive content info, cast, reviews — MISC category)

**Subtitles:** `opensubtitles`, `opensubtitles-v3-plus`, `aiosubtitle`, `subdl`, `subsource`, `subhero`

**System:** `library` (continue watching / user library), `custom`, `aiostreams` (self-reference/chaining)

**Supported services (17):** `realdebrid`, `alldebrid`, `premiumize`, `debridlink`, `torbox`, `offcloud`, `putio`, `easynews`, `easydebrid`, `debrider`, `pikpak`, `seedr`, `nzbdav`, `altmount`, `stremthru_newz`, `stremio_nntp`, `aiostreams`
- `stremio_nntp` — native NNTP usenet streaming (v2.31.0)
- `aiostreams` — AIOStreams built-in usenet engine (v2.31.0)
- `putio` — valid service for presets/config but **removed from `service()` SEL whitelist** in v2.31.0; `service(streams, 'putio')` will throw

**Per-Addon Flood Guard caps (current — v2.9.5):**
Meteor ≤ 5, Comet ≤ 5, MediaFusion ≤ 4, EZTV ≤ 3, HdHub ≤ 3, Torrent Galaxy ≤ 1 (backup), Knaben ≤ 1 (backup), TorrentsDB ≤ 1 (backup)

---

## Active Template Inventory (as of v3.3.2)

### Single (TorBox Pro)
- `Single/core-nexus-4k-apex.json` v0.9.0 — flagship 4K, IQR PSEs, pow() decay, 5s dynamic fetching cap, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `Single/core-nexus-4k-apex-torbox.json` v2.12.9 — TorBox-cached-only Apex variant, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `Single/core-nexus-stream.json` v2.10.8 — 1080p streaming quality, 720p fallback
- `Single/core-nexus-stream-lite.json` v2.10.8 — lite variant
- `Single/core-nexus-stream-firestick.json` v2.10.8 — Fire Stick optimised
- `Single/core-nexus-stream-firestick-lite.json` v2.10.5

### Essential (TorBox Essential)
- `Essential/core-nexus-4k-essential.json` v2.12.8 — 4K with IQR PSEs, pow() decay, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `Essential/core-nexus-4k-essential-lite.json` v2.10.8 — CB-style PSEs
- `Essential/core-nexus-essential.json` v2.10.8 — 1080p
- `Essential/core-nexus-essential-lite.json` v2.10.5

### Flash
- `Flash/core-nexus-flash-4k.json` v2.10.7 — cached-only 4K instant play
- `Flash/core-nexus-flash.json` v2.10.7 — cached-only 1080p instant play

### Speed (TorBox)
- `Speed/TorBox/core-nexus-speed-4k.json` v2.10.7 — fast cached 4K
- `Speed/TorBox/core-nexus-speed-4k-lite.json` v2.10.5
- `Speed/TorBox/core-nexus-speed.json` v2.10.7 — fast cached 1080p
- `Speed/TorBox/core-nexus-speed-lite.json` v2.10.5

### Speed (EasyNews)
- `Speed/EasyNews/core-nexus-speed-4k-plus.json` v2.10.9 — EasyNews 4K, davex preset (disabled by default)
- `Speed/EasyNews/core-nexus-speed-easynews.json` v2.10.9 — EasyNews 1080p, davex preset (disabled by default)

### AllDebrid
- `AllDebrid/core-nexus-4k-alldebrid.json` v0.4.9 — 4K with IQR PSEs, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `AllDebrid/core-nexus-4k-alldebrid-lite.json` v0.2.9 — 4K CB-style
- `AllDebrid/core-nexus-alldebrid.json` v0.2.9 — 1080p
- `AllDebrid/core-nexus-alldebrid-lite.json` v0.2.9 — 1080p lite

### Hybrid
- `Hybrid/core-nexus-4k-hybrid.json` v2.12.9 — TorBox + RD, service() priority PSEs, IQR, Score IQR Guard, elite group pins, perGroup() Extra Cached, dedup tiebreakers (after_addon), NZBGeek preset (disabled by default)
- `Hybrid/core-nexus-hybrid.json` v2.10.9 — 1080p hybrid, TorBox-priority twins (IQR), dedup tiebreakers (after_addon), NZBGeek preset (disabled by default)
- `Hybrid/core-nexus-hybrid-lite.json` v2.10.9 — TorBox-priority twins (CB-style), dedup tiebreakers (after_addon), NZBGeek preset (disabled by default)

### Device
- `Device/Samsung/core-nexus-samsung-tv.json` v0.3.8 — 1080p, DV-Only Kill on, AV1/VC-1 excluded, REPACK ISE + booster PSEs
- `Device/Samsung/core-nexus-samsung-tv-4k.json` v0.3.8 — 4K, DV-Only Kill on, AV1/VC-1 excluded, REPACK ISE + booster PSEs
- `Device/Samsung/core-nexus-samsung-ru7100-4k.json` v0.3.8 — RU7100 4K, full APEX IQR PSE stack, FLAC/AAC native audio, HDR10+/HLG (promoted from Nightly)
- `Device/Xiaomi/core-nexus-xiaomi-4k.json` v0.1.1 — Xiaomi Mi Box S 4K, DV Profile 5 + HDR10+ native, AV1/VC-1 excluded, lossless audio excluded (DD+ Atmos ceiling), handles REMUX
- `Device/Windows/core-nexus-ultrawide.json` v0.2.8 — Windows PC / ultrawide monitor, 1080p primary + 4K fallback, full lossless audio, HDR-first visual tags, 14-PSE stack

### Anime
- `Anime/core-nexus-anime-4k.json` v2.8.17 — 4K anime, SeaDex + AnimeTosho, cachedAnime/uncachedAnime sort
- `Anime/core-nexus-anime-4k-lite.json` v2.8.15 — cachedAnime/uncachedAnime sort
- `Anime/core-nexus-anime.json` v2.8.17 — 1080p anime, cachedAnime/uncachedAnime sort
- `Anime/core-nexus-anime-lite.json` v2.8.15 — cachedAnime/uncachedAnime sort
- `Anime/core-nexus-anime-dub.json` v2.8.17 — dubbed variant, cachedAnime/uncachedAnime sort
- `Anime/core-nexus-anime-dub-lite.json` v2.8.15 — cachedAnime/uncachedAnime sort

### Nightly (gitignored — force-add to commit)
- `Nightly/AppleTV/core-nexus-apple-tv-4k.json` v0.2.7 — DV Profile 5/8, AV1 excluded, SeaDex ISE, REPACK ISE
- `Nightly/Essential/core-nexus-4k-essential-labs.json` v0.5.0 — Essential 4K experimental, ESE v2.0 (Protect Library, SeaDex Duplicates, rseMatched tier guards, Low Quality filter), Bitrate Floor ESEs (4K+1080p REMUX, runtime-aware), perGroup() Extra Cached, anime language passthrough, subtitle PSE, cachedAnime/uncachedAnime sort, age sort key
- `Nightly/Essential/core-nexus-essential-labs.json` v0.4.0 — Essential 1080p experimental, ESE v2.0 (Protect Library, SeaDex Duplicates, Low Quality filter), perGroup() Extra Cached, anime language passthrough, subtitle PSE, cachedAnime/uncachedAnime sort, age sort key
- `Nightly/Single/core-nexus-4k-apex-labs.json` v0.14.0 — ESE v2.0 (Protect Library, SeaDex Duplicates, rseMatched tier guards, Low Quality filter), Score IQR Guard, perGroup() dedup, Indexer Diversity, Bad Dual Audio Groups, elite group pins, Bitrate Floor ESEs (4K+1080p REMUX, runtime-aware), anime language passthrough, latestSeason season pack kill, subtitle PSE, cachedAnime/uncachedAnime sort, age sort key
- `Nightly/Single/core-nexus-stream-labs.json` v0.10.0 — ESE v2.0 (Protect Library, SeaDex Duplicates, Low Quality filter), perGroup() prototypes, dynamicAddonFetching, StreamNZB preset, Bitrate Floor ESEs (1080p REMUX AV1 kill + 8Mbps floor, runtime-aware), anime language passthrough, subtitle PSE, cachedAnime/uncachedAnime sort, age sort key
- `Nightly/Single/core-nexus-all-rounder-labs.json` v0.4.0 — ESE v2.0 (Protect Library, SeaDex Duplicates, rseMatched tier guards, Low Quality filter), isAnime+hasSeaDex conditional PSEs, anime+live-action scrapers, anime language passthrough, subtitle PSE, cachedAnime/uncachedAnime sort, age sort key, all LABS features
- `Nightly/Anime/core-nexus-anime-4k-labs.json` v0.3.0 — ESE v2.0 (Protect Library, SeaDex Duplicates, rseMatched tier guards, Low Quality filter), Score IQR Guard, perGroup() dedup, Indexer Diversity, hasSeaDex conditional tiers, anime elite pins, anime language passthrough, subtitle PSE, cachedAnime/uncachedAnime sort, age sort key

---

## PSE Architecture

### IQR Tukey Fence Pattern (4K full templates)
```
/*LABEL*/
count(PEER_EXPR) >= 4
  ? size(bitrate(STREAMS, q1(values(bitrate(STREAMS,'5Mbps'),'bitrate')) - 1.5*iqr(values(...)), q3(...) + 1.5*iqr(...)), '15GB')
  : count(PEER_EXPR) > 0
    ? size(bitrate(STREAMS, min(values(...))*0.80, max(values(...))*1.20), '15GB')
    : (count(bitrate(STREAMS, MEDIAN*(1-0.4*pow(0.95,daysSinceRelease)), MEDIAN*(1+0.4*pow(0.95,daysSinceRelease)))) >= 1
        ? bitrate(STREAMS, MEDIAN*(1-0.4*pow(0.95,daysSinceRelease)))
        : [])
```

Three-tier adaptive:
- ≥4 peers → IQR Tukey fence (statistically sound)
- 1–3 peers → min/max ±20% (thin pool)
- 0 peers → pow() exponential decay window (replaces hard 60-day cliff)

### pow() Decay Window
`pow(0.95, daysSinceRelease)` produces smooth decay: ±40% day 0, ±9% day 30, ±2% day 60, ~0% day 90+.
Applied to: 4K Apex, 4K Apex TorBox, 4K Hybrid, 4K Essential, 4K AllDebrid.

### Hybrid TorBox-Priority Pattern
Each IQR tier has a TorBox-only twin PSE before it:
```
service(size(bitrate(STREAMS, IQR_LO, IQR_HI), '15GB'), 'torbox')
```
Returns `[]` if no TorBox streams match → falls through to the all-service PSE.

### ongoingSeason PSE (all active templates)
```
/*ongoingSeasonPack*/
((queryType=='series' or queryType=='anime.series') and ongoingSeason 
  and (daysSinceLastAired < -1 or daysUntilNextEpisode >= 0))
? seasonPack(streams, 'onlySeasons') : []
```

---

## Regex Scoring Architecture (v2.9.0)

### How elfhosted's whitelist works (definitive)

elfhosted's AIOStreams validates ALL regex fields against an allowlist built from Vidhin05's `English/regexes.json`. The check is **exact string equality on the `pattern` field value** — not on the name, not on syntax class.

**Whitelist source:** `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json` — 174 entries.

**fortheweak uses a different/stricter whitelist.** Patterns that pass elfhosted's Vidhin05 check may still be rejected on `streams-nightly.fortheweak.cloud`. As of v2.9.0, the following entries have been removed from all templates to ensure cross-host compatibility: `Radarr Web T1`, `Sonarr Web T1`, `Radarr Bad Dual Groups`, `Sonarr Bad Dual Groups`, `hallowed`, `LQ (Radarr)`, `LQ (Radarr) [B]`, `LQ (Sonarr)`, `LQ (Sonarr) [B]`, `LQ (Release Title) (Radarr)`, `LQ (Release Title) (Sonarr)` (ranked); LQ[B] large patterns + iVy-only (excluded). Do NOT re-add these without verifying on fortheweak first.

**Drift risk:** Vidhin05 updates their file (adding/removing groups). If elfhosted reports "X/N not allowed" after a Vidhin05 update, re-run the comparison script in `scripts/` and bump to the new strings.

### `preferredRegexPatterns`
Full `{name, pattern}` entries on all active non-Anime templates.
- **4K templates (7 entries):** Radarr Remux T1, Sonarr Remux T1, Radarr UHD Bluray T1, Radarr UHD Bluray T1 — DON, Anime BD T1, Anime BD T1 [sam], FraMeSToR
- **1080p templates (5 entries):** Web T1, 126811, FLUX, SiC, BHDStudio
- All `pattern` strings exactly match Vidhin05's entries.

### `rankedRegexPatterns` (restored v3.2.0)
Full `{name, pattern, score}` inline override entries on all active non-Anime templates. Sourced from `Filtering/ranked-regex-patterns.json`, filtered for host compatibility. These override Vidhin05's synced zero-score entries by name matching — AIOStreams shows them as `regexOverrides` in the config diff.
- **4K templates:** 107 entries (score tiers +100/+80/+60/+40/+20/−25/−50/−75/−200)
- **1080p templates:** 103 entries — same set minus the 4 UHD Bluray-specific names
- Every `pattern` string is an EXACT verbatim copy of a current Vidhin05 entry (elfhosted whitelist requirement); score-0 entries and the 11 fortheweak-removed names are excluded
- **v3.2.6 additions:** Anime BD T1/T2/T3 (main group lists — fills the gap where only `[B]` sub-variants were scored), `v0` (-25 pre-release penalty), `DV (Disk)` (+40 FraMeSToR DV provenance), `x266` (+20 VVC codec boost), `Uncensored` (+20 Uncut/AT-X)
- **Anime templates:** `[]`
- **Why inline:** elfhosted/fortheweak whitelist specific URLs for `syncedRankedRegexUrls` — our GitHub raw URL cannot be whitelisted, so the scored file must be delivered inline
- **History:** the override layer was silently lost during the v2.8.x slimming — between then and v3.2.0, `regexScore` in sortCriteria was a fleet-wide no-op (all 174 synced Vidhin05 entries carry score 0)

### `rseMatched()` tier strategy (LABS, v3.2.0)
Ranked regex entries double as **named matchers** via `rseMatched(streams, ...names)` — score-independent and elfhosted-safe. Used for:
- Tier-guarded kills: `Bad 4k Bluray` only fires when no `Radarr UHD Bluray T1-T3` / `Remux T1/T2` match exists
- `S+ Tier` micro-PSEs: T1-matched remuxes rank above generic remuxes (replaces the dead regexScore signal with live seScore)
- `T1 Pattern Pin`: pins pattern-verified elites beyond the hand-listed release groups
- Names must match the ranked set verbatim (`Radarr Remux T1`, not `Remux T1`) — the RU7100 originally shipped with German-locale names (`DE Bluray T1`, `BD T1`) which never matched, making its guards permanently pass (fixed v0.3.0)

### `excludedRegexPatterns`
**8 inline patterns per template** (was 11 — 3 LQ patterns removed in v2.9.0 for fortheweak compatibility). All remaining 8 strings appear verbatim in Vidhin05's `pattern` fields:
- Upscaled (AI) — plain ✓
- Extras (Radarr), Extras (Sonarr) — lookbehind patterns ✓
- LQ (Radarr) small `/\b(beAst|COLLECTiVE|EPiC|iVy|KiNGDOM|LUCY|Scene|SUNSCREEN)\b/` ✓
- Sing-Along Versions — lookbehind ✓
- BR-DISK — lookbehind+lookahead guard ✓
- Retags (Radarr), Retags (Sonarr) — plain ✓
- Hebrew/EZTV (Radarr), Hebrew/EZTV (Sonarr) — plain ✓

### `syncedRankedRegexUrls`
Points to Vidhin05's file on all non-Hybrid templates. Supplements ranked patterns with Vidhin05's 174-pattern set at score 0; our inline `rankedRegexPatterns` entries override scoring by name. Hybrid templates now also carry the Vidhin05 URL (added v3.2.0).

### `syncedExcludedRegexUrls`
Removed from all active templates. Previously pointed to a third-party excluded regex file that caused "Forbidden URL" errors on elfhosted due to allowlist drift. Excluded regex patterns are now handled entirely via inline `excludedRegexPatterns`.

---

## Template Collection & Trusted Access (v3.2.5)

### How AIOStreams whitelists synced URLs

AIOStreams uses `registerTrustedAccess()` (`packages/core/src/utils/templates.ts`) to auto-whitelist synced URLs. When an operator adds a template URL to their `TEMPLATE_URLS` env var, AIOStreams fetches the template at startup and whitelists all `synced*Urls` and inline regex patterns found inside it. This is how Core Builds gets its URLs whitelisted — operators add the template collection to `TEMPLATE_URLS`.

### Core Builds template collection

`core-builds-template-collection.json` at repo root. Contains 3 representative templates (4K Apex, Stream, Anime 4K) with all Core Builds synced URLs declared.

**Operator setup:** Add to `TEMPLATE_URLS`:
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/core-builds-template-collection.json
```

**URLs auto-whitelisted when added:**
- `Filtering/ranked-regex-patterns.json` — 107 scored regex patterns (via `syncedRankedRegexUrls`)
- `Filtering/core-builds-eses.json` — 83 ESEs, full fleet superset (via `syncedExcludedStreamExpressionUrls`)
- `Filtering/core-builds-ises.json` — 8 ISEs (via `syncedIncludedStreamExpressionUrls`)
- `Filtering/core-builds-pses.json` — 163 PSEs, all architectures (via `syncedPreferredStreamExpressionUrls`)
- Vidhin05's `regexes.json` (via `syncedRankedRegexUrls`, already whitelisted on most instances)

### AIOStreams trust mechanisms (3 levels)

1. **`TEMPLATE_URLS`** (template-level) — operator adds template URL → all synced URLs inside auto-whitelisted. This is what `core-builds-template-collection.json` targets.
2. **`TRUSTED_UUIDS`** (user-level) — operator adds user UUIDs → those users bypass all URL whitelists. Trust inherited by parent→child configs.
3. **Explicit whitelists** (URL-level) — `WHITELISTED_REGEX_PATTERNS_URLS`, `WHITELISTED_SEL_URLS` env vars for manual URL-by-URL allowlisting.

Access controlled by `REGEX_FILTER_ACCESS` (`none`/`trusted`/`all`, default `trusted`) and `SEL_SYNC_ACCESS` (`trusted`/`all`, default `trusted`).

---

## SEL Function Reference

### Confirmed available in AIOStreams SEL (packages/core/src/parser/streamExpression.ts)

**Stats:** `max`, `min`, `avg`, `mean`, `sum`, `percentile`, `q1`, `median`, `q2`, `q3`, `iqr`, `variance`, `stddev`, `range`, `mode`, `skewness`, `kurtosis`, `values`

**Stream filters:** `resolution`, `quality`, `encode`, `type`, `visualTag`, `audioTag`, `audioChannels`, `language`, `subtitle`, `subtitles`, `seeders`, `age`, `size`, `bitrate`, `service`, `cached`, `uncached`, `releaseGroup`, `seasonPack`, `multiEpisode`, `addon`, `library`, `seadex`, `message`, `passthrough`

**Match/score:** `seScore`, `streamExpressionScore`, `regexScore`, `regexMatched`, `regexMatchedInRange`, `keyword` (alias: `keywords`), `seMatched`, `seMatchedInRange`, `rseMatched`, `indexer`

**Array ops:** `count`, `negate`, `merge`, `slice`, `perGroup`, `pin`

**Math:** `pow`, `sqrt`, `floor`, `ceil`, `round`, `trunc`, `random` (from expr-eval)

### Key function details

**`pin(streams, position='top', returnMatched=false)`**
- Registers streams in a side-effect map; actual reordering happens post-evaluation
- Use in ESE context (returns `[]` so streams are not excluded):
  `pin(releaseGroup(streams, 'FraMeSToR'), 'top')`
- Use `returnMatched=true` in RSE context

**`seMatched(streams, ...seNames)`**
- Filters to streams whose `streamExpressionMatched.name` matches any given name
- No args → all streams matched by ANY named stream expression
- Use case: post-scoring filter to a specific named tier

**`seMatchedInRange(streams, min, max)`**
- Filters to streams matched by expression at index between min and max

**`keyword(streams, attribute, ...terms)`**
- `attribute`: `'filename'`, `'releaseGroup'`, `'all'`, etc.
- Returns streams where the attribute contains any of the terms
- `keyword(streams, 'filename', 'REPACK', 'PROPER')` for REPACK detection

**`audioChannels(streams, ...channels)`**
- Filter by channel count: `'5.1'`, `'7.1'`, etc.

**`indexer(streams, ...names)`**
- Filter by indexer/scraper name

### SEL Variables (available as bare names in expressions)

**Content metadata:**
`queryType` (`'movie'`, `'series'`, `'anime.movie'`, `'anime.series'`), `isAnime`, `title`, `year`, `yearEnd`, `season`, `episode`, `absoluteEpisode`, `genres`, `runtime`, `originalLanguage`, `hasSeaDex`

**Release timing:**
`daysSinceRelease`, `daysSinceFirstAired`, `daysSinceLastAired`, `daysUntilNextEpisode`, `hasNextEpisode`, `latestSeason`, `ongoingSeason`

**Dynamic addon fetching (exit condition only):**
`totalStreams`, `totalTimeTaken`, `queriedAddons`, `allAddons`

**Groups (group condition only):**
`previousStreams`, `previousGroupTimeTaken`

### NOT available in SEL (formatter DSL only)
`hasChapters`, `editions`, `regraded`, `date`, `dubbed`, `subbed` — these exist as `stream.X` in formatter DSL only, not as SEL variables in PSE/ESE/ISE expressions.

---

## Formatter Field Reference

All used via `{stream.fieldName::operator[...]}` in formatter `name`/`description` strings.

| Field | Type | Notes |
|---|---|---|
| `hasChapters` | boolean | `{stream.hasChapters::istrue["📖  "\|\|""]}` — BluRay REMUX chapter badge |
| `editions` | string[] | `{stream.editions::join(' · ')}` — Director's Cut, Extended, IMAX, etc. |
| `edition` | string | First edition only |
| `regraded` | boolean | `{stream.regraded::istrue["🔄 "\|\|""]}` — colour regrade flag |
| `repack` | boolean | `{stream.repack::istrue["🔁 REPACK"\|\|""]}` — REPACK/PROPER flag |
| `date` | string | Release date from filename |
| `dubbed` | boolean | Audio dubbed |
| `subbed` | boolean | Has subtitles |
| `uSubtitleEmojis` | string[] | Per-language subtitle flags (🇬🇧 🇫🇷 etc.) |
| `seMatched` | string | Name of the stream expression that matched this stream |
| `rseMatched` | string[] | Regex set expression tier(s) matched |
| `nSeScore` | number | Normalised stream expression score |
| `nRegexScore` | number | Normalised regex score |
| `folderSeasons` | string[] | Season folders in multi-season packs |
| `folderEpisodes` | string[] | Episode entries in folder-based releases |
| `preloading` | boolean | `{stream.preloading::istrue["⏳ "\|\|""]}` — pre-caching/preload indicator (v2.31.0) |

### Formatter String Modifiers (appended after `::`)

| Modifier | Effect |
|---|---|
| `smallcaps` | Renders text in small caps |
| `rsort` | Reverse-sort array before joining |
| `lsort` | Logical (natural) sort of array |
| `slice(start, end)` | Trim array to index range |
| `remove(val)` | Remove a value from array/string |
| `star` / `pstar` | Star/partial-star rating display |

---

## AIOStreams Parent/Child Config Linking (v2.28.0+)

Top-level field: `parentConfig`

```json
{
  "parentConfig": {
    "uuid": "parent-config-uuid",
    "password": "parent-config-password",
    "mergeStrategies": {
      "presets":   "inherit" | "extend" | "override",
      "services":  "inherit" | "extend" | "override",
      "filters":   "inherit" | "override",
      "sorting":   "inherit" | "override",
      "formatter": "inherit" | "override",
      "branding":  "inherit" | "override",
      "proxy":     "inherit" | "override",
      "metadata":  "inherit" | "override",
      "misc":      "inherit" | "override",
      "fieldOverrides": {
        "addonName": "override"
      }
    }
  }
}
```

- **Runtime resolution** — parent is fetched and merged on every `getUser()` call; only child is stored
- **`proxy`, `metadata`, `misc`** are also valid `mergeStrategies` keys (confirmed v2.30.x) — CLAUDE.md previously documented only 6 of 9 keys
- Minimum child: just `{ "parentConfig": { "uuid": "...", "password": "..." } }` (all sections inherit)
- `extend` (presets/services only) merges parent + child lists
- `fieldOverrides` overrides a single field while inheriting the rest
- Graceful fallback: if parent unreachable, child loads unmerged

---

## AIOStreams v2.31.0 Schema Notes

### `service()` SEL whitelist (v2.31.0)

The `service()` function now accepts 16 services (was 15). Changes:
- **Added:** `stremio_nntp` (native NNTP usenet), `aiostreams` (built-in usenet engine)
- **Removed:** `putio` (still valid in presets/config, just not usable in SEL `service()` expressions)

### Newznab preset: `seasonPackStrategy` (v2.31.0)

New option for Newznab/Torznab presets. Controls how series searches handle season packs:
- `'episodeOnly'` — default, search episodes only
- `'dynamic'` — season pack preferred
- `'episodeFirstSeasonPackFallback'` — try episode first, fall back to season pack
- `'seasonPackFirstEpisodeFallback'` — try season pack first, fall back to episode
Only applies when `searchMode` is `'auto'`. Not shown in simple mode.

### Newznab preset: `searchMode` (v2.31.0)

Replaces/extends old `forceQuerySearch`:
- `'auto'` — default, AIOStreams picks the best mode
- `'query'` — force query-based search
- `'both'` — creates two addon instances (one per mode)

### EasyNews Search: `apiVersion` (v2.31.0)

- `'3.0'` — default, 100 results/page, no rate limiting, parallel page fetching
- `'2.0'` — legacy, up to 250 results/page but rate-limited to 2 concurrent requests

### Deduplicator: `libraryBehaviour` (v2.31.0)

Controls how library items interact with deduplication:
- `'ignore'` — default, library items treated like any other stream
- `'prefer'` — library items preferred when deduplicating
- `'exclusive'` — only library items survive deduplication

### Deduplicator: `merge` (v2.31.0)

New boolean option. When enabled, allows adding deduplicated streams to the failover list instead of discarding them entirely.

### Formatter: `stream.preloading` (v2.31.0)

New boolean field. `true` when the stream has been selected for pre-caching/preloading. Usage: `{stream.preloading::istrue["⏳ "||""]}` to show a preload indicator.

---

## AIOStreams Server-Side Features (v2.31.0+)

These are server/operator features from the AIOStreams codebase — not template config fields, but important context for understanding what AIOStreams can do.

### Built-in Usenet Engine

AIOStreams now includes a full usenet streaming engine with:
- **Provider management** — add NNTP providers with connection pools, test connectivity, run speed tests
- **NZB library** — add NZBs by URL or upload, inspect/queue/stream/download, live SSE status updates
- **Performance profiles** — configurable engine tuning
- **Dashboard** — live stats (24h/7d/30d/all windows), active stream monitoring, provider health
- **Blocklist integration** — library entries cross-referenced against release blocklist (wd1 fingerprint + nh1 content hash)
- **Library statuses:** `queued`, `inspecting`, `available`, `degraded`, `failed`, `streaming`
- **Service IDs:** `stremio_nntp` (native NNTP), `aiostreams` (built-in engine)

### Release Blocklist

Collaborative release filtering system:
- **Local verdicts** — manually mark releases as blocked/allowed by key (btih, wd1 fingerprint, nh1 content hash)
- **Remote sources** — subscribe to blocklist URLs (NDJSON format), auto-refresh on schedule
- **Trust levels** — per-source trust (`full`, etc.), quorum voting across sources
- **Backbone grouping** — normalize release group identifiers for cross-source matching
- **Overrides** — local allow-overrides suppress remote block verdicts
- **Publishing** — push blocklist artifacts (native/warden NDJSON, gzipped) to external targets on a schedule
- **Import/export** — upload/download NDJSON blocklist files

### Debrid Failover Chains

Enhanced playback resolution with cascading fallbacks:
- **Play chains** — ordered list of fallback sources (debrid + usenet + external URLs)
- **Parallel resolution** — configurable concurrency (`parallel`), stagger delays, grace periods
- **Distributed locks** — share one running chain across concurrent requests for the same click
- **Proxy wrapping** — resolved CDN URLs auto-proxied when configured (fail-open on proxy error)
- **Static error videos** — DebridError codes map to static video files (UNAVAILABLE_FOR_LEGAL_REASONS, STORE_LIMIT_EXCEEDED, PAYMENT_REQUIRED, etc.)
- **External targets** — failover items can resolve via external URLs or internal playback targets

### Anime Database & Season Selector

Multi-source anime ID mapping and season/episode resolution:
- **Data sources:** Fribb mappings, Manami DB, Kitsu↔IMDB, Extended AniTrakt (movies+TV), Anime List XML, nattadasu/animeApi
- **Season scoring** — per-source priority: native coordinate system match (100) > cross-system (30) > synonym regex (55-60)
- **Kitsu IMDb-cour range** — interpolation (gap between known cours, priority 65) vs extrapolation (past last cour, priority 40)
- **Type filtering** — season-aware candidate selection: undefined→movies, 0→specials/OVA/ONA, ≥1→TV (with non-TV fallback)
- **ID types:** `imdbId`, `thetvdbId`, `themoviedbId`, `traktId` — each has a native season source for authoritative matching
- **Level of detail:** `none` (disabled), `required` (minimal), `full` (everything)

### Key Environment Variables (operator-facing)

**Auth & access:**
- `CONFIG_ACCESS_KEY` — gate for config create/update/serve (auto-generated when `AIOSTREAMS_AUTH_REQUIRED=true`)
- `AIOSTREAMS_AUTH_PERMISSIONS` — per-user: `admin`, `proxy`, `service`, `sabnzbd`, `none`
- `ALIASED_CONFIGURATIONS` — URL aliases for configs (`/stremio/u/<alias>/manifest.json`)
- `TRUSTED_IPS` — CIDR ranges for header trust

**APIs:**
- `ENABLE_SEARCH_API` — mount /api/v1/search endpoint (default: true)
- `ENABLE_NAB_API` — mount per-user Newznab/Torznab API endpoints for Prowlarr/Sonarr/Radarr integration (default: true)
- `PROVIDE_STREAM_DATA` — stream metadata in responses (auto-detect from User-Agent, or force true/false/IP list)

**Presets:**
- `DEFAULT_TIMEOUT` — fallback preset timeout: `7000`ms
- Per-preset: `{PRESET}_URL` (list), `DEFAULT_{PRESET}_TIMEOUT`, `DEFAULT_{PRESET}_USER_AGENT`
- `COMET_PUBLIC_API_TOKEN` — Comet public API tokens
- `MEDIAFUSION_API_PASSWORD`, `MEDIAFUSION_DEFAULT_USE_CACHED_RESULTS_ONLY`
- `DEFAULT_JACKETTIO_INDEXERS`, `DEFAULT_JACKETTIO_STREMTHRU_URL`

**Proxy:**
- `ENCRYPT_MEDIAFLOW_URLS`, `ENCRYPT_STREMTHRU_URLS` — URL encryption (default: true)
- `DEFAULT_PROXY_*` / `FORCE_PROXY_*` — default/forced proxy configuration
- `REQUEST_HEADER_OVERRIDES` — per-hostname/context User-Agent overrides with built-in presets (`{sabnzbd}`, `{chrome}`, etc.)
- `ADDON_PROXY` / `ADDON_PROXY_CONFIG` — outbound proxy for addon fetching

**Templates:**
- `TEMPLATE_URLS` — remote template URLs (Core Builds collection goes here)
- `TEMPLATE_REFRESH_INTERVAL` — refresh schedule (default: 24h)
- `FEATURED_TEMPLATE_IDS` — up to 2 featured templates on about page

**Services:**
- `DEFAULT_SERVICE_CREDENTIALS` — pre-filled credentials per `serviceId.credentialId=value`
- `FORCED_SERVICE_CREDENTIALS` — override user credentials, hidden from UI

### Stream Types (player.ts)

AIOStreams streams now have these types:
- `http` — standard HTTP stream (debrid-resolved CDN URLs)
- `usenet` — usenet-sourced stream (built-in engine or external)
- `debrid` — debrid-proxied stream
- `live` — live TV/IPTV stream
- `info` — informational (no playback)
- `p2p` — torrent/P2P stream (magnet link + infoHash)

---

## AIOStreams v2.30.x Schema Notes

### `config.deduplicator.tiebreakers` (v2.30.3)
Controls whether seeder count / usenet age takes precedence before or after addon priority when scores are tied:
```json
"tiebreakers": [
  { "type": "torrent_seeders", "position": "before_addon" },
  { "type": "usenet_age",      "position": "before_addon" }
]
```
- `position`: `"before_addon"` (seeder/age beats addon order) or `"after_addon"` (addon order wins)
- Omitting the field defaults to both at `before_addon`
- Core Builds templates currently omit this field (inheriting the default)

### `VC-1` encode tag
Now a valid value in `encode()` SEL expressions and `excludedEncodes`. Samsung templates already exclude AV1 and VC-1 — the tag is formally available if needed elsewhere.

### Granular `sortCriteria` keys
Beyond `global`/`movies`/`series`/`anime`, these per-type × cached/uncached keys are also valid:
`cachedMovies`, `uncachedMovies`, `cachedSeries`, `uncachedSeries`, `cachedAnime`, `uncachedAnime`

### Sort criteria architecture (v3.2.4)
AIOStreams uses a **stable multi-key sort** — position 1 is the primary sort; each subsequent key only breaks ties from prior comparisons. Keys at position 10+ rarely influence results.

**Available keys (25):** `cached`, `streamExpressionMatched`, `streamExpressionScore`, `seadex`, `resolution`, `quality`, `regexScore`, `visualTag`, `audioTag`, `audioChannel`, `language`, `encode`, `library`, `seeders`, `bitrate`, `size`, `service`, `addon`, `keyword`, `streamType`, `private`, `age`, `subtitle`, `regexPatterns`, `releaseGroup`

**⚠ `audioChannel` upstream bug (v2.31.0):** The key is accepted in the config schema (`SORT_CRITERIA` constant) and used by the frontend, but the sorter (`sorter.ts`) has no `case 'audioChannel':` handler — it falls through to `default: return 0`, making it a **fleet-wide no-op**. All 60+ Core Builds templates include this key at position ~10. It will start working once the upstream bug is fixed. Do NOT remove it from templates.

**Core Builds uses 16 keys** (17 for Hybrid). Sections per template: `global`, `movies`, `series`, `anime`, `cachedMovies`, `uncachedMovies`, `uncachedSeries`.

**4K global sort (16 keys):**
`cached → seMatched → seScore → seadex → resolution → quality → regexScore → visualTag → audioTag → audioChannel → language → encode → library → seeders → bitrate → size`

**1080p global sort (16 keys):**
`cached → seMatched → seScore → seadex → resolution → quality → regexScore → audioTag → audioChannel → language → visualTag → encode → library → seeders → bitrate → size`
(visualTag lower — HDR less relevant at 1080p)

**Per-type sort (movies/series/cachedMovies — 16 keys):**
`cached → seMatched → seScore → seadex → library → resolution → quality → regexScore → visualTag → encode → audioTag → audioChannel → language → seeders → bitrate → size`

**Uncached sort (uncachedMovies/uncachedSeries — seeders promoted):**
`cached → seMatched → seScore → seadex → library → resolution → quality → regexScore → visualTag → encode → seeders → audioTag → audioChannel → language → bitrate → size`

**Anime sort (all sections — seadex at position 2):**
`cached → seadex → seMatched → seScore → [library →] resolution → quality → regexScore → visualTag → encode → audioTag → audioChannel → language → seeders → bitrate → size`

**Hybrid sort (adds `service` after `seadex` — 17 keys):**
Same structure but with `service` key after `seadex` for debrid provider priority (TorBox-first)

---

## Conventions

- **Version schemes:** Configurator uses `MAJOR.MINOR` (e.g. 2.82). Template suite uses semver `MAJOR.MINOR.PATCH` (e.g. 3.3.2). Template JSONs use their own version scheme (e.g. v2.10.8).
- **PSE labels:** `/* TEMPLATE_LABEL Tier Description */` e.g. `/* APEX S-Tier 4K Remux — IQR Tukey fence */`
- **ESE labels:** `/* Description */` plain English
- **1080p templates MUST have** a hard resolution exclusion ESE: `resolution(streams, '2160p', '1440p')` to prevent 4K leaking through (PSEs rank but do not exclude)
- **Samsung templates:** DV-Only Kill ESE enabled by default; `excludedAudioTags: ["TrueHD","DTS-HD MA","DTS:X","FLAC"]`
- **Xiaomi templates:** DV-Only Kill disabled (DV Profile 5 native); AV1/VC-1 excluded; lossless audio excluded (DD+ Atmos ceiling); DV added to preferredVisualTags
- **AllDebrid templates:** `stremthruStore` replaces `stremthruTorz`; no `torbox-search`

---

## Links

- Canonical repo: https://github.com/brevityA/Core-Builds
- Live site: https://brevitya.github.io/Core-Builds/configurator/
- Tools page: https://brevitya.github.io/Core-Builds/tools/
- Account tools: https://brevitya.github.io/Core-Builds/account-tools/
- Docs: https://core-builds.mintlify.app/
- Reddit (Core Crew): https://www.reddit.com/r/CoreBuilds/
- AIOStreams: https://github.com/Viren070/AIOStreams
- AIOStreams docs: https://docs.aiostreams.viren070.me
