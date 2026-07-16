# Configurator v2.56

**Released:** July 2026  
**Repository:** [brevityA/Core-Builds](https://github.com/brevityA/Core-Builds)  
**AIOStreams compatibility:** v2.31+

---

## What's in this release

### Resolution First toggle

New option in Video Preferences. When enabled, resolution sorts before cache status — 4K always ranks above 1080p/720p even if lower-res streams are cached.

| Mode | Sort order |
|---|---|
| Default | `cached → resolution → quality` |
| Resolution First | `resolution → quality → cached` |

Within the same resolution, cached still beats uncached. Available in both the wizard's advanced preferences and Simple Mode.

---

### Foreign Language Kill

Hard ESE that blocks foreign-language streams from movies and TV results. On by default for all new configurations.

- Adapts to Language Preferences — if you've added Spanish, French, etc., those languages pass through
- Library, SeaDex, and anime content are always exempt
- Uses `negate(merge(library(streams), seadex(streams), language(streams, ...)), streams)` pattern
- Located in Language Preferences as a toggle with red accent

---

### v2.55 — UX Optimizations

1. **Staggered fade-in animations** — splash elements animate in sequentially (50ms stagger)
2. **Smart service pre-selection** — remembers last-used service via `localStorage`
3. **Contextual Quick Deploy presets** — preset cards adapt when switching services (debrid → 4K/1080p, free → Free Streaming/P2P)
4. **Step dot tooltips** — hovering completed progress dots shows current selection ("Resolution: 4K")
5. **Auto-saved indicator** — subtle badge flashes after each state change
6. **Keyboard navigation** — arrow keys navigate between service chips, doors, and preset cards; Enter/Space activates
7. **ARIA accessibility** — service chips use `radiogroup`/`radio` with `aria-checked`
8. **Reduced motion support** — `prefers-reduced-motion` disables all animations
9. **Mobile tertiary reflow** — tertiary links switch to 2-column grid below 400px

---

## Previous configurator releases

| Version | Key Features |
|---|---|
| v2.54 | Host Compatibility Checker, Import Existing Config, Guided Troubleshooter, Stremio Deep Link, Template Backup Timeline |
| v2.53 | IQR PSE Architecture — Apex IQR quality mode with three-tier adaptive bitrate filtering |
| v2.52 | Anime Addon Stack — AnimeTosho, NekoBT, Sootio presets auto-enabled for anime profiles |
| v2.51 | Usenet Engine Support — `stremio_nntp` and `aiostreams` service entries |
| v2.50 | Selective Migration (per-section checkboxes), Parent/Child Config ("Use Core Builds Base") |

---

## Template inventory

46 active templates across 10 categories. See [CLAUDE.md](CLAUDE.md) for the full inventory.

---

## Import

All templates available at:

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/
```

Full import URL index: [Templates/Torbox/README.md](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/README.md)

---

## Upgrading

Generate a fresh template from the [configurator](https://brevitya.github.io/Core-Builds/), or use "Update Existing Template" to see the diff and cherry-pick changes. The Foreign Language Kill and Resolution First toggles are in the wizard's advanced preferences.
