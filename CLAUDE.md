# Core Builds — Claude Context

This is **brevityA/Core-Builds**, a backup mirror of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity).

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
- `torbox-search` was renamed/removed in AIOStreams v2.30.2 — keep it `enabled: false`

---

## Active Template Inventory (as of v2.8.0)

### Single (TorBox Pro)
- `core-nexus-4k-apex.json` v0.4.0 — flagship 4K, IQR PSEs, pow() decay
- `core-nexus-4k-apex-torbox.json` v0.2.0 — TorBox-cached-only Apex variant
- `core-nexus-stream.json` v2.7.6 — 1080p streaming quality
- `core-nexus-stream-lite.json` — lite variant
- `core-nexus-stream-firestick.json` — Fire Stick optimised
- `core-nexus-stream-firestick-lite.json`

### Essential (TorBox Essential)
- `core-nexus-4k-essential.json` v2.8.0 — 4K with IQR PSEs, pow() decay
- `core-nexus-4k-essential-lite.json` — CB-style PSEs
- `core-nexus-essential.json` — 1080p
- `core-nexus-essential-lite.json`

### AllDebrid
- `core-nexus-4k-alldebrid.json` v0.1.2 — 4K with IQR PSEs
- `core-nexus-alldebrid.json` v0.1.0 — 1080p
- `core-nexus-4k-alldebrid-lite.json` v0.1.0 — 4K CB-style
- `core-nexus-alldebrid-lite.json` v0.1.0 — 1080p lite

### Device
- `Device/Samsung/core-nexus-samsung-tv.json` v0.2.1 — 1080p, DV-Only Kill on, HDR preferred
- `Device/Samsung/core-nexus-samsung-tv-4k.json` v0.2.1 — 4K, DV-Only Kill on, excludedAudioTags set

### Hybrid
- `core-nexus-4k-hybrid.json` v1.2.0 — TorBox + RD, service() priority PSEs, IQR
- `core-nexus-hybrid.json` — 1080p hybrid
- `core-nexus-hybrid-lite.json`

### Nightly
- `Nightly/AppleTV/core-nexus-apple-tv-4k.json` v0.1.0 — DV Profile 5/8, AV1 excluded

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

### ongoingSeason PSE (all 46 templates)
```
/*ongoingSeasonPack*/
((queryType=='series' or queryType=='anime.series') and ongoingSeason 
  and (daysSinceLastAired < -1 or daysUntilNextEpisode >= 0))
? seasonPack(streams, 'onlySeasons') : []
```

---

## SEL Function Reference

### Confirmed available in AIOStreams SEL (packages/core/src/parser/streamExpression.ts)

**Stats:** `max`, `min`, `avg`, `mean`, `sum`, `percentile`, `q1`, `median`, `q2`, `q3`, `iqr`, `variance`, `stddev`, `range`, `mode`, `skewness`, `kurtosis`, `values`

**Stream filters:** `resolution`, `quality`, `encode`, `type`, `visualTag`, `audioTag`, `audioChannels`, `language`, `subtitle`, `subtitles`, `seeders`, `age`, `size`, `bitrate`, `service`, `cached`, `uncached`, `releaseGroup`, `seasonPack`, `multiEpisode`, `addon`, `library`, `seadex`, `message`, `passthrough`

**Match/score:** `seScore`, `streamExpressionScore`, `regexScore`, `regexMatched`, `regexMatchedInRange`, `keyword` (alias: `keywords`), `seMatched`, `seMatchedInRange`, `rseMatched`, `indexer`

**Array ops:** `count`, `negate`, `merge`, `slice`, `perGroup`, `pin`

**Math:** `pow` (from expr-eval)

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
