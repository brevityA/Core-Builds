# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

### v2.84 — Configurator & Expression Layer

| Version | Item |
|---|---|
| v2.84 | **Age Rating Limit** (Kids Mode) — G/PG/PG-13/R/NC-17 content filtering |
| v2.84 | **Library Boost** — Default / Strong / None options |
| v2.84 | **NZB Failover** with position control |
| v2.84 | **Bandwidth Estimator** |
| v2.84 | **Security audit** — XSS, CSP, CORS, credential stripping fixes |
| v2.84 | **Error Logger & Diagnostics modal** |
| v2.84 | **Contact Widget** → Discord webhook relay |
| v2.84 | **Debrider** multi-debrid aggregator service |
| v2.84 | **Knaben, Zilean, Jackett, Prowlarr** scrapers |
| v2.84 | **REPACK/PROPER Passthrough ISE** — 42 templates |
| v2.84 | **Per-Addon Flood Guard ESE** — 3 variants (19/14/4 templates) |
| v2.84 | **Usenet Propagation Guard ESE** — 35 templates |
| v2.84 | **Codec Efficiency Booster PSE** — 39 templates |
| v2.84 | **Audio Pinnacle PSE** — 40 templates (Atmos/TrueHD → DTS-HD MA → DD+) |
| v2.84 | **HDR/DV Priority PSE** — 40 templates (DV/HDR10+/HDR10 → SDR) |
| v2.84 | **AI Upscale Exclusion ESE** — 35 templates |
| v2.84 | **Indexer Diversity ESE** — 29 templates |
| v2.84 | **Score IQR Guard ESE** — 5 templates |
| v2.84 | **Adaptive Seeder Guard ESE** — 5 Labs templates |
| v2.84 | **Bitrate Floor ESEs** (1080p + 4K REMUX) — 2 Labs templates |
| v2.84 | **Tier-guarded Bluray/Anime kills** — 1 Samsung template |

### v2.81–v2.83 — Configurator Features

| Version | Item |
|---|---|
| v2.83 | **Health Score** — 0–100 with A–F grading, 11 checks, ring gauge |
| v2.82 | **Template Inspector** — paste JSON for instant validation + host compatibility |
| v2.81 | **Template Versioning** — auto-update banner when template is outdated |
| v2.81 | **Full Stack Install** — AIOMetadata + Cinemeta patch + addon ordering in one click |
| v2.81 | **family-v4 formatter** — truncated title, bitrate, release group, seeders, age, indexer |
| v2.81 | **Troubleshooter** — interactive decision tree for common issues |
| v2.81 | **17 device profiles** — Shield, Fire Stick, Samsung, Apple TV, LG, Roku, etc. |
| v2.81 | **19 formatter presets** — family-v4, Apex, Elite, Sigma, Syntax, Prime, TV, etc. |

### v2.56–v2.8.0 — Earlier Milestones

| Version | Item |
|---|---|
| v2.8.0 | Speed tier consolidation — 8 redundant Speed templates deprecated |
| v2.8.0 | Core Builds Expression Layer rollout — 7 expressions deployed to all 31 active templates |
| v2.8.0 | Core Nexus 4K Pro deprecated — Apex is the direct replacement |
| v2.7.5 | Addon timeout tuning — per-addon values replacing flat 3000ms |
| v2.7.5 | Dedup tiebreakers explicitly configured |
| v2.7.5 | `hdhub` preset added to 12 full non-Lite templates |
| v2.7.4 | Chapter badge added to Elite/Apex-v2/Nexus Prime formatters |
| v2.7.3 | `zilean` + `meteor` catalog bleed fix |
| v2.7.2 | `size()` floor guards on BluRay REMUX PSEs |
| v2.7.1 | Addon stack cleanup — Knaben moved, AnimeTosho + NekoBT enabled |
| v2.7.0 | Core Nexus 4K Hybrid — new TorBox + NZBGeek Usenet template |
| v2.7.0 | IQR Tukey fence PSEs rolled out to 4K Pro, 4K Essential, Hybrid |
| v2.6.0 | Live nSeScore display, Smart preload, DV-Only Kill, Subtitle flags |
| v2.5.0 | Lite template suite, Anime 4K, Speed EasyNews |
| v2.56 | Resolution First toggle, Foreign Language Kill |

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
| Template Migration Tool | Under consideration — auto-upgrade old schemas to current version |
| Live Stream Preview | Under consideration — fetch real streams before deploying |

---

## 🙏 Want to Contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. For feature suggestions, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue — roadmap items that gain community traction get prioritised.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds)*
