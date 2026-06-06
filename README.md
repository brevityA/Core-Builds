<p align="center">
  <a href="https://github.com/brevityA/Core-Builds/releases/latest">
    <img src="https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/banner.svg" alt="Core Builds Banner" width="100%"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/brevityA/Core-Builds/actions/workflows/validate.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/brevityA/Core-Builds/validate.yml?style=for-the-badge&label=BUILD&logo=github&logoColor=white&labelColor=1a1f27" alt="Build Status"/>
  </a>
  <a href="https://github.com/brevityA/Core-Builds/releases/latest">
    <img src="https://img.shields.io/github/v/release/brevityA/Core-Builds?style=for-the-badge&label=RELEASE&labelColor=1a1f27&color=00d4ff" alt="Latest Release"/>
  </a>
  <a href="https://github.com/brevityA/Core-Builds/stargazers">
    <img src="https://img.shields.io/github/stars/brevityA/Core-Builds?style=for-the-badge&label=STARS&logo=github&logoColor=white&labelColor=1a1f27&color=00d4ff&cacheSeconds=86400" alt="Stars"/>
  </a>
  <a href="https://ko-fi.com/branding_brevity">
    <img src="https://img.shields.io/badge/DONATE-Ko--fi-ff5f5f?style=for-the-badge&logo=ko-fi&logoColor=white&labelColor=1a1f27" alt="Donate"/>
  </a>
  <a href="https://github.com/brevityA/Core-Builds/discussions">
    <img src="https://img.shields.io/badge/DISCUSSIONS-Community-7c3aed?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1f27" alt="Discussions"/>
  </a>
  <a href="https://github.com/brevityA/Core-Builds/blob/main/ROADMAP.md">
    <img src="https://img.shields.io/badge/ROADMAP-What's_Next-0ea5e9?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1f27" alt="Roadmap"/>
  </a>
</p>

<p align="center">
  <a href="https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e">
    <img src="https://img.shields.io/badge/TorBox-Get_15_days_free_with_code_d1ccddb0-f97316?style=for-the-badge&logo=thunder&logoColor=white&labelColor=1a1f27" alt="TorBox Referral"/>
  </a>
</p>

> 🚀 **These templates are built for [TorBox](https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e).** Use the referral link above and get **up to 84 extra days free** depending on the plan — and support this project.

---

## 🚀 Quick Start

**Three steps to get running:**

1. **Pick your template** from the table below → copy its import URL
2. **Open your AIOStreams host** → Settings → About → Get Started → Load Template → paste URL
3. **Enter your TorBox API key** → Save → copy manifest URL → install in Stremio or WuPlay

