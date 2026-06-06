# Core Nexus 4K Essential
**Version:** 2.2.6 · **Plan:** TorBox Essential · **Resolution:** 4K HDR

> Full-featured 4K build for TorBox Essential users. No Usenet access required — runs entirely on TorBox's torrent cache. Full 8-addon stack with Dolby Vision, TrueHD/Atmos, and SeaDex anime enforcement. No secondary service needed.

---

## Designed For

TorBox Essential plan users who want 4K quality without a TorBox Pro upgrade or second debrid service. Shield Pro, Apple TV 4K, OLED/QLED displays.

---

## What It Targets / What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 2160p, 1080p | 1440p, Unknown |
| **Quality** | BluRay REMUX, BluRay, WEB-DL, WEBRip | CAM, SCR, TS, TC, HC HD-Rip |
| **Visual** | DV, HDR+DV, HDR10+, HDR10, HDR, HLG, SDR | 3D, H-OU, H-SBS |
| **Audio** | Atmos, DTS:X, TrueHD, DTS-HD MA, DTS, DD+, DD, AAC | — |
| **Channels** | 7.1 preferred, 5.1 fallback | — |
| **Streams** | Cached only | P2P, uncached, YouTube, external |

---

## File Size Limits

| Resolution | Movies | Series |
|---|---|---|
| **2160p** | 5 GB – 150 GB | 500 MB – 80 GB |
| **1080p** | 1 GB – 30 GB | 150 MB – 20 GB |
| **720p** | 500 MB – 10 GB | 100 MB – 6 GB |

---

## Addons

| Addon | Timeout | Purpose |
|---|---|---|
| Library | 2000ms | Personal TorBox cached history — instant |
| Search NZB (TorBox) | 3500ms | TorBox Newznab API — torrent + usenet index |
| Comet | 4000ms | Fast debrid scraper |
| Meteor | 4000ms | Comprehensive VOD scraper |
| Zilean | 3500ms | DMM hashlist lookup |
| SeaDex | 3500ms | Anime best-release enforcement |
| Knaben | 4500ms | P2P torrent proxy |
| OpenSubtitles V3+ | 3000ms | Subtitle matching |

---

## Key Configuration

| Setting | Value |
|---|---|
| Services | TorBox Essential (pre-enabled), 11 others opt-in |
| Stream types | Debrid only |
| Result limits | 20 global · 8 per resolution |
| SeaDex best-only | On (anime) |
| Scored regex ranking | 148 patterns (4K set) |
| Episode matching | Strict |
| Tamtaro ESEs | Full inline set |

---

## Quick Import

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-torbox.json
```

---

*[Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Import Guide](https://github.com/brevityA/Core-Builds/blob/refs/heads/main/Guides/IMPORT_GUIDE.md) · [Changelog](https://github.com/brevityA/Core-Builds/blob/refs/heads/main/CHANGELOG.md)*
