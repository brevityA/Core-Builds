# Adjusting Search Criteria

This guide explains how to tune the matching settings in any Core Builds template to fix zero-result issues, handle edge cases, and get the best stream coverage for your content.

---

## What Is Search Criteria?

When you open a movie or show in Stremio, AIOStreams sends a request to your addons with the title, year, and episode information. Search criteria controls how strictly the returned streams must match that request before they're shown to you.

Too strict → zero results on valid content  
Too loose → wrong content appearing (a movie showing episodes from a show with the same name)

All three matching settings live under the same section of the config:

```json
"titleMatching": {
  "enabled": true,
  "mode": "contains",
  "similarityThreshold": 0.75
},
"yearMatching": {
  "enabled": true,
  "strict": false,
  "tolerance": 2
},
"seasonEpisodeMatching": {
  "enabled": true,
  "strict": false
}
```

---

## Title Matching

Controls whether the stream's filename must contain the title of the content you're watching.

### Settings

| Setting | Values | Default (Core Builds) |
|---|---|---|
| `enabled` | `true` / `false` | `true` |
| `mode` | `"contains"` / `"exact"` | `"contains"` |
| `similarityThreshold` | `0.0` – `1.0` | `0.75` |

### Mode

**`contains` (recommended)** — the stream filename just needs to include the title somewhere. "Gladiator.II.2024.2160p..." would match a search for "Gladiator 2".

**`exact`** — the stream filename must match the title almost perfectly. This was the original bug in many configs — `exact` mode causes zero results on sequels, films with alternate titles, and anything with punctuation differences. **Never use `exact` for public templates.**

### Similarity Threshold

How closely the title in the stream filename must resemble the requested title. Only applies in `contains` mode.

| Threshold | Effect |
|---|---|
| `1.0` | Perfect match required — same as `exact` mode effectively |
| `0.75` | Recommended — handles minor variations, punctuation, romanisation |
| `0.60` | Loose — may allow unrelated streams with partial title matches |
| `0.50` | Very loose — not recommended |

**When to lower from 0.75:**
- Content with very short titles (one or two characters)
- Content with special characters in the title that don't encode well
- Anime titles with romanisation inconsistencies

**When to raise above 0.75:**
- You're getting wrong-show streams alongside correct ones
- A short common word in a title matches too many unrelated releases

---

## Year Matching

Filters streams based on the release year. Prevents you from seeing a 1990 film when you open a 2023 remake with the same name.

### Settings

| Setting | Values | Default (Core Builds) |
|---|---|---|
| `enabled` | `true` / `false` | `true` |
| `strict` | `true` / `false` | `false` |
| `tolerance` | Integer (years) | `2` |

### Strict Mode

**`strict: false` (recommended)** — a stream is allowed if its year is within the tolerance range. A ±2 tolerance means a 2023 film will match streams tagged 2021–2025.

**`strict: true`** — streams must match the year exactly. This was a common misconfiguration causing zero results because:
- TMDB and release groups sometimes disagree on release year by 1–2 years
- Films released at year-end (December) get tagged as the following year
- International releases sometimes use the local premiere year

### Tolerance

How many years either side of the TMDB year are accepted. Only applies when `strict: false`.

| Tolerance | Effect |
|---|---|
| `0` | Same as `strict: true` |
| `1` | One year either side — can still miss some edge cases |
| `2` | Recommended — covers all common year discrepancy scenarios |
| `3+` | Too loose for most content — remakes may collide with originals |

**When to increase tolerance:**
- Documentary or archive content where release year is ambiguous
- Content from non-English markets where release dates vary significantly by region

---

## Season / Episode Matching

For series content, controls whether streams must have explicit season and episode metadata matching the episode you're watching.

### Settings

| Setting | Values | Default (Core Builds) |
|---|---|---|
| `enabled` | `true` / `false` | `true` |
| `strict` | `true` / `false` | `false` |

### Strict Mode

**`strict: false` (recommended)** — streams are allowed through even if they don't have explicit S/E metadata in the filename. This matters because:
- BluRay and REMUX releases frequently omit S/E numbering in filenames
- Older releases used different naming conventions
- Season packs often don't have per-episode tags

**`strict: true`** — every stream must have a season and episode number that exactly matches the requested episode. This will drop all BluRay REMUXes, most older content, and any stream that uses non-standard episode naming. Not recommended unless you're specifically trying to prevent season packs from appearing.

### The Movie Problem

