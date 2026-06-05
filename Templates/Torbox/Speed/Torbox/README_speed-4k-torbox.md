# Core Nexus Speed 4K
**Version:** 2.2.6 · **Plan:** TorBox Essential only · **Resolution:** 4K HDR

> Speed-first 4K, single service. 4 addons, 3500ms timeouts, 2-3 second cached stream delivery. Dolby Vision, TrueHD/Atmos, SeaDex enforced. No secondary service required.

---

## Designed For

TorBox Essential users who want 4K quality and instant load speed without a second subscription. Shield, Apple TV 4K, OLED/QLED displays.

---

## What It Targets / What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 2160p, 1080p | 1440p, Unknown |
| **Visual** | DV, HDR+DV, HDR10+, HDR10, HDR, HLG, SDR | 3D, H-OU, H-SBS |
| **Audio** | Atmos, DTS:X, TrueHD, DTS-HD MA, DTS, DD+, DD, AAC | — |
| **Channels** | 7.1 preferred, 5.1 fallback | — |
| **Streams** | Cached only | P2P, uncached, YouTube, external |

---

## Addons

| Addon | Timeout | Purpose |
|---|---|---|
| Library | 2000ms | Personal TorBox cached history — instant |
| Search NZB (TorBox) | 3500ms | TorBox Newznab API — torrent + usenet index |
| Comet | 3500ms | Fastest external debrid scraper |
| Zilean | 3500ms | DMM hashlist — fast hash lookup |
| OpenSubtitles V3+ | 3500ms | Subtitle matching |

---

## Key Configuration

| Setting | Value |
|---|---|
| Services | TorBox Essential (pre-enabled), 11 others opt-in |
| Stream types | Debrid only |
| Timeouts | 3500ms flat |
| Result limits | 10 global · 4 per resolution |
| Sort keys | 5 (cached › expression › quality › regexScore › seeders) |
| SeaDex best-only | On (anime) |

---

## Quick Import

```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k-torbox.json
```

---

*[Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity) · [Import Guide](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/refs/heads/main/Guides/IMPORT_GUIDE.md) · [Changelog](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/refs/heads/main/CHANGELOG.md)*
