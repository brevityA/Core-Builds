# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

| Version | Item |
|---|---|
| v2.6.0 | Live nSeScore display — `💎 94` replaces binary `💎 ELITE` badge in formatter |
| v2.6.0 | Smart content-type preload — movies get quality diversity, series get resolution balance |
| v2.6.0 | v2.6.0 version bump — all 30 active templates; triggers in-app update notification |
| v2.6.0 | Core Nexus Samsung TV Nightly — DV-only kill enabled, device-specific template |
| v2.6.0 | DV-Only Kill ESE — optional, disabled by default, added to all 30 templates |
| v2.6.0 | Subtitle language flags — `uSubtitleEmojis` replaces generic 📝 SUB badge |
| v2.6.0 | Flash `daysSinceRelease` guard — uncached allowed for content ≤ 3 days old |
| v2.6.0 | Balanced preload selector — `perGroup(resolution, 2)` across 28 templates |
| v2.6.0 | Episode sort fix — canonical 14-key global sort applied to 7 outdated templates |
| v2.6.0 | Core Nexus Stream (Fire Stick) + Lite variants |
| v2.6.0 | Anime Non-Anime Query Guard — `and not isAnime` ISE guard |
| v2.6.0 | Flash `addonName` mismatch fix |
| v2.6.0 | Regional Content Guide (`Guides/REGIONAL_CONTENT_GUIDE.md`) |
| v2.6.0 | GitHub Actions version pins corrected (checkout @v4, github-script @v7) |
| v2.6.0 | Auto-responder keywords refined; Flash/Nightly labels + labeler added |
| v2.6.0 | IMPORT_GUIDE, WHICH_TEMPLATE, DEVICE_PROFILES full rewrites |
| v2.6.0 | FAQ and TROUBLESHOOTING stale content fixes |
| v2.5.1 | Local test environment — `requirements.txt` + CONTRIBUTING.md setup guide |
| v2.5.1 | README banner and badges fixed |
| v2.5.0 | Lite template suite — 12 Lite variants of every active template |
| v2.5.0 | Core Nexus Anime 4K template |
| v2.5.0 | Core Nexus TV formatter — large-screen / 10-foot UI |
| v2.5.0 | Core Nexus Speed EasyNews — EasyNews-only speed build |
| v2.4.8 | Core Cipher personal build added to `Templates/Personal/` |
| v2.4.7 | Core Nexus Apex, Sigma, and Minimal formatters |
| v2.4.6 | Core Nexus Elite formatter (bundled in all templates) |
| v2.4.5 | SeaDex best-release enforcement on Anime template |

---

## 🔄 In Progress

| Item | Notes |
|---|---|
| AllDebrid template suite | Flash + Speed + Essential variants; natively supported in AIOStreams; biggest unserved community segment |
| Samsung TV Nightly → stable | Gather community feedback; promote out of Nightly once validated on hardware |
| Hybrid template refresh | Review Newznab config after AIOStreams v2.5+ schema changes |

---

## 📋 Planned

### Templates
- [ ] **AllDebrid Flash** — Cached-only instant play for AllDebrid subscribers (`Templates/AllDebrid/Flash/`)
- [ ] **AllDebrid Speed** — Fast cached play variant for AllDebrid (`Templates/AllDebrid/Speed/`)
- [ ] **AllDebrid Essential** — Full-coverage AllDebrid template with quality gates (`Templates/AllDebrid/Essential/`)
- [ ] **Mobile / Bandwidth template** — 25 Mbps bitrate ceiling, SDR-preferred, no REMUX; covers mobile, travel, data-capped users
- [ ] **Anime Dub 4K variant** — English-dub priority at 4K for the growing dub community

### Formatters
- [ ] **Formatter v2 pass** — Review new AIOStreams token additions; refresh Elite formatter with any newly available fields

### Infrastructure
- [ ] **GitHub Sponsors setup** — Ko-fi is live; explore GitHub-native sponsorship tier
- [ ] **Automated live AIOStreams testing** — Docker-based end-to-end validation against a real AIOStreams instance (local validator + pytest shipped in v2.5.1; live instance test still pending)

### Documentation
- [ ] **Video walkthrough** — Import flow and template selection walkthrough for new users
- [ ] **AllDebrid setup guide** — Mirror of the TorBox import guide scoped to AllDebrid credential setup

---

## 💡 Ideas / Under Consideration

| Idea | Status |
|---|---|
| Debrid-Link template | Under research — supported in AIOStreams; smaller user base than AllDebrid |
| Premiumize template | Under research — natively supported; European user base overlap with AllDebrid |
| RealDebrid support revival | Monitoring — server-side filter policy (May 2026) blocks most torrent results; situation under review |
| Per-indexer score weighting in PSEs | Exploratory — reward high-trust indexers (e.g. BTN, PTP) above general public trackers |
| Community formatter gallery | Under consideration — dedicated `Formatters/Community/` directory with user-submitted layouts |

---

## 🙏 Want to Contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. For feature suggestions, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue — roadmap items that gain community traction get prioritised.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds)*
