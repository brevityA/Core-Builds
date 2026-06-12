<p align="center">
  <img src="https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/templates_banner.svg" alt="Core Builds Template Directory Banner" width="100%"/>
</p>

# Core Builds — Template Directory

All active templates for AIOStreams v2.30+. Every template requires a **TorBox subscription**. All templates ship with the **Core Syntax Formatter**, Tamtaro standard ESEs + Core Builds kill ESEs, Tamtaro ISEs, and in-app update notifications.

> **Current version: v2.7.2** · [CHANGELOG](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md)

> 📖 **New here?** Start with the [Complete Setup Guide](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md) — it covers picking a template, importing, API keys, device profiles, and troubleshooting.

---

## ⚡ Quick Reference

| Template | Plan | Resolution | Best for |
|---|---|---|---|
| [4K Pro](#-core-nexus-4k-pro) | Pro | 4K + 1080p | Flagship — DV/HDR REMUX + Usenet |
| [4K Apex](#-core-nexus-4k-apex) | Pro | 4K + 1080p | Adaptive bitrate floors — outperforms 4K Pro on quality filtering |
| [Stream](#-core-nexus-stream) | Pro | 1080p | WEB-DL only, budget hardware |
| [Stream (Fire Stick)](#-core-nexus-stream-fire-stick) | Pro | 1080p SDR | Fire Stick + low-RAM devices |
| [Samsung TV](#-core-nexus-samsung-tv-nightly) 🌙 | Pro | 1080p | Samsung / no Dolby Vision |
| [Samsung TV 4K](#-core-nexus-samsung-tv-4k-nightly) 🌙 | Pro | 4K + 1080p | Samsung 4K / HDR10+ |
| [4K Hybrid](#-core-nexus-4k-hybrid) | Pro + NZBGeek | 4K + 1080p | Dual-source: TorBox + Usenet, full 4K |
| [Hybrid](#-core-nexus-hybrid) | Pro + NZBGeek | 1080p | Dual-source: TorBox + Usenet |
| [4K Essential](#-core-nexus-4k-essential) | Essential | 4K + 1080p | Full 4K on Essential plan |
| [Essential](#-core-nexus-essential) | Essential | 1080p | Standard Essential build |
| [Speed 4K+](#easynews-speed-templates) | Essential + EasyNews | 4K | Instant cached 4K |
| [Speed+](#easynews-speed-templates) | Essential + EasyNews | 1080p | Instant cached 1080p |
| [Speed EasyNews](#easynews-speed-templates) | EasyNews only | 1080p | EasyNews — no TorBox needed |
| [Speed 4K](#torbox-only-speed-templates) | Essential | 4K | Fast cached 4K |
| [Speed](#torbox-only-speed-templates) | Essential | 1080p | Fast cached 1080p |
| [Anime](#-anime) 🎌 | Essential | 1080p | SeaDex best-release anime |
| [Anime 4K](#-anime) 🎌 | Essential | 4K + 1080p | HDR anime |
| [Anime Dub](#-anime) 🎌 | Essential | 1080p | English dubbed anime |
| [Flash](#️-flash-tier) ⚡⚡ | Essential | 1080p | Instant play, cached only |
| [Flash 4K](#️-flash-tier) ⚡⚡ | Essential | 4K + 1080p | Instant play 4K, cached only |

> 🪶 Every template above also has a **Lite variant** (`-lite` suffix in the filename). Import URLs are in the [All Templates](#-all-templates) table below.

### 🌍 Community

| Template | Author | Plan | Resolution | Best for |
|---|---|---|---|---|
| [Auburn Tiger Edition](#-community-templates) | RB3 | Pro + RD | 4K + 1080p | TorBox Pro + Real-Debrid, warm orange/navy UI |
| [RB3 TorBox Pro + RD Hybrid](#-community-templates) | RB3 | Pro + RD | 1080p | Dual-source hybrid with Usenet |
| [Prism TorBox Essential 1080p](#-community-templates) | MightyIcyy | Essential | 1080p | Simple, low-friction Essential build |

---

## 🗺️ Which Template?

```
TorBox Pro?
├── Got NZBGeek/Usenet indexer?
│   ├── Want 4K? → 4K Hybrid
│   └── 1080p only? → Hybrid
├── Want 4K? → 4K Pro
├── Samsung TV / no Dolby Vision? → Samsung TV (Nightly) · Samsung TV 4K (Nightly)
└── 1080p only? → Stream

TorBox Essential?
├── Single-click instant play (cached only)? → Flash tier
│   ├── 4K? → Flash 4K
│   └── 1080p? → Flash
├── Fast general play (2-3s)? → Speed tier
│   ├── + EasyNews, 4K → Speed 4K+
│   ├── + EasyNews, 1080p → Speed+
│   ├── No EasyNews, 4K → Speed 4K
│   └── No EasyNews, 1080p → Speed
├── Want 4K? → 4K Essential
└── 1080p standard? → Essential

EasyNews only (no TorBox)? → Speed EasyNews

Anime?
├── Want 4K HDR? → Anime 4K
├── Standard 1080p? → Anime
└── Prefer English dubs? → Anime Dub

Getting too few results / low-overhead host? → use the Lite variant of any template above
```

---

## 📋 All Templates

| Template | Plan | Res | Import URL |
|---|---|---|---|
| **Core Nexus 4K Pro** | TorBox Pro | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json` |
| **Core Nexus 4K Apex** | TorBox Pro | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Core Nexus 4K Apex (TorBox)** | TorBox Pro | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex-torbox.json` |
| **Core Nexus Stream** | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json` |
| **Core Nexus Stream (Fire Stick)** | TorBox Pro | 1080p SDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Core Nexus Samsung TV** 🌙 | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv.json` |
| **Core Nexus Samsung TV 4K** 🌙 | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json` |
| **Core Nexus 4K Hybrid** | Pro + NZBGeek | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json` |
| **Core Nexus Hybrid** | Pro + NZBGeek | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json` |
| **Core Nexus 4K Essential** | Essential | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Core Nexus Essential** | Essential | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json` |
| **Core Nexus Speed 4K+** | Essential + EasyNews | 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json` |
| **Core Nexus Speed+** | Essential + EasyNews | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus.json` |
| **Core Nexus Speed EasyNews** | EasyNews only | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json` |
| **Core Nexus Speed 4K** | Essential | 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json` |
| **Core Nexus Speed** | Essential | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json` |
| **Core Nexus Anime** 🎌 | Essential | 1080p+4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime.json` |
| **Core Nexus Anime 4K** 🎌 | Essential | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k.json` |
| **Core Nexus Flash** ⚡⚡ | Essential | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash.json` |
| **Core Nexus Flash 4K** ⚡⚡ | Essential | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash-4k.json` |

> 🪶 Every template above also has a **Lite variant** (`-lite` suffix in the filename) *(except Nightly templates)*. Lite templates run 12 ESEs instead of 24 — quality gates removed, hard kills kept. See the [Lite section](#-lite-variants) below.

---

## 📥 How to Import

1. Copy the import URL from the table above
2. Open your AIOStreams host → **About → Get Started → Load Template** → paste URL
3. Enter your **TorBox API key** in Services
4. Enter your **TMDB Access Token** (recommended — improves title matching)
5. Save → copy manifest URL → install in Stremio or WuPlay

---

## 🔵 TorBox Pro Templates

### 🏆 Core Nexus 4K Pro

Flagship 4K build. Full addon stack. Targets DV/HDR, TrueHD/Atmos, BluRay REMUX. cacheAndPlay for both Usenet and debrid torrents.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-4k-pro.json` |
| **Version** | v2.7.2 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json` |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ✅ cacheAndPlay + nzbFailover |

---

### 🎯 Core Nexus 4K Apex

Adaptive flagship. Identical addon and ESE stack to 4K Pro — the difference is in the PSEs. Uses IQR Tukey fence filtering (Q1−1.5×IQR / Q3+1.5×IQR) to set bitrate floors per tier, with a min/max fallback for thin pools and a median cluster for new releases under 60 days. BluRay REMUX tiers also enforce file size floors (15 GB for 4K, 8 GB for 1080p) to filter mislabeled fakes. HDR and SDR WEB-DL are evaluated separately so HDR streams don't inflate the SDR floor.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Version** | v0.3.2 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ✅ cacheAndPlay + nzbFailover |

---

### 📺 Core Nexus Stream

1080p WEB-DL only. BluRay and Remux excluded. Best for budget hardware or WEB-DL purists.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-stream.json` |
| **Version** | v2.7.1 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ✅ via Newznab (opt-in) |

---

### 📺 Core Nexus Stream (Fire Stick)

1080p SDR build tuned for Fire Stick and low-RAM streaming devices.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Version** | v2.7.1 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Resolution** | 1080p · SDR |
| **Usenet** | ❌ |

---

### 🌙 Core Nexus Samsung TV *(Nightly)*

Stream-based 1080p template for Samsung TVs and devices without Dolby Vision support. DV-only streams excluded by default. DV+HDR10 dual-layer files pass through normally.

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv.json` |
| **Version** | v0.1.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ❌ |

> 🌙 Nightly — stable for daily use, gathering community feedback before promotion to stable.

---

### 🌙 Core Nexus Samsung TV 4K *(Nightly)*

4K variant of the Samsung TV template. DV-Only Kill ESE enabled by default — DV-only streams excluded, HDR10+/HDR10/HLG/SDR and DV+HDR10 dual-layer pass through normally. HDR10+ is the preferred visual tag (Samsung TVs support HDR10+). Full lossless audio enabled with 7.1 channel support.

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json` |
| **Version** | v0.1.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

> 🌙 Nightly — stable for daily use, gathering community feedback before promotion to stable.

---

### 🔀 Core Nexus 4K Hybrid

TorBox Pro + NZBGeek. Full 4K with maximum source diversity.

| | |
|---|---|
| **File** | `Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json` |
| **Version** | v1.0.2 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json` |
| **Resolution** | 2160p primary, 1080p fallback |
| **HDR** | ✅ Full HDR — DV, HDR10+, HDR10 |
| **Usenet** | ✅ NZBGeek API key required |
| **PSEs** | IQR Tukey fence adaptive bitrate filtering |

> ⚠️ After import go to **Add-ons → Newznab** and enter your NZBGeek API key.

---

### 🔀 Core Nexus Hybrid

TorBox Pro + NZBGeek. Maximum source diversity.

| | |
|---|---|
| **File** | `Templates/Torbox/Hybrid/core-nexus-hybrid.json` |
| **Version** | v2.7.2 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ✅ NZBGeek API key required |

> ⚠️ After import go to **Add-ons → Newznab** and enter your NZBGeek API key.

---

## 🟡 TorBox Essential Templates

### 💎 Core Nexus 4K Essential

Full 4K for Essential plan. No Usenet.

| | |
|---|---|
| **File** | `Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Version** | v2.7.2 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ❌ |

---

### 📱 Core Nexus Essential

1080p for Essential subscribers.

| | |
|---|---|
| **File** | `Templates/Torbox/Essential/core-nexus-essential.json` |
| **Version** | v2.7.1 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ❌ |

---

## ⚡ Speed Tier

> **Zero results?** Check two things: (1) Did you enter your TorBox API key? (2) Speed templates only show cached streams — try a popular title first (e.g. Breaking Bad S01E01). Use Core Nexus Essential for full coverage.

### EasyNews Speed Templates

| | Speed 4K+ | Speed+ | Speed EasyNews |
|---|---|---|---|
| **Resolution** | 4K | 1080p | 1080p |
| **Requires** | Essential + EasyNews | Essential + EasyNews | EasyNews only |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json` |

> **Speed EasyNews** — EasyNews-only instant play. No TorBox subscription required. Usenet-first with debrid fallback. Great for EasyNews users who want fast cached results without a TorBox plan.

### TorBox-Only Speed Templates

| | Speed 4K | Speed |
|---|---|---|
| **Resolution** | 4K | 1080p |
| **Requires** | Essential | Essential |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json` |

---

## 🎌 Anime

SeaDex best-release enforcement · AnimeTosho (Nyaa.si mirror) · FLAC/AAC first · Japanese + English + Dual Audio.

| | Anime | Anime 4K | Anime Dub |
|---|---|---|---|
| **File** | `core-nexus-anime.json` | `core-nexus-anime-4k.json` | `core-nexus-anime-dub.json` |
| **Resolution** | 1080p primary · 720p fallback | 2160p primary · 1080p fallback | 1080p primary · 720p fallback |
| **Language priority** | Japanese → Dual Audio → English | Japanese → Dual Audio → English | Dubbed → Dual Audio → English → Japanese |
| **Visual priority** | SDR-first | DV → HDR10+ → HDR | SDR-first |
| **Audio priority** | FLAC → AAC | Atmos → TrueHD → FLAC | FLAC → AAC |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub.json` |

---

## ⚡⚡ Flash Tier

Pure cached-only instant play. `excludeUncached: true` — only streams already cached in TorBox appear. A 2-stream dynamic stop condition fires as soon as 2 cached results are found, making load time nearly instant. The 0Cached ISE passes through a title result if nothing is cached, so you never get a completely blank screen.

> **Flash vs Speed:** Speed shows uncached streams as fallback. Flash never does — it's literally only what TorBox has ready to serve right now. If content isn't cached, use Speed or Essential instead.

| | Flash | Flash 4K |
|---|---|---|
| **File** | `core-nexus-flash.json` | `core-nexus-flash-4k.json` |
| **Resolution** | 1080p primary · 720p fallback | 2160p primary · 1080p fallback |
| **Visual priority** | SDR | DV → HDR10+ → HDR |
| **Uncached streams** | ❌ Never shown | ❌ Never shown |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash-4k.json` |

---

## 🪶 Lite Variants

Every standard template has a `-lite` variant. Lite removes 12 quality-gate ESEs (Low Bitrate, Low Seeders, Low SEL Score, Upscaled 4K, Bad 4K/1080P Bluray, Extra Cached/Uncached limits, Final Limit). Hard kills retained (CAM, YouTube, 3D, Bad NZBs).

**When to use Lite:**
- Standard template returns very few results
- Running on a low-overhead shared host
- Testing / debugging what the quality gates are filtering

| Lite Template | Import URL |
|---|---|
| **4K Pro Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro-lite.json` |
| **Stream Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-lite.json` |
| **Stream (Fire Stick) Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick-lite.json` |
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
| **Anime Dub Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub-lite.json` |

---

## 🛠️ Common to All Templates (v2.6.3)

| Feature | Detail |
|---|---|
| **Formatter** | Core Syntax · `id: tamtaro` · `overrides['tamtaro']` |
| **ESEs (standard)** | 24 total — 20 Tamtaro standard + Hard CAM Kill, YouTube Kill, 3D Kill, Season Pack Guard |
| **ESEs (Lite)** | 12 total — quality gates removed, hard kills retained |
| **ISEs** | 6 Tamtaro ISEs — Library, 0Cached, digitalRelease Bypass, SeaDex (anime only) |
| **Sort** | cached → matched → score → resolution → quality → audio → language |
| **Deduplication** | filename + infoHash + smartDetect · 14 attributes · `libraryBehaviour: prefer` |
| **Matching** | title `contains/0.75` · year `±2yr` · season/episode `non-strict` |
| **Auto features** | autoPlay · precacheNextEpisode · preloadStreams · dynamicAddonFetching · checkOwned |
| **Scoring** | Vidhin05 ranked regex · Tamtaro synced PSEs |
| **RPDB** | `t0-free-rpdb` baked in |
| **In-app updates** | `metadata.changelog` embedded |

---

## 🌍 Community Templates

| Template | Author | Import |
|---|---|---|
| [Auburn Tiger Edition](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/RB3/auburn-tiger-rb3.json) | RB3 | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/RB3/auburn-tiger-rb3.json) |
| [RB3 TorBox Pro + RD Hybrid](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/RB3/rb3-hybrid/rb3-torbox-pro-rd-hybrid.json) | RB3 | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/RB3/rb3-hybrid/rb3-torbox-pro-rd-hybrid.json) |
| [Prism TorBox Essential 1080p](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json) | MightyIcyy | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json) |

> Want your template listed? Open a PR to `Community-Templates/` with your JSON and a README.

---

## ⚠️ Disclaimer

Core Builds is an independent community project and is not affiliated with, endorsed by, or supported by TorBox, AIOStreams, or any service provider referenced in these templates. Templates configure how the AIOStreams addon filters and displays streams — they do not host, proxy, or distribute any content. Use is entirely at your own risk.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Complete Setup Guide](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md) · [CHANGELOG](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md)*