> 🟢 [**Live host status →**](https://github.com/brevityA/Core-Builds/blob/main/STATUS.md) — ElfHosted · Yeb's · Midnight's · Kuu's · ATBP · Omni's

---

## 📋 Pick Your Template

### Don't know which to choose?

```
TorBox Pro?
├── Got NZBGeek/Usenet indexer? → Hybrid
├── Want 4K? → 4K Pro
└── 1080p only? → Stream

TorBox Essential?
├── Want single-click instant play? → Flash tier
├── Want fastest general play (2-3s)? → Speed tier
├── Want 4K? → 4K Essential
└── 1080p standard? → Essential

EasyNews only (no TorBox)? → Speed EasyNews

Watching anime?
├── Want 4K HDR? → Anime 4K
└── Standard 1080p? → Anime

Getting too few results / low-overhead host? → use the Lite variant of any template above
```

---

### 🔵 TorBox Pro

| Template | Res | Import URL |
|---|---|---|
| **Core Nexus 4K Pro** | 4K HDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json` |
| **Core Nexus Stream** | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json` |
| **Core Nexus Hybrid** ⚠️ | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json` |

> ⚠️ Hybrid requires a **NZBGeek API key** — enter it in Add-ons → Newznab after loading.

---

### 🟡 TorBox Essential

| Template | Res | Import URL |
|---|---|---|
| **Core Nexus 4K Essential** | 4K HDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Core Nexus Essential** | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json` |

---

### ⚡ Speed — Instant Cached Play

> Zero results = content not cached in TorBox yet. Test with a popular title first. For full coverage use Core Nexus Essential.

| Template | Res | Requires | Import URL |
|---|---|---|---|
| **Speed 4K+** | 4K | Essential + EasyNews | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json` |
| **Speed+** | 1080p | Essential + EasyNews | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus.json` |
| **Speed 4K** | 4K | Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json` |
| **Speed** | 1080p | Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json` |
| **Speed EasyNews** | 1080p | EasyNews only | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json` |

---

### ⚡⚡ Flash — Single-Click Instant Play

> Pure cached-only builds. Only streams already cached in TorBox appear — zero uncached results. If nothing is cached, the 0Cached ISE shows a title passthrough instead of a blank screen. Faster than Speed because there's nothing to wait for.

| Template | Res | Import URL |
|---|---|---|
| **Core Nexus Flash** | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash.json` |
| **Core Nexus Flash 4K** | 4K + 1080p fallback | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash-4k.json` |

---

### 🎌 Anime

| Template | Res | Import URL |
|---|---|---|
| **Core Nexus Anime** | 1080p + 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime.json` |
| **Core Nexus Anime 4K** | 4K + 1080p fallback | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k.json` |

SeaDex best-release enforcement · AnimeTosho · FLAC/AAC audio priority · Japanese + English + Dual Audio

---

### 🪶 Lite — Relaxed Filtering

> Same templates, fewer quality gates. **24 ESEs → 12.** Low Bitrate, Low Seeders, Low SEL Score, and all result limiters removed. Shows more streams, including ones the standard suite would cut. Hard kills (CAM, YouTube, 3D) remain. Use when the standard templates return too few results, or on low-overhead hosts.

| Template | Base | Import URL |
|---|---|---|
| **4K Pro Lite** | 4K Pro | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro-lite.json` |
| **Stream Lite** | Stream | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-lite.json` |
| **Hybrid Lite** ⚠️ | Hybrid | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid-lite.json` |
| **4K Essential Lite** | 4K Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-lite.json` |
| **Essential Lite** | Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential-lite.json` |
| **Speed 4K+ Lite** | Speed 4K+ | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus-lite.json` |
| **Speed+ Lite** | Speed+ | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus-lite.json` |
| **Speed EasyNews Lite** | Speed EasyNews | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews-lite.json` |
| **Speed 4K Lite** | Speed 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k-lite.json` |
| **Speed Lite** | Speed | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-lite.json` |
| **Anime Lite** | Anime | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-lite.json` |
| **Anime 4K Lite** | Anime 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k-lite.json` |

---

## 🌍 Community Templates

| Template | Author | Plan | Import |
|---|---|---|---|
| [Prism TorBox Essential 1080p](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json) | MightyIcyy | Essential | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json) |
| [RB3 TorBox Pro + RD Hybrid](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/RB3/RB3%20Hybrid/RB3%20TorBox%20Pro%20%2B%20RD%20Hybrid.json) | RB3 | TorBox Pro + RD | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/RB3/RB3%20Hybrid/RB3%20TorBox%20Pro%20%2B%20RD%20Hybrid.json) · [README](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/RB3/RB3%20Hybrid/Readme.md) |

> Want your template listed? Open a PR to `Community-Templates/` with your JSON and a README.

---

## 🎨 Formatters

All formatters use `id: tamtaro` with `definitions.overrides['tamtaro']`. Import via AIOStreams → Settings → Formatter → Custom.

| Formatter | Bundled In | Download |
|---|---|---|
| **Core Nexus Elite** | All 14 Core Nexus templates | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-elite-formatter.json) |
| **Core Nexus TV** | Stand-alone · all templates | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-tv-formatter.json) |
| **Core Syntax V3** | Core Cipher personal build | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-syntax-v3.json) |
| **Core Nexus Uniform** | Legacy — replaced by Core Nexus Elite | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/Core%20Nexus%20Uniform%20Formatter.json) |

> 📁 [**Browse all formatters →**](https://github.com/brevityA/Core-Builds/tree/main/Formatters)

---

## 🔧 What's Inside Every Template

| Feature | Detail |
|---|---|
| **Formatter** | Core Syntax — `id: tamtaro`, custom override |
| **Filtering** | 24 ESEs (20 Tamtaro standard + 4 CB kills) · 6 ISEs (Library, 0Cached, digitalRelease Bypass) |
| **Sorting** | cached → matched → score → resolution → quality → audio → language |
| **Deduplication** | filename + infoHash + smartDetect · 14 attributes · libraryBehaviour: prefer |
| **Matching** | titleMatching contains/0.75 · yearMatching ±2yr · seasonEpisode non-strict |
| **Auto features** | autoPlay · precacheNextEpisode · preloadStreams · dynamicAddonFetching · checkOwned |
| **Scoring** | Vidhin05 ranked regex synced · Tamtaro PSE synced URL |
| **RPDB** | `t0-free-rpdb` baked in |
| **TMDB** | `<template_placeholder>` — fill in during import for best matching |
| **In-app updates** | `metadata.changelog` embedded — shows what changed on re-import |

---

## 📂 Repository

| Folder | Contents |
|---|---|
| [`Templates/Torbox/`](https://github.com/brevityA/Core-Builds/tree/main/Templates/Torbox) | 28 active templates — 16 standard + 12 Lite variants |
| [`Community-Templates/`](https://github.com/brevityA/Core-Builds/tree/main/Community-Templates) | Community-submitted templates |
| [`Filtering/`](https://github.com/brevityA/Core-Builds/tree/main/Filtering) | Core Builds ESEs, PSEs, ISEs — standalone import files |
| [`Formatters/`](https://github.com/brevityA/Core-Builds/tree/main/Formatters) | Elite, TV, and legacy formatters |
| [`Guides/`](https://github.com/brevityA/Core-Builds/tree/main/Guides) | Import guide, troubleshooting, device profiles |
| [`CHANGELOG.md`](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) | Full version history |
| [`STATUS.md`](https://github.com/brevityA/Core-Builds/blob/main/STATUS.md) | Live host status |

---

## 📖 Guides

| Guide | Link |
|---|---|
| Import a template | [Guides → Import](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md#1--importing-a-template) |
| Formatters | [Guides → Formatters](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md#2--formatters) |
| Filtering | [Guides → Filtering](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md#3--filtering) |
| Device profiles | [Guides → Device Profiles](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md#4--device-profiles) |
| Troubleshooting | [Guides → Troubleshooting](https://github.com/brevityA/Core-Builds/blob/main/Guides/README.md#6--troubleshooting) |

---

## 🔁 AIOStreams Hosts

| Host | Type | URL |
|---|---|---|
| **ElfHosted** | Stable | [aiostreams.elfhosted.com](https://aiostreams.elfhosted.com/stremio/configure) |
| **Yeb's (Fortheweak)** | Stable + Nightly | [aiostreams.fortheweak.cloud](https://aiostreams.fortheweak.cloud/stremio/configure) |
| **Midnight's** ⚠️ | Beta — Meteor V2 | — |
| **Kuu's** | Stable | — |

---

## ☕ Support

| | |
|---|---|
| **Ko-fi** | [ko-fi.com/branding_brevity](https://ko-fi.com/branding_brevity) |
| **TorBox referral** | Code `d1ccddb0-f094-45ca-b52b-942a2635855e` — [15 days free →](https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e) |

---

## 📜 Version

Current: **`v2.5.1`** · [Full changelog](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) · [Releases](https://github.com/brevityA/Core-Builds/releases)

---

## 🤖 Transparency

Templates were created from scratch and debugged with AI assistance. GitHub infrastructure was set up with AI help. Everything has been personally tested.

---

## 🙏 Credits & Acknowledgements

Core Builds by Brevity is built on the work of the following projects and authors. Their contributions are embedded in every template.

| Project | Author | Contribution |
|---|---|---|
| [Tamtaro SEL Setup](https://git.tamtaro.de) | [@Tam-Taro](https://github.com/Tam-Taro) | ISEs, ESEs, PSEs, synced URL patterns, and the `tamtaro` formatter type powering every template in this repo |
| [Releases-Regex](https://github.com/Vidhin05/Releases-Regex) | [@Vidhin05](https://github.com/Vidhin05) | Ranked regex patterns for quality detection, synced into all templates |
| [AIOStreams](https://github.com/Viren070/AIOStreams) | [@Viren070](https://github.com/Viren070) | The open-source platform all templates are built for |
| Meteor for the Weebs | [@midnightignite](https://github.com/midnightignite) | Community Meteor endpoint pinned across all templates |

> The filtering engine in every Core Builds template directly embeds Tamtaro's Standard SEL ISEs and ESEs. The formatter uses `id: "tamtaro"` — a type he contributed to AIOStreams itself. If these templates are useful to you, please consider supporting [Tamtaro on Ko-fi](https://ko-fi.com/tamtaro).

---
