# Separated SEL Expression Files

Individual expression files split by category — use only the ones you need.

> These are the same expressions from the combined files (`core-builds-eses.json`, `core-builds-ises.json`, `core-builds-pses.json`) split into standalone modules. No duplicates between files.

---

## ESEs (Excluded Stream Expressions)

| File | Count | Use Case |
|---|---|---|
| `core-eses.json` | 19 | Universal hard kills + quality gates (30+ templates) |
| `advanced-eses.json` | 37 | Flood control, extras dedup, indexer diversity, resolution kills |
| `anime-eses.json` | 2 | Anime-only guards |
| `flash-speed-eses.json` | 2 | Flash/Speed-specific |
| `labs-eses.json` | 23 | Experimental: tier-guarded kills, bitrate floors, perGroup dedup |

## ISEs (Included Stream Expressions)

| File | Count | Use Case |
|---|---|---|
| `core-ises.json` | 8 | Cached passthrough, Library, REPACK, SeaDex, English, digitalRelease |

## PSEs (Preferred Stream Expressions)

| File | Count | Use Case |
|---|---|---|
| `universal-pses.json` | 4 | ongoingSeason + shared fallbacks (30+ templates) |
| `cb-static-pses.json` | 42 | Fixed S/A/B/C/D quality+resolution tiers (1080p templates) |
| `iqr-pses.json` | 36 | IQR Tukey fence adaptive bitrate (4K flagships) |
| `hybrid-pses.json` | 2 | Hybrid TorBox-priority twin PSEs |
| `anime-pses.json` | 23 | SeaDex tiers, anime quality ranking |
| `alldebrid-pses.json` | 16 | AllDebrid-specific quality tiers |
| `pins-pses.json` | 4 | Elite group pins, IMAX, REPACK boosters |
| `device-pses.json` | 13 | Samsung, Ultrawide, Apple TV device PSEs |
| `labs-pses.json` | 23 | Experimental: S+ tier, pattern-verified, perGroup |

---

## Recommended Combinations

**Basic setup (any debrid):**
`core-eses.json` + `core-ises.json` + `cb-static-pses.json` + `universal-pses.json`

**4K flagship:**
`core-eses.json` + `advanced-eses.json` + `core-ises.json` + `iqr-pses.json` + `universal-pses.json` + `pins-pses.json`

**Anime:**
`core-eses.json` + `anime-eses.json` + `core-ises.json` + `anime-pses.json` + `universal-pses.json`

**Samsung TV:**
`core-eses.json` + `advanced-eses.json` + `core-ises.json` + `device-pses.json` + `universal-pses.json`

---

Each expression includes a `templates` array showing which Core Builds templates use it.
