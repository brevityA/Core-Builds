# Core Nexus TorBox Exclusive (RPDB)
**Version:** 2.1.0 · **Services:** TorBox only · **Resolution:** 1080p SDR

> The frictionless single-service build. TorBox only — no secondary debrid service required. RPDB poster database integration provides rich poster art in Stremio. Targets WEB-DL and WEBRip sources and blocks everything that won't play reliably on budget hardware: 4K, HDR, BluRay, Remux, and lossless audio.

---

## 🎯 Designed For

Phones · Tablets · Budget Android TV boxes · Amazon Fire TV Sticks · Older 1080p TVs

---

## ✅ What It Targets / ❌ What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 1080p, 720p | 2160p, 1440p, Unknown |
| **Quality** | WEB-DL, WEBRip, HDRip | CAM, SCR, TS, TC, HC HD-Rip, BluRay, BluRay REMUX |
| **Visual** | SDR | DV, HDR+DV, HDR10+, HDR10, HDR, HLG, 3D, H-OU, H-SBS |
| **Encode** | HEVC, AVC | — |
| **Audio** | DD+, Atmos, FLAC, DD, AAC | — |
| **Channels** | 5.1 preferred, 2.0 fallback | — |
| **Streams** | Cached only | P2P, uncached, YouTube |

---

## 📦 File Size Limits

| Resolution | Movies | Series |
|---|---|---|
| **Global** | 1 GB – 60 GB | 1 GB – 30 GB |
| **1080p** | 1 GB – 25 GB | 512 MB – 15 GB |
| **720p** | 256 MB – 10 GB | 128 MB – 6 GB |

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
| RPDB | Poster database integration enabled |
| SeaDex best-only | Not set — compatibility over encode quality |
| Deduplicate | SmartDetect aggressive — 13 attributes |
| Result limit | 25 global · 10 per resolution |
| Sort (global) | Cached → Expression → Resolution → Quality → Score → Visual → Audio → Channel → Encode → Seeders → Age |
| Sort (series) | Cached → Expression → Resolution → Quality → Channel → Seeders → Age |
| Tamtaro SEL stack | ✅ Live-synced ESE, PSE, regex |
| Vidhin05 ranking | ✅ Release group regex + expressions |
| RD Infringing Scrub | Not applicable — TorBox only |

---

## ⚡ Quick Import

```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/main/Templates/TorBox/Single/core-nexus-torbox-exclusive_rpdb.json
```

Paste directly into the **Template Import** menu in your AIOStreams host, then enable TorBox in the services panel.

---

*Part of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity) · [Import Guide](../../Guides/IMPORT_GUIDE.md) · [Changelog](../../CHANGELOG.md)*
