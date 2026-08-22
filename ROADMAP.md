# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

<!-- AUTO:ROOT_COMPLETED:BEGIN -->
Auto-generated from [`CHANGELOG.md`](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) by `scripts/sync-docs.py`. In Progress / Planned / Ideas below are hand-curated.

| Version | Date | Highlights |
| --- | --- | --- |
| v3.6.2 | 2026-08-22 | Core Badge Builder (Configurator v2.97 · tools/badges/) — a no-code Nuvio Fusion badge configurator with 111 original Co… |
| v3.6.1 | 2026-08-13 | Live instance-status cron retired — the every-6-hours auto-check (host → STATUS.md + docs page) was retired after 25 con… |
| v3.6.0 | 2026-08-11 | Preflight audit tool (Configurator v2.92 · Tools page) — audits any template or live config offline with rules learned f… |
| v3.5.3 | 2026-08-04 | Episode-pack availability — multi-episode and season-pack streams were previously removed by an early exclusion filter b… |
| v3.5.2 | 2026-08-02 | Core Builds CLI published to npm — npm install -g core-builds for generate, validate, diff, and info commands. Same @cor… |
| v3.5.1 | 2026-07-31 | Capability-based device profiles (Configurator v2.87) — Android Mobile, Android TV / Google TV, Samsung Tizen, LG webOS,… |
| v3.5.0 | 2026-07-29 | SEL Engine v2 (Configurator v2.86 + all 72 templates via synced expressions) — perGroup() QR balance replaces 8 verbose … |
| v3.4.0 | 2026-07-26 | Core Nexus Mixed template (Templates/Torbox/Single/core-nexus-mixed.json) — adaptive multi-resolution build for niche an… |
| v3.3.2 | 2026-07-17 | Subtitle Picker (Configurator v2.57) — choose subtitle sources (AIOSubtitle, OpenSubtitles v3+, SubDL) and select from 3… |
| v3.3.1 | 2026-07-17 | Free Tier Overhaul (Configurator v2.56) — comprehensive improvements to P2P and HTTP template generation: |
| v3.3.0 | 2026-07-16 | Stream pool broadening (Configurator v2.55 + all 31 active templates) — increased maxResults, maxResultsPerResolution, a… |
| v3.2.9 | 2026-07-15 | Template Migration Tool (Configurator v2.49) — "Update Existing Template" now shows a full visual diff of every change (… |
| v3.2.8 | 2026-07-15 | REMUX ranking fix (all 44 active templates) — BluRay REMUX files were consistently ranked below WEB-DL streams because t… |
| v3.2.7 | 2026-07-11 | LABS v0.14.0 SEL expressions (6 Labs templates) — seven new expression features across all Labs templates: |
<!-- AUTO:ROOT_COMPLETED:END -->

> **Shipped-then-removed:** Audio Pinnacle PSE and HDR/DV Priority PSE shipped at v2.84 and were **removed in v3.2.8** (REMUX-ranking fix). Do not re-implement.

---

## 🔄 In Progress

| Item | Notes |
|---|---|
| `hasSeaDex` + `seMatched()` anime gating | LABS templates have it (Anime 4K Labs, All-Rounder Labs); needs promotion to stable Anime, Anime 4K, Anime Dub |
| Samsung TV Nightly → stable | Samsung RU7100 4K has tier-guarded expressions; gathering hardware feedback before stable promotion |
| Mobile / Bandwidth template validation | `core-nexus-mobile.json` exists in `Single/`; needs validation and documentation |

---

## 📋 Planned

### Templates
- [ ] **Anime Dub 4K variant** — English-dub priority at 4K for the growing dub community
- [ ] **AllDebrid Essential** — Full-coverage AllDebrid template with quality gates (`Templates/AllDebrid/Essential/`)
- [ ] **`pin()` top result** — Pin the #1 PSE-matched stream to position 1 regardless of sort order
- [ ] **Deprecate Flash suite** — Under review; `excludeUncached: true` behaviour is genuinely distinct from Speed/Essential

### Expression Layer
- [ ] **`hasSeaDex` anime gating promotion** — Move from LABS to stable Anime templates
- [ ] **`stddev()` / `variance()` PSE variants** — z-score style gating as alternative to IQR for large pools
- [ ] **Per-indexer score weighting** — Reward high-trust indexers (BTN, PTP) above general public trackers

### Formatters
- [ ] **Formatter v2 pass** — Review new AIOStreams token additions; refresh Elite formatter with any newly available fields
- [ ] **Community formatter gallery** — Dedicated `Formatters/Community/` directory with user-submitted layouts

### Infrastructure
- [ ] **Automated live AIOStreams testing** — Docker-based e2e validation against a real AIOStreams instance
- [ ] **GitHub Sponsors setup** — Ko-fi is live; explore GitHub-native sponsorship tier

### Documentation
- [ ] **Video walkthrough** — Import flow and template selection walkthrough for new users
- [ ] **AllDebrid setup guide** — Mirror of the TorBox import guide scoped to AllDebrid credential setup
- [ ] **Configurator guide** — Dedicated docs for wizard features (Resolution First, Foreign Language Kill, IQR PSEs, Parent/Child Config, Host Checker, Import)
- [ ] **Samsung TV setup guide** — Which models are supported, what the template excludes, how to report hardware issues

---

## 💡 Ideas / Under Consideration

| Idea | Status |
|---|---|
| Unified 6-template suite | Under consideration — Apex · Essential · Hybrid · Stream · Anime · Samsung TV |
| Debrid-Link template | Under research — supported in AIOStreams; smaller user base |
| Premiumize template | Under research — natively supported; European user base |
| RealDebrid support revival | Monitoring — server-side filter policy (May 2026) blocks most torrent results |
| Live Stream Preview | Under consideration — fetch real streams before deploying |

---

## 🙏 Want to Contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. For feature suggestions, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue — roadmap items that gain community traction get prioritised.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds)*
