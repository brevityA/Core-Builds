# Core Builds configurator — smarter and more solid

**Research date:** 26 September 2026 (UTC)  
**Target reviewed:** <https://brevitya.github.io/Core-Builds/configurator/index.html> (v3.11)  
**Repository baseline:** `aec48b3`  
**Scope:** product, UX, recommendation quality, compatibility, reliability, security, performance, and maintainability.

## Executive recommendation

Core Builds is already unusually strong for a static configurator: it has device policies, host capability routing, upstream-generated contracts, preflight findings, reversible updates, credential sanitisation, 595 unit tests, golden templates, and direct installation. The next step should **not** be more switches.

The highest-value direction is an explainable, local-first **Build Advisor + Doctor**:

1. ask for the outcome the user wants (content, playback target, network, tolerance for waits/uncached results, and priorities);
2. produce a recommendation with reasons, trade-offs, confidence, and assumptions;
3. simulate the resulting configuration before install;
4. validate it against the selected host/version/device;
5. offer a reversible repair when an imported or old setup drifts.

This turns Core Builds from “a sophisticated template form” into “a configuration expert that can prove its advice.” It also fits the repository’s strongest assets better than adding runtime scraping, playback, or more addon presets.

## What was verified

- Live page and repository source reviewed.
- `npm test`: **595/595 pass**.
- `npm run validate`: **all 29 checks pass**.
- `npm audit`: **0 vulnerabilities** after `npm ci`.
- `npm run build`: passes; standalone output **1,083,426 bytes**; web assets **868,252 bytes JS + 176,163 bytes CSS**.
- The first build attempt failed only because dependencies had not been installed; a clean `npm ci` fixed it.
- The current source is modular at the policy layer but still has a very large UI controller (`src/js/app.js`) and a large shipped JS bundle.
- Existing security controls scrub sensitive state before persistence and remove `stremioPassword` from normal saved state. This is materially better than storing account credentials in localStorage.

## Market and ecosystem findings

