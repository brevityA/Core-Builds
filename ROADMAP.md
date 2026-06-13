# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

| Version | Item |
|---|---|
| v2.7.5 | Addon timeout tuning — per-addon values replacing flat 3000ms across all 33 templates; fixes silent usenet result drops on Meteor + TorBox NZB |
| v2.7.5 | Dedup tiebreakers explicitly configured — `torrent_seeders` + `usenet_age` (`before_addon`) added to all 33 templates; formalises AIOStreams v2.30.3 default behavior |
| v2.7.5 | `hdhub` preset added (disabled by default) to 12 full non-Lite templates — TorBox-native P2P scraper; `resources: ['stream']`, 5000ms timeout, `tb_only: true`; enable in AIOStreams addon settings |
| v2.7.4 | 📖 Chapter badge added to Elite/Apex-v2/Nexus Prime formatters and all 33 active templates — BluRay REMUXes with embedded chapters now visually distinguished |
| v2.7.3 | `zilean` + `meteor` catalog bleed fix — `resources: ['stream']` added to both scrapers across all 33 active templates; suppresses scraper catalog entries appearing in Stremio instead of playable streams |
| v2.7.2 | `size()` floor guards on BluRay REMUX PSEs — 15 GB floor for 4K Remux, 8 GB floor for 1080p Remux; applied to 4K Apex, 4K Pro, 4K Essential, 4K Hybrid, and 1080p Hybrid |
| v2.7.1 | Addon stack cleanup — Knaben moved to last P2P slot, `torbox-search` renamed-addon fix, AnimeTosho + NekoBT enabled across all 6 anime templates; applied to all 33 active templates |
| v2.7.0 | Core Nexus 4K Hybrid — new TorBox + NZBGeek Usenet template; full 4K, full HDR, full lossless audio |
| v2.7.0 | IQR Tukey fence PSEs rolled out to 4K Pro, 4K Essential, and Hybrid (1080p tiers) |
| v0.3.0 | Core Nexus 4K Apex — IQR Tukey fence PSEs (Q1−1.5×IQR / Q3+1.5×IQR); three-tier adaptive gate with thin-pool and new-release fallbacks; replaces min/max approach |
| v0.3.0 | Standalone PSE reference files — `Expressions/apex-iqr-pses.md` + `.json` |
| v2.6.0 | Live nSeScore display — `💎 94` replaces binary `💎 ELITE` badge in formatter |
| v2.6.0 | Smart content-type preload — movies get quality diversity, series get resolution balance |
| v2.6.0 | Core Nexus Samsung TV Nightly — DV-only kill enabled, device-specific template |
| v2.6.0 | DV-Only Kill ESE — optional, disabled by default, added to all 30 templates |
| v2.6.0 | Subtitle language flags — `uSubtitleEmojis` replaces generic 📝 SUB badge |
| v2.6.0 | Flash `daysSinceRelease` guard — uncached allowed for content ≤ 3 days old |
| v2.6.0 | Core Nexus Stream (Fire Stick) + Lite variants |
| v2.6.0 | Anime Non-Anime Query Guard — `and not isAnime` ISE guard |
| v2.5.1 | Local test environment — `requirements.txt` + CONTRIBUTING.md setup guide |
| v2.5.0 | Lite template suite — 12 Lite variants of every active template |
| v2.5.0 | Core Nexus Anime 4K template |
| v2.5.0 | Core Nexus Speed EasyNews — EasyNews-only speed build |
| v2.4.7 | Core Nexus Apex, Sigma, and Minimal formatters |
| v2.4.6 | Core Nexus Elite formatter (bundled in all templates) |
| v2.4.5 | SeaDex best-release enforcement on Anime template |

---

## 🔄 In Progress

| Item | Notes |
|---|---|
| **Core Builds Expression Layer — trial** | 4 custom SEL expressions in active testing on Stream template (v2.7.10): REPACK/PROPER Passthrough ISE, Per-Addon Flood Guard ESE, Usenet Propagation Guard ESE, Codec Efficiency Booster PSE. See `Expressions/core-builds-expression-layer.pdf` |
| `hasSeaDex` + `seMatched()` anime gating | Adaptive anime quality gate: if SeaDex data exists → require SeaDex-matched stream in top tier; else fall through to standard sort |
| AllDebrid template suite | Essential variant; natively supported in AIOStreams; biggest unserved community segment |
| Samsung TV Nightly → stable | Gather community feedback; promote out of Nightly once validated on hardware |

