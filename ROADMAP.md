# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

| Version | Item |
|---|---|
| v2.6.0 | Core Nexus Samsung TV Nightly template — DV-only kill enabled, device-specific |
| v2.6.0 | DV-Only Kill ESE — optional, disabled by default, all 30 templates |
| v2.6.0 | Subtitle language flags — `uSubtitleEmojis` replaces generic 📝 SUB badge |
| v2.6.0 | Flash `daysSinceRelease` guard — uncached allowed for ≤ 3-day-old content |
| v2.6.0 | Balanced preload selector — `perGroup(resolution, 2)` across 28 templates |
| v2.6.0 | Episode sort fix — global sort updated to canonical 14-key in 7 templates |
| v2.6.0 | Core Nexus Stream (Fire Stick) + Lite variants |
| v2.6.0 | Anime Non-Anime Query Guard — `and not isAnime` ISE guard |
| v2.6.0 | Flash template `addonName` mismatch fix |
| v2.6.0 | Regional Content Guide (`Guides/REGIONAL_CONTENT_GUIDE.md`) |
| v2.6.0 | GitHub Actions version pins corrected (checkout @v4, github-script @v7) |
| v2.6.0 | Link checker exit code string comparison fix |
| v2.6.0 | Auto-responder keywords refined; Flash/Nightly labels + labeler added |
| v2.6.0 | IMPORT_GUIDE, WHICH_TEMPLATE, DEVICE_PROFILES full rewrites |
| v2.6.0 | FAQ and TROUBLESHOOTING stale content fixes |
| v2.5.1 | Local test environment — `requirements.txt` + CONTRIBUTING.md setup guide |
| v2.5.1 | Midnight's Meteor V2 Beta documented across STATUS.md and Guides |
| v2.5.1 | README banner and badges fixed |
| v2.5.0 | Lite template suite — 12 Lite variants of every active template |
| v2.5.0 | Core Nexus Anime 4K template |
| v2.5.0 | Core Nexus Apex v2 formatter — score number, bitrate-first, subtitle flags |
| v2.5.0 | Core Nexus TV formatter — large-screen / 10-foot UI |
| v2.5.0 | Core Nexus Speed EasyNews — EasyNews-only speed build |
| v2.4.8 | GitHub optimisation — CI fixes, workflow cleanup, label sync, tests CI |
| v2.4.8 | Core Cipher personal build added to `Templates/Personal/` |
| v2.4.8 | Migration guide (`Guides/MIGRATION.md`) |
| v2.4.8 | All-contributors config (`.all-contributorsrc`) |
| v2.4.7 | Anime template update detection fix (`source: external` missing) |
| v2.4.7 | Tamtaro / Vidhin / AIOStreams attribution across all docs |
| v2.4.7 | Core Nexus Apex, Sigma, and Minimal formatters |
| v2.4.7 | Formatter preview images for all 13 formatters |
| v2.4.6 | 13-template expansion — Speed, Essential, 4K tiers |
| v2.4.6 | Core Nexus Elite formatter (bundled in all templates) |
| v2.4.5 | SeaDex best-release enforcement on Anime template |

---

## 🔄 In Progress

| Item | Notes |
|---|---|
| Formatter v2 exploration | Investigating AIOStreams token additions for upcoming releases |
| Hybrid template refresh | Review Newznab config after AIOStreams v2.5+ schema changes |

---

## 📋 Planned

### Templates
- [x] **EasyNews-only Speed template** — `Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json`
- [x] **Anime 4K variant** — SeaDex + 4K filter stack
- [x] **Lite template suite** — minimal ESE count for low-overhead hosts / more results

### Formatters
- [x] **Core Nexus Apex v2** — score number, bitrate-first, subtitle language flags
- [x] **Core Nexus TV** — formatter tuned for large-screen / 10-foot UI

### Infrastructure
- [x] Branch protection on `main` — require passing validate check before merge
- [ ] GitHub Sponsors setup
- [x] All-contributors config (`.all-contributorsrc`)

### Documentation
- [x] Per-template migration guide (`Guides/MIGRATION.md`)
- [ ] Video walkthrough of template import flow

---

## 💡 Ideas / Under Consideration

| Idea | Status |
|---|---|
| RealDebrid support revival | Blocked — upstream API instability; re-evaluating |
| Multi-debrid template (AllDebrid / Debrid-Link) | Under research |
| Automated template testing against live AIOStreams instance | Partial — local validator + pytest suite shipped (v2.5.1); live AIOStreams instance testing requires Docker |

---

## 🙏 Want to Contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. For feature suggestions, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue — roadmap items that gain community traction get prioritised.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds)*