AIOStreams itself already provides 80+ marketplace addons, custom addons, services, filtering, SEL, sorting, deduplication, catalog controls, and formatters. Competing with that feature surface would duplicate upstream rather than differentiate Core Builds [1](https://github.com/Viren070/AIOStreams).

The configuration problem remains difficult. Current guides still tell users to gather keys, choose Advanced mode, configure several screens, save UUID/password pairs, and sometimes uninstall/reinstall after catalog or resource changes [4](https://howtomediacenter.com/en/install-aiostreams-stremio-addon/). Community setup posts describe the experience as overwhelming and rely on long recipes [3](https://www.reddit.com/r/StremioAddons/comments/1q2du2j/as_promised_my_full_stremio_build_guide_using/).

The live upstream backlog reinforces the opportunity for diagnosis rather than another aggregator. Examples include generic NZB resolve failures, absolute episode-number fallback, unplayable debrid results, configuration access, and undo-before-save requests:

- [AIOStreams #1135](https://github.com/Viren070/AIOStreams/issues/1135) — NZBHydra searches work but TorBox resolution fails with a generic error.
- [#1115](https://github.com/Viren070/AIOStreams/issues/1115) and [#1146](https://github.com/Viren070/AIOStreams/issues/1146) — seasonal vs absolute episode numbering.
- [#895](https://github.com/Viren070/AIOStreams/issues/895) — streams that are available but unplayable need fallback handling.
- [#986](https://github.com/Viren070/AIOStreams/issues/986) — easier access to self-hosted configurations.
- [#1142](https://github.com/Viren070/AIOStreams/issues/1142) — undo in “show changes before saving.”

These are signals, not proof of market size. They do consistently point to failures that cross provider, metadata, version, host, and configuration boundaries—the exact boundary Core Builds can explain.

## Product audit

### What is already strong

1. **Compatibility is treated as policy, not scattered UI prose.** Host, device, filter, sort, install, schema, and preflight modules are independently testable.
2. **Generated upstream contracts reduce guesswork.** This is a major reliability advantage over manually maintained builders.
3. **Preflight catches errors before export and install.** Most competitors discover invalid configuration after submission.
4. **The application is local-first.** Keys are used in the browser and sensitive snapshots are scrubbed.
5. **There is real regression depth.** Unit, schema, golden, E2E, provenance, and upstream migration tests exist.
6. **Progressive routes exist.** Express, guided, and advanced modes are the right basic information architecture.
7. **Host/version awareness is a differentiator.** A template is not merely “valid”; it must be valid for the actual destination.

### Where “smart” currently falls short

1. **The tool asks for configuration choices more often than user intent.** “Standard vs Apex IQR vs Apex Mixed” is an implementation choice. A newcomer thinks in outcomes: fastest first result, best 4K quality, smallest files, obscure-content coverage, anime, foreign language, or family-safe playback.
2. **Recommendations are mostly presets, not an explicit decision model.** The user cannot inspect why option A beat B, which assumptions mattered, or how confidence changes when data is missing.
3. **There is no counterfactual comparison.** Users need “If you choose quality-first, expect larger files and possibly slower starts” and “switching to 1080p removes these tiers,” not only a final choice.
4. **Validation proves shape and compatibility, but not likely behavior.** A syntactically valid template can still over-filter, query too many slow sources, or behave badly for niche titles.
5. **Health is host-centric rather than dependency-centric.** A host can be online while a critical provider/addon path is degraded.
6. **Imported configurations are not yet a first-class diagnosis journey.** The strategic opportunity is “tell me why this stopped working,” not merely “start another build.”

### Where “solid” can improve

1. **Bundle size and controller size.** The built web JS is 868 KB and standalone file is 1.08 MB. `app.js` owns too many unrelated flows. This increases regression and review cost even if present performance is acceptable.
2. **Upstream drift is handled well but should become a release gate with a visible support window.** Users should know exactly which AIOStreams versions/hosts were certified and when.
3. **Tests are broad but mostly example-based.** Generated combinations need invariant/property testing: no invalid required options, no duplicate instance IDs, no unsupported stream lanes, deterministic output, secrets never persisted, and payload limits always honored.
4. **Runtime failure evidence is weak.** Anonymous “generated” counts do not reveal whether a build installed, returned results, or needed repair. Privacy-safe outcome telemetry must remain opt-in and coarse.
5. **Optional third-party error reporting expands the trust boundary.** Sentry is feature-flagged, but its CDN and ingest domains remain in CSP. A self-hosted or vendored reporter would reduce supply-chain and privacy complexity.
6. **Several advanced integrations are hard to complete safely.** The prior audit found Jackett/Prowlarr credential branches without complete URL-input journeys. Dead or partial integrations should be hidden until end-to-end validated.

## Proposed smart architecture

### 1. Intent Profile

Replace low-level opening questions with a compact profile:

- **Primary goal:** fastest start / best quality / balanced / obscure-content coverage.
- **Content:** mainstream / anime / international / older & niche / live.
- **Device:** existing device profile.
- **Network:** measured, entered, or “unknown”; distinguish sustained bandwidth from nominal line speed.
- **Storage/data tolerance:** small / balanced / unrestricted.
- **Reliability preference:** cached-only / cached-first with fallback / broad discovery.
- **Audio/display capabilities:** inferred from device, editable when the user has AVR or unusual playback support.

The current controls remain available in Advanced mode. Progressive disclosure should expose common choices first and rare controls second; this generally makes complex applications easier to learn and less error-prone [2](https://ixdf.org/literature/book/the-glossary-of-human-computer-interaction/progressive-disclosure).

### 2. Deterministic recommendation engine

Do not begin with a black-box LLM. Use versioned rules with explicit evidence:

```text
inputs + capability facts + policy version
  → candidate builds
  → hard compatibility gates
  → weighted objectives
  → recommendation + alternatives + explanations
```

Each decision should emit:

- selected value;
- reason codes;
- evidence source and freshness;
- assumptions;
- confidence (`high`, `medium`, `low`);
- alternatives and their trade-offs;
- policy version for reproducibility.

Example:

> **Cached-first recommended (high confidence).** Your Fire TV profile and 55 Mbps connection favor HEVC 1080p/efficient 4K. Uncached fallback remains enabled for older titles. Lossless audio is demoted because this device profile does not reliably pass it through.

### 3. Build Simulator

Before install, show a model—not fake precision—of likely behavior:

- expected source fan-out and worst configured timeout;
- estimated response window (range, not a single promise);
- filters that can produce zero-result sets;
- number of quality/audio/stream lanes retained;
- payload size and host limit;
- dependency graph with critical vs optional dependencies;
- compatibility verdict by device, host, and AIOStreams version;
- “what changed?” diff when toggling an option.

Label modeled values clearly and expose the formula. Never invent FPS-like exactness for stream availability.

### 4. Configuration Doctor

Make **Diagnose existing setup** a top-level route beside Express Install:

```text
Import local JSON or manifest export
→ redact secrets locally
→ choose/identify host and device
→ static checks
→ optional live status probe
→ findings grouped by blocker/warning/opportunity
→ select repairs
→ review reversible diff
→ export or install
```

High-value rules:

- stale/removed preset or option;
- host/version mismatch;
- missing required preset option;
- duplicate IDs;
- unsupported P2P/HTTP/live lane;
- credential placeholder or credential accidentally embedded in a URL;
- invalid/unknown SEL function or expression close to limits;
- impossible device codec/HDR/audio combination;
- filter intersection likely to remove all streams;
- excessive addon fan-out or timeouts;
- payload near/over host limit;
- custom addon URL that cannot be safely verified;
- imported key silently dropped by migration.

### 5. Evidence-aware host selection

Rank hosts using separate dimensions rather than “fastest” alone:

- compatibility with requested features;
- observed status freshness;
- version/channel;
- latency range;
- policy restrictions;
- write capability;
- confidence and fallback host.

Do not automatically POST to multiple hosts. Continue the existing safe distinction: reads may race; writes must target one explicit destination.

## Reliability engineering roadmap

### P0 — trust and correctness

1. **Release certification matrix.** On every release, generate representative builds across service × device × resolution × output profile × host capability class. Validate against the pinned upstream contract and publish the supported version range.
2. **Property/invariant tests.** Add seeded combinatorial tests with reproducible failures. Invariants should cover determinism, schema validity, required options, lane compatibility, unique IDs, payload budget, and secret non-persistence.
3. **Doctor MVP.** Reuse existing import, schema guard, preflight, host capability, update-session, and diff modules. This has the best impact/reuse ratio.
4. **Atomic install journal.** Model the full-stack install as a transaction: planned operations, completed operations, prior manifests, retryability, and a local recovery bundle. If step 3 of 4 fails, tell the user exactly what changed and what did not.
5. **Secret canary suite.** Plant synthetic credentials in every accepted location, then assert they never enter localStorage snapshots, analytics, URLs, error reports, exported share files, or DOM diagnostic text.

### P1 — smarter outcomes

6. **Intent Profile + explainable recommendations.** Start with 8–12 reason codes, not dozens of opaque weights.
7. **Counterfactual comparison.** Compare recommended, faster, and higher-quality configurations side by side using the same simulator.
8. **Filter starvation analysis.** Calculate intersections of required language, resolution, HDR, cache, source, age, and size constraints; flag combinations that are structurally too restrictive.
9. **Dependency health graph.** Distinguish host online, addon reachable, provider credential present, resolver supported, and playback path unknown.
10. **Local named profiles.** Let users keep “Living room,” “Phone,” and “Family” profiles and compare them without storing credentials.

### P2 — maintainability and performance

11. **Split `app.js` by journey.** Express, guided, advanced, install, doctor, account push, telemetry, and modal rendering should become separate modules with narrow interfaces.
12. **Route-level lazy loading.** Keep landing/Express code small; load advanced editors, QR, Doctor diff, and optional Sentry only when invoked.
13. **Tighten CSP.** Move inline boot code to hashed/external assets, remove `unsafe-inline` over time, and only permit Sentry origins in builds where reporting is enabled.
14. **Complete or remove partial integrations.** No visible option until its URL, credentials, required options, preflight, generation, export, direct install, and tests all work.
15. **Accessibility and mobile E2E gates.** Add axe checks, keyboard-only journeys, reduced-motion checks, and screenshots for 360/390/768/1280 widths.

## Measurement plan

Do not optimize for page visits or generated-template counts. Use an opt-in, privacy-minimal funnel:

- route started (Express / Guided / Advanced / Doctor);
- preflight reached;
- blocker category only (no values or config text);
- export/install attempted;
- install acknowledged by the browser flow;
- repair accepted/rejected;
- user-rated outcome after return: worked / partial / did not work.

Never collect API keys, host UUID/password paths, manifest URLs, titles searched, account email, IP-derived identity, or complete configurations. Aggregate locally where possible. OWASP warns that localStorage persists and is script-accessible, so authentication tokens and credentials must not be stored there [5](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Success metrics:

- completion rate by route;
- median time to a validated build;
- blocker rate by stable reason code;
- direct-install recovery rate;
- percentage of Doctor repairs that pass post-repair validation;
- repeat build/update rate;
- user-reported “worked first try” rate;
- regression escapes per release.

## 90-day implementation sequence

### Weeks 1–3: foundation

- Define `Recommendation`, `Evidence`, `Assumption`, and `Finding` schemas.
- Add property tests and a deterministic combination generator.
- Publish the certification matrix in build artifacts.
- Add secret canaries and install-operation journaling.
- Hide incomplete advanced integrations.

### Weeks 4–7: Doctor MVP

- Add top-level Diagnose route.
- Import and locally redact.
- Run schema, version, host, device, lane, payload, SEL, and secret checks.
- Render plain-language findings with JSON paths.
- Preview selected repairs and export the patched file.

### Weeks 8–10: Advisor

- Ship Intent Profile.
- Generate three candidates: recommended, speed-first, quality-first.
- Add reason codes, confidence, assumptions, and comparisons.
- Connect recommended outputs to the existing deterministic generator.

### Weeks 11–12: hardening

- Split/lazy-load the heaviest journeys.
- Run mobile/accessibility E2E and Lighthouse in CI.
- Conduct five novice and five power-user observed sessions.
- Revise recommendations based on task success, not preference surveys alone.

## Features not recommended now

- **An LLM that edits configs directly.** It weakens reproducibility, privacy, offline operation, and schema guarantees. If AI is later used, constrain it to explaining deterministic findings.
- **Runtime stream aggregation or playback proxying.** This duplicates AIOStreams and adds uptime, legal, bandwidth, and credential risk.
- **Automatic cross-host writes.** Read probes can race; creation/update must remain explicit and single-target.
- **More presets without an intent model.** More choices make the product look smarter while increasing cognitive load and maintenance.
- **A public “best host” leaderboard without methodology.** Host quality is feature- and location-dependent; show evidence, freshness, and uncertainty.

## Bottom line

The configurator does not need a broader feature list. It needs a stronger decision loop:

> **understand intent → recommend transparently → simulate consequences → validate against reality → install transactionally → diagnose drift later**

That loop would make Core Builds meaningfully smarter while strengthening the qualities it already leads on: local-first privacy, compatibility, explainability, and tested configuration correctness.
