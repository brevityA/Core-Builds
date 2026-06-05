# Core Builds — Template Directory

All active templates for AIOStreams v2.30+. Every template requires a **TorBox subscription**. All templates ship with the **Core Syntax Formatter**, Tamtaro standard ESEs + Core Builds kill ESEs, Tamtaro ISEs, and in-app update notifications.

> **Current version: v2.5.1** · [Full template library →](https://github.com/Branding-Brevity/Core-Builds-By-Brevity)

---

## 🗺️ Which Template?

```
TorBox Pro?
├── Want 4K? → 4K Pro
└── 1080p only? → Stream

TorBox Essential?
├── Want 4K? → 4K Essential
└── 1080p standard? → Essential

Speed (cached only)?
├── Want 4K? → Speed 4K
└── 1080p? → Speed
```

> For Flash, Anime, Hybrid, EasyNews, and Lite variants → [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity)

---

## 📋 Templates

| Template | Plan | Res | Import |
|---|---|---|---|
| **Core Nexus 4K Pro** | TorBox Pro | 4K+1080p | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json) |
| **Core Nexus Stream** | TorBox Pro | 1080p | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json) |
| **Core Nexus 4K Essential** | Essential | 4K+1080p | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json) |
| **Core Nexus Essential** | Essential | 1080p | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json) |
| **Core Nexus Speed 4K** | Essential | 4K | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json) |
| **Core Nexus Speed** | Essential | 1080p | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json) |

---

## 📥 How to Import

1. Click the **Import →** link next to your chosen template — copy the URL from your browser's address bar
2. Open your AIOStreams host → **About → Get Started → Load Template** → paste URL
3. Enter your **TorBox API key** in Services
4. Enter your **TMDB Access Token** (recommended — improves title matching)
5. Save → copy manifest URL → install in Stremio or WuPlay

---

## 🔵 TorBox Pro Templates

### 🏆 Core Nexus 4K Pro

Flagship 4K build. Full addon stack. Targets DV/HDR, TrueHD/Atmos, BluRay REMUX.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-4k-pro.json` |
| **Version** | v2.5.0 |
| **Import** | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json) |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ✅ cacheAndPlay + nzbFailover |

---

### 📺 Core Nexus Stream

1080p WEB-DL only. BluRay and Remux excluded.

| | |
|---|---|
| **File** | `Templates/Torbox/Single/core-nexus-stream.json` |
| **Version** | v2.5.0 |
| **Import** | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json) |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ✅ via Newznab (opt-in) |

---

## 🟡 TorBox Essential Templates

### 💎 Core Nexus 4K Essential

Full 4K for Essential plan. No Usenet.

| | |
|---|---|
| **File** | `Templates/Torbox/Essential/core-nexus-4k-essential.json` |
| **Version** | v2.5.0 |
| **Import** | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json) |
| **Resolution** | 2160p primary, 1080p fallback |
| **Usenet** | ❌ |

---

### 📱 Core Nexus Essential

1080p for Essential subscribers.

| | |
|---|---|
| **File** | `Templates/Torbox/Essential/core-nexus-essential.json` |
| **Version** | v2.5.0 |
| **Import** | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json) |
| **Resolution** | 1080p · 720p fallback |
| **Usenet** | ❌ |

---

## ⚡ Speed Tier

> **Zero results?** Speed templates only show cached streams — try a popular title first (e.g. Breaking Bad S01E01). Use Core Nexus Essential for full coverage.

| | Speed 4K | Speed |
|---|---|---|
| **Resolution** | 4K | 1080p |
| **Requires** | Essential | Essential |
| **Import** | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json) | [Import →](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json) |

---

## 🛠️ Common to All Templates (v2.5.1)

| Feature | Detail |
|---|---|
| **Formatter** | Core Syntax · `id: tamtaro` · `overrides['tamtaro']` |
| **ESEs** | 24 total — 20 Tamtaro standard + Hard CAM Kill, YouTube Kill, 3D Kill, Season Pack Guard |
| **ISEs** | 6 Tamtaro ISEs — Library, 0Cached, digitalRelease Bypass |
| **Sort** | cached → matched → score → resolution → quality → audio → language |
| **Deduplication** | filename + infoHash + smartDetect · 14 attributes · `libraryBehaviour: prefer` |
| **Matching** | title `contains/0.75` · year `±2yr` · season/episode `non-strict` |
| **Auto features** | autoPlay · precacheNextEpisode · preloadStreams · dynamicAddonFetching · checkOwned |
| **Scoring** | Vidhin05 ranked regex · Tamtaro synced PSEs |
| **RPDB** | `t0-free-rpdb` baked in |
| **In-app updates** | `metadata.changelog` embedded |

---

*Backup mirror of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity) · v2.5.1*
