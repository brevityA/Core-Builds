# Core Builds — Claude Context

This is **brevityA/Core-Builds**, a backup mirror of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity).

---

## Workflow Rules

- **Create a new PR for every task.** After committing and pushing changes, always open a pull request — even for small or experimental changes.

---

## What This Repo Is

A collection of optimised AIOStreams templates for TorBox subscribers. Templates control how streams are filtered, sorted, deduplicated, and formatted inside [AIOStreams](https://github.com/Viren070/AIOStreams).

---

## Repo Structure

```
Templates/Torbox/
  Single/           → TorBox Pro templates (4K Apex, Stream + Lite variants)
  Essential/        → TorBox Essential templates (4K Essential, Essential + Lite variants)
  Flash/            → Cached-only instant play (Flash, Flash 4K)
  Speed/TorBox/     → Fast cached play (Speed 4K, Speed + Lite variants)
  Speed/EasyNews/   → EasyNews dual-source variants (Speed, Speed 4K + Lite variants)
  Anime/            → Anime-optimised templates (Anime, Anime 4K + Lite variants)
  Hybrid/           → TorBox + RD hybrid templates (4K Hybrid, Hybrid, Hybrid Lite)
  AllDebrid/        → AllDebrid variants (4K AllDebrid, AllDebrid + Lite variants)
  Device/Samsung/   → Samsung TV device templates (Samsung TV, Samsung TV 4K)
  Device/Windows/   → Windows PC device templates (Ultrawide)
  Nightly/          → Pre-release / nightly builds (Apple TV 4K)
  Deprecated/       → Retired templates kept for reference
Templates/Personal/ → Personal/experimental templates (core-cipher) — do not document
Templates/Deprecated/ → Retired non-Torbox templates
Community-Templates/ → Community-contributed templates (MightyIcyy, RB3)
Formatters/         → 14 custom stream layout formatters
Filtering/          → Shared filter expression files (ESEs, ISEs, PSEs, ranked regex)
Regex/              → Excluded regex pattern lists
Assets/             → Banners, icons, formatter preview images
core-builds-template-collection.json → Operator template catalog for TEMPLATE_URLS
Guides/             → Import guide, troubleshooting, device profiles, FAQ
tests/              → pytest test suite (template validation, integration)
.github/            → Workflows, issue templates, discussion templates
scripts/            → One-off maintenance scripts (not imported by templates)
```

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

Preset `type` values confirmed in AIOStreams source (as of v2.30.x):

**Debrid/service:** `stremthruTorz`, `stremthruStore`, `torbox-search`, `sootio`, `peerflix`
- `torbox` — **DEPRECATED** (removed/disabled v2.30.2); use `torbox-search`

**Scrapers:** `comet`, `mediafusion`, `jackettio`, `prowlarr`, `knaben`, `torrentio`, `debridio`, `meteor`, `torrent-galaxy`, `zilean`, `hdhub`, `eztv`, `torrents-db`, `streamfusion`, `baguettio`, `flix-streams`, `brazuca-torrents`, `yastream`, `bitmagnet`, `dmm-cast`, `torznab`, `webstreamr`, `nuvio-streams`, `ai-search`

**HTTP stream / direct-play:** `webstreamr` (multi-language HTTP streams from streaming sites), `nuvio-streams` (Showbox/VidSrc/VidZee), `flix-streams` (50+ provider aggregator, paid tier)

**Google Drive / personal media:** `stremio-gdrive` (Google Drive integration, builtin — requires OAuth setup)
- `orion` — Orionoid aggregator; **TorBox deliberately excluded** from supported services
- `annatar` — **does not exist** in current codebase (no preset file); remove from any config
- `mediafusion-public` — not a separate preset file; likely a config option on `mediafusion`, not a distinct type
- `torrentio` — TorBox supported but **blocked on elfhosted public instance** by developer request; unstable hosting (March 2026 suspension)

**Usenet:** `newznab`, `easynews`, `easynews-plus`, `easynews-plus-plus`, `easynews-search`, `streamnzb`, `usenet-streamer`, `nzbhydra`

**Anime-specific:** `seadex`, `animetosho`, `neko-bt`, `yastream`, `astream`, `fkstream`

**Subtitles:** `opensubtitles-v3-plus`, `aiosubtitle`, `subdl`, `subsource`, `subhero`

**System:** `library` (continue watching / user library), `custom`, `aiostreams` (self-reference/chaining)

**Per-Addon Flood Guard caps (current — v2.9.5):**
Meteor ≤ 5, Comet RD ≤ 5, MediaFusion ≤ 4, EZTV ≤ 3, HdHub ≤ 3, Torrent Galaxy ≤ 1 (backup), Knaben ≤ 1 (backup), TorrentsDB ≤ 1 (backup)

---

## Active Template Inventory (as of v3.2.4)

### Single (TorBox Pro)
- `Single/core-nexus-4k-apex.json` v0.7.5 — flagship 4K, IQR PSEs, pow() decay, 5s dynamic fetching cap, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `Single/core-nexus-4k-apex-torbox.json` v2.12.4 — TorBox-cached-only Apex variant, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `Single/core-nexus-stream.json` v2.10.4 — 1080p streaming quality, 720p fallback
- `Single/core-nexus-stream-lite.json` v2.10.4 — lite variant
- `Single/core-nexus-stream-firestick.json` v2.10.4 — Fire Stick optimised
- `Single/core-nexus-stream-firestick-lite.json` v2.10.4

### Essential (TorBox Essential)
- `Essential/core-nexus-4k-essential.json` v2.12.4 — 4K with IQR PSEs, pow() decay, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `Essential/core-nexus-4k-essential-lite.json` v2.10.4 — CB-style PSEs
- `Essential/core-nexus-essential.json` v2.10.4 — 1080p
- `Essential/core-nexus-essential-lite.json` v2.10.4

### Flash
- `Flash/core-nexus-flash-4k.json` v2.10.4 — cached-only 4K instant play
- `Flash/core-nexus-flash.json` v2.10.4 — cached-only 1080p instant play

### Speed (TorBox)
- `Speed/TorBox/core-nexus-speed-4k.json` v2.10.4 — fast cached 4K
- `Speed/TorBox/core-nexus-speed-4k-lite.json` v2.10.4
- `Speed/TorBox/core-nexus-speed.json` v2.10.4 — fast cached 1080p
- `Speed/TorBox/core-nexus-speed-lite.json` v2.10.4

### Speed (EasyNews)
- `Speed/EasyNews/core-nexus-speed-4k-plus.json` v2.10.4 — EasyNews 4K
- `Speed/EasyNews/core-nexus-speed-easynews.json` v2.10.4 — EasyNews 1080p

### AllDebrid
- `AllDebrid/core-nexus-4k-alldebrid.json` v0.4.4 — 4K with IQR PSEs, Score IQR Guard, elite group pins, perGroup() Extra Cached
- `AllDebrid/core-nexus-4k-alldebrid-lite.json` v0.2.4 — 4K CB-style
- `AllDebrid/core-nexus-alldebrid.json` v0.2.4 — 1080p
- `AllDebrid/core-nexus-alldebrid-lite.json` v0.2.4 — 1080p lite

### Hybrid
- `Hybrid/core-nexus-4k-hybrid.json` v2.12.4 — TorBox + RD, service() priority PSEs, IQR, Score IQR Guard, elite group pins, perGroup() Extra Cached, NZBGeek preset (disabled by default)
- `Hybrid/core-nexus-hybrid.json` v2.10.4 — 1080p hybrid, TorBox-priority twins (IQR), NZBGeek preset (disabled by default)
- `Hybrid/core-nexus-hybrid-lite.json` v2.10.4 — TorBox-priority twins (CB-style), NZBGeek preset (disabled by default)

### Device
- `Device/Samsung/core-nexus-samsung-tv.json` v0.3.4 — 1080p, DV-Only Kill on, AV1/VC-1 excluded, REPACK ISE + booster PSEs
- `Device/Samsung/core-nexus-samsung-tv-4k.json` v0.3.4 — 4K, DV-Only Kill on, AV1/VC-1 excluded, REPACK ISE + booster PSEs
- `Device/Samsung/core-nexus-samsung-ru7100-4k.json` v0.3.4 — RU7100 4K, full APEX IQR PSE stack, FLAC/AAC native audio, HDR10+/HLG (promoted from Nightly)
- `Device/Windows/core-nexus-ultrawide.json` v0.2.4 — Windows PC / ultrawide monitor, 1080p primary + 4K fallback, full lossless audio, HDR-first visual tags, 14-PSE stack

### Anime
- `Anime/core-nexus-anime-4k.json` v2.8.11 — 4K anime, SeaDex + AnimeTosho
- `Anime/core-nexus-anime-4k-lite.json` v2.8.9
- `Anime/core-nexus-anime.json` v2.8.11 — 1080p anime
- `Anime/core-nexus-anime-lite.json` v2.8.9
- `Anime/core-nexus-anime-dub.json` v2.8.11 — dubbed variant
- `Anime/core-nexus-anime-dub-lite.json` v2.8.9

### Nightly (gitignored — force-add to commit)
- `Nightly/AppleTV/core-nexus-apple-tv-4k.json` v0.2.4 — DV Profile 5/8, AV1 excluded, SeaDex ISE, REPACK ISE
- `Nightly/Essential/core-nexus-4k-essential-labs.json` v0.3.4 — Essential 4K experimental, Bitrate Floor ESEs (4K+1080p REMUX), perGroup() Extra Cached, configurable daf thresholds at import
- `Nightly/Essential/core-nexus-essential-labs.json` v0.2.4 — Essential 1080p experimental, perGroup() Extra Cached, configurable daf thresholds at import
- `Nightly/Single/core-nexus-4k-apex-labs.json` v0.11.4 — Score IQR Guard, perGroup() dedup, Indexer Diversity, Bad Dual Audio Groups, elite group pins, Bitrate Floor ESEs (4K+1080p REMUX)
- `Nightly/Single/core-nexus-stream-labs.json` v0.8.4 — perGroup() prototypes, dynamicAddonFetching, StreamNZB preset, Bitrate Floor ESEs (1080p REMUX AV1 kill + 8Mbps floor)
- `Nightly/Single/core-nexus-all-rounder-labs.json` v0.2.4 — isAnime+hasSeaDex conditional PSEs, anime+live-action scrapers, all LABS features
- `Nightly/Anime/core-nexus-anime-4k-labs.json` v0.1.3 — Score IQR Guard, perGroup() dedup, Indexer Diversity, hasSeaDex conditional tiers, anime elite pins

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
- **4K templates:** 100 entries (score tiers +100/+80/+60/+40/+20/−25/−50/−75/−200)
- **1080p templates:** 96 entries — same set minus the 4 UHD Bluray-specific names
- Every `pattern` string is an EXACT verbatim copy of a current Vidhin05 entry (elfhosted whitelist requirement); score-0 entries and the 11 fortheweak-removed names are excluded; `Anime BD T1/T2/T3` excluded (pattern drift vs current Vidhin05)
- **Anime templates:** `[]`
- **Why inline:** elfhosted/fortheweak whitelist specific URLs for `syncedRankedRegexUrls` — our GitHub raw URL cannot be whitelisted, so the scored file must be delivered inline
- **History:** the override layer was silently lost during the v2.8.x slimming — between then and v3.2.0, `regexScore` in sortCriteria was a fleet-wide no-op (all 174 synced Vidhin05 entries carry score 0)

### `rseMatched()` tier strategy (LABS, v3.2.0)
Ranked regex entries double as **named matchers** via `rseMatched(streams, ...names)` — score-independent and elfhosted-safe. Used for:
- Tier-guarded kills: `Bad 4k Bluray` only fires when no `Radarr UHD Bluray T1-T3` / `Remux T1/T2` match exists
- `S+ Tier` micro-PSEs: T1-matched remuxes rank above generic remuxes (replaces the dead regexScore signal with live seScore)
- `T1 Pattern Pin`: pins pattern-verified elites beyond the hand-listed release groups
- Names must match the ranked set verbatim (`Radarr Remux T1`, not `Remux T1`) — the RU7100 shipped with Tamtaro's German names (`DE Bluray T1`, `BD T1`) which never matched, making its guards permanently pass (fixed v0.3.0)

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
Points to Tamtaro's excluded regex file at `Tam-Taro/SEL-Filtering-and-Sorting` on all active templates. **Note:** Tamtaro renamed their GitHub account from `Tamtaro` → `Tam-Taro`; the old URL 404s. The new `Tam-Taro` URL works (200) but elfhosted's allowlist has not been updated — users on elfhosted get "Forbidden URL" errors on import until elfhosted ships an allowlist update. Same applies to `syncedIncludedStreamExpressionUrls` (ISEs) and `syncedPreferredStreamExpressionUrls` (PSEs).

---

## Template Collection & Trusted Access (v3.2.5)

### How AIOStreams whitelists synced URLs

AIOStreams uses `registerTrustedAccess()` (`packages/core/src/utils/templates.ts`) to auto-whitelist synced URLs. When an operator adds a template URL to their `TEMPLATE_URLS` env var, AIOStreams fetches the template at startup and whitelists all `synced*Urls` and inline regex patterns found inside it. This is how Tam-Taro gets their URLs whitelisted — operators add their template collection to `TEMPLATE_URLS`.

### Core Builds template collection

`core-builds-template-collection.json` at repo root. Contains 3 representative templates (4K Apex, Stream, Anime 4K) with all Core Builds synced URLs declared.

**Operator setup:** Add to `TEMPLATE_URLS`:
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/core-builds-template-collection.json
```

**URLs auto-whitelisted when added:**
- `Filtering/ranked-regex-patterns.json` — 149 scored regex patterns (via `syncedRankedRegexUrls`)
- `Filtering/core-builds-eses.json` — shared ESEs (via `syncedExcludedStreamExpressionUrls`)
- `Filtering/core-builds-ises.json` — shared ISEs (via `syncedIncludedStreamExpressionUrls`)
- `Filtering/core-builds-pses.json` — shared PSEs (via `syncedPreferredStreamExpressionUrls`)
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

**Planned use:** "Core Builds Base" parent config holding all presets (with tuned timeouts), ESEs, ISEs, sort criteria, and formatter. Child templates specify only PSEs and branding. One change propagates to all 46 templates instantly.

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

## Formatters

All formatters use `id: "tamtaro"` with `definitions.overrides['tamtaro']`. Import via AIOStreams → Formatter → Import icon → paste raw URL.

Active formatters: `core-nexus-apex-v2-formatter.json`, `core-nexus-elite-formatter.json`, `nexus-prime-formatter.json` (+ 11 others)

---

## Conventions

- **Version scheme:** `MAJOR.MINOR.PATCH` — minor bump for new features/PSE logic changes, patch for fixes
- **PSE labels:** `/* TEMPLATE_LABEL Tier Description */` e.g. `/* APEX S-Tier 4K Remux — IQR Tukey fence */`
- **ESE labels:** `/* Description */` plain English
- **1080p templates MUST have** a hard resolution exclusion ESE: `resolution(streams, '2160p', '1440p')` to prevent 4K leaking through (PSEs rank but do not exclude)
- **Samsung templates:** DV-Only Kill ESE enabled by default; `excludedAudioTags: ["TrueHD","DTS-HD MA","DTS:X","FLAC"]`
- **AllDebrid templates:** `stremthruStore` replaces `stremthruTorz`; no `torbox-search`

---

## Security

Real API keys must NEVER be committed. Personal templates are in `Templates/Personal/` — do not document or expose.

---

## Links

- Main repo: https://github.com/Branding-Brevity/Core-Builds-By-Brevity
- AIOStreams: https://github.com/Viren070/AIOStreams
- AIOStreams docs: https://docs.aiostreams.viren070.me
- Offline archive: https://mega.nz/folder/DvQGwYYJ#eAnBsID9nc4Nkr8eQfZ2Lg
