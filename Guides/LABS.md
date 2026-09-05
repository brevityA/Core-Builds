# Core Builds — Nightly Labs

Nightly / Labs templates test new ideas before they're promoted to stable. They run against real libraries — report what you find in the Nightly thread.

---

## Active Labs Templates

| Template | Version | Resolution | Base |
|---|---|---|---|
| **4K Apex Labs** | v0.15.2 | 4K + 1080p | 4K Apex |
| **Stream Labs** | v0.10.2 | 1080p | Stream |
| **All-Rounder Labs** | v0.4.2 | 1080p | Stream + Anime |
| **4K Essential Labs** | v0.6.2 | 4K + 1080p | 4K Essential |
| **Essential Labs** | v0.4.2 | 1080p | Essential |
| **Anime 4K Labs** | v0.3.1 | 4K + 1080p | Anime 4K |

---

## v0.14.0 Features

### 1. Runtime-Aware Bitrate Floors

Bitrate Floor ESEs now check content type before firing:

```js
(isAnime or 'Animation' in genres or (runtime > 0 and runtime < 25))
  ? []
  : [existing bitrate floor logic]
```

**Why:** Animation and short-form content (< 25 min) legitimately encodes 50% smaller than live-action. Without this guard, the REMUX bitrate floors killed valid anime and animation encodes.

**Templates:** 4K Apex Labs, Stream Labs, 4K Essential Labs (only templates with bitrate floors).

---

### 2. Anime Language Passthrough ISE

```js
isAnime ? passthrough(streams, 'language') : []
```

Bypasses language filtering for anime queries. Anime fansub groups use non-standard language tagging (e.g. `Japanese` vs `jpn`, dual-audio labelled as English-only) that the standard language filter rejects — causing valid anime streams to be dropped silently.

**Templates:** All 6 Labs templates.

---

### 3. latestSeason-Aware Season Pack Kill

The Season Pack Kill ESE now includes:

```js
season >= latestSeason
```

**Before:** Season packs were killed whenever episode-level streams existed, even for the current season where the pack might be the only high-quality source.

**After:** Season packs for the current season (where `season >= latestSeason`) are preserved. Older-season packs continue to be killed when individual episodes exist.

**Templates:** 4K Apex Labs, Stream Labs, All-Rounder Labs, 4K Essential Labs, Essential Labs (not Anime — anime templates exempt from season pack kill).

---

### 4. Subtitle Preference PSE

```js
subtitles(streams, 'English')
```

Inserted before the Codec Efficiency Booster PSE. Gives a scoring boost to streams with embedded English subtitles. Does not exclude streams without subs — just ranks sub-carrying streams higher when all else is equal.

**Templates:** All 6 Labs templates.

---

### 5. Age Sort Key

`age` with `direction: "asc"` added to `uncachedMovies` and `uncachedSeries` sort sections. When all other sort criteria tie, newer uncached torrents rank above older ones — more likely to have active seeders.

**Templates:** All 6 Labs templates.

---

### 6. Cached/Uncached Anime Sort Sections

Two new granular sort sections for anime content:

**`cachedAnime`** (16 keys): `cached → seadex → seMatched → seScore → library → resolution → quality → regexScore → visualTag → encode → audioTag → audioChannel → language → seeders → bitrate → size`

SeaDex at position 2 — the strongest anime quality signal ranks immediately after cached status.

**`uncachedAnime`** (17 keys): Same structure but with seeders promoted above audio criteria and `age` (asc) appended. Newer uncached anime torrents with more seeders rank higher.

**Templates:** All 6 Labs templates.

---

## Previous LABS Features (still active)

These features were introduced in earlier Labs versions and remain active:

| Feature | Version | Description |
|---|---|---|
| **ESE v2.0** | v0.9.0 | Protect Library, SeaDex Duplicates, rseMatched tier guards, Low Quality filter |
| **Score IQR Guard** | v0.9.0 | Tukey lower fence on `seScore` — removes statistical outliers at ≥8 streams |
| **perGroup() dedup** | v0.9.0 | Single-expression `perGroup(..., 'resolution', 3)` replaces 20–35 clause merge/slice |
| **Indexer Diversity** | v0.9.0 | `perGroup(..., 'indexer', 2)` caps per-scraper results at 2 when pool > 20 |
| **Elite group pins** | v0.9.0 | `pin(releaseGroup(...))` for top/bottom group positioning |
| **rseMatched() tiers** | v0.9.0 | Ranked regex entries as named matchers for tier-guarded kills |
| **Bitrate Floor ESEs** | v0.11.0 | 4K + 1080p REMUX bitrate floors (now runtime-aware in v0.14.0) |
| **Private tracker kill** | v0.12.0 | Hard-excludes results from private trackers |
| **totalCachedStreams DAF** | v0.12.0 | Dynamic addon fetching exits on cached stream count |
| **Strict year+title matching** | v0.13.0 | Tighter match criteria for content identification |
| **SeaDex Best PSE tier** | v0.13.0 | Dedicated PSE tier for SeaDex best-rated releases |

---

## What to Test & Report

1. **Animation/anime results** — do anime titles still surface valid REMUX streams? The runtime guard should prevent bitrate floors from killing short-form and animated content.

2. **Season packs on current-season shows** — when watching a show in its latest season, do season packs still appear? On older seasons, are they still properly killed when individual episodes exist?

3. **Subtitle ranking** — do streams with embedded English subs rank above equivalent streams without subs? The effect should be subtle — a tiebreaker, not a dominant sort.

4. **Uncached anime** — for anime content that isn't cached, do results with more seeders and newer upload dates surface higher?

5. **Language filtering on anime** — do anime streams that were previously dropped by language filters now appear? This is most visible on niche anime with non-standard language metadata.

---

## Import URLs

| Template | Import URL |
|---|---|
| **4K Apex Labs** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json` |
| **Stream Labs** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json` |
| **All-Rounder Labs** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json` |
| **4K Essential Labs** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-4k-essential-labs.json` |
| **Essential Labs** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-essential-labs.json` |
| **Anime 4K Labs** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json` |

Labs templates are nightly builds — they receive changes faster and without the same audit gate as stable templates.
