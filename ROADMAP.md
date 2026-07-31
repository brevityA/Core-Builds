# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

<!-- AUTO:ROOT_COMPLETED:BEGIN -->
Auto-generated from [`CHANGELOG.md`](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) by `scripts/sync-docs.py`. In Progress / Planned / Ideas below are hand-curated.

| Version | Date | Highlights |
| --- | --- | --- |
| v3.5.1 | 2026-07-31 | Capability-based device profiles (Configurator v2.87) — Android Mobile, Android TV / Google TV, Samsung Tizen, LG webOS,… |
| v3.5.0 | 2026-07-29 | SEL Engine v2 (Configurator v2.86 + all 72 templates via synced expressions) — perGroup() QR balance replaces 8 verbose … |
| v3.4.0 | 2026-07-26 | Core Nexus Mixed template (Templates/Torbox/Single/core-nexus-mixed.json) — adaptive multi-resolution build for niche an… |
| v3.3.2 | 2026-07-17 | Subtitle Picker (Configurator v2.57) — choose subtitle sources (AIOSubtitle, OpenSubtitles v3+, SubDL) and select from 3… |
| v3.3.1 | 2026-07-17 | Free Tier Overhaul (Configurator v2.56) — comprehensive improvements to P2P and HTTP template generation: |
| v3.3.0 | 2026-07-16 | Stream pool broadening (Configurator v2.55 + all 31 active templates) — increased maxResults, maxResultsPerResolution, a… |
| v3.2.9 | 2026-07-15 | Template Migration Tool (Configurator v2.49) — "Update Existing Template" now shows a full visual diff of every change (… |
| v3.2.8 | 2026-07-15 | REMUX ranking fix (all 44 active templates) — BluRay REMUX files were consistently ranked below WEB-DL streams because t… |
| v3.2.7 | 2026-07-11 | LABS v0.14.0 SEL expressions (6 Labs templates) — seven new expression features across all Labs templates: |
| v3.2.6 | 2026-07-09 | Configurator v2.30 — 3 new debrid services: EasyDebrid, PikPak, Seedr (all using StremThru Store cache layer). Generated… |
| v3.2.5 | 2026-07-03 | Template collection file (core-builds-template-collection.json) — operator-facing template catalog for AIOStreams TEMPLA… |
| v3.2.4 | 2026-07-03 | Sort criteria overhaul (all 42 templates) — rebuilt the sort pipeline based on AIOStreams' stable multi-key sort archite… |
| v3.2.3 | 2026-07-02 | Configurator v2.9 — Easy Setup one-click button now opens AIOStreams directly via ?template=URL deep link instead of cal… |
| v3.2.2 | 2026-07-02 | Configurator v2.8.1 — groups.groupings now omitted when groups are disabled, fixing "Every group must have at least one … |
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
