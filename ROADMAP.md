# Roadmap

This is a living list of planned work, active development, and recently completed milestones. It is updated with each release.

---

## ✅ Recently Completed

<!-- AUTO:ROOT_COMPLETED:BEGIN -->
Auto-generated from [`CHANGELOG.md`](https://github.com/brevityA/Core-Builds/blob/main/CHANGELOG.md) by `scripts/sync-docs.py`. In Progress / Planned / Ideas below are hand-curated.

| Version | Date | Highlights |
| --- | --- | --- |
| v3.14.0 | 2026-11-25 | SeaDex picks first in Anime 4K and Anime (1080p) — when a title has a SeaDex entry (hasSeaDex), SeaDex Best 2160p (4K on… |
| v3.13.0 | 2026-11-14 | Best file first inside every tier (41 templates) — each active template now carries inline ranked stream expressions fro… |
| v3.12.1 | 2026-10-23 | Remaining AIOStreams 2.36 save follow-ups (18 templates, one patch bump each) — the four Personal templates no longer ca… |
| v3.12.0 | 2026-10-22 | 52 templates refused on AIOStreams 2.36 (AIOSubtitle removed) — AIOStreams 2.36.0 marks the aiosubtitle preset removed (… |
| v3.11.0 | 2026-10-22 | Inline regex re-synced to upstream Vidhin05 (43 templates, one bump each) — hosts accept a regex only on an exact string… |
| v3.10.0 | 2026-10-13 | Host-preload collection drops the nested Deprecated lane — sync_template_collection.py checked only the first path part … |
| v3.9.0 | 2026-09-26 | nzbFailover → failover across all 60 active templates — AIOStreams renamed the key and migrates the old spelling before … |
| v3.8.0 | 2026-09-22 | Dead-key purge across all 55 active templates — maxResults, maxResultsPerResolution, seadexBestOnly, excludedStreamSourc… |
| v3.7.0 | 2026-09-05 | Standalone template regex sync (drift-fix release) — every active standalone template's inline rankedRegexPatterns, pref… |
| v3.6.2 | 2026-08-22 | Core Badge Builder (Configurator v2.97 · tools/badges/) — a no-code Nuvio Fusion badge configurator with 111 original Co… |
| v3.6.1 | 2026-08-13 | Live instance-status cron retired — the every-6-hours auto-check (host → STATUS.md + docs page) was retired after 25 con… |
| v3.6.0 | 2026-08-11 | Preflight audit tool (Configurator v2.92 · Tools page) — audits any template or live config offline with rules learned f… |
| v3.5.3 | 2026-08-04 | Episode-pack availability — multi-episode and season-pack streams were previously removed by an early exclusion filter b… |
| v3.5.2 | 2026-08-02 | Core Builds CLI published to npm — npm install -g core-builds for generate, validate, diff, and info commands. Same @cor… |
<!-- AUTO:ROOT_COMPLETED:END -->

> **Shipped-then-removed:** Audio Pinnacle PSE and HDR/DV Priority PSE shipped at v2.84 and were **removed in v3.2.8** (REMUX-ranking fix). Do not re-implement.

---

## 🔄 In Progress

| Item | Notes |
|---|---|
| Samsung RU7100 hardware feedback | Promoted to stable in `Device/Samsung/`; collecting reports per TV model ([Samsung TV setup](docs/samsung-tv.mdx) says how to report) |
| Profitability | Disclosed referral links in the service picker and a one-time thank-you after a successful install, pending the owner's choice of programmes and wording |

---

## 📋 Planned

### Formatters
- [ ] **Formatter v2 pass** — check the Elite formatter against the fields AIOStreams 2.38.1 exposes and add the ones that earn their space

### Documentation
- [ ] **Video walkthrough** — import flow and template choice, for new users (needs a screen recording by the maintainer)

### Infrastructure
- [ ] **Sync Upstream Rules** — fails until *Settings → Actions → General → Allow GitHub Actions to create and approve pull requests* is turned on

---

## ✔️ Done since the last roadmap pass (Nov 2026)

- **SeaDex gating in stable Anime** — Anime 4K and Anime (1080p) rank SeaDex picks first when a title has a SeaDex entry (template suite 3.14.0). The Dub templates keep their dub-first ranking: SeaDex Best is often a Japanese-audio release.
- **Anime Dub 4K**, **AllDebrid Essential (4K)**, **Mobile**, **Mixed** and **Xiaomi 4K** templates, now all listed in the [Template Directory](docs/template-directory.mdx)
- **Samsung RU7100 4K** promoted from Nightly to stable
- **Automated live AIOStreams testing** — the save test saves every generated and static config into a real AIOStreams at the pinned release on each PR
- **GitHub Sponsors** alongside Ko-fi (`.github/FUNDING.yml`)
- **Guides**: AllDebrid setup, Configurator, [Samsung TV setup](docs/samsung-tv.mdx), [Mobile template](docs/mobile-template.mdx)
- **Community formatter folder** — [`Formatters/Community/`](Formatters/Community/README.md) with submission rules
- **Live stream preview** — Review's *Test streams first* runs the build before installing
- **Premiumize and Debrid-Link** — covered by the [smart template](Templates/Smart/core-builds.json) and the Configurator, which build for any service AIOStreams supports, so no separate static templates

---

## 🧭 Decided against (for now)

| Item | Why |
|---|---|
| `pin()` the #1 match to the top | `pin()` overrides the sort, so an uncached top match would sit above cached results that play instantly. The sort already puts the best cached match first. |
| `stddev()` / `variance()` PSE variants | Bitrate distributions are skewed, and a mean/standard-deviation gate is pulled by the outliers it is meant to catch. The IQR fences are the robust version of the same idea. |
| Per-indexer weighting (BTN, PTP) | Those are private trackers the public scrapers do not return, so the weight would never apply. Revisit if a supported addon exposes trusted indexers. |
| Deprecate the Flash suite | Kept: cached-only instant play (`excludeUncached`) is a real choice the Speed and Essential lines do not offer. |
| Unified 6-template suite | The smart template already gives one import that adapts to device, picture, services and anime, so the static line-up stays as is. |
| RealDebrid revival | Still blocked: Real-Debrid's server-side filtering (May 2026) removes most torrent results. |

---

## 🙏 Want to Contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. For feature suggestions, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue — roadmap items that gain community traction get prioritised.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds)*
