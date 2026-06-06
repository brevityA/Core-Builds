# Core Nexus Anime
**Version:** 2.2.9 · **Services:** TorBox Essential · **Resolution:** 1080p + 4K

> Dedicated anime build. SeaDex best-release enforcement, AnimeTosho for Nyaa coverage, and audio/visual priorities tuned specifically for anime — FLAC and AAC over Atmos, SDR-first, WEB-DL from Crunchyroll and HiDive sources prioritised.

---

## 🎯 Designed For

Seasonal simulcasts · Full series · Anime movies · Mixed sub/dub households

---

## ✅ What It Targets / ❌ What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 1080p (primary), 2160p (newer titles), 720p | — |
| **Quality** | WEB-DL, WEBRip, BluRay REMUX, BluRay | CAM, SCR, TS, TC, HC HD-Rip |
| **Visual** | SDR, HLG, 10bit, HDR, HDR10 | 3D, H-OU, H-SBS |
| **Audio** | FLAC, AAC, OPUS, DD+, DD, DTS | — |
| **Encode** | HEVC, AV1, AVC, VC-1 | — |
| **Language** | Japanese, English, Original, Dual Audio, Multi, Dubbed | — |
| **Streams** | Cached debrid | YouTube, external |

> **Why SDR-first?** Quality anime releases (SubsPlease, Erai-raws, CR WEB sources) are almost always SDR. HDR is supported for newer theatrical titles and 4K remasters but ranked lower.

> **Why FLAC/AAC over Atmos?** Atmos and TrueHD are rare in anime. Most quality releases use FLAC (lossless) or AAC. Prioritising these avoids ranking DTS-HD MA anime rips above native WEB sources.

---

## 📦 File Size Limits

| Content | Minimum | Maximum |
|---|---|---|
| Movies | 1 GB | 25 GB |
| Series episodes | 150 MB | 15 GB |
| 720p episodes | 50 MB | 4 GB |

---

## 🔌 Addons

| Addon | Purpose | State |
|---|---|---|
| Library | Personal debrid library — owned files first | ✅ On |
| SeaDex | Community-curated best-release anime database | ✅ On |
| AnimeTosho | Nyaa.si + TokyoTosho mirror — widest anime torrent coverage | ⬜ Off (opt-in)* |
| Zilean | DMM hashlist — fastest cached lookup | ✅ On |
| Comet | Multi-source debrid scraper | ✅ On |
| Meteor | Secondary debrid scraper for depth | ✅ On |
| Knaben | TPB, 1337x, Nyaa.si proxy — additional torrent coverage | ✅ On |
| OpenSubtitles V3+ | Hash-matched subtitle search | ✅ On |
| NekoBT | Additional anime torrent source | ⬜ Off (opt-in)* |
| TorBox Search | TorBox NZB search | ⬜ Off (upstream bug) |

> *AnimeTosho and NekoBT are not available on all AIOStreams hosting instances. They load silently when disabled — enable them manually in **Add-ons** if your instance supports them. SeaDex + Zilean + Comet + Knaben cover the gap on instances without them.

> **Why AnimeTosho over a standalone Nyaa addon?** Nyaa.si is already covered by Knaben. AnimeTosho is a dedicated mirror of both Nyaa.si and TokyoTosho, providing broader coverage with better metadata.

---

## 🏆 Quality Tiers (PSE Scoring)

Streams are scored into tiers — highest tier shown first:

| Tier | Label | Criteria |
|---|---|---|
| S | 1080p WEB-DL · FLAC | Best quality simulcast |
| A | 1080p WEB-DL · AAC/OPUS/DD+ | Standard simulcast |
| B | 1080p WEBRip | Good encode rip |
| C | 1080p BluRay REMUX | Physical BluRay rip |
| D | Any 1080p | Everything else at 1080p |
| — | 4K WEB-DL HDR | Newer theatrical titles |
| — | Any 2160p | All other 4K |
| — | 720p WEB-DL | Legacy/fallback |
| — | Any 720p | Last resort |

---

## ⚙️ Key Configuration

| Setting | Value |
|---|---|
| Services | TorBox Essential (no Usenet required) |
| cacheAndPlay | Disabled |
| nzbFailover | Disabled |
| Result limit | 20 global · 8 per resolution |
| Sort | Cached → Expression Score → Resolution → Quality → Regex Score → Audio → Visual |
| CB Filtering | Inline ESEs — CAM Kill, YouTube Kill, 3D Kill, Season Pack Guard |
| SeaDex best-only | ✅ Enforced via SeaDex addon |
| RPDB posters | ✅ t0-free-rpdb baked in |

---

## ⚡ Quick Import

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime.json
```

Paste into the **Template Import** menu in your AIOStreams host, then enable TorBox in the Services panel.

### After Import

1. **Services** → Enable TorBox, enter your API key
2. **Metadata** → Optionally add your TMDB API key for enhanced poster art
3. **Install** → Copy the manifest URL and paste into Stremio or WuPlay

---

## 💡 Tips

**Seasonal simulcasts** — SeaDex + AnimeTosho will find the best available release. For currently airing shows, WEB-DL from Crunchyroll (CR) or HiDive will rank in the A-tier.

**Older series** — BluRay REMUX and FLAC audio releases rank well in tiers C and S respectively. Zilean is the fastest path to cached older series.

**4K anime** — Supported but ranked below 1080p. Enable for theatrical releases (Demon Slayer: Mugen Train, Jujutsu Kaisen 0, etc.) where 4K WEB-DL exists.

**Dual audio** — Both Japanese and English are in `requiredLanguages`. Dubbed streams will appear if cached.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Master Template Guide](../README.md) · [Import Guide](../../../Guides/IMPORT_GUIDE.md) · [Changelog](../../../CHANGELOG.md)*