With `strict: false`, movies and series with identical titles in the same year can bleed into each other — you open a movie and see TV episodes alongside it.

This is solved in Core Builds with a dedicated ESE rather than strict matching:

```
/* CB | Kill Episode Streams on Movie Queries */
queryType == "movie" ?
keyword(streams, "filename", "S01E", "S02E", "S03E", ...) : []
```

This ESE removes episode-tagged streams when `queryType == "movie"`, without affecting series queries at all. It's the correct fix — `strict: true` is too blunt and breaks too much legitimate content.

---

## Language Settings

Controls which audio languages are allowed or prioritised.

### The Two Fields

| Field | Effect |
|---|---|
| `requiredLanguages` | **Hard-requires** every stream to match. Streams without any of these languages are dropped completely. |
| `preferredLanguages` | **Soft preference** used for sorting. Streams with these languages rank higher. Nothing is blocked. |

**Core Builds sets `requiredLanguages: []` (empty) on all templates.** This is intentional. Hard-requiring languages blocks streams that don't have language metadata embedded (common in older releases, scene content, and some Usenet uploads) even when the content is perfectly valid English content. The Tamtaro ISEs handle language contextually — `preferredLanguages` handles ranking.

### When to use `requiredLanguages`

Only if you have a very specific reason to hard-block non-English results entirely. For personal builds on non-English markets, adding your language to `requiredLanguages` alongside `English` and `Unknown` can reduce noise:

```json
"requiredLanguages": ["English", "French", "Unknown", "Multi", "Dubbed"]
```

> ⚠️ Always include `"Unknown"` — a large proportion of valid streams have no language tag and would be dropped without it.

---

## Common Scenarios

### Getting zero results on a specific title

Work through in order:

1. **Lower `similarityThreshold`** from `0.75` to `0.65` — the most common fix
2. **Check `yearMatching.tolerance`** — make sure it's `2` (not `0` or `1`)
3. **Confirm `strict: false`** on both `yearMatching` and `seasonEpisodeMatching`
4. **Clear `requiredLanguages`** — empty array removes all hard language requirements

### Getting wrong show/movie results alongside correct ones

1. Confirm the `CB | Kill Episode Streams on Movie Queries` ESE is enabled (removes TV episodes from movie pages)
2. **Increase `similarityThreshold`** slightly — from `0.75` to `0.80`
3. Check `yearMatching.tolerance` isn't set too high — `2` is correct

### Older content (pre-2000) returning few results

- Lower `similarityThreshold` to `0.65`
- Increase `yearMatching.tolerance` to `3`
- Ensure `seasonEpisodeMatching.strict` is `false` — older releases rarely have S/E tags

### Anime returning wrong dubs or wrong shows

- Lower `similarityThreshold` to `0.65` — anime title romanisation varies widely
- Ensure `SeaDex` ISE is enabled (Anime template only)
- Ensure `preferredLanguages` includes `"Dubbed"` if dubs are wanted

### Series returning season packs instead of individual episodes

This is handled by the `ongoingSeasonPack` ESE (Tamtaro standard set) — it removes ambiguous season packs when you're watching a currently airing show week-to-week. If season packs are still appearing:

1. Confirm the ESE is enabled in your config
2. Check that your TMDB API key is correctly set — `ongoingSeasonPack` uses TMDB data to determine whether a show is currently airing

---

## Full Reference Config

The safest, most permissive matching configuration for maximum stream coverage:

```json
"titleMatching": {
  "enabled": true,
  "mode": "contains",
  "similarityThreshold": 0.75
},
"yearMatching": {
  "enabled": true,
  "strict": false,
  "tolerance": 2
},
"seasonEpisodeMatching": {
  "enabled": true,
  "strict": false
},
"requiredLanguages": [],
"preferredLanguages": ["English", "Original", "Dual Audio", "Multi", "Dubbed", "Unknown"]
```

---

## Why Strict Settings Break Things

The most common support issue across all AIOStreams setups is one of these three combinations:

```
titleMatching.mode: "exact"          ← kills sequels, alt titles, romanised anime
yearMatching.strict: true            ← kills year-boundary releases
seasonEpisodeMatching.strict: true   ← kills BluRay REMUX and older content
```

All three default to their strict forms in a fresh AIOStreams install. All three Core Builds templates correct this. If you're building your own config from scratch or editing someone else's, these are the first three settings to check when streams aren't appearing.

---

*Part of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity)*
