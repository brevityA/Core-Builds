# Prism — TorBox Essential 1080p
**Author:** MightyIcyy · **Version:** 1.0.0 · **Services:** TorBox Essential · **Resolution:** 1080p

> A frictionless 1080p configuration powered exclusively by TorBox. Prioritises WEB-DL, Blu-ray and WEBRip while excluding Remux and 4K entirely. Built for simplicity and fast playback.

---

## 🎯 Designed For

Users who want a clean, no-fuss 1080p experience on TorBox Essential without tuning filters or managing complex addon stacks.

---

## ✅ What It Targets / ❌ What It Blocks

| Category | Targets | Blocks |
|---|---|---|
| **Resolution** | 1080p preferred | 4K excluded from preferences |
| **Quality** | WEB-DL → BluRay → WEBRip | BluRay REMUX, CAM, TS, TC, SCR |
| **Audio** | AAC, OPUS | — |
| **Visual** | SDR | 3D, DV |
| **Language** | English preferred | Russian, Ukrainian excluded |

---

## 📦 File Size Limits

| Content | Minimum | Maximum |
|---|---|---|
| Movies | 800 MB | 15 GB |
| Series episodes | 300 MB | 8 GB |

---

## 🔌 Addons

| Addon | Timeout | Notes |
|---|---|---|
| Torrentio | 10,000ms | General torrent scraper |
| Debridio Scraper | 6,500ms | Debrid-optimised scraper |

---

## ⚙️ Key Configuration

| Setting | Value |
|---|---|
| Result limit | 10 global |
| onlyShowCachedStreams | Not set (shows all) |
| cacheAndPlay | Disabled |
| autoPlay | ✅ `matchingFile` — resolution + quality + release group |
| Sort | cached → library → resolution → quality → expression score → stream type → visual → audio |

---

## ⚡ Quick Import

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/prism-torbox-essential-1080p.json
```

---

## ⚠️ Known Issues

**`DV Only` visual tag** — `'DV Only'` is not a valid AIOStreams enum value. Valid value is `'DV'`. The exclusion may not apply correctly.

**`language()` in ESE** — `language()` is not a valid AIOStreams SEL function for stream expressions. The Russian/Ukrainian language exclusion block may not work as intended. Use `requiredLanguages` config instead.

**Case sensitivity** — `'Bluray'` in expressions should be `'BluRay'` (AIOStreams is case-sensitive for quality enums).

**No hard resolution filter** — `includedResolutions` is not set, so 4K streams can still appear. Only `preferredResolutions: ['1080p']` is configured which scores but does not hard-block.

---

## 💡 Tips

This template is intentionally minimal — two addons, light filtering, low result cap. Good for users who want fast stream loading without a large scraper stack.

For more comprehensive coverage on TorBox Essential consider **Core Nexus Essential** from the main suite.

---

*Community template by MightyIcyy · Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) Community Templates*
