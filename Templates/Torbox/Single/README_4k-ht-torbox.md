# Core Nexus 4K HT TorBox
**Version:** 2.1.0 · **Services:** TorBox only · **Resolution:** 4K UHD

> The TorBox-exclusive home theater build. No secondary debrid service required — a single TorBox subscription is all you need. Targets the same 4K quality ceiling as the Dual Core build: Dolby Vision, lossless audio, and full BluRay REMUX up to 150 GB.

---

## 🎯 Designed For

Nvidia Shield · Apple TV 4K · High-end Android TV · 4K OLED / QLED displays

---

## ✅ What It Targets / ❌ What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 2160p, 1080p | 1440p, Unknown |
| **Quality** | BluRay REMUX, BluRay, WEB-DL, WEBRip | CAM, SCR, TS, TC, HC HD-Rip |
| **Visual** | DV, HDR+DV, HDR10+, HDR10, HDR, HLG, SDR | 3D, H-OU, H-SBS |
| **Encode** | HEVC, AV1, AVC | — |
| **Audio** | TrueHD, Atmos, DTS:X, DTS-HD MA, FLAC | — |
| **Channels** | 7.1 preferred, 5.1 fallback | — |
| **Streams** | Cached only | P2P, uncached, YouTube |

---

## 📦 File Size Limits

| Resolution | Movies | Series |
|---|---|---|
| **Global** | 5 GB – 150 GB | 1 GB – 80 GB |
| **2160p** | 5 GB – 150 GB | 1 GB – 80 GB |
| **1080p** | 1 GB – 30 GB | 512 MB – 20 GB |
| **720p** | 512 MB – 12 GB | 256 MB – 8 GB |

---

## 🔌 Addons

| Addon | Type | Purpose | State |
|---|---|---|---|
| Library | Built-in | Personal debrid library — owned files, first priority | ✅ On |
| TorBox Search | Built-in | TorBox's native Newznab endpoint — Usenet + torrents, `checkOwned: true` | ✅ On |
| StremThru Torz | Built-in | Crowdsourced Torz hashlist via StremThru | ✅ On |
| Comet | External | Premium multi-source debrid scraper | ✅ On |
| Meteor | External | High-performance debrid scraper, all major services | ✅ On |
| Zilean | Built-in | DMM hashlist scraper — essential for debrid hash matching | ✅ On |
| SeaDex | Built-in | Community-curated best-release anime database | ✅ On |
| AnimeTosho | Built-in | Nyaa.si + TokyoTosho mirror for anime torrents | ✅ On |
| Searchⁿᶻᵇ | Built-in | TorBox Newznab API search | ✅ On |
| TorrentGalaxy | Built-in | Active torrent indexer | ✅ On |
| Knaben | Built-in | Proxy search across TPB, 1337x, Nyaa.si and more | ✅ On |
| MediaFusion | External | ElfHosted public instance — cached results only | ✅ On |
| OpenSubtitles V3+ | External | Hash-matched subtitle search | ✅ On |
| EZTV | Built-in | TV-specific torrent search | ⬜ Off |

---

## ⚙️ Key Configuration

| Setting | Value |
|---|---|
| Services | TorBox only (all 12 services available, opt-in) |
| RD role | Not used in this build |
| RD proxy | Not applicable |
| SeaDex best-only | ✅ Enforced for anime |
| Deduplicate | SmartDetect aggressive — 13 attributes |
| Result limit | 30 global · 12 per resolution |
| Sort (global) | Cached → Expression → SeaDex → Resolution → Quality → Score → Visual → Audio → Channel → Encode → Seeders → Age |
| Sort (series) | Cached → Expression → SeaDex → Resolution → Quality → Score → Visual → Audio → Channel → Seeders → Age |
| Sort (cached movies) | Library → SeaDex → Resolution → Quality → Expression → Score → Visual → Audio → Channel → **Size ↓** → Encode → Age |
| Tamtaro SEL stack | ✅ Live-synced ESE, PSE, regex |
| Vidhin05 ranking | ✅ Release group regex + expressions |
| RD Infringing Scrub | Not applicable — TorBox only |

---

## ⚡ Quick Import

```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/main/Templates/TorBox/Single/core-nexus-4k-ht-torbox.json
```

Paste directly into the **Template Import** menu in your AIOStreams host, then enable TorBox in the services panel.

---

*Part of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity) · [Import Guide](../../Guides/IMPORT_GUIDE.md) · [Changelog](../../CHANGELOG.md)*
