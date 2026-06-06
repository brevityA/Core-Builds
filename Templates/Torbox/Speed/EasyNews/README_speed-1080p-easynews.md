# Core Nexus Speed 1080p (EasyNews)
**Version:** 2.2.6 · **Plan:** TorBox Essential + EasyNews · **Resolution:** 1080p SDR

> Speed-first 1080p. Stripped to 4 addons for 2-3 second cached stream delivery. SDR only, hardware-safe on any device. Requires TorBox Essential and an active EasyNews subscription.

---

## Designed For

Users who want instant stream loading on any hardware. Phones, tablets, Fire TV Stick, budget boxes. Active EasyNews subscription required.

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
| Services | TorBox Essential + EasyNews (pre-enabled), 10 others opt-in |
| Timeouts | 3500ms flat |
| Result limits | 10 global · 4 per resolution |
| Sort keys | 5 (cached › expression › quality › regexScore › seeders) |
| SeaDex best-only | Off |

---

## Quick Import

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-1080p.json
```

---

*[Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Import Guide](https://github.com/brevityA/Core-Builds/blob/refs/heads/main/Guides/IMPORT_GUIDE.md) · [Changelog](https://github.com/brevityA/Core-Builds/blob/refs/heads/main/CHANGELOG.md)*
