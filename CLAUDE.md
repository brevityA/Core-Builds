# Core Builds — Claude Context

This is **brevityA/Core-Builds**, a backup mirror of [Core Builds by Brevity](https://github.com/Branding-Brevity/Core-Builds-By-Brevity).

---

## What This Repo Is

A collection of optimised AIOStreams templates for TorBox subscribers. Templates control how streams are filtered, sorted, deduplicated, and formatted inside [AIOStreams](https://github.com/Viren070/AIOStreams).

---

## Repo Structure

```
Templates/Torbox/
  Single/           → TorBox Pro templates (4K Pro, Stream + Lite variants)
  Essential/        → TorBox Essential templates (4K Essential, Essential + Lite variants)
  Flash/            → Cached-only instant play (Flash, Flash 4K)
  Speed/TorBox/     → Fast cached play (Speed 4K, Speed + Lite variants)
  Speed/EasyNews/   → EasyNews dual-source variants (Speed, Speed 4K + Lite variants)
  Anime/            → Anime-optimised templates (Anime, Anime 4K + Lite variants)
  Hybrid/           → TorBox + RD hybrid templates (Hybrid, Hybrid Lite)
  Nightly/          → Pre-release / nightly builds
  Deprecated/       → Retired templates kept for reference
Templates/Personal/ → Personal/experimental templates (core-cipher)
Templates/Deprecated/ → Retired non-Torbox templates
Community-Templates/ → Community-contributed templates (MightyIcyy, RB3)
Formatters/         → 14 custom stream layout formatters
Filtering/          → Shared filter expression files (ESEs, ISEs, PSEs)
Regex/              → Excluded regex pattern lists
Assets/             → Banners, icons, formatter preview images
Guides/             → Import guide, troubleshooting, device profiles, FAQ
tests/              → pytest test suite (template validation, integration)
.github/            → Workflows, issue templates, discussion templates
```

---

## Template Format

Templates are JSON files validated against the AIOStreams schema. Key fields:

- `metadata` — id, name, version, description, sourceUrl, changelog
- `sortCriteria.global` — array of `{ key, direction }` objects (`"asc"` or `"desc"`)
- `addonLogo` — points to `raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/core_icon.svg`
- `sourceUrl` — points to `raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/...`
- All import URLs use `brevityA/Core-Builds` — NOT the main `Branding-Brevity` repo

## Known Validator Rule

`sortCriteria` entries must use `"direction"` (not `"order"`) — AIOStreams rejects `"order"` on import.

---

## Formatters

All formatters use `id: "tamtaro"` with `definitions.overrides['tamtaro']`. Import via AIOStreams → Formatter → Import icon → paste raw URL.

---

## Links

- Main repo (full template library): https://github.com/Branding-Brevity/Core-Builds-By-Brevity
- Full offline archive: https://mega.nz/folder/DvQGwYYJ#eAnBsID9nc4Nkr8eQfZ2Lg
- AIOStreams: https://github.com/Viren070/AIOStreams
- AIOStreams docs: https://docs.aiostreams.viren070.me
