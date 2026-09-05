<p align="center">
  <a href="https://github.com/brevityA/Core-Builds/releases/latest">
    <img src="https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/banner_square.svg" alt="Core Builds Banner" width="400"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/brevityA/Core-Builds/actions/workflows/validate.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/brevityA/Core-Builds/validate.yml?style=for-the-badge&label=BUILD&logo=github&logoColor=white&labelColor=1a1f27" alt="Build Status"/>
  </a>
  <a href="https://github.com/brevityA/Core-Builds/releases/latest">
    <img src="https://img.shields.io/badge/RELEASE-v3.7.0-00d4ff?style=for-the-badge&labelColor=1a1f27" alt="Latest Release"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/brevityA/Core-Builds/stargazers">
    <img src="https://img.shields.io/github/stars/brevityA/Core-Builds?style=for-the-badge&label=STARS&logo=github&logoColor=white&labelColor=1a1f27&color=00d4ff&cacheSeconds=86400" alt="Stars"/>
  </a>
  <a href="https://ko-fi.com/branding_brevity">
    <img src="https://img.shields.io/badge/DONATE-Ko--fi-ff5f5f?style=for-the-badge&logo=ko-fi&logoColor=white&labelColor=1a1f27" alt="Donate"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/brevityA/Core-Builds/discussions">
    <img src="https://img.shields.io/badge/DISCUSSIONS-Community-00d4ff?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1f27" alt="Discussions"/>
  </a>
  <a href="https://www.reddit.com/r/CoreBuilds/">
    <img src="https://img.shields.io/badge/REDDIT-r%2FCoreBuilds-FF4500?style=for-the-badge&logo=reddit&logoColor=white&labelColor=1a1f27" alt="Reddit"/>
  </a>
  <a href="https://corebuilds-docs.docsalot.dev/roadmap">
    <img src="https://img.shields.io/badge/ROADMAP-What's_Next-00d4ff?style=for-the-badge&logo=gitbook&logoColor=white&labelColor=1a1f27" alt="Roadmap"/>
  </a>
  <a href="https://corebuilds-docs.docsalot.dev">
    <img src="https://img.shields.io/badge/DOCS-corebuilds-docs.docsalot.dev-00d4ff?style=for-the-badge&logo=gitbook&logoColor=white&labelColor=1a1f27" alt="Documentation"/>
  </a>
  <a href="https://discord.gg/ZvjnKbrq">
    <img src="https://img.shields.io/badge/DISCORD-Join_Us-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=1a1f27" alt="Discord"/>
  </a>
</p>

<p align="center">
  <a href="https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e">
    <img src="https://img.shields.io/badge/TorBox-Get_15_days_free_with_code_d1ccddb0-f97316?style=for-the-badge&logo=thunder&logoColor=white&labelColor=1a1f27" alt="TorBox Referral"/>
  </a>
</p>

<p align="center">
  Template directory, import links, and full documentation have moved to<br/>
  <a href="https://corebuilds-docs.docsalot.dev/templates/directory"><b>corebuilds-docs.docsalot.dev</b></a>
</p>

<p align="center">
  <a href="https://brevitya.github.io/Core-Builds/">
    <img src="https://img.shields.io/badge/OPEN_CONFIGURATOR-Build_your_template_in_30_seconds-00d4ff?style=for-the-badge&logo=react&logoColor=white&labelColor=1a1f27" alt="Open the Core Builds Configurator"/>
  </a>
</p>

> 🚀 **These templates are built for [TorBox](https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e).** Use the referral link above and get **up to 84 extra days free** depending on the plan — and support this project.

---

## 🎛️ Core Builds Configurator — the main product

