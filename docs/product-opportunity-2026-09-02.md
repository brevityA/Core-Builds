# Core Builds: product opportunity and recommendation

**Research cut-off:** 2 September 2026 (Sydney time)  
**Repository:** [brevityA/Core-Builds](https://github.com/brevityA/Core-Builds)  
**Recommendation:** build a privacy-first **Core Builds Reliability & Configuration Control Plane**, launched as a local-first configuration doctor and migration tool—not as another Stremio runtime stream aggregator.

## Executive decision

Core Builds has already outgrown the description “a collection of AIOStreams templates.” Its highest-value assets are the machinery around configuration correctness:

- a large, opinionated template and filtering corpus;
- generated AIOStreams schema, preset, sort, and compatibility contracts;
- host-capability detection and last-mile configuration gating;
- device/output profiles and payload budgets;
- SEL and regex structural validation;
- an explainable 0–100 Core Score with a traceable breakdown;
- import sanitisation, update/diff helpers, Inspector and Preflight tools;
- account backup/inspection prototypes, a CLI, and bounded worker infrastructure;
- extensive validation, golden, and regression tests.

That combination is unusually well matched to the problem users actually report: **“the same configuration worked before, but this host, version, device, provider, or update now behaves differently—what changed, and how do I repair it safely?”**

The product should therefore be:

> **A local-first compatibility, diagnosis, repair, and migration layer for Stremio/AIOStreams configurations.**

The MVP should accept a JSON template/configuration or a local manifest, explain likely failures against a selected AIOStreams version/host/device, show a reversible diff, and export a sanitized install bundle. It should not require a Stremio password, debrid key, provider key, or remote account creation.

A useful two-surface launch is:

1. **Core Builds Doctor** — a browser-local PWA/CLI for users.
2. **Core Builds Check** — a GitHub Action/CLI mode for template authors and instance maintainers.

Hosted monitoring, fleet management, account synchronization, and managed private instances are later products, not the first release.

---

## 1. What Core Builds can already reuse

### 1.1 Product-quality assets

The repository is active: the public page currently shows 51 stars, 1,074 commits, 57 tags, and a main-branch commit on 1 September 2026. The README and roadmap describe v3.6.2 work, including Preflight, device profiles, SEL Engine v2, template migration, and the badge builder. See the [repository](https://github.com/brevityA/Core-Builds), [README](https://raw.githubusercontent.com/brevityA/Core-Builds/main/README.md), and [ROADMAP](https://raw.githubusercontent.com/brevityA/Core-Builds/main/ROADMAP.md).

| Existing asset | Product value |
|---|---|
| `Templates/` | Curated, tested starting points for TorBox Pro/Essential, Speed/Flash, anime, device-specific, Lite, Nightly/Labs, and community scenarios. This is a test corpus as much as a template library. |
| `Filtering/` | ESE/PSE/ISE packs, expression layers, ranked regex data, and pinned upstream snapshots. These provide known-good and known-risk fixtures. |
| `Formatters/` | Core Nexus, TV, legacy, and community-style output formats. Useful for payload-size and compatibility checks. |
| `configurator/src/core/` | Pure modules for generation, policy, host gating, device profiles, output budgets, SEL validation, import/update handling, and scoring. These can become a stable domain library. |
| `host-capability-policy.js` | The strongest differentiator. It merges registry knowledge with a live status probe and can remove unsupported keys, presets, stream types, and restricted regex while reporting why. It explicitly makes the stricter registry/probe result win. |
| `sel-expression-parser.js` | Structural validation for parentheses, ternaries, string literals, known upstream functions, and expression-length headroom. This directly addresses a reported AIOStreams UX gap. |
| `core-score-policy.js` | A deterministic, explainable stream-quality score with tier, bitrate/IQR, resolution, HDR, source, seeders, freshness, and gate breakdowns. This is more valuable as an explanation engine than as another ranking UI. |
| Device/output policies | Capability-aware profiles for Android/Google TV, Fire TV, Samsung/LG, Apple TV, Shield, mobile, browser-like use, and audio/video constraints. |
| Inspector | A lightweight, browser-local “paste JSON, get plain-English findings, safe repair hints, and host compatibility” surface. This is almost the consumer MVP already. |
| Preflight | A much richer audit/evidence surface: static checks, host fleet status, version drift, payload limits, dependency checks, and evidence export. It is productizable after removing unsafe remote-write defaults. |
| Update/diff helpers | Transactional preview/commit/cancel logic and version/changelog helpers support reversible migrations. |
| Account tools | Backup, manifest inspection, comparison, restore, and emerging undo patterns. Keep separate until the credential and mutation contract is hardened. |
| CLI | Existing `generate`, `validate`, `diff`, and `info` commands are a good foundation for CI and support workflows. |
| Worker | CORS/status proxy, bounded temporary paste route, rate limiting, and analytics already exist. Reuse only the allowlisted, metadata-only status lane for the MVP. |
| Tests and fixtures | The repo’s schema, compatibility, local-expression-policy, documentation, and regression tests can become the product’s trust layer. |

### 1.2 The key insight

Most template projects optimize for a good initial configuration. Core Builds has the ingredients to own the **configuration lifecycle**:

```text
import → normalize → identify target → lint → explain → patch → review diff → export → verify later
```

That lifecycle is valuable even when the user changes host, AIOStreams version, playback device, service plan, or addon mix. It also avoids taking responsibility for finding or hosting audiovisual content.

---

## 2. Ecosystem and competitive landscape

### 2.1 AIOStreams is a large, moving substrate—not an empty market

[AIOStreams](https://github.com/Viren070/AIOStreams) is the central platform in this niche. Its current repository shows roughly 2.6k stars, 827 forks, active development, and a large open issue backlog. Its product surface includes:

- 80+ marketplace addons and arbitrary custom addon URLs;
- built-in search and native Usenet integrations;
- debrid and Usenet service support;
- universal filtering, sorting, deduplication, matching, and formatting;
- catalogs, metadata, subtitles, and stream resources;
- built-in/external proxy options;
- stable/nightly channels, public community instances, self-hosting, and paid managed hosting.

The [AIOStreams public-instance documentation](https://docs.aiostreams.viren070.me/getting-started/public-instances/) explicitly says instances can impose different limits. ElfHosted’s public instance, for example, forcefully excludes P2P, HTTP, and Live stream types, while other hosts expose a broader set. The [deployment documentation](https://docs.aiostreams.viren070.me/getting-started/deployment/) also makes Docker, `BASE_URL`, `SECRET_KEY`, HTTPS, reverse proxies, version channels, and provider-specific network issues operationally relevant.

A live `/api/v1/status` response from one public instance reported **v2.33.2**, `stable`, and a `users` field of 243,648 when checked for this research. That number is a directional ecosystem signal only—not verified monthly active users and not evidence that all accounts are active.

The implication is strategic: do not compete with AIOStreams on aggregation, search, filters, or a generic configuration page. Build the layer that helps people operate configurations across its moving parts.

### 2.2 Competitive categories

**Template and expression authors.** [Tam-Taro/SEL-Filtering-and-Sorting](https://github.com/Tam-Taro/SEL-Filtering-and-Sorting) has 805 stars, 361 commits, and a current release/update around 1 September 2026. It offers sophisticated ready-to-import templates and an onboarding wizard for users who do not want to author SEL themselves. Its open issues include filters behaving unexpectedly, updates removing user settings, password/import friction, version compatibility, and incorrect formatter data. This is strong evidence that demand exists for opinionated configurations, but also that configuration maintenance is painful.

**Dedicated builders.** [aio-tvflix-builder](https://github.com/ParticularCatch449/aio-tvflix-builder) has 73 stars and packages a focused AIOStreams builder with autoplay, anime, TorBox, and P2P/debrid-specific fixes. It validates the builder category but is a narrower, template-centric product.

**Account/configuration managers.** [AIOManager](https://github.com/Sonicx161/AIOManager) has 273 stars and demonstrates demand for addon snapshots, bulk actions, mirroring, failover flags, local-first storage, encrypted optional sync, and metrics. It is explicitly in maintenance mode, which creates an opening for a narrower, more reliable successor—but its existence means account management is not an uncontested blue ocean. [Stremio Account Manager](https://github.com/Asymons/stremio-account-manager) offers local encrypted multi-account/addon management, tagging, bulk operations, and sync with 48 stars. [Storemio](https://github.com/CmdPrmpt/Storemio) offers a terminal-based mirror/backup manager, but has very small adoption.

**Runtime aggregators and curators.** [Torrentio](https://stremio-addons.net/addons/torrentio) is listed at roughly 2k directory stars; [Comet](https://stremio-addons.net/addons/comet) at roughly 813; AIOStreams at 633 in the directory. [Pipe](https://stremio-addons.net/addons/pipe) is a newer runtime aggregator that advertises server-side stream health checks, 11 sources, optional debrid support, and no tracking. [torrentio-stream-curator](https://github.com/ethanmotaco/torrentio-stream-curator) is a small but technically serious experiment with filtering, ranking, probes, caching, and SSRF hardening. This is a crowded and operationally exposed lane.

**Reliability/status tools.** [stremio-status](https://github.com/SolitudePy/stremio-status) has 88 stars and combines addon status pages and health metrics. Core Builds’ own [STATUS.md](https://raw.githubusercontent.com/brevityA/Core-Builds/main/STATUS.md) says its recurring status cron was retired because it had become stale and disagreed with reality. This is useful evidence that a static status directory is not enough; on-demand, target-specific evidence is better.

**Niche paid addons.** [Auto-Subs](https://stremio-addons.net/addons/streamio-auto-subs) currently advertises paid plans from $2.99/month, while [Ratings](https://stremio-addons.net/addons/ratings) is a free metadata/ratings addon with roughly 134 directory stars. Users will pay for a sharply defined outcome, but not necessarily for another generic addon.

---

## 3. Evidence of user pain and unmet needs

### 3.1 Upstream issue themes

The AIOStreams backlog is qualitative evidence, not a willingness-to-pay survey. Many individual issues have low engagement, so these should be treated as recurring problem statements and pilot hypotheses rather than market-size estimates.

| Pain theme | Direct evidence | Product implication |
|---|---|---|
| Provider/addon outages stall the whole request | [#1221](https://github.com/Viren070/AIOStreams/issues/1221) says a down TorBox API or addon is queried repeatedly until timeout, with no fall-through without editing config. [#1001](https://github.com/Viren070/AIOStreams/issues/1001) asks for fallback debrid tiers. | Explain dependency chains, detect incompatible/known-down targets, and produce safe failover/disable patches. Do not become the runtime failover proxy in v1. |
| Complex conditions are authored from memory | [#1198](https://github.com/Viren070/AIOStreams/issues/1198) says group conditions have a plain text box with no completion, linting, or pre-save validation, even though the formatter editor has those affordances. | Make SEL/condition errors first-class, with function suggestions and clear repair explanations. |
| One config cannot serve all clients well | [#1128](https://github.com/Viren070/AIOStreams/issues/1128) describes browser-safe versus native-TV formats and the drift caused by maintaining separate configurations. | Use Core Builds device profiles to generate a base plus device-specific overlays, or at least explain the trade-offs and produce a diff. |
| Multiple configs are hard to find and maintain | [#986](https://github.com/Viren070/AIOStreams/issues/986) asks for aliases instead of UUID/password tracking. [#1081](https://github.com/Viren070/AIOStreams/issues/1081) asks for child configs to exclude inherited addons/services. | Add local named profiles and parent/child diff views before attempting cloud account management. |
| Version/host behavior changes are hard to diagnose | [#1254](https://github.com/Viren070/AIOStreams/issues/1254) documents a preload/cache-key problem behind a reverse proxy; [#1135](https://github.com/Viren070/AIOStreams/issues/1135) documents NZBHydra search succeeding but TorBox resolution failing with a generic error; [#1260](https://github.com/Viren070/AIOStreams/issues/1260) asks for more precise same-release failover behavior. | Capture target version, host policy, provider dependencies, and evidence in every diagnosis. |
| Proxy playback can stutter or freeze | [#1164](https://github.com/Viren070/AIOStreams/issues/1164) asks for buffering inside the proxy to absorb CDN jitter. | This confirms real runtime pain, but it is a reason not to own proxy uptime and data-plane operations in the MVP. |

### 3.2 Core Builds’ own usage signal

The deployed worker’s public `/api/stats` endpoint reported, at retrieval time on 2 September 2026:

- **32,010** page visits;
- **333** template-generation events;
- **1,084** temporary paste creations and **3,285** paste views;
- **8,574** proxy calls, including **392** cache hits;
- **1,328** proxy errors.

The counters are not unique users and likely include tests, repeat visits, and badge-related flows; they should not be presented as a conversion funnel. Nevertheless, they demonstrate that the repository’s surrounding infrastructure is being used substantially beyond its 51 GitHub stars.

Several high-volume hosts showed worker-recorded error shares in the rough range of 8–20% (for example, ElfHosted 9.8%, Yeb’s 20.1%, Midnight’s 14.9%, Kuu’s 18.6%, Wizaardd 15.2%). These are proxy request errors, not uptime measurements, and include any failed/test requests. They still support the hypothesis that host choice and live compatibility are meaningful user concerns.

The generator counters also show device and quality intent: 4K was the largest resolution selection category in the available aggregate (242 of 309 resolution-tagged selections, about 78%), with Fire Stick 4K Max, generic, ONN, Shield, Google TV, Apple TV, Samsung, and other device profiles represented. The sample is not a market census, but it supports building around device/compatibility decisions rather than only a generic template picker.

---

## 4. Ranked opportunity matrix

Scores are directional product judgments on a 1–5 scale. For demand, differentiation, reuse, defensibility, and monetization, 5 is better. For complexity and legal/operational risk, 5 is more burdensome/risky.

| Rank | Product | Demand | Differentiation | Core reuse | Complexity | Defensibility | Monetization | Legal/ops risk | Decision |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| **1** | **Reliability & configuration control plane** | 4.5 | 5 | 5 | 3 | 4.5 | 4 | 2 | **Build.** Best fit to the repository and the pain evidence. |
| **2** | **Configuration QA/repair utility** | 4 | 4.5 | 5 | 2 | 3.5 | 3 | 1.5 | **Launch wedge.** The smallest safe product; can grow into #1. |
| **3** | **Hosted monitoring, fleet, and private-instance management** | 3.5 | 4 | 4 | 5 | 4 | 5 | 4.5 | **Later.** Strong B2B economics, but secrets, uptime, quotas, and support burden are substantial. |
| **4** | **Provider-independent device-adaptive runtime addon** | 3.5 | 2.5 | 3.5 | 5 | 2.5 | 3 | 5 | **Avoid for now.** It inherits the legal, data-plane, provider, and uptime surface of a true addon. |
| **5** | **Generic formatter/catalog/subtitle addon** | 3 | 1.5 | 3 | 3.5 | 1.5 | 2 | 3 | **Do not lead with it.** AIOStreams and active community addons already cover much of this. |

### Adjacent but not recommended as the first standalone product

A local Stremio account/addon manager is a viable feature line, especially for backup, named profiles, and reversible restore. However, AIOManager and Stremio Account Manager already occupy much of that space, and the moment the product logs in, stores auth keys, or mutates addon collections it inherits a much higher security and support burden. Keep account tools local and optional until the configuration doctor has repeat users.

---

## 5. Recommended product: Core Builds Doctor / Control Plane

### 5.1 Target users

Start with three overlapping user groups:

1. **Power users** who maintain one or more AIOStreams configurations across TV, mobile, browser, or family profiles.
2. **Template authors** who repeatedly answer “why did this import fail?” and need compatibility evidence before publishing.
3. **Community instance hosts/self-hosters** who need to explain host-specific restrictions and version drift without handling every user’s secrets.

The first paying customer may be the maintainer rather than the casual viewer. Maintainers have repeated jobs, stronger pain, and a clearer reason to pay for CI reports, release gates, and support tooling.

### 5.2 MVP contract

**Inputs**

- A local JSON template/configuration, pasted text, or a local manifest export.
- A selected target host from the known registry, or a user-entered host label with an “unverified” state.
- Optional user-triggered `GET /api/v1/status` probe through a strict allowlisted proxy.
- AIOStreams compatibility target and playback device/output profile.

**Outputs**

- A normalized configuration view.
- Findings with severity, JSON path, rule, likely host/version reason, and suggested remedy.
- A reversible patch/diff; no silent mutation.
- A repaired JSON export and an install checklist.
- A sanitized evidence bundle containing target version, non-secret capability facts, findings, patch summary, timestamps, and hashes.
- A machine-readable report for CI (`check`, `warn`, `fail`).

**MVP rules**

- Local audit performs zero network calls.
- No Stremio password, auth key, debrid key, provider key, or manifest credential is required.
- Manifest URLs containing UUID/password-like path segments are treated as secrets and never logged or sent as analytics.
- No remote `POST /api/v1/user`, remote account creation, or real credential testing.
- No stream resolving, content fetching, torrent/NZB probing, or playback proxying.
- Export is blocked or explicitly redacted if the secret scanner finds credential-shaped values.
- Every repair is previewed, attributable, and reversible.

### 5.3 First rule/fixture pack

Build the initial product around known, testable failures:

- required option missing from a preset;
- enabled credential-bearing preset/service with an empty placeholder;
- preset requiring a usable service when none is enabled;
- host-blocked P2P/HTTP/Live lane, especially the ElfHosted public policy;
- stale/removed preset or key for an older AIOStreams target;
- unknown SEL function, malformed ternary, unbalanced parenthesis, or near-limit expression;
- duplicate `instanceId` values;
- payload close to or above the instance body limit;
- device mismatch such as AV1, Dolby Vision, audio, or browser compatibility;
- version-stamp drift between the imported config and the selected host;
- inherited parent/child addon/service differences;
- dangerous or untrusted remote sync URLs.

The rule UI should answer three questions in plain language:

1. **What is wrong?**
2. **Why would this host/version/device care?**
3. **What changes if I apply the fix?**

### 5.4 Proposed user flow

```text
Drop JSON → choose host/device → static audit → inspect explanation
→ select fixes → review diff → export sanitized bundle → install manually
```

A qualified first-use goal is diagnosis and repair in under five minutes, without signup and without sending credentials anywhere.

---

## 6. Safe architecture

```text
Local PWA / CLI
├── JSON normalizer and schema adapter
├── versioned AIOStreams capability registry
├── host/device/output policy engine
├── SEL/regex and payload linter
├── explainable finding model
├── patch + diff + rollback engine
├── secret scanner and sanitized exporter
└── optional status-only edge adapter
    ├── hardcoded host allowlist
    ├── GET /api/v1/status only
    ├── short timeout and bounded response
    ├── no arbitrary URL forwarding
    ├── no config body persistence
    └── no credentials or user identifiers
```

The existing [host-capability policy](https://raw.githubusercontent.com/brevityA/Core-Builds/main/configurator/src/core/host-capability-policy.js) is a strong architectural base: it knows the difference between registry facts and live probe facts, keeps the stricter restriction, and reports the reason. The [SEL parser](https://raw.githubusercontent.com/brevityA/Core-Builds/main/configurator/src/core/sel-expression-parser.js) and [Core Score policy](https://raw.githubusercontent.com/brevityA/Core-Builds/main/configurator/src/core/core-score-policy.js) are already pure and unit-testable.

### Do not reuse unchanged

The current Preflight live lane posts a redacted or optionally credential-bearing configuration to `/api/v1/user`, creates a throwaway account, can auto-heal based on remote error text, and leaves an inert remote artifact because public deletion is not exposed. That is useful research tooling, but it is not an acceptable commercial default. If a future verified mode is added, it should be explicitly opt-in, limited to a user-owned/self-hosted instance, have a cleanup/retention design, and never be needed for a first-pass audit.

The current worker’s temporary paste route stores objects in KV for up to 30 days. Keep it only for user-explicit, already-redacted sharing; local export should be the default.

---

## 7. Validation and monetization plan

### Phase 0 — product hardening

Before public productization:

1. Resolve the licensing and package boundary. The repository README/roadmap is on a v3.6.x line, the GitHub Releases API currently identifies 3.5.3 as latest, npm reports `core-builds` 2.87.0, `cli/package.json` says 3.0.0/MIT, while `packages/core/package.json` says 3.0.0, `private: true`, and `UNLICENSED`. Do not market `@core-builds/core` as a supported SDK until this is deliberately resolved.
2. Audit provenance and redistribution rights for upstream schemas, regexes, expression data, community templates, logos, and provider-specific assets.
3. Separate `core` policy logic from template/content data and define a versioned normalized intermediate representation.
4. Add a zero-network local-audit test and a secret-leak regression suite.
5. Define supported compatibility targets and label everything else “unverified.”

### Phase 1 — free local wedge

Release a polished Inspector/Doctor that requires no account:

- link it from the existing configurator, Preflight, docs, and template pages;
- include 10–15 known failure fixtures and “load broken sample” demonstrations;
- add an opt-in feedback button that submits only rule ID, target version, and coarse outcome—not configuration contents;
- add `core-builds check`, `diff`, and proposed `doctor`/`patch` CLI commands;
- publish a GitHub Action for template repositories.

### Phase 2 — paid validation

Test two offers, not one:

- **Power-user pass:** a small one-time or annual purchase for expanded migration packs, device profiles, signed rule updates, and priority support. Initial hypothesis: roughly $9–19 one-time or $29/year.
- **Maintainer/host plan:** private CI reports, compatibility matrices, release alerts, and evidence bundles. Initial hypothesis: roughly $19–49/month for a project, increasing only if a host uses it operationally.

These are pricing experiments, not final pricing. Avoid locking core diagnosis behind a paywall before there is evidence of repeat use.

### Validation thresholds

Within the first targeted pilot, look for:

- 20 user interviews, including at least five template authors/hosters;
- 50 real configurations audited, not only demo fixtures;
- median first diagnosis under five minutes;
- at least 30% of qualified users applying or exporting a patch;
- at least 20% returning after a version/template change;
- five paid individual commitments **or** two maintainer/host commitments;
- zero credential or manifest-secret leakage incidents.

If users mostly want a new template and do not import existing configurations, keep the tool free and treat it as a distribution/brand asset. If users repeatedly ask for remote stream tests or credential handling, do not rush to satisfy that request: it is a signal to design a separate, higher-risk product.

### Phase 3 — only after payment validation

- local account backup/restore and named profile management;
- optional self-hosted agent for a user’s own AIOStreams instance;
- hoster fleet dashboard with opt-in status and config-drift alerts;
- managed compatibility feeds for template authors;
- private-instance setup/support, if the business is willing to own uptime and secret handling.

---

## 8. True Stremio runtime addon versus companion/control plane

| Dimension | Core Builds companion/control plane | True Stremio runtime addon |
|---|---|---|
| What it does | Imports, audits, explains, repairs, versions, and exports configurations. | Responds to Stremio resource requests for catalogs, metadata, streams, and/or subtitles. |
| Where it appears | A separate web app, local PWA, CLI, or CI tool. It is not installed in the Stremio addon list. | A public manifest URL installed into Stremio and invoked by clients. |
| Protocol | JSON/config formats chosen by the tool; optional status GET. | Must serve `/manifest.json` and resource routes such as `/{resource}/{type}/{id}.json`, with CORS for HTTP transport. |
| Runtime traffic | Mostly user-initiated local computation. | Receives requests for titles/episodes and must return valid, ordered stream/meta/subtitle objects with appropriate URLs, hashes, indexes, and behavior hints. |
| Operations | Can be offline and deterministic. | Needs public HTTPS, low latency, caching, rate limiting, abuse handling, monitoring, and reliable upstream integrations. |
| Reuse from Core Builds | Direct reuse of policy engine, host registry, schema contracts, fixtures, diff/repair, and CLI. | Only partial reuse of device profiles, parsing, formatting, and perhaps scoring; a new data-plane system is required. |
| Legal/terms surface | Lower if it handles user-supplied configurations and does not fetch or host content. Still needs privacy, trademark, and credential controls. | Higher: the operator is running a community addon/data service and must handle content/provider responsibility, takedowns, and upstream terms. |
| Recommendation | **Build now.** | Keep as a separate future decision; do not smuggle it into the MVP. |

The [official Stremio protocol](https://stremio.github.io/stremio-addon-sdk/protocol.html) and [stream object specification](https://stremio.github.io/stremio-addon-sdk/api/responses/stream.html) make the distinction concrete. A runtime addon can return direct URLs, torrent info hashes, NZB URLs, external URLs, and other stream forms; that is materially more consequential than validating a local JSON configuration.

---

## 9. Legal, privacy, and operational boundaries

This is not legal advice, but the product boundary should be conservative:

- The [Stremio terms](https://addons.stremio.com/tos) place responsibility for community-addon content and legality on community addon developers and restrict use without the relevant rights. Do not market a companion as an official Stremio product or imply that it authorizes access to content.
- [TorBox API documentation](https://api-docs.torbox.app/) and its [rate-limit guidance](https://support.torbox.app/en/articles/13726368-api-rate-limits) describe 300 requests/minute per API token, plus 60/hour limits for uncached torrent creation, Usenet creation, and web-download creation. Limits can change. A hosted “test every stream” product could consume quotas or create unexpected activity.
- [TorBox terms](https://www.torbox.app/terms) and [Real-Debrid terms](https://real-debrid.com/terms) make the user responsible for account activity and restrict account/credential/link sharing. Do not centralize customer provider credentials in a new cloud service.
- Existing public status and paste infrastructure should be treated as untrusted/volatile. Status is advisory; a final install remains the user’s responsibility.
- Use a clear non-affiliation notice for Stremio, AIOStreams, TorBox, Real-Debrid, and community addons. Review trademarks, logos, referral links, and upstream licenses separately.
- Treat manifest URLs, UUID/password paths, API keys, bearer tokens, auth keys, and provider URLs as secrets. Redaction must happen before telemetry, support upload, paste, or error logging—not only before display.

---

## Bottom line

The best business is not “another AIOStreams build.” It is the **safety and maintenance layer around a fast-moving configuration ecosystem**.

Build the smallest useful version first:

> **Drop in a config. Choose the host and device. See why it may fail. Apply a reversible repair. Export a clean install bundle.**

Then use the same engine in CI for template authors and hosters. This maximizes reuse of Core Builds’ existing work, addresses real upstream pain, keeps credentials local, avoids the runtime addon/legal/data-plane surface, and creates a credible path from a free utility to paid maintainer tooling.

## Source index

- [Core Builds repository](https://github.com/brevityA/Core-Builds)
- [Core Builds README](https://raw.githubusercontent.com/brevityA/Core-Builds/main/README.md)
- [Core Builds roadmap](https://raw.githubusercontent.com/brevityA/Core-Builds/main/ROADMAP.md)
- [Core Builds worker README and metrics notes](https://raw.githubusercontent.com/brevityA/Core-Builds/main/cloudflare-worker/README.md)
- [Live Core Builds worker stats](https://core-builds-cors-proxy.tlorenzato26.workers.dev/api/stats)
- [Core Builds host-capability policy](https://raw.githubusercontent.com/brevityA/Core-Builds/main/configurator/src/core/host-capability-policy.js)
- [Core Builds SEL parser](https://raw.githubusercontent.com/brevityA/Core-Builds/main/configurator/src/core/sel-expression-parser.js)
- [Core Builds Core Score policy](https://raw.githubusercontent.com/brevityA/Core-Builds/main/configurator/src/core/core-score-policy.js)
- [Core Builds Preflight](https://raw.githubusercontent.com/brevityA/Core-Builds/main/tools/preflight/index.html)
- [Core Builds account tools](https://raw.githubusercontent.com/brevityA/Core-Builds/main/account-tools/index.html)
- [AIOStreams repository](https://github.com/Viren070/AIOStreams)
- [AIOStreams public instances](https://docs.aiostreams.viren070.me/getting-started/public-instances/)
- [AIOStreams deployment](https://docs.aiostreams.viren070.me/getting-started/deployment/)
- [AIOStreams SEL reference](https://docs.aiostreams.viren070.me/reference/stream-expressions/)
- [AIOStreams live status example](https://aiostreams.fortheweak.cloud/api/v1/status)
- [AIOStreams issues: outage failover](https://github.com/Viren070/AIOStreams/issues/1221), [conditions](https://github.com/Viren070/AIOStreams/issues/1198), [client profiles](https://github.com/Viren070/AIOStreams/issues/1128), [config aliases](https://github.com/Viren070/AIOStreams/issues/986), [proxy cache](https://github.com/Viren070/AIOStreams/issues/1254), [NZB/TorBox resolution](https://github.com/Viren070/AIOStreams/issues/1135), [failover variants](https://github.com/Viren070/AIOStreams/issues/1260), [proxy buffering](https://github.com/Viren070/AIOStreams/issues/1164)
- [Tam-Taro SEL templates](https://github.com/Tam-Taro/SEL-Filtering-and-Sorting)
- [AIOManager](https://github.com/Sonicx161/AIOManager)
- [Stremio Account Manager](https://github.com/Asymons/stremio-account-manager)
- [Storemio](https://github.com/CmdPrmpt/Storemio)
- [TVFlix builder](https://github.com/ParticularCatch449/aio-tvflix-builder)
- [Pipe](https://stremio-addons.net/addons/pipe)
- [Torrentio](https://stremio-addons.net/addons/torrentio)
- [Comet](https://stremio-addons.net/addons/comet)
- [Stremio status](https://github.com/SolitudePy/stremio-status)
- [Stremio addon protocol](https://stremio.github.io/stremio-addon-sdk/protocol.html)
- [Stremio stream object](https://stremio.github.io/stremio-addon-sdk/api/responses/stream.html)
- [Stremio terms](https://addons.stremio.com/tos)
- [TorBox API docs](https://api-docs.torbox.app/)
- [TorBox rate limits](https://support.torbox.app/en/articles/13726368-api-rate-limits)
- [TorBox terms](https://www.torbox.app/terms)
- [Real-Debrid terms](https://real-debrid.com/terms)
