# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

| Version | Item |
|---|---|
| Unreleased | Core Nexus Stream (Fire Stick) + Lite variants |
| Unreleased | Anime Non-Anime Query Guard — `and not isAnime` ISE guard |
| Unreleased | Flash template `addonName` mismatch fix |
| Unreleased | Regional Content Guide (`Guides/REGIONAL_CONTENT_GUIDE.md`) |
| Unreleased | GitHub Actions version pins corrected (checkout @v4, github-script @v7) |
| Unreleased | Link checker exit code string comparison fix |
| Unreleased | Auto-responder keywords refined; Flash/Nightly labels + labeler added |
| Unreleased | IMPORT_GUIDE, WHICH_TEMPLATE, DEVICE_PROFILES full rewrites |
| Unreleased | FAQ and TROUBLESHOOTING stale content fixes |
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