The [**Configurator**](https://brevitya.github.io/Core-Builds/) turns your service, device, and preferences into a polished, tuned AIOStreams template — **"Build streams with intent"**, no JSON editing required. It shares its policies, formatters and filter stack with the pinned template suite below, so a generated setup and a shipped template speak the same language.

| Route | For |
|---|---|
| ⚡ **Express Install** | One click — pick debrid · profile · device, install in ~30s (Stremio, WuPlay, Nuvio, or manifest) |
| 🛠️ **Advanced Builder** | Full control: filters, sort rules, SEL expressions, 19 formatters, subtitles, catalogs, proxy, bandwidth cap |
| 🔄 **Update Existing Setup** | Import your live config or template → rebuild with current logic, diffed, with cherry-pick |
| 🧞 **Setup Genie** | Chat-style guided walkthrough for first-timers |

**What it does that a pinned template can't:**
- **Device-aware profiles** — Fire Stick, Apple TV, Samsung, Android TV, Windows, ultrawide… each sets the right codec limits, HDR handling and resolution caps.
- **Host Compatibility gate** — options your chosen AIOStreams host (ElfHosted, Yeb's, self-hosted…) would reject are greyed out and stripped *before* you save — no more "X/Y regexes are not allowed" surprises.
- **Direct Install with soft-fail recovery** — deploys to your host; if an add-on fetch fails, it offers to disable and retry with an auto-backup.
- **Free and paid alike** — TorBox, Real-Debrid, AllDebrid, EasyNews, plus free P2P/HTTP lanes with no account or server-side credentials.
- **Runs locally, works offline** — export stays in your browser; the whole app is a [single-file build](https://github.com/brevityA/Core-Builds/blob/main/configurator/index.html) you can download and open anywhere.

> 📖 Configurator guide: [core-builds.mintlify.app/configurator](https://core-builds.mintlify.app/configurator)

---

## 🚀 Quick Start

### ⭐ Recommended: let the Configurator build it

Open the [**Configurator**](https://brevitya.github.io/Core-Builds/) and pick a route — **⚡ Express Install** is one click from debrid + device to deployed config. It generates the template, **Direct Installs** it to your chosen AIOStreams host, and opens Stremio / WuPlay / Nuvio. Prefer to stay manual? Export the JSON and import it in the next section.

### Or: import a pinned template

**Three steps to get running:**

1. **Pick your template** from the table below → copy its import URL
2. **Open your AIOStreams host** → Settings → About → Get Started → Load Template → paste URL
3. **Enter your TorBox API key** → Save → copy manifest URL → install in Stremio or WuPlay

> 🟢 [**Live host status →**](https://github.com/brevityA/Core-Builds/blob/main/STATUS.md) — ElfHosted · Yeb's · Midnight's · Kuu's · ATBP · Omni's

---

## 📋 Pick Your Template

### Don't know which to choose?

```
First install, import troubleshooting, or want the smallest predictable setup?
├── Want 4K? → Core Stable 4K
└── 1080p? → Core Stable 1080p

TorBox Pro?
├── Got NZBGeek/Usenet indexer?
│   ├── Want 4K? → 4K Hybrid
│   └── 1080p only? → Hybrid
├── Want 4K? → 4K Apex
├── Samsung TV / no Dolby Vision? → Samsung TV · Samsung TV 4K
└── 1080p only? → Stream

TorBox Essential?
├── Want single-click instant play? → Flash tier
├── Have EasyNews + want 4K cached? → Speed 4K+
├── Want 4K? → 4K Essential
└── 1080p standard? → Essential

EasyNews only (no TorBox)? → Speed EasyNews

Watching anime?
├── Want 4K HDR? → Anime 4K
├── Standard 1080p? → Anime
└── Prefer English dubs? → Anime Dub

Getting too few results / low-overhead host? → use the Lite variant of any template above
```

> 🎛️ Prefer a setup tuned to *your* device and host instead of a pinned template? **[Generate one in the Configurator →](https://brevitya.github.io/Core-Builds/)** — it covers every lane above, plus free P2P/HTTP builds.

---

### 🟢 Core Stable — predictable baseline

> Start here for a first install, import troubleshooting, or a conservative setup. Core Stable uses no remote SEL/regex sync, no add-on groups, no dynamic early fetch exit, one native result-limit policy, and visible diagnostics. It deliberately keeps valid season and multi-episode packs available.

| Template | Res | Import URL |
|---|---|---|
| **Core Stable 1080p · TorBox** | 1080p + 720p fallback | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Stable/core-stable-torbox-1080p.json` |
| **Core Stable 4K · TorBox** | 4K + 1080p fallback | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Stable/core-stable-torbox-4k.json` |

> Need additional local scoring, IQR, or experimental fetching behaviour? Choose a named Balanced, Advanced, or Labs output profile in the Configurator rather than layering extra rules over a Stable template.

---

### 🔵 TorBox Pro

| Template | Res | Import URL |
|---|---|---|
| **Core Nexus 4K Apex** | 4K HDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json` |
| **Core Nexus 4K Apex (TorBox)** | 4K HDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex-torbox.json` |
| **Core Nexus Stream** | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json` |
| **Core Nexus Stream (Fire Stick)** | 1080p SDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json` |
| **Core Nexus Samsung TV** | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json` |
| **Core Nexus Samsung TV 4K** | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json` |
| **Core Nexus 4K Hybrid** ⚠️ | 4K HDR | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-4k-hybrid.json` |
| **Core Nexus Hybrid** ⚠️ | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json` |

> ⚠️ Hybrid templates require a **NZBGeek API key** — enter it in Add-ons → Newznab after loading.

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
| **Speed 4K** | 4K + 1080p | TorBox Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json` |
| **Speed** | 1080p | TorBox Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json` |
| **Speed 4K+** | 4K | Essential + EasyNews | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json` |
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
| **Core Nexus Anime Dub** | 1080p · Dubbed-first | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub.json` |

SeaDex best-release enforcement · AnimeTosho · FLAC/AAC audio priority · Japanese + English + Dual Audio · Anime Dub prioritises English dubs and Dual Audio

---

### 🌙 Nightly / Device

> Pre-release templates targeting specific hardware or use-cases. These are stable enough for daily use but ship under the Nightly label while they gather community feedback. Not included in stable release archives.

| Template | Device / Use-case | Res | Import URL |
|---|---|---|---|
| **Core Nexus Apple TV 4K** 🌙 | Apple TV 4K / Infuse | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json` |
| **Core Nexus Samsung RU7100 4K** | Samsung RU7100 (2019) | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Device/Samsung/core-nexus-samsung-ru7100-4k.json` |

> **Samsung TV:** DV-only streams excluded by default (Samsung TVs lack a DV licence on most models — DV-only files display as a black screen). TrueHD / DTS:X / FLAC also excluded for Tizen compatibility. DV+HDR10 dual-layer files pass through. TorBox Pro · Essential plan.

> **Apple TV 4K:** Dolby Vision Profile 5/8 native via Infuse — DV streams prioritised. AV1 hard-excluded (no hardware decoder on A15). DD+ Atmos top audio. Based on Core Nexus 4K Apex · TorBox Pro.

---

### 🧪 Labs — Experimental Builds

> Labs templates test new SEL expression architectures before promotion to stable. Currently testing v0.14.0 features: runtime-aware bitrate floors, anime language passthrough, latestSeason-aware season pack kill, subtitle preference PSE, age sort key for uncached streams, and anime-specific sort sections.

| Template | Version | Res | Import URL |
|---|---|---|---|
| **Core Nexus 4K Apex Labs** 🧪 | v0.15.2 | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json` |
| **Core Nexus Stream Labs** 🧪 | v0.10.2 | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json` |
| **Core Nexus All-Rounder Labs** 🧪 | v0.4.2 | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json` |
| **Core Nexus 4K Essential Labs** 🧪 | v0.6.2 | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-4k-essential-labs.json` |
| **Core Nexus Essential Labs** 🧪 | v0.4.2 | 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Essential/core-nexus-essential-labs.json` |
| **Core Nexus Anime 4K Labs** 🧪 | v0.3.1 | 4K + 1080p | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json` |

> [**Full Labs changelog & testing guide →**](https://github.com/brevityA/Core-Builds/blob/main/Guides/LABS.md)

---

### 🪶 Lite — Relaxed Filtering

> Same templates, fewer quality gates. **24 ESEs → 12.** Low Bitrate, Low Seeders, Low SEL Score, and all result limiters removed. Shows more streams, including ones the standard suite would cut. Hard kills (CAM, YouTube, 3D) remain. Use when the standard templates return too few results, or on low-overhead hosts.

| Template | Base | Import URL |
|---|---|---|
| **Stream Lite** | Stream | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-lite.json` |
| **Stream Fire Stick Lite** | Stream (Fire Stick) | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick-lite.json` |
| **Hybrid Lite** ⚠️ | Hybrid | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid-lite.json` |
| **4K Essential Lite** | 4K Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-lite.json` |
| **Essential Lite** | Essential | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential-lite.json` |
| **Anime Lite** | Anime | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-lite.json` |
| **Anime 4K Lite** | Anime 4K | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k-lite.json` |
| **Anime Dub Lite** | Anime Dub | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-dub-lite.json` |

---

## 🌍 Community Templates

| Template | Author | Plan | Import |
|---|---|---|---|
| [Prism TorBox Essential 1080p](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json) | MightyIcyy | Essential | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json) |
| [RB3 TorBox Pro + RD Hybrid](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/RB3/rb3-hybrid/rb3-torbox-pro-rd-hybrid.json) | RB3 | TorBox Pro + RD | [↓ JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/RB3/rb3-hybrid/rb3-torbox-pro-rd-hybrid.json) · [README](https://github.com/brevityA/Core-Builds/blob/main/Community-Templates/Templates/RB3/rb3-hybrid/README.md) |

> Community templates are not Core Builds-maintained profiles. A community template that uses synced stream-expression URLs is not compatible with the Core Builds local-expression policy and may fail on public hosts. Want your template listed? Open a PR to `Community-Templates/` with your JSON and a README.

---

## 🎨 Formatters

All formatters use `id: tamtaro` with `definitions.overrides['tamtaro']`. Import via AIOStreams → Settings → Formatter → Custom.

| Formatter | Bundled In | Download |
|---|---|---|
| **Core Nexus Elite** | All 14 Core Nexus templates | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-elite-formatter.json) |
| **Core Nexus TV** | Stand-alone · all templates | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-tv-formatter.json) |
| **Core Syntax V3** | Core Cipher personal build | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-syntax-v3.json) |
| **Core Nexus Uniform** | Legacy — replaced by Core Nexus Elite | [↓ Download](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-uniform-formatter.json) |

> 📁 [**Browse all formatters →**](https://github.com/brevityA/Core-Builds/tree/main/Formatters)

---

## 🔧 What's Inside Every Template

| Feature | Detail |
|---|---|
| **Formatter** | Core Syntax — `id: tamtaro`, custom override |
| **Filtering** | 24 ESEs (20 standard + 4 CB kills) · 6 ISEs (Library, 0Cached, digitalRelease Bypass) |
| **Sorting** | cached → matched → score → resolution → quality → audio → language |
| **Deduplication** | filename + infoHash + smartDetect · 14 attributes · libraryBehaviour: prefer |
| **Matching** | titleMatching contains/0.75 · yearMatching ±2yr · seasonEpisode non-strict |
| **Auto features** | autoPlay · precacheNextEpisode · preloadStreams · dynamicAddonFetching · checkOwned |
| **Scoring** | Inline `rankedRegexPatterns` (107 patterns, 10 score tiers) + `syncedRankedRegexUrls` (Vidhin05) + template-specific `preferredRegexPatterns` |
| **RPDB** | `t0-free-rpdb` baked in |
| **TMDB** | `<template_placeholder>` — fill in during import for best matching |
| **In-app updates** | `metadata.changelog` embedded — shows what changed on re-import |

---

## 📂 Repository

| Folder | Contents |
|---|---|
| [`configurator/`](https://github.com/brevityA/Core-Builds/tree/main/configurator) | **Core Builds Configurator** — the web app that generates tuned AIOStreams templates; ships as a single-file build live at [brevitya.github.io/Core-Builds](https://brevitya.github.io/Core-Builds/) |
| [`tools/`](https://github.com/brevityA/Core-Builds/tree/main/tools) | Companion utilities — Preflight audit, Template Inspector, Badge Builder, Banner Studio, CoreSpeed |
| [`Templates/Stable/`](https://github.com/brevityA/Core-Builds/tree/main/Templates/Stable) | Core Stable baseline templates — minimal local filtering and predictable fetch behaviour |
| [`Templates/Torbox/`](https://github.com/brevityA/Core-Builds/tree/main/Templates/Torbox) | Curated TorBox, device, Lite, Nightly, and Labs templates |
| [`Community-Templates/`](https://github.com/brevityA/Core-Builds/tree/main/Community-Templates) | Community-submitted templates |
| [`Filtering/`](https://github.com/brevityA/Core-Builds/tree/main/Filtering) | Core Builds ESEs, PSEs, ISEs — standalone import files |
| [`Formatters/`](https://github.com/brevityA/Core-Builds/tree/main/Formatters) | Elite, TV, and legacy formatters |
| [`Guides/`](https://github.com/brevityA/Core-Builds/tree/main/Guides) | Import guide, troubleshooting, device profiles |
| [`CHANGELOG.md`](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) | Full version history |
| [`STATUS.md`](https://github.com/brevityA/Core-Builds/blob/main/STATUS.md) | Live host status |

---

## 📖 Documentation

Full docs at **[corebuilds-docs.docsalot.dev](https://corebuilds-docs.docsalot.dev)**

| Guide | Link |
|---|---|
| Configurator | [Docs → Template Configurator](https://core-builds.mintlify.app/configurator) |
| Quick Start | [Docs → Quick Start](https://corebuilds-docs.docsalot.dev/getting-started/quick-start) |
| Import a template | [Docs → Importing a Template](https://corebuilds-docs.docsalot.dev/guides/importing-templates) |
| Which template? | [Docs → Which Template?](https://corebuilds-docs.docsalot.dev/guides/choosing-a-template) |
| Formatters | [Docs → Formatters](https://corebuilds-docs.docsalot.dev/guides/formatters) |
| Device profiles | [Docs → Device Profiles](https://corebuilds-docs.docsalot.dev/guides/device-profiles) |
| Troubleshooting | [Docs → Troubleshooting](https://corebuilds-docs.docsalot.dev/support/troubleshooting) |
| FAQ | [Docs → FAQ](https://corebuilds-docs.docsalot.dev/support/faq) |

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

Current: **`v3.7.0`** · [Full changelog](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) · [Releases](https://github.com/brevityA/Core-Builds/releases)

---

## 🤖 Transparency

Templates were created from scratch and debugged with AI assistance. GitHub infrastructure was set up with AI help. Everything has been personally tested.

---

## 🙏 Credits & Acknowledgements

Core Builds by Brevity is built on the work of the following projects and authors. Their contributions are embedded in every template.

| Project | Author | Contribution |
|---|---|---|
| [Releases-Regex](https://github.com/Vidhin05/Releases-Regex) | [@Vidhin05](https://github.com/Vidhin05) | Ranked regex pattern format that influenced the `Filtering/ranked-regex-patterns.json` scoring architecture |
| [AIOStreams](https://github.com/Viren070/AIOStreams) | [@Viren070](https://github.com/Viren070) | The open-source platform all templates are built for |
| Meteor for the Weebs | [@midnightignite](https://github.com/midnightignite) | Community Meteor endpoint pinned across all templates |

---
