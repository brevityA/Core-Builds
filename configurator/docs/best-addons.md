# Best Add-on Stack for AIOStreams (2026-09 Research)

This document is surfaced inside the configurator (Review → Tools → Recommended Stack) and as a standalone reference.

## Decision: Forks picker skipped
Viren070/AIOStreams is the canonical repo. Known forks (elfhosted, fortheweak, etc.) run the **same** upstream code (pinned e694b6a v2.34.0) with different host policy (free/P2P allowed, rate limits, regex allowlist level). A forks picker would be misleading — pick the **host**, not the fork. Host selection lives in Advanced → Hosts (Auto = fastest healthy).

## Recommended Stack (r/StremioAddons 2025-2026 consensus)

### Debrid — pick ONE primary, optionally add a second for failover
- **TorBox** — best API speed, usenet + p2p, 1 TB cache, cheap. Pair with Torz for usenet.
- **Real-Debrid** — largest cached catalog, cheapest, but no usenet native.
- **AllDebrid** — balanced, supports 15+ hosters, good for groups sequential fetching.
- **Premiumize** — best for private trackers via Jackettio bridge.

### Torrent Scrapers (AIOStreams presets) — 52 simple / 30 require extra
Core Builds wires **17 safe** optional scrapers by default:
- `comet` — **Comet** + CometNet P2P metadata sharing (no files shared, trust pools)
- `mediafusion` — MediaFusion universal scraper (torrent + live)
- `torz` — **StremThru Torz** (usenet aggregator via Newznab, needs TorBox/usenet creds)
- `zilean` — DMM via Zilean (needs DMM API)
- `knaben` — Knaben (usenet search, no account)
- `debridio` — Debridio (debrid search, needs api key, shipped disabled)
- `hdhub` — HdHub (http, no account, unstable)
- `webstreamrmbg` — WebStreamr MBG (http)
- `flix-streams` — Flix-Streams (http)
- `easynews++` — EasyNews++ (usenet, needs creds, catalog+meta)
- `newznab` — Newznab custom (user URL)
- `jackettio` — Jackettio bridge to Jackett/Prowlarr (self-hosted, 8-12 indexers recommended)

**Not recommended as primary:**
- `torbox-search` — removed in v2.32+ host (source contains literal check, output must not include type)
- Pure HTTP scrapers (HdHub/WebStreamrMBG/Flix-Streams) — unreliable, use as fallback only, gated behind OPTIONAL_EXTRAS_STREAM_TYPES + isExplicitPreset so Stable/Balanced can drop them

### Best Practice per Community Guides (guides.viren070.me)
- **Primary:** Torrentio + Comet + MediaFusion + StremThru Torz + Debridio (if you have Debridio key)
- **HTTP fallback:** HdHub/WebStreamrMBG only if you need no-debrid free streaming
- **Reality TV / niche:** EasyNews++ (usenet) — better than P2P for old seasons
- **Groups:** fetch sequentially to avoid rate limits (AIOStreams does this when `groups` configured)
- **Regex:** Vidhin regex + Tamtaro SEL for language-aware sorting

### Self-hosted Improvements (for power users)
- **DB:** PostgreSQL tuned `shared_buffers 128MB`, `effective_cache_size 384MB`, background scraper <3s cache
- **CometNet:** enable P2P metadata sharing — reduces API calls, no files shared
- **DMM Ingester:** Zilean + DMM for private metadata
- **FlareSolverr:** for Cloudflare-protected Jackett indexers
- **Jackett:** 8-12 indexers max, else rate-limit; use Prowlarr for management
- **Host:** self-host AIOStreams on ElfHosted / VPS with 100KB payload limit awareness

### Configurator WebTools Improvements (implemented in this patch)
- **Debounce svc-filter 200ms + requestIdleCallback** — avoids jank on 82 presets
- **Host status 5-min localStorage cache + background refresh** — instant chip, no probe storm
- **Live byte counter in Review** — `payloadSizeGuard(buildFinal().config)` with bar, warns at 90KB, blocks at 100KB
- **content-visibility:auto** for 31-card scraper carousel + svc-list rows — reduces layout cost
- **Import unknown keys warning** — uses `unknownConfigKeys` from generated schema, shows dead payload
- **Feature flags `cb-flags`** — localStorage comma list: `pwa=0`, `webVitals=1`, `sentryDsn=https://...`, `hostCache=0`
- **PWA manifest.json + SW** — offline cache of same-origin assets, installable, respects `pwa=0`
- **Web Vitals beacon** — LCP/CLS/FID via PerformanceObserver, beacons to USAGE_BEACON_URL or COUNTER_URL when `webVitals=1`
- **Sentry optional** — loads browser SDK only when `sentryDsn` flag set, tags with flags
- **Ctrl+/ shortcut** — shows keyboard help, lists flags
- **Lighthouse CI** — `configurator/lighthouserc.json` + `.github/workflows/lighthouse.yml`, budgets: JS 600KB, CSS 150KB, FCP 2s, LCP 2.5s, CLS 0.1

### Credential Handling (security)
- Send directly to api.strem.io over HTTPS, never store in Core Builds beyond localStorage
- Treat debrid key as password — sanitizeTemplateForRemoteImport strips credentials for import URLs
- `isSensitiveKey` covers apiKey, token, password, secret; RPDB free-tier `t0-free-rpdb` is public exception
- StreamNZB URL blanked on export (can embed credential)

### References
- Upstream pin e694b6a v2.34.0 Viren070/AIOStreams
- r/StremioAddons 2025-2026 threads: best setup Torrentio+Comet+MediaFusion+StremThru Torz+Debridio
- g0ldyy/comet: CometNet
- ImJustDoingMyPart/stremio-stack: PG tuning, Jackett, FlareSolverr
- stremioaddonmanager.org: credential handling
