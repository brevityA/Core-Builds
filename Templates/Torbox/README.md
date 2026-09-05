<p align="center">
  <img src="https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/templates_banner.svg" alt="Core Builds Template Directory Banner" width="100%"/>
</p>

<p align="center">
  <a href="https://core-builds.mintlify.app/template-directory">
    <img src="https://img.shields.io/badge/DOCS-core--builds.mintlify.app-3B82F6?style=for-the-badge&logo=gitbook&logoColor=white&labelColor=1a1f27" alt="Documentation"/>
  </a>
</p>

<p align="center">
  Template directory, import links, and full documentation have moved to<br/>
  <a href="https://core-builds.mintlify.app/template-directory"><b>core-builds.mintlify.app</b></a>
</p>

# Core Builds — Template Directory

All active templates for AIOStreams v2.30+. Every template requires a **TorBox subscription**. All templates ship with the **Core Syntax Formatter**, standard ESEs + Core Builds kill ESEs, Core Builds ISEs, and in-app update notifications.

> **Current version: v3.7.0** · [CHANGELOG](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md)

> 📖 **New here?** Start with the [Complete Setup Guide](https://github.com/brevityA/Core-Builds/wiki) — it covers picking a template, importing, API keys, device profiles, and troubleshooting.

---

## ⚡ Quick Reference

### 🧪 Nightly / Labs

Nightly templates test new optimisations before they're promoted to stable. They may change frequently and are not guaranteed to be stable. Use them to give feedback on new ideas — report findings in the Nightly thread.

| Template | Version | Testing | Import URL |
|---|---|---|---|
| **4K Apex Labs** | v0.14.0 | v0.14.0 SEL — runtime-aware bitrate floors, anime passthrough, latestSeason packs, subtitle PSE, age sort, cachedAnime/uncachedAnime sort | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json` |
| **4K Apex Mixed** | v0.1.0 | Mixed adaptive resolution × Apex IQR stack — no resolution caps (wakes Apex's dormant 480p/240p tiers + new 576p niche tier), quality-before-resolution blend, blended DAF exit | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json` |
| **Stream Labs** | v0.10.0 | v0.14.0 SEL — 1080p variant, all LABS features except bitrate floors | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json` |
| **All-Rounder Labs** | v0.4.0 | v0.14.0 SEL — single template for TV, movies, and anime with isAnime/hasSeaDex conditional tiers | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json` |
| **4K Essential Labs** | v0.5.0 | v0.14.0 SEL — Essential 4K with runtime-aware bitrate floors, all LABS features | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-4k-essential-labs.json` |
| **Essential Labs** | v0.4.0 | v0.14.0 SEL — Essential 1080p, all LABS features except bitrate floors | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-essential-labs.json` |
| **Anime 4K Labs** | v0.3.0 | v0.14.0 SEL — anime-specific with hasSeaDex conditional PSEs, anime group pins | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json` |
| **Apple TV 4K** | v0.2.7 | Device profile — DV Profile 5/8, AV1 excluded, Atmos preferred | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json` |

> **[What's being tested? → Full Labs changelog & testing guide](https://github.com/brevityA/Core-Builds/blob/main/Guides/LABS.md)**

### 🗂️ Stable Templates

| Template | Plan | Resolution | Best for |
|---|---|---|---|
| [4K Apex](#-core-nexus-4k-apex) | Pro | 4K + 1080p | Flagship — DV/HDR REMUX + Usenet · IQR adaptive bitrate floors |
| [Mobile](#-core-nexus-mobile) | Pro | 1080p | Bandwidth-optimised, mobile / data-capped |
| [Stream](#-core-nexus-stream) | Pro | 1080p | WEB-DL only, budget hardware |
| [Mixed](#-core-nexus-mixed) | Pro | 4K → SD adaptive | Niche / mixed libraries — no hard caps, cached × quality blend |
| [Stream (Fire Stick)](#-core-nexus-stream-fire-stick) | Pro | 1080p SDR | Fire Stick + low-RAM devices |
| [Samsung TV](#-core-nexus-samsung-tv) | Pro | 1080p | Samsung / no Dolby Vision |
| [Samsung TV 4K](#-core-nexus-samsung-tv-4k) | Pro | 4K + 1080p | Samsung 4K / HDR10+ |
| [Samsung RU7100 4K](#-core-nexus-samsung-ru7100-4k) | Pro | 4K + 1080p | Samsung RU7100 (2019) — full IQR PSE stack |
| [Xiaomi 4K](#-core-nexus-xiaomi-4k) | Pro | 4K + 1080p | Xiaomi Mi Box S / DV P5 + HDR10+ (no AV1) |
| [Google TV Streamer 4K](#-core-nexus-google-tv-streamer-4k) | Pro | 4K + 1080p | Google TV Streamer (2024) / DV + AV1 + HDR10+ |
| [Windows Ultrawide](#-core-nexus-ultrawide) | Pro | 1080p + 4K capable | Windows PC / ultrawide monitor — full audio, HDR-first |
| [Apple TV 4K](#-core-nexus-apple-tv-4k-nightly) 🌙 | Pro | 4K + 1080p | Apple TV 4K / Dolby Vision |
| [4K Hybrid](#-core-nexus-4k-hybrid) | Pro + NZBGeek | 4K + 1080p | Dual-source: TorBox + Usenet, full 4K |
| [Hybrid](#-core-nexus-hybrid) | Pro + NZBGeek | 1080p | Dual-source: TorBox + Usenet |
| [4K Essential](#-core-nexus-4k-essential) | Essential | 4K + 1080p | Full 4K on Essential plan |
| [Essential](#-core-nexus-essential) | Essential | 1080p | Standard Essential build |
| [4K AllDebrid](#-core-nexus-4k-alldebrid) | AllDebrid | 4K + 1080p | AllDebrid users — full 4K |
| [4K AllDebrid Essential](#-core-nexus-4k-alldebrid-essential) | AllDebrid | 4K + 1080p | AllDebrid — Essential-grade ESE stack |
| [AllDebrid](#-core-nexus-alldebrid) | AllDebrid | 1080p | AllDebrid users — 1080p |
| [4K AllDebrid Lite](#-core-nexus-4k-alldebrid-lite) | AllDebrid | 4K + 1080p | AllDebrid — simple filtering |
| [AllDebrid Lite](#-core-nexus-alldebrid-lite) | AllDebrid | 1080p | AllDebrid — simple filtering |
| [Speed 4K+](#easynews-speed-templates) | Essential + EasyNews | 4K | Instant cached 4K |
| [Speed+](#easynews-speed-templates) | Essential + EasyNews | 1080p | Instant cached 1080p |
| [Speed EasyNews](#easynews-speed-templates) | EasyNews only | 1080p | EasyNews — no TorBox needed |
| [Speed 4K](#torbox-only-speed-templates) | Essential | 4K | Fast cached 4K — no EasyNews needed |
| [Speed](#torbox-only-speed-templates) | Essential | 1080p | Fast cached 1080p — no EasyNews needed || [Anime](#-anime) 🎌 | Essential | 1080p | SeaDex best-release anime |
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
├── Want 4K? → 4K Apex
├── Samsung TV / no Dolby Vision? → Samsung TV · Samsung TV 4K
├── Xiaomi Mi Box S / Android TV box? → Xiaomi 4K
├── Google TV Streamer? → Google TV Streamer 4K
├── Apple TV 4K (Infuse)? → Apple TV 4K (Nightly)
├── Windows PC / ultrawide monitor? → Ultrawide
├── Mobile / data-capped? → Mobile
└── 1080p only? → Stream

TorBox Essential?
├── Single-click instant play (cached only)? → Flash tier
│   ├── 4K? → Flash 4K
│   └── 1080p? → Flash
├── Fast cached play + EasyNews?
│   ├── 4K? → Speed 4K+
│   └── 1080p? → Essential
├── Want 4K? → 4K Essential
└── 1080p standard? → Essential

EasyNews only (no TorBox)? → Speed EasyNews

AllDebrid (no TorBox)?
├── Want 4K?
│   ├── Full IQR filtering → 4K AllDebrid
│   ├── Essential-grade ESE stack → 4K AllDebrid Essential
│   └── Simpler filtering → 4K AllDebrid Lite
└── 1080p only?
    ├── Full → AllDebrid
    └── Lite → AllDebrid Lite

Anime?
├── Want 4K HDR? → Anime 4K
├── Standard 1080p? → Anime
└── Prefer English dubs? → Anime Dub

Getting too few results / low-overhead host? → use the Lite variant of any template above
```

---

## 📋 All Templates

### 🧩 Base Template

| Template | Version | Import URL |
|---|---|---|
| **Core Builds Base — TorBox** | v1.0.0 | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Base/core-nexus-base-torbox.json` |

> **What is the Base Template?** A shared parent config holding all 84 common fields (13 presets, formatter, sort criteria, deduplicator, proxy, regex URLs). Import it once, then enter its UUID in the [Configurator](https://brevitya.github.io/Core-Builds/) to generate lightweight child templates (~44 KB vs ~65 KB standalone) that inherit updates automatically. See [Base Config guide](#-base-config-parentconfig) below.

---

### 📋 All Active Templates

| Template | Plan | Res | Import URL |
|---|---|---|---|
| **Core Nexus 4K Apex** | TorBox Pro | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Core Nexus 4K Apex (TorBox)** | TorBox Pro | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex-torbox.json` |
| **Core Nexus Mobile** | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-mobile.json` |
| **Core Nexus Stream** | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json` |
| **Core Nexus Mixed** | TorBox Pro | 4K → SD adaptive | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-mixed.json` |
| **Core Nexus Stream (Fire Stick)** | TorBox Pro | 1080p SDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Core Nexus Samsung TV** | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json` |
| **Core Nexus Samsung TV 4K** | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json` |
| **Core Nexus Apple TV 4K** 🌙 | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json` |
| **Core Nexus 4K Apex Labs** 🧪 | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json` |
| **Core Nexus Stream Labs** 🧪 | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json` |
| **Core Nexus All-Rounder Labs** 🧪 | TorBox Pro | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json` |
| **Core Nexus Samsung RU7100 4K** | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-ru7100-4k.json` |
| **Core Nexus Xiaomi 4K** | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Xiaomi/core-nexus-xiaomi-4k.json` |
| **Core Nexus Google TV Streamer 4K** | TorBox Pro | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/GoogleTV/core-nexus-google-tv-streamer-4k.json` |
| **Core Nexus Ultrawide** | TorBox Pro | 1080p + 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Windows/core-nexus-ultrawide.json` |
| **Core Nexus Essential Labs** 🧪 | TorBox Essential | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-essential-labs.json` |
| **Core Nexus 4K Essential Labs** 🧪 | TorBox Essential | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-4k-essential-labs.json` |
| **Core Nexus Anime 4K Labs** 🧪 | Essential | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json` |
| **Core Nexus 4K Hybrid** | Pro + NZBGeek | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json` |
| **Core Nexus Hybrid** | Pro + NZBGeek | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json` |
| **Core Nexus 4K Essential** | Essential | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Core Nexus Essential** | Essential | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json` |
| **Core Nexus 4K AllDebrid** | AllDebrid | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json` |
| **Core Nexus 4K AllDebrid Essential** | AllDebrid | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-essential.json` |
| **Core Nexus AllDebrid** | AllDebrid | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-alldebrid.json` |
| **Core Nexus 4K AllDebrid Lite** | AllDebrid | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-lite.json` |
| **Core Nexus AllDebrid Lite** | AllDebrid | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-alldebrid-lite.json` |
| **Core Nexus Speed 4K** | TorBox Essential | 4K+1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json` |
| **Core Nexus Speed** | TorBox Essential | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json` |
| **Core Nexus Speed 4K+** | Essential + EasyNews | 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json` |
| **Core Nexus Speed EasyNews** | EasyNews only | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json` |
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

## 🧩 Base Config (parentConfig)

> **Optional — for Configurator users who want automatic updates and smaller template files.**

Import `Core Builds Base — TorBox` once. It holds all 84 shared fields — 13 presets, formatter, sort criteria, deduplicator, proxy, regex URLs, and category colours. Then open the [Configurator](https://brevitya.github.io/Core-Builds/), enter your base UUID in the **Base Config** panel on the Review step, and generate a child template.

**What changes:**
- Child template: ~44 KB instead of ~65 KB; 24 config keys instead of 111
- When the base is updated, all child templates inherit the change automatically — no re-import needed
- Leaving the UUID blank generates a fully standalone template as before

**Full setup guide:** [Guides/README.md — Section 2b](../Guides/README.md#2b--base-config-parentconfig)

---

## 🔵 TorBox Pro Templates

### 🏆 Core Nexus 4K Apex

Flagship 4K build for TorBox Pro. Full addon stack — DV/HDR, TrueHD/Atmos, BluRay REMUX, cacheAndPlay for Usenet and debrid. IQR Tukey fence PSEs (Q1−1.5×IQR / Q3+1.5×IQR) set adaptive bitrate floors per tier, with min/max fallback for thin pools and a median cluster for new releases under 60 days. BluRay REMUX tiers enforce file size floors (15 GB for 4K, 8 GB for 1080p) to filter mislabeled fakes. HDR and SDR WEB-DL evaluated separately.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Version** | v0.7.8 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ✅ cacheAndPlay + nzbFailover |

---

### 📱 Core Nexus Mobile

Bandwidth-optimised 1080p template for mobile and data-capped connections. 25 Mbps bitrate ceiling, WEB-DL preferred, SDR-first visual tags. Designed for cellular streaming where file size and bandwidth matter most.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-mobile.json` |
| **Version** | v0.1.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-mobile.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ❌ |

---

### 📺 Core Nexus Stream

1080p WEB-DL only. BluRay and Remux excluded. Best for budget hardware or WEB-DL purists.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-stream.json` |
| **Version** | v2.10.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ✅ via Newznab (opt-in) |

---

### 📺 Core Nexus Stream (Fire Stick)

1080p SDR build tuned for Fire Stick and low-RAM streaming devices.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Version** | v2.10.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Resolution** | 1080p · SDR |
| **Usenet** | ❌ |

---

### 📺 Core Nexus Samsung TV

Stream-based 1080p template for Samsung TVs and devices without Dolby Vision support. DV-only streams excluded by default. DV+HDR10 dual-layer files pass through normally.

| | |
|---|---|
| **File** | `Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json` |
| **Version** | v0.3.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ❌ |

---

### 📺 Core Nexus Samsung TV 4K

4K variant of the Samsung TV template. DV-Only Kill ESE enabled by default — DV-only streams excluded, HDR10+/HDR10/HLG/SDR and DV+HDR10 dual-layer pass through normally. HDR10+ is the preferred visual tag. TrueHD, DTS:X, DTS-HD MA, and FLAC hard-excluded for Samsung Tizen compatibility — DD+ Atmos is the top audio format.

| | |
|---|---|
| **File** | `Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json` |
| **Version** | v0.3.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

---

### 📺 Core Nexus Samsung RU7100 4K

Full 4K template for the Samsung RU7100 (2019). Runs the complete APEX IQR PSE stack — 16 PSEs with Tukey fence adaptive bitrate floors. FLAC and AAC pass through natively (Samsung RU7100 decodes these without a receiver). HDR10+, HDR10, and HLG supported; Dolby Vision excluded (Tizen 5.0 has no DV licence). AV1 and VC-1 hard-excluded. TrueHD, DTS:X, and DTS-HD MA excluded for Tizen compatibility.

| | |
|---|---|
| **File** | `Templates/Torbox/Device/Samsung/core-nexus-samsung-ru7100-4k.json` |
| **Version** | v0.3.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-ru7100-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

---

### 📺 Core Nexus Xiaomi 4K

4K template for Xiaomi Mi Box S (2nd gen) and similar Xiaomi / Android TV devices. Dolby Vision Profile 5 and HDR10+ natively supported — DV-Only Kill disabled. AV1 and VC-1 hard-excluded (no hardware decode on 2nd gen; 3rd gen users can remove the AV1 exclusion). Lossless audio excluded (TrueHD, DTS-HD MA, DTS:X, FLAC) — DD+ Atmos is the audio ceiling. Handles REMUX well despite 2GB RAM. Based on Core Nexus Samsung TV 4K with DV-Only Kill removed and DV added to preferred visual tags.

| | |
|---|---|
| **File** | `Templates/Torbox/Device/Xiaomi/core-nexus-xiaomi-4k.json` |
| **Version** | v0.1.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Xiaomi/core-nexus-xiaomi-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

---

### 📺 Core Nexus Google TV Streamer 4K

4K template tuned for the Google TV Streamer (2024). Dolby Vision, HDR10+, HDR10, and HLG all natively supported. AV1 hardware decode enabled — no codec exclusions. Lossless audio excluded (TrueHD, DTS-HD MA, DTS:X, FLAC) — DD+ Atmos is the audio ceiling. Audio channels capped at 5.1. Based on Core Nexus 4K Apex with full IQR Tukey fence PSE stack, Score IQR Guard, elite group pins, and perGroup() Extra Cached. Audio Pinnacle PSE removed (limited audio device).

| | |
|---|---|
| **File** | `Templates/Torbox/Device/GoogleTV/core-nexus-google-tv-streamer-4k.json` |
| **Version** | v0.1.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/GoogleTV/core-nexus-google-tv-streamer-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

---

### 🖥️ Core Nexus Ultrawide

Windows PC / ultrawide monitor template. Prioritises 1080p quality tiers (S/A/B/C) before falling through to 1440p, then 4K as a quality fallback — designed for ultrawide displays that upscale well but primary content is 1080p. Full lossless audio unlocked (TrueHD, DTS-HD MA, DTS:X, FLAC). HDR-first visual tag ordering (HDR+DV, DV, HDR10+, HDR10). AV1 and HEVC preferred for codec efficiency. VC-1 excluded. No hard resolution kill — 1440p and 4K streams are shown when no 1080p stream passes quality thresholds.

| | |
|---|---|
| **File** | `Templates/Torbox/Device/Windows/core-nexus-ultrawide.json` |
| **Version** | v0.2.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Windows/core-nexus-ultrawide.json` |
| **Resolution** | 1080p primary · 1440p + 2160p fallback |
| **Usenet** | ✅ |

---

### 🌙 Core Nexus Apple TV 4K *(Nightly)*

4K template for Apple TV 4K (3rd gen) and Infuse. Dolby Vision Profile 5/8 natively supported — DV streams prioritised. HDR10+ (3rd gen exclusive), HDR10, HLG, and SDR also shown. AV1 hard-excluded (no hardware decoder on A15 chip). DD+ Atmos is the native top audio format. Based on Core Nexus Samsung TV 4K with DV-Only Kill removed and visual tag order adjusted for DV preference.

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json` |
| **Version** | v0.2.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

> 🌙 Nightly — stable for daily use, gathering community feedback before promotion to stable.

---

### 🧪 Labs Templates

Experimental builds testing new SEL expression architectures before promotion to stable. Currently on v0.14.0 — runtime-aware bitrate floors, anime language passthrough, latestSeason-aware season pack kill, subtitle preference PSE, age sort, and cachedAnime/uncachedAnime sort sections. [Full testing guide →](https://github.com/brevityA/Core-Builds/blob/main/Guides/LABS.md)

#### Core Nexus 4K Apex Labs

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json` |
| **Version** | v0.14.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Base** | 4K Apex |
| **Usenet** | ❌ |

#### Core Nexus Stream Labs

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json` |
| **Version** | v0.10.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json` |
| **Resolution** | 1080p |
| **Base** | Stream |
| **Usenet** | ❌ |

#### Core Nexus All-Rounder Labs

Single template for TV, movies, and anime with `isAnime`/`hasSeaDex` conditional tiers. Anime+live-action scrapers combined.

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json` |
| **Version** | v0.4.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json` |
| **Resolution** | 1080p |
| **Usenet** | ❌ |

#### Core Nexus 4K Essential Labs

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Essential/core-nexus-4k-essential-labs.json` |
| **Version** | v0.5.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-4k-essential-labs.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

#### Core Nexus Essential Labs

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Essential/core-nexus-essential-labs.json` |
| **Version** | v0.4.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-essential-labs.json` |
| **Resolution** | 1080p |
| **Usenet** | ❌ |

#### Core Nexus Anime 4K Labs

Anime-specific with `hasSeaDex` conditional PSEs, SeaDex Best pin, anime elite group pins.

| | |
|---|---|
| **File** | `Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json` |
| **Version** | v0.3.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Usenet** | ❌ |

---

### 🔀 Core Nexus 4K Hybrid

TorBox Pro + NZBGeek. Full 4K with maximum source diversity.

| | |
|---|---|
| **File** | `Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json` |
| **Version** | v2.12.8 |
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
| **Version** | v2.10.8 |
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
| **Version** | v2.12.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ❌ |

---

### 📱 Core Nexus Essential

1080p for Essential subscribers.

| | |
|---|---|
| **File** | `Templates/Torbox/Essential/core-nexus-essential.json` |
| **Version** | v2.10.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json` |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ❌ |

---

## 🟠 AllDebrid Templates

AllDebrid variants for users without a TorBox subscription. Same IQR Tukey fence PSE stack as the Essential tier — `stremthruStore` replaces `stremthruTorz`. After import, go to **Add-ons → StremThru AllDebrid** and enter your AllDebrid API key.

### 💎 Core Nexus 4K AllDebrid

Full 4K for AllDebrid. IQR Tukey fence bitrate PSEs · DV/HDR priority · TrueHD/Atmos · AV1.

| | |
|---|---|
| **File** | `Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json` |
| **Version** | v0.4.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json` |
| **Resolution** | 2160p primary, 1080p fallback |

### 💎 Core Nexus 4K AllDebrid Essential

4K AllDebrid build with Essential-grade ESE stack. IQR Tukey fence PSEs, HDR/DV Priority, elite group pins, perGroup() Extra Cached. Same filtering depth as 4K Essential but for AllDebrid users.

| | |
|---|---|
| **File** | `Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-essential.json` |
| **Version** | v0.1.0 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-essential.json` |
| **Resolution** | 2160p primary, 1080p fallback |

### 📱 Core Nexus AllDebrid

1080p AllDebrid. WEB-DL / Remux · HDR preferred · TrueHD/Atmos.

| | |
|---|---|
| **File** | `Templates/Torbox/AllDebrid/core-nexus-alldebrid.json` |
| **Version** | v0.2.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-alldebrid.json` |
| **Resolution** | 1080p · 720p fallback |

### 💡 Core Nexus 4K AllDebrid Lite

4K AllDebrid with simple CB-style PSEs — no IQR Tukey fence. Lighter filtering for users who prefer less complexity.

| | |
|---|---|
| **File** | `Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-lite.json` |
| **Version** | v0.2.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid-lite.json` |
| **Resolution** | 2160p primary, 1080p fallback |

### 💡 Core Nexus AllDebrid Lite

1080p AllDebrid Lite. WEB-DL / Remux · HDR preferred · same PSE stack as AllDebrid 1080p with the Lite naming convention.

| | |
|---|---|
| **File** | `Templates/Torbox/AllDebrid/core-nexus-alldebrid-lite.json` |
| **Version** | v0.2.7 |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/AllDebrid/core-nexus-alldebrid-lite.json` |
| **Resolution** | 1080p · 720p fallback |

---

## ⚡ Speed Tier

> **Zero results?** Speed templates prioritise cached streams — try a popular title first (e.g. Breaking Bad S01E01). Use Core Nexus Essential for full coverage with uncached fallback.

### TorBox-only Speed Templates

No EasyNews required. Library + Zilean + TorBox Search. Exits as soon as 3 cached streams are found or 4 seconds elapse — faster than the full Essential stack, broader than Flash.

| | Speed 4K | Speed |
|---|---|---|
| **Resolution** | 4K + 1080p | 1080p · 720p fallback |
| **Requires** | TorBox Essential | TorBox Essential |
| **Presets** | Library · Zilean · TorBox Search | Library · Zilean · TorBox Search |
| **Exit condition** | 3 cached 4K or 4s | 3 cached 1080p or 4s |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json` |

> 🪶 Lite variants available: [`core-nexus-speed-4k-lite.json`](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k-lite.json) · [`core-nexus-speed-lite.json`](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-lite.json)

### EasyNews Speed Templates

| | Speed 4K+ | Speed EasyNews |
|---|---|---|
| **Resolution** | 4K | 1080p |
| **Requires** | Essential + EasyNews | EasyNews only |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json` |

> **Speed EasyNews** — EasyNews-only instant play. No TorBox subscription required.

---

## 🎌 Anime

SeaDex best-release enforcement · AnimeTosho (Nyaa.si mirror) · FLAC/AAC first · Japanese + English + Dual Audio.

| | Anime | Anime 4K | Anime Dub | Anime Dub 4K |
|---|---|---|---|---|
| **File** | `core-nexus-anime.json` | `core-nexus-anime-4k.json` | `core-nexus-anime-dub.json` | `core-nexus-anime-dub-4k.json` |
| **Resolution** | 1080p primary · 720p fallback | 2160p primary · 1080p fallback | 1080p primary · 720p fallback | 2160p primary · 1080p fallback |
| **Language priority** | Japanese → Dual Audio → English | Japanese → Dual Audio → English | Dubbed → Dual Audio → English → Japanese | Dubbed → Dual Audio → English → Japanese |
| **Visual priority** | SDR-first | DV → HDR10+ → HDR | SDR-first | DV → HDR10+ → HDR |
| **Audio priority** | FLAC → AAC | Atmos → TrueHD → FLAC | FLAC → AAC | Atmos → TrueHD → FLAC |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub.json` | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub-4k.json` |

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
| **Stream Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-lite.json` |
| **Stream (Fire Stick) Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick-lite.json` |
| **Hybrid Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid-lite.json` |
| **4K Essential Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-lite.json` |
| **Essential Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential-lite.json` |
| **Anime Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-lite.json` |
| **Anime 4K Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k-lite.json` |
| **Anime Dub Lite** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub-lite.json` |

---

## 🛠️ Common to All Templates (v3.7.0)

| Feature | Detail |
|---|---|
| **Formatter** | Core Syntax · `id: tamtaro` · `overrides['tamtaro']` |
| **ESEs (standard)** | 24 total — 20 standard + Hard CAM Kill, YouTube Kill, 3D Kill, Season Pack Guard |
| **ESEs (Lite)** | 12 total — quality gates removed, hard kills retained |
| **ISEs** | 6 ISEs — Library, 0Cached, digitalRelease Bypass, SeaDex (anime only), REPACK Passthrough |
| **Sort** | 16 keys: cached → seMatched → seScore → seadex → resolution → quality → regexScore → visualTag → audioTag → audioChannel → language → encode → library → seeders → bitrate → size |
| **Deduplication** | filename + infoHash + smartDetect · 14 attributes · `libraryBehaviour: prefer` |
| **Matching** | title `contains/0.75` · year `±2yr` · season/episode `non-strict` |
| **Auto features** | autoPlay · precacheNextEpisode · preloadStreams · dynamicAddonFetching · checkOwned |
| **Scoring** | Inline `rankedRegexPatterns` (107 patterns, 10 score tiers) + `syncedRankedRegexUrls` (Vidhin05) + `preferredRegexPatterns` |
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

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Wiki](https://github.com/brevityA/Core-Builds/wiki) · [CHANGELOG](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md)*
