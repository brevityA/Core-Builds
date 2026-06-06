# Core Nexus TB Hybrid 1080p
**Version:** 2.1.0 · **Services:** TorBox + NZBGeek · **Resolution:** 1080p SDR

> The Usenet indexer hybrid. Combines TorBox's native Usenet and torrent pipeline with NZBGeek for broader source coverage. Unlike every other build, this one surfaces both cached and uncached streams — uncached files are downloaded by TorBox before playback begins. Requires a NZBGeek API key to activate the full indexer tier.

---

## 🎯 Designed For

TorBox users who also subscribe to a Usenet indexer and want the widest possible source pool on 1080p hardware.

---

## ⚠️ NZBGeek API Key Required

The NZBGeek API key **cannot** be entered in the AIOStreams credentials modal — it must be configured directly in the addon settings after the template loads.

**After importing and saving:**
1. Go to the **Addons** section in your AIOStreams dashboard
2. Find the **NZBGeek** addon
3. Click the ⚙️ settings icon
4. Replace the placeholder with your NZBGeek API key
5. Click **Save**

Your API key is found at [nzbgeek.info](https://nzbgeek.info) → Account → API Key. Every other addon in this template works immediately without it.

---

## ✅ What It Targets / ❌ What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 1080p, 720p | 2160p, 1440p, Unknown |
| **Quality** | WEB-DL, WEBRip, HDRip | CAM, SCR, TS, TC, HC HD-Rip, BluRay, BluRay REMUX |
| **Visual** | SDR | DV, HDR, HDR10, HDR10+, HLG, 3D, H-OU, H-SBS |
| **Encode** | HEVC, AVC | — |
| **Audio** | DD+, DTS, DD, AAC | — |
| **Channels** | 5.1 preferred, 2.0 fallback | — |
| **Streams** | Cached + uncached | YouTube |

> This is the **only** Core Builds template that shows uncached streams. P2P streams are visible but TorBox must download them before playback begins.

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
| Searchⁿᶻᵇ | Built-in | TorBox Newznab API search | ✅ On |
| NZBGeek | External | Paid Usenet indexer — **requires API key** | ✅ On |
| Knaben | Built-in | Proxy search across TPB, 1337x, Nyaa.si and more | ✅ On |
| MediaFusion | External | ElfHosted public instance — cached results only | ✅ On |
| OpenSubtitles V3+ | External | Hash-matched subtitle search | ✅ On |
| EZTV | Built-in | TV-specific torrent search | ⬜ Off |

> AnimeTosho and TorrentGalaxy are not included in this template — coverage is provided by Knaben and the dual Newznab setup.

---

## ⚙️ Key Configuration

| Setting | Value |
|---|---|
| Services | TorBox only (all 12 services available, opt-in) |
| NZBGeek | Active — API key required in addon settings |
| Cached streams | ✅ Shown |
| Uncached streams | ✅ Shown (TorBox downloads before playback) |
| P2P streams | ✅ Shown |
| SeaDex best-only | Not set |
| Deduplicate | SmartDetect aggressive — 13 attributes |
| Result limit | 30 global · 12 per resolution |
| Sort (global) | Cached → Expression → Resolution → Quality → Score → Visual → Audio → Channel → Encode → Seeders → Age |
| Sort (series) | Cached → Expression → Resolution → Quality → Channel → Seeders → Age |
| Tamtaro SEL stack | ✅ Live-synced ESE, PSE, regex |
| Vidhin05 ranking | ✅ Release group regex + expressions |

---

## ⚡ Quick Import

```
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Templates/TorBox/Hybrid/core-nexus-tb-hybrid-1080p.json
```

Paste directly into the **Template Import** menu in your AIOStreams host, enable TorBox in the services panel, then follow the NZBGeek setup step above.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Import Guide](../../Guides/IMPORT_GUIDE.md) · [Changelog](../../CHANGELOG.md)*
