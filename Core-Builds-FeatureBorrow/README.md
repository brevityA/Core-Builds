# Core Builds — Feature Borrowing Package

**Date:** 24 Jul 2026  
**Analysis:** AIOStreams v2.31.1, Tam-Taro SEL, TVFlix Builder, Duck Tools, CrispyFormat

## Contents

| File | What | Borrowed From | Priority |
|------|------|--------------|----------|
| `ANALYSIS.md` | Full feature borrowing analysis | — | — |
| `code/knaben-preset.js` | Knaben + Zilean + Jackett + Prowlarr + Torznab scrapers | AIOStreams v2.13+, Tam-Taro | **P0** |
| `code/cinemeta-patch.js` | Cinemeta patching + full stack install | Duck Tools/QuackStart | **P0** |
| `code/health-score.js` | Template Health Score (0–100) | **Nobody — unique to you** | **P1** |
| `code/debrider-service.js` | Debrider multi-debrid service | AIOStreams v2.10 | **P0** |
| `code/nzb-failover.js` | NZB failover options | AIOStreams v2.25 | **P1** |
| `code/template-versioning.js` | Template version tracking + auto-update | **Nobody — unique to you** | **P1** |

## Quick Start

```bash
# Copy scrapers into your configurator
cp code/knaben-preset.js /path/to/Core-Builds/configurator/src/data/
# Add NEW_SCRAPERS to OPTIONAL_SCRAPER_DEFS in scrapers.js

# Copy cinemeta patch into your configurator
cp code/cinemeta-patch.js /path/to/Core-Builds/configurator/src/js/
# Import fullStackInstall() in app.js

# Copy health score into your configurator
cp code/health-score.js /path/to/Core-Builds/configurator/src/js/
# Call calculateHealthScore() in the Review step
```

## The Big Picture

| Feature | Who Has It | You Should Build |
|---------|-----------|-----------------|
| Knaben addon | Tam-Taro, TVFlix | ✅ Yes — 1 hour |
| Debrider service | AIOStreams v2.10 | ✅ Yes — 30 min |
| Cinemeta patching | Duck Tools | ✅ Yes — 3 days |
| Full stack install | Duck Tools | ✅ Yes — 2 weeks |
| Template Health Score | Nobody | ✅ Yes — 1 week |
| Template versioning | Nobody | ✅ Yes — 1 week |
| NZB failover | AIOStreams v2.25 | ✅ Yes — 1 day |
| Bandwidth limits | TVFlix | ✅ Already built |
| Age ratings | TVFlix | ✅ Already built |
| Catalog reordering | TVFlix, Duck Tools | ⏳ Later |
| Poster ratings | TVFlix | ⏳ Later |
| Formatter editor | CrispyFormat | ❌ Don't — deep-link |
| Shared API keys | TVFlix | ❌ Don't — risk of ban |
