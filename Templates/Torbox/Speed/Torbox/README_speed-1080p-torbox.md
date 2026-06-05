# Core Nexus Speed 1080p
**Version:** 2.2.6 · **Plan:** TorBox Essential only · **Resolution:** 1080p SDR

> Speed-first 1080p, single service. 4 addons, 3500ms timeouts, 2-3 second cached stream delivery. SDR only, works on any device. No secondary service required.

---

## Designed For

TorBox Essential users who want instant stream loading without a second subscription. Phones, tablets, Fire TV Stick, budget Android TV boxes.

---

## What It Targets / What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 1080p, 720p | 2160p, 1440p, Unknown |
| **Quality** | WEB-DL, WEBRip | BluRay, BluRay REMUX, CAM, SCR, TS, TC |
| **Visual** | SDR | DV, HDR+DV, HDR10+, HDR10, HDR, HLG, 3D |
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
| SeaDex best-only | Off |

---

## Quick Import

```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-1080p-torbox.json
```

---

*[Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity) · [Import Guide](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/refs/heads/main/Guides/IMPORT_GUIDE.md) · [Changelog](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/refs/heads/main/CHANGELOG.md)*