---

## 📋 Planned

### Expression Layer

**In trial** (Core Nexus Stream v2.7.10 — roll out to all templates post-trial):

- [ ] **REPACK/PROPER Passthrough ISE** — Pins REPACK/PROPER releases ahead of limit/excluded filters; ensures patched releases always surface. *All templates — critical for Anime (fansub REPACKs), Hybrid, and Stream (streaming service fix runs)*
- [ ] **Per-Addon Flood Guard ESE** — Per-addon result cap (Meteor ≤5, Comet ≤5, MediaFusion ≤4, Torrent Galaxy/EZTV/Knaben/HdHub ≤3) on cached non-library streams. *All templates — most impactful on Stream, Essential, and Apex where Meteor can return 15–20+ results*
- [ ] **Usenet Propagation Guard ESE** — Holds back NZBs younger than 2 hours when propagated alternatives exist; eliminates corrupt early-propagation grabs. *All Usenet-enabled templates — critical for Apex, 4K Hybrid, Hybrid; not applicable to Flash*
- [ ] **Codec Efficiency Booster PSE** — Surfaces HEVC/AV1 encodes of 1080p + 720p Bluray REMUX and WEB-DL/WEBRip ahead of AVC equivalents. *Stream, Essential, Anime (primary) — limited effect on 4K REMUX templates where HEVC is already standard; not applicable to Flash*

**Planned** (post-trial, pending research — no Tam-Taro equivalent exists for any of these):

- [ ] **Audio Pinnacle PSE** — Promotes lossless/object-based audio tracks within the ranked pool: Atmos/TrueHD → DTS-HD MA/DTS-X → EAC3/DD+. *Critical for Apex, 4K Apex, 4K Hybrid, 4K Essential (home theatre users); moderate for Stream, Hybrid, Essential; low impact on Anime (fansub FLAC/AAC standard) and Flash*
- [ ] **HDR / DV Priority PSE** — Within 4K results, surfaces DV/HDR10+/HDR10 ahead of SDR equivalents. Safe no-op on 1080p-only templates (empty 2160p pool). *Critical for Apex, 4K Apex, 4K Essential, 4K Hybrid, Flash 4K, Speed 4K; high for Anime 4K; no effect on Stream/Essential/FireStick/Flash*
- [ ] **AI Upscale Exclusion ESE** — Excludes streams containing AI upscaling keywords (topaz, ai-upscale, aiupscale, upscaled, neural, enhancedai) using the `keyword()` function (AIOStreams v2.29.6+). First Core Builds expression to use `keyword()`. *Critical for all 4K templates and Anime 4K; high for Anime (upscaled 1080p); moderate for Stream/Essential*

### Templates
- [ ] **Deprecate Core Nexus 4K Pro + Pro Lite** — Apex is the fully upgraded successor; Pro adds no distinct value and creates maintenance overhead. Move to `Templates/Torbox/Deprecated/`
- [ ] **Deprecate Speed + Flash suite** — Community feedback confirms these are redundant now that the core templates match their responsiveness. 8 templates moved to `Templates/Torbox/Deprecated/`
- [ ] **`pin()` top result** — Pin the #1 PSE-matched stream to position 1 regardless of sort order; clean UX improvement across all quality-gated templates
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
| New unified template suite | Under consideration — if Speed/Flash/Pro are deprecated, explore a tighter 6-template lineup (Apex · Essential · Hybrid · Stream · Anime · Samsung TV) built around the Core Builds expression layer from the ground up |
| Debrid-Link template | Under research — supported in AIOStreams; smaller user base than AllDebrid |
| Premiumize template | Under research — natively supported; European user base overlap with AllDebrid |
| RealDebrid support revival | Monitoring — server-side filter policy (May 2026) blocks most torrent results; situation under review |
| `stddev()` / `variance()` PSE variants | Exploratory — z-score style gating (mean ± 2×stddev) as alternative to IQR for large pools |
| Per-indexer score weighting in PSEs | Exploratory — reward high-trust indexers (e.g. BTN, PTP) above general public trackers |
| Community formatter gallery | Under consideration — dedicated `Formatters/Community/` directory with user-submitted layouts |

---

## 🙏 Want to Contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. For feature suggestions, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue — roadmap items that gain community traction get prioritised.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds)*
