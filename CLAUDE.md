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
- `syncedRankedRegexUrls` is **blocked on public instances** (elfhosted, fortheweak.cloud) — do not use; embed patterns inline in `rankedRegexPatterns` instead

## Known Preset Types

Preset `type` values confirmed in AIOStreams source:

**Debrid/service:** `stremthruTorz`, `stremthruStore`, `torrent-io`, `torbox`, `torbox-search`

**Scrapers:** `comet`, `mediafusion`, `mediafusion-public`, `jackettio`, `prowlarr`, `orionoid`, `annatar`, `knaben`, `torrentio`, `debridio`, `meteor`, `torrent-galaxy`, `zilean`, `hdhub`, `eztv`

**Usenet:** `newznab`, `easynews`, `easynews-plus`

**Anime-specific:** `seadex`, `animetosho`, `neko-bt`

**Subtitles:** `opensubtitles-v3-plus`, `aiosubtitle`

**System:** `library` (continue watching / user library), `custom`

---

## Active Template Inventory (as of v2.8.6)

### Single (TorBox Pro)
- `Single/core-nexus-4k-apex.json` v0.4.7 — flagship 4K, IQR PSEs, pow() decay
- `Single/core-nexus-4k-apex-torbox.json` v2.8.6 — TorBox-cached-only Apex variant
- `Single/core-nexus-stream.json` v2.8.5 — 1080p streaming quality
- `Single/core-nexus-stream-lite.json` v2.8.5 — lite variant
- `Single/core-nexus-stream-firestick.json` v2.8.5 — Fire Stick optimised
- `Single/core-nexus-stream-firestick-lite.json` v2.8.5

### Essential (TorBox Essential)
- `Essential/core-nexus-4k-essential.json` v2.8.5 — 4K with IQR PSEs, pow() decay
- `Essential/core-nexus-4k-essential-lite.json` v2.8.5 — CB-style PSEs
- `Essential/core-nexus-essential.json` v2.8.5 — 1080p
- `Essential/core-nexus-essential-lite.json` v2.8.5

### Flash
- `Flash/core-nexus-flash-4k.json` v2.8.5 — cached-only 4K instant play
- `Flash/core-nexus-flash.json` v2.8.5 — cached-only 1080p instant play

### Speed (TorBox)
- `Speed/TorBox/core-nexus-speed-4k.json` v2.8.5 — fast cached 4K
- `Speed/TorBox/core-nexus-speed-4k-lite.json` v2.8.5
- `Speed/TorBox/core-nexus-speed.json` v2.8.5 — fast cached 1080p
- `Speed/TorBox/core-nexus-speed-lite.json` v2.8.5

### Speed (EasyNews)
- `Speed/EasyNews/core-nexus-speed-4k-plus.json` v2.8.4 — EasyNews 4K
- `Speed/EasyNews/core-nexus-speed-easynews.json` v2.8.4 — EasyNews 1080p

### AllDebrid
- `AllDebrid/core-nexus-4k-alldebrid.json` v0.1.3 — 4K with IQR PSEs
- `AllDebrid/core-nexus-4k-alldebrid-lite.json` v0.1.1 — 4K CB-style
- `AllDebrid/core-nexus-alldebrid.json` v0.1.2 — 1080p
- `AllDebrid/core-nexus-alldebrid-lite.json` v0.1.2 — 1080p lite

### Hybrid
- `Hybrid/core-nexus-4k-hybrid.json` v2.8.6 — TorBox + RD, service() priority PSEs, IQR, NZBGeek preset
- `Hybrid/core-nexus-hybrid.json` v2.8.6 — 1080p hybrid, NZBGeek preset
- `Hybrid/core-nexus-hybrid-lite.json` v2.8.6 — NZBGeek preset

### Device
- `Device/Samsung/core-nexus-samsung-tv.json` v0.2.4 — 1080p, DV-Only Kill on, AV1/VC-1 excluded
- `Device/Samsung/core-nexus-samsung-tv-4k.json` v0.2.4 — 4K, DV-Only Kill on, AV1/VC-1 excluded

