# Core Nexus 1080p Essential
**Version:** 2.2.6 · **Plan:** TorBox Essential · **Resolution:** 1080p SDR

> Full-featured 1080p build for TorBox Essential users. No Usenet required. Targets WEB-DL and WEBRip, blocks BluRay and Remux for reliable playback on any hardware. Full 8-addon stack. No secondary service needed.

---

## Designed For

TorBox Essential plan users on budget hardware — phones, tablets, Fire TV Stick, budget Android TV boxes. Streams work reliably on anything that can decode 1080p.

---

## What It Targets / What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 1080p, 720p | 2160p, 1440p, Unknown |
| **Quality** | WEB-DL, WEBRip, HDRip | BluRay, BluRay REMUX, CAM, SCR, TS, TC |
| **Visual** | SDR | DV, HDR+DV, HDR10+, HDR10, HDR, HLG, 3D |
| **Streams** | Cached only | P2P, uncached, YouTube, external |

---

## File Size Limits

| Resolution | Movies | Series |
|---|---|---|
| **1080p** | 1 GB – 25 GB | 150 MB – 15 GB |
| **720p** | 256 MB – 10 GB | 100 MB – 6 GB |

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
| Result limits | 15 global · 6 per resolution |
| SeaDex best-only | Off |
| Scored regex ranking | 130 patterns (1080p set) |
| Episode matching | Strict |
| Tamtaro ESEs | Full inline set |

---

## Quick Import

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-1080p-essential-torbox.json
```

---

*[Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Import Guide](https://github.com/brevityA/Core-Builds/blob/refs/heads/main/Guides/IMPORT_GUIDE.md) · [Changelog](https://github.com/brevityA/Core-Builds/blob/refs/heads/main/CHANGELOG.md)*
