# Core Builds Filtering System

<p align="center">
  <a href="https://core-builds.mintlify.app">
    <img src="https://img.shields.io/badge/DOCS-core--builds.mintlify.app-3B82F6?style=for-the-badge&logo=gitbook&logoColor=white&labelColor=1a1f27" alt="Documentation"/>
  </a>
</p>

A standalone quality scoring and filtering layer for AIOStreams — built around the **Core Builds scoring philosophy**: rank everything, block nothing except hard trash.

> Pull these files into any AIOStreams setup via the **Synced URL** fields. No template required.

---

## Files

| File | Synced URL Field | Count | Purpose |
|---|---|---|---|
| `core-builds-eses.json` | `syncedExcludedStreamExpressionUrls` | 83 | Full fleet ESE superset — hard kills, quality gates, flood guards, and LABS expressions |
| `core-builds-pses.json` | `syncedPreferredStreamExpressionUrls` | 163 | All quality tiers — CB static, IQR Tukey fence, Hybrid TorBox-priority, pins, boosters, anime |
| `core-builds-ises.json` | `syncedIncludedStreamExpressionUrls` | 8 | Cached passthrough, Library, REPACK/PROPER, SeaDex, English language, digitalRelease bypass |
| `ranked-regex-patterns.json` | `syncedRankedRegexUrls` | 107 | Release group scoring — 10-tier system (+100 to −200) |

### Raw URLs

```
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/core-builds-eses.json
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/core-builds-pses.json
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/core-builds-ises.json
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/ranked-regex-patterns.json
```

---

## PSE Architecture

Templates use one of three PSE architectures, all included in the shared file:

### IQR Tukey Fence (4K Apex, 4K Hybrid, 4K Essential, 4K AllDebrid)
Three-tier adaptive bitrate ranking:
- **≥4 peers** → IQR Tukey fence (Q1−1.5×IQR to Q3+1.5×IQR)
- **1–3 peers** → min/max ±20% window
- **0 peers** → pow(0.95, daysSinceRelease) exponential decay

### CB Static Tiers (Stream, Essential, Speed, Flash, Device)
Fixed quality+resolution matching into S/A/B/C/D tiers with 720p fallback.

### Hybrid TorBox-Priority (4K Hybrid, Hybrid)
Each IQR tier has a TorBox-only twin PSE before it — `service(tier, 'torbox')`.

---

## ESE Categories (83 total)

| Category | Count | Examples |
|---|---|---|
| Universal hard kills | 5 | CAM, External, Season Pack, Multi-Episode, Ambiguous Pack |
| Quality gates | 12 | Low Bitrate, Low Seeders, Upscaled 4K, Bad BluRay, Bad Dual Audio |
| Result management | 7 | Extra Cached HQ/LQ, Extra Uncached, Final Limit, Indexer Diversity, Flood Guard |
| Adaptive guards | 4 | Score IQR Guard, Usenet Propagation, Bad NZBs, RD Copyright |
| Device-specific | 2 | DV-Only Kill, No Sootio Library |
| LABS experimental | 15 | perGroup() dedup, tier-guarded kills, Bitrate Floor, Adaptive Seeder Guard |
| Synced external | 2 | Core Builds SEL Setup, Standard ESE |
| Other | 36 | Resolution kills, foreign language, AI upscale, 3D, YouTube, anime-specific |

---

## ISE List (8 total)

| Expression | Purpose |
|---|---|
| Cached passthrough | Pin cached streams to top |
| Library | Continue-watching priority |
| REPACK/PROPER | Pin repacks above originals |
| digitalRelease Bypass | Allow digital releases through ESE gates |
| English Language | English audio priority |
| SeaDex (×2 variants) | Best-release anime pins |
| Core Builds ISE (synced) | External ISE set |

---

## Ranked Regex (107 patterns)

10-tier score system from elite (+100) to hard-kill (−200):

| Score | Tier | Example Groups |
|---|---|---|
| +100 | Elite | FraMeSToR, BHDStudio, FLUX |
| +80 | Premium | DON, CtrlHD, SiC |
| +60 | High | EbP, W4NK3R, hallowed |
| +40 | Good | REMUX groups, BD specialists |
| +20 | Decent | Mainstream quality groups |
| 0 | Neutral | (Vidhin05 baseline — not included in scored file) |
| −25 | Below avg | x264, pre-release, known mediocre |
| −50 | Low | Bad dual audio, poor encoders |
| −75 | Very low | Known bad groups |
| −200 | Hard kill | Upscale/spam groups |