### Anime
- `Anime/core-nexus-anime-4k.json` v2.8.3 — 4K anime, SeaDex + AnimeTosho
- `Anime/core-nexus-anime-4k-lite.json` v2.8.3
- `Anime/core-nexus-anime.json` v2.8.3 — 1080p anime
- `Anime/core-nexus-anime-lite.json` v2.8.3
- `Anime/core-nexus-anime-dub.json` v2.8.3 — dubbed variant
- `Anime/core-nexus-anime-dub-lite.json` v2.8.3

### Nightly (gitignored — force-add to commit)
- `Nightly/AppleTV/core-nexus-apple-tv-4k.json` v0.1.2 — DV Profile 5/8, AV1 excluded
- `Nightly/Essential/core-nexus-4k-essential-labs.json` v0.1.2 — Essential 4K experimental
- `Nightly/Essential/core-nexus-essential-labs.json` v0.1.2 — Essential 1080p experimental
- `Nightly/Samsung/core-nexus-samsung-tv-4k.json` v0.2.7 — Samsung 4K nightly (RU7100)
- `Nightly/Single/core-nexus-4k-apex-labs.json` v0.8.1 — perGroup() prototypes, dynamicAddonFetching, releaseGroup() ESEs
- `Nightly/Single/core-nexus-stream-labs.json` v0.6.1 — perGroup() prototypes, dynamicAddonFetching

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

## Regex Scoring Architecture (v2.8.6)

### `preferredRegexPatterns`
**Always `[]` on all active templates.** Radarr/Sonarr quality-guide patterns use lookahead syntax (`(?=...)`) blocked by elfhosted's regex allowlist. Cleared in v2.8.5. The A-tier and B-tier entries in `rankedRegexPatterns` cover the same release groups with compatible regex syntax.

### `rankedRegexPatterns` (inline, |score| ≥ 50 subset)
High-impact patterns from `Filtering/ranked-regex-patterns.json` embedded directly in each template.

| Template type | Count | Score tiers |
|---|---|---|
| 4K templates | 39 | S(+100), A(+80), B(+60), Penalised(−50), Bad(−75), Blacklist(−200) |
| 1080p templates | 36 | Same tiers |
| Anime templates | 0 | Cleared — live-action group names don't match anime naming |

**Source of truth:** `Filtering/ranked-regex-patterns.json` — 149 patterns, 10 score tiers. The inline set is the |score| ≥ 50 subset, **with no `[B]`/`[C]` suffix variants** — these names are not on elfhosted's allowlist and were removed in v2.8.5.

### `excludedRegexPatterns`
**Do not use lookahead/lookbehind syntax.** elfhosted's regex validator rejects patterns containing `(?=...)`, `(?!...)`, `(?<=...)`, or `(?<!...)`. Each template carries 8 inline excluded patterns (file extensions, AI upscale, scene groups, LQ groups, RARBG tags). The 4 Radarr/Sonarr lookbehind patterns (Extras, Sing-Along, BR-DISK) were removed in v2.8.6; coverage via `rankedRegexPatterns` negative scores.

### `syncedRankedRegexUrls`
**Do not use.** Public AIOStreams instances (elfhosted, fortheweak.cloud) block `raw.githubusercontent.com` URLs, throwing "Forbidden URL(s) in regex configuration". Embed patterns inline.

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
      "fieldOverrides": {
        "addonName": "override"
      }
    }
  }
}
```

- **Runtime resolution** — parent is fetched and merged on every `getUser()` call; only child is stored
- Minimum child: just `{ "parentConfig": { "uuid": "...", "password": "..." } }` (all sections inherit)
- `extend` (presets/services only) merges parent + child lists
- `fieldOverrides` overrides a single field while inheriting the rest
- Graceful fallback: if parent unreachable, child loads unmerged

**Planned use:** "Core Builds Base" parent config holding all presets (with tuned timeouts), ESEs, ISEs, sort criteria, and formatter. Child templates specify only PSEs and branding. One change propagates to all 46 templates instantly.

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
