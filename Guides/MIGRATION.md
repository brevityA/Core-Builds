# Migration Guide

## v2.4.6 → v2.4.7

This release expanded the template catalogue, standardised the formatter, and fixed anime update detection. The changes below are **non-breaking** — existing imports continue to work, but a **fresh import** is recommended to get all improvements.

---

### What Changed

#### Templates (all 13 active templates)

| Area | Change |
|---|---|
| `metadata.source` | Added `"source": "external"` + `sourceUrl` to all templates (enables in-app update badge) |
| `metadata.changelogUrl` | Added CHANGELOG link to all templates |
| `formatter.id` | Standardised to `"tamtaro"` across all templates |
| Anime template | Fixed missing `source: external` — update detection now works correctly |

#### New Templates Added (v2.4.6 → v2.4.7)

| Template | Location | Notes |
|---|---|---|
| Core Nexus Speed 4K+ | `Templates/Torbox/Speed/EasyNews/` | 4K, TorBox Essential + EasyNews |
| Core Nexus Speed+ | `Templates/Torbox/Speed/EasyNews/` | 1080p, TorBox Essential + EasyNews |
| Core Nexus Speed 4K | `Templates/Torbox/Speed/TorBox/` | 4K, TorBox Essential only |
| Core Nexus Speed | `Templates/Torbox/Speed/TorBox/` | 1080p, TorBox Essential only |

#### New Formatters Added

| Formatter | Notes |
|---|---|
| Core Nexus Apex | Audio tag in name line, colour-coded resolution, ELITE badge |
| Core Nexus Sigma | `「 」` bracket system, title-first name line |
| Core Nexus Minimal | Compact 3-line description, TV-optimised |

---

### How to Update

**Option A — In-app update (recommended):**
1. Open your AIOStreams instance
2. A blue **Update** badge appears next to templates imported via URL
3. Click **Update** — your API keys and service settings are preserved

**Option B — Fresh import:**
1. Copy your template's import URL from the [README](../README.md#-pick-your-template)
2. AIOStreams → Settings → About → Get Started → **Load Template** → paste URL
3. Re-enter your TorBox API key → Save → reinstall manifest in Stremio

> ⚠️ If the Update badge doesn't appear, do a fresh import. The badge requires the original import to have been done via URL (not copy-pasted JSON).

---

## v2.4.5 → v2.4.6

#### New Templates Added

| Template | Location |
|---|---|
| Core Nexus 4K Essential | `Templates/Torbox/Essential/` |
| Core Nexus Essential | `Templates/Torbox/Essential/` |

#### Formatter

- Core Nexus Elite formatter introduced — bundled in all templates as the default

---

*For full version history see [CHANGELOG.md](../CHANGELOG.md)*
