# Core Builds by Brevity — v2.5.0

## What's New

### 🪶 Lite Template Suite — 12 New Templates

Every active template now has a Lite variant. Same import flow, same presets, same formatting — but with relaxed filtering that shows more streams.

**What Lite removes:**
- G's Low Bitrate gate (was cutting streams below quality thresholds)
- Low Seeders filter (was removing low-seeder P2P)
- Low SEL Score cut (was removing streams below expression score –50)
- Bad 4K/1080P Bluray gates (was requiring REMUX or regex-matched BD tier)
- Upscaled 4K filter
- Extra Cached (HQ/LQ) limiters
- Extra Uncached limiter
- Final Limit cap

**What Lite keeps:**
- Hard CAM / TS / SCR kill
- YouTube kill
- 3D content kill
- Bad NZBs kill
- Season Pack guard (when episodes exist)
- All ISEs (SeaDex, Library, 0Cached, digitalRelease Bypass)
- All sorting, deduplication, and matching settings
- All presets unchanged

Result limits raised to 30 global / 12 per resolution (was 20/8).

**When to use Lite:** If the standard template shows fewer than 5–6 results for mainstream content, or you're on a low-overhead shared host.

| Lite Template | Import URL |
|---|---|
| **4K Pro Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro-lite.json` |
| **Stream Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-lite.json` |
| **Hybrid Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid-lite.json` |
| **4K Essential Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-lite.json` |
| **Essential Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential-lite.json` |
| **Speed 4K+ Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus-lite.json` |
| **Speed+ Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus-lite.json` |
| **Speed EasyNews Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews-lite.json` |
| **Speed 4K Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k-lite.json` |
| **Speed Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-lite.json` |
| **Anime Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-lite.json` |
| **Anime 4K Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k-lite.json` |

---

### 🎌 Core Nexus Anime 4K

4K-first variant of the Anime template. Resolution order: 2160p → 1080p fallback. Visual priority: DV → HDR+DV → HDR10+ → HDR. Audio priority: Atmos → TrueHD → DTS-HD MA → FLAC. New PSE tier stack with 4K S/A/B/C grades above the 1080p fallback tiers. Size caps raised to 80 GB movies / 40 GB series.

**Import:** `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k.json`

---

### ✨ Core Nexus Apex v2 Formatter

Three targeted upgrades over Apex v1:
- **Score number in line 1** — `✦ 87` instead of `✦ QUALITY`, so the actual score is visible
- **Bitrate before visual tags** in line 2 — encode → container → bitrate → HDR/DV decorations
- **Subtitle language flags** — `📝 🇬🇧 🇫🇷` instead of binary `📝 SUB`

Apex v1 remains available. Both formatters downloadable from the [Formatters directory](https://github.com/brevityA/Core-Builds/tree/main/Formatters).

**Download:** `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/Core%20Nexus%20Apex%20v2%20Formatter.json`

---

### 📺 Core Nexus TV Formatter

Large-screen / 10-foot UI formatter. UPPER CASE throughout (no smallcaps — readable at TV distance), coloured resolution circles (🔴 4K · 🔵 1080P · 🟢 720P), ⚡/⏳ cache indicator, 4-line description with 🎬 video / 🔊 audio / 🔌 meta section icons. Works with any template.

**Download:** `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/Core%20Nexus%20TV%20Formatter.json`

---

### ⚡ Core Nexus Speed EasyNews

EasyNews-only instant play. No TorBox subscription required. Usenet-first with debrid fallback. For users who have EasyNews but not TorBox.

**Import:** `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json`

---

## Full Changelog

[CHANGELOG.md](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md)
