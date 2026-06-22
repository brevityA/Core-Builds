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
  Nightly/          → Pre-release / nightly builds (Apple TV 4K)
  Deprecated/       → Retired templates kept for reference
Templates/Personal/ → Personal/experimental templates (core-cipher) — do not document
Templates/Deprecated/ → Retired non-Torbox templates
Community-Templates/ → Community-contributed templates (MightyIcyy, RB3)
Formatters/         → 14 custom stream layout formatters
Filtering/          → Shared filter expression files (ESEs, ISEs, PSEs)
Regex/              → Excluded regex pattern lists
Assets/             → Banners, icons, formatter preview images
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

## Active Template Inventory (as of v2.9.5)

### Single (TorBox Pro)
- `Single/core-nexus-4k-apex.json` v0.4.16 — flagship 4K, IQR PSEs, pow() decay, 5s dynamic fetching cap
- `Single/core-nexus-4k-apex-torbox.json` v2.9.4 — TorBox-cached-only Apex variant
- `Single/core-nexus-stream.json` v2.9.6 — 1080p streaming quality, 720p fallback
- `Single/core-nexus-stream-lite.json` v2.9.3 — lite variant
- `Single/core-nexus-stream-firestick.json` v2.9.5 — Fire Stick optimised
- `Single/core-nexus-stream-firestick-lite.json` v2.9.3

### Essential (TorBox Essential)
- `Essential/core-nexus-4k-essential.json` v2.9.4 — 4K with IQR PSEs, pow() decay
- `Essential/core-nexus-4k-essential-lite.json` v2.9.3 — CB-style PSEs
- `Essential/core-nexus-essential.json` v2.9.5 — 1080p
- `Essential/core-nexus-essential-lite.json` v2.9.3

### Flash
- `Flash/core-nexus-flash-4k.json` v2.9.2 — cached-only 4K instant play
- `Flash/core-nexus-flash.json` v2.9.3 — cached-only 1080p instant play

### Speed (TorBox)
- `Speed/TorBox/core-nexus-speed-4k.json` v2.9.1 — fast cached 4K
- `Speed/TorBox/core-nexus-speed-4k-lite.json` v2.9.1
- `Speed/TorBox/core-nexus-speed.json` v2.9.1 — fast cached 1080p
- `Speed/TorBox/core-nexus-speed-lite.json` v2.9.1

### Speed (EasyNews)
- `Speed/EasyNews/core-nexus-speed-4k-plus.json` v2.9.2 — EasyNews 4K
- `Speed/EasyNews/core-nexus-speed-easynews.json` v2.9.3 — EasyNews 1080p

### AllDebrid
- `AllDebrid/core-nexus-4k-alldebrid.json` v0.1.12 — 4K with IQR PSEs
- `AllDebrid/core-nexus-4k-alldebrid-lite.json` v0.1.9 — 4K CB-style
- `AllDebrid/core-nexus-alldebrid.json` v0.1.12 — 1080p
- `AllDebrid/core-nexus-alldebrid-lite.json` v0.1.11 — 1080p lite

### Hybrid
- `Hybrid/core-nexus-4k-hybrid.json` v2.9.5 — TorBox + RD, service() priority PSEs, IQR, NZBGeek preset
- `Hybrid/core-nexus-hybrid.json` v2.9.6 — 1080p hybrid, TorBox-priority twins (IQR), NZBGeek preset
- `Hybrid/core-nexus-hybrid-lite.json` v2.9.6 — TorBox-priority twins (CB-style), NZBGeek preset

### Device
- `Device/Samsung/core-nexus-samsung-tv.json` v0.2.13 — 1080p, DV-Only Kill on, AV1/VC-1 excluded
- `Device/Samsung/core-nexus-samsung-tv-4k.json` v0.2.13 — 4K, DV-Only Kill on, AV1/VC-1 excluded, simple quality-tier PSEs
- `Device/Samsung/core-nexus-samsung-ru7100-4k.json` v0.2.16 — RU7100 4K, full APEX IQR PSE stack, FLAC/AAC native audio, HDR10+/HLG (promoted from Nightly)

### Anime
- `Anime/core-nexus-anime-4k.json` v2.8.8 — 4K anime, SeaDex + AnimeTosho
- `Anime/core-nexus-anime-4k-lite.json` v2.8.6
- `Anime/core-nexus-anime.json` v2.8.8 — 1080p anime
- `Anime/core-nexus-anime-lite.json` v2.8.6
- `Anime/core-nexus-anime-dub.json` v2.8.8 — dubbed variant
- `Anime/core-nexus-anime-dub-lite.json` v2.8.6

### Nightly (gitignored — force-add to commit)
- `Nightly/AppleTV/core-nexus-apple-tv-4k.json` v0.1.9 — DV Profile 5/8, AV1 excluded
- `Nightly/Essential/core-nexus-4k-essential-labs.json` v0.1.7 — Essential 4K experimental
- `Nightly/Essential/core-nexus-essential-labs.json` v0.1.7 — Essential 1080p experimental
- `Nightly/Single/core-nexus-4k-apex-labs.json` v0.8.6 — perGroup() prototypes, dynamicAddonFetching, releaseGroup() ESEs
- `Nightly/Single/core-nexus-stream-labs.json` v0.6.7 — perGroup() prototypes, dynamicAddonFetching

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

### `rankedRegexPatterns`
Full `{name, pattern, score}` entries on all active non-Anime templates.
- **4K templates:** 37 entries — Remux T2, Bluray T1/T2 variants, group scores (126811/FLUX/SiC +80, BHDStudio +60, TheFarm +80), negative scores for extras/3D/obfuscated/retags/BR-DISK/sing-along/atmos/truehd
- **1080p templates:** 37 entries — same set minus 4K-specific UHD Bluray variants
- **`[B]` variants:** use Vidhin05's SECOND entry pattern for that name. Pattern must be an EXACT verbatim copy from Vidhin05.
- **Anime templates:** `[]`

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
Points to Vidhin05's file on all non-Hybrid templates. Supplements ranked patterns with Vidhin05's 174-pattern set at score 0; our inline entries override scoring by name.

### `syncedExcludedRegexUrls`
Points to Tamtaro's file on all active templates. This URL is on elfhosted's URL whitelist.

---

## SEL Function Reference

### Confirmed available in AIOStreams SEL (packages/core/src/parser/streamExpression.ts)

**Stats:** `max`, `min`, `avg`, `mean`, `sum`, `percentile`, `q1`, `median`, `q2`, `q3`, `iqr`, `variance`, `stddev`, `range`, `mode`, `skewness`, `kurtosis`, `values`

**Stream filters:** `resolution`, `quality`, `encode`, `type`, `visualTag`, `audioTag`, `audioChannels`, `language`, `subtitle`, `subtitles`, `seeders`, `age`, `size`, `bitrate`, `service`, `cached`, `uncached`, `releaseGroup`, `seasonPack`, `multiEpisode`, `addon`, `library`, `seadex`, `message`, `passthrough`

**Match/score:** `seScore`, `streamExpressionScore`, `regexScore`, `regexMatched`, `regexMatchedInRange`, `keyword` (alias: `keywords`), `seMatched`, `seMatchedInRange`, `rseMatched`, `indexer`

**Array ops:** `count`, `negate`, `merge`, `slice`, `perGroup`, `pin`

**Math:** `pow`, `sqrt`, `random` (from expr-eval)

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
