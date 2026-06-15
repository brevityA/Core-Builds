# Core Builds v2.8.2

**Released:** June 15, 2026  
**Repository:** [brevityA/Core-Builds](https://github.com/brevityA/Core-Builds)  
**AIOStreams compatibility:** v2.30+

---

## What's in this release

### Regex scoring overhaul

The previous approach embedded 149 inline patterns (~40 KB) per template, then switched to `syncedRankedRegexUrls` in an attempt to shrink file sizes. Neither extreme worked cleanly — 149 inline pushed templates past 120 KB, and synced URLs aren't available on all AIOStreams instances (silently providing zero scoring).

**New approach:** 53 high-impact patterns embedded inline (~16 KB), all templates under 100 KB.

| Tier | Score | Count | Purpose |
|---|---|---|---|
| S-Tier | +100 | 5 | Top release groups (FraMeSToR, Radarr Remux T1…) |
| A-Tier | +80 | 11 | High-quality groups (CtrlHD, DON, hallowed…) |
| B-Tier | +60 | 14 | Good groups (FLUX, NTb, KiNGS…) |
| Penalised | −50 | 9 | Below-average quality |
| Bad Quality | −75 | 12 | Known bad encodes / upscale groups |
| Blacklist | −200 | 2 | Extras packages (Radarr/Sonarr) |

Mid-tier scores (0 / 20 / 40) provided no meaningful ranking differentiation and are dropped. `syncedRankedRegexUrls` removed from all templates.

Anime templates retain `rankedRegexPatterns: []` — live-action group names don't match anime release naming; SeaDex + AnimeTosho handle quality selection.

---

### Samsung TV audit fixes (v0.2.1 → v0.2.2)

Applies to both `core-nexus-samsung-tv-4k.json` and `core-nexus-samsung-tv.json`.

**AV1 and VC-1 excluded** — Samsung Tizen (2018–2022 models: RU7100, RU8000, NU8000, Q60) has no hardware AV1 decoder; VC-1 is absent. Both are now in `excludedEncodes`. Previously they were ranked *above* HEVC in `preferredEncodes`, causing silent playback failures on these models.

**Visual tag cleanup** — Dolby Vision, HDR+DV (dual-layer), and AI upscale removed from `preferredVisualTags`. DV streams are already blocked by the DV-Only Kill ESE; ranking them created inconsistent ordering for the few DV+HDR10 streams that slipped through. AI upscale is not a real HDR format.

**Result limits aligned** — `maxResults` → 20, `maxResultsPerResolution` → 8 (matched standard defaults).

---

### 4K Apex audit fixes (v0.4.2 → v0.4.3)

- **AI upscale removed** from `preferredVisualTags` — not a genuine HDR format
- **`2.0` added** to `preferredAudioChannels` → `["7.1", "5.1", "2.0"]` — stereo streams were unranked
- **`seadexBestOnly: false`** — was silently dropping non-SeaDex streams for all anime queries
- **`maxResults` → 20, `maxResultsPerResolution` → 8** (aligned with defaults)
- **Duplicate regex names fixed** — `"Radarr UHD Bluray T1 — DON"` and `"Anime BD T1 [sam]"` each appeared twice; second instances renamed `[B]`
- **Low resolutions removed** from `preferredResolutions` (144p, 240p, 360p)

---

## Files changed

| File | Change |
|---|---|
| `Filtering/ranked-regex-patterns.json` | Source of truth — 149 patterns, 10 tiers (reference only) |
| `Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json` | v0.2.1 → v0.2.2 |
| `Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json` | v0.2.1 → v0.2.2 |
| `Templates/Torbox/Single/core-nexus-4k-apex.json` | v0.4.2 → v0.4.3 |
| All 28 non-Anime active templates | 53 inline patterns, no `syncedRankedRegexUrls` |
| All 6 Anime templates | `rankedRegexPatterns: []` confirmed |
| `CHANGELOG.md` | v2.8.2 entry added |
| `Templates/Torbox/README.md` | Version badge → v2.8.2 |

---

## Template inventory (v2.8.2)

34 active templates across 8 categories:

| Category | Templates |
|---|---|
| TorBox Pro — Single | 4K Apex, 4K Apex (TorBox), Stream, Stream Lite, Stream Firestick, Stream Firestick Lite |
| Hybrid (Pro + NZBGeek) | 4K Hybrid, Hybrid, Hybrid Lite |
| Essential | 4K Essential, 4K Essential Lite, Essential, Essential Lite |
| Flash | Flash 4K, Flash |
| Speed (EasyNews) | Speed 4K+, Speed EasyNews |
| AllDebrid | 4K AllDebrid, 4K AllDebrid Lite, AllDebrid, AllDebrid Lite |
| Device — Samsung TV | Samsung TV 4K, Samsung TV |
| Anime | Anime 4K, Anime 4K Lite, Anime, Anime Lite, Anime Dub, Anime Dub Lite |
| Nightly 🌙 | Apple TV 4K, 4K Apex Labs |

---

## Import

All templates available at:

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/
```

Full import URL index: [Templates/Torbox/README.md](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/README.md)

---

## Upgrading

Templates with in-app update notifications will show a badge automatically. To update manually: AIOStreams → your config → **Update** button, or re-import from the URL above.

**No breaking changes.** All PSE logic, ESE stacks, and preset configurations are compatible with v2.8.1.
