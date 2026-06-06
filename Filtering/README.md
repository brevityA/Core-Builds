# Core Builds Filtering System

A standalone quality scoring and filtering layer for AIOStreams — built around the **Core Builds scoring philosophy**: rank everything, block nothing except hard trash.

> Pull these files into any AIOStreams setup via the **Synced URL** fields. No template required.

---

## Files

| File | Synced URL Field | Purpose |
|---|---|---|
| `Core-Builds-ESEs.json` | `syncedExcludedStreamExpressionUrls` | Blocks CAM, YouTube, AI Enhanced, 3D, season packs |
| `Core-Builds-PSEs.json` | `syncedPreferredStreamExpressionUrls` | Scores streams into quality tiers (S → D) |
| `Core-Builds-ISEs.json` | `syncedIncludedStreamExpressionUrls` | Prioritises cached + English streams |

### Raw URLs

```
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/Core-Builds-ESEs.json
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/Core-Builds-PSEs.json
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Filtering/Core-Builds-ISEs.json
```

---

## Scoring Tiers (PSEs)

Streams are matched against tiers in order — a stream lands in the highest tier it qualifies for.

### 4K Tiers

| Tier | Label | Criteria |
|---|---|---|
| S | Perfect 4K | BluRay REMUX + DV/HDR+DV + Atmos/TrueHD/DTS:X |
| S | Premium 4K | BluRay REMUX + HDR10+/HDR + Atmos/TrueHD/DTS:X |
| A | Great 4K | WEB-DL + DV/HDR+DV + Atmos/TrueHD/DTS:X |
| A | Good 4K | WEB-DL + HDR10+/HDR + DD+/Atmos |
| B | Solid 4K | WEB-DL + any HDR tag |
| C | Decent 4K | WEBRip + HDR |
| D | Base 4K | Any 2160p |

### 1080p Tiers

| Tier | Label | Criteria |
|---|---|---|
| S | Perfect 1080p | BluRay REMUX + Atmos/TrueHD/DD+ |
| A | Great 1080p | WEB-DL + Atmos/TrueHD/DD+/DTS |
| B | Good 1080p | WEB-DL + DD/AAC |
| C | Solid 1080p | WEBRip or BluRay |
| D | Base 1080p | Any 1080p |

### Fallback
| | 720p WEB-DL/WEBRip/BluRay |
| | Any 720p |

---

## ESEs (What Gets Blocked)

| Rule | What it removes |
|---|---|
| Hard CAM Kill | CAM, SCR, TS, TC, HC HD-Rip quality streams |
| Hard YouTube Kill | YouTube streams, external links, youtube keywords |
| AI Enhanced Kill | Streams tagged as AI Enhanced |
| 3D Content Kill | 3D, H-OU, H-SBS visual tags |
| Season Pack Guard | Season packs when 3+ episode streams exist |
| Ambiguous Pack Guard | Ambiguous packs when non-pack streams exist |

---

## Philosophy

**Core Builds never hard-blocks based on audio tag, encode, or quality enum.** Instead:
- Every stream is ranked into a tier based on the combination of quality signals
- The worst streams land in tier D but still appear — they don't disappear silently
- Only absolute trash (CAM, YouTube, 3D, AI) gets hard-removed

This means new AIOStreams enum values never break the filter.
