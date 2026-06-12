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
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Community-Templates/Templates/MightyIcyy/prism-torbox-essential-1080p.json
```

---

## 📝 Configuration Notes

**`DV Only` visual tag** — AIOStreams uses `'DV'` not `'DV Only'` for this enum. If you're customising the exclusion list, use the correct value.

**Language exclusions** — `language()` is not a valid SEL function for stream expressions. To exclude languages, use the `requiredLanguages` setting in AIOStreams config instead.

**Quality enum case** — AIOStreams is case-sensitive: use `'BluRay'` not `'Bluray'` in custom expressions.

**Resolution** — `preferredResolutions: ['1080p']` scores 1080p higher but does not hard-block 4K. Set `includedResolutions` if you want a strict cap.

---

## 💡 Tips

This template is intentionally minimal — two addons, light filtering, low result cap. Good for users who want fast stream loading without a large scraper stack.

For more comprehensive coverage on TorBox Essential, see **Core Nexus Essential** in the main suite.

---

*Community template by MightyIcyy · Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) Community Templates*
