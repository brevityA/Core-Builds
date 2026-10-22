# Core Builds Configurator — Full Audit Report

**Repo:** [brevityA/Core-Builds](https://github.com/brevityA/Core-Builds)  
**Live:** [brevitya.github.io/Core-Builds](https://brevitya.github.io/Core-Builds/)  
**Version:** v2.78 · 832 commits · 43 stars  
**Audited:** 24 Jul 2026  

---

## Part 1: Bugs Found & Fixed

### ✅ Fixes Applied (5 bugs, 12 files)

| # | Severity | What | Files Changed |
|---|----------|------|---------------|
| 1 | **High** | **Apex template formatter ID** — `id: "core-clean"` → `"tamtaro"`. AIOStreams only recognises the `tamtaro` built-in slot. | `Templates/Torbox/Single/core-nexus-4k-apex.json`, `Formatters/core-clean.json` |
| 2 | **High** | **CORS proxy fallback** — `openInAIOStreams()` used `fetchWithTimeout()` for a mutating POST to a public host. Public hosts block CORS, so this always failed in-browser. Changed to `writeHostFetch()` which routes through the CF Worker proxy. | `configurator/src/js/app.js` |
| 3 | **Medium** | **Stale Tam-Taro synced URLs** — 7 template files still referenced `Tam-Taro/SEL-Filtering-and-Sorting` synced URLs, which are blocked on elfhosted ("Forbidden URL" error). Removed all references. | 5× `Templates/Personal/*.json`, 2× `Community-Templates/RB3/*.json` |
| 4 | **Medium** | **Community template formatter IDs** — 3 community templates used `"prism"` or `"custom"` as formatter IDs with malformed `definitions` structure (missing `overrides` nesting). Fixed to `id: "tamtaro"` with correct `definitions.overrides.tamtaro` path. | `prism-torbox-essential-1080p.json`, `auburn-tiger-rb3.json`, `rb3-torbox-pro-rd-hybrid.json` |
| 5 | **Prevention** | **Added 2 regression tests** — `test_all_active_templates_have_tamtaro_formatter_id` and `test_no_stale_tamtaro_synced_urls` catch future drift in all static template files. | `tests/test_validate_template.py` |

### Test Results

| Suite | Before | After |
|-------|--------|-------|
| pytest (template validator) | 197 pass | **199 pass** (+2 new) |
| npm test (configurator) | 29 pass | 29 pass |
| npm run validate (static) | 25 pass | 25 pass |

### Remaining Known Issues (lower priority)

| # | Type | Issue | Impact |
|---|------|-------|--------|
| 1 | Bug | `showManifestModal` uses bare `fetchWithTimeout` for the "Push to Stremio" handler inside the modal (line ~4545), which also won't work through CORS. | Low — only affects the modal's Stremio install button |
| 2 | Bug | `stremioEmail` is persisted to `localStorage` but `stremioPassword` is not, creating an inconsistent state where the email survives sessions but the password doesn't. | UX — user must re-enter password every session |
| 3 | Warning | Community templates (`prism`, `rb3-hybrid`) still have `titleMatching.mode: "exact"` — causes zero results on title variations. Should be `"fuzzy"`. | Functional — users get fewer results |
| 4 | Warning | Community templates missing `0Cached` ISE — no fallback when nothing is cached. | Functional — empty results on niche content |
| 5 | Tech debt | ~5,000+ hardcoded inline styles in `app.js` instead of CSS classes. Makes maintenance harder and prevents CSS-only hover/focus states. | Maintainability |
| 6 | Tech debt | `Formatters/*.json` standalone files have missing/incorrect `id` fields. They're reference files not used at runtime, but confusing. | Clarity |
| 7 | Security | `instancePassword` (AIOStreams config password) is persisted in `localStorage` unencrypted. Intentional for UX, but exposes the password on shared machines. | Security |

---

## Part 2: Your Tool Suite (what you're building)

From the live site and codebase, you have a **4-tool utility deck** at `/tools/`:

### ✅ Operational

| Tool | URL | Status |
|------|-----|--------|
| **Template Builder** | `/` | Live — Quick Install, Advanced Builder, device-aware profiles, 17 formatters, 107 ranked regex, IQR PSE, partial exports |
| **Addon Backup** | `/account-tools/` | Live — read-only Stremio addon collection backup, JSON download, import/inspect |

### 🔒 In Development

| Tool | URL | Status |
|------|-----|--------|
| **Template Inspector** | `/tools/` (card only) | "In development" — local schema checks, plain-English findings, safe repairs, compatibility reports |
| **Account Manager** | `/tools/` (card only) | "Security review locked" — restore, ordering, cloning, Cinemeta controls, exact diffs, rollback |

---

## Part 3: Competitive Landscape

### Who else does this, and how they differ

| Tool | What It Does | Stars/Users | How It Differs from Core Builds |
|------|-------------|-------------|--------------------------------|
| **[Tam-Taro SEL](https://github.com/Tam-Taro/SEL-Filtering-and-Sorting)** | Pre-built AIOStreams templates with synced SEL expression URLs + AIOMetadata configs | 725★ | **Template-first, not configurator-first.** Ships a single "complete setup" JSON you import. Has a Template Wizard for customization but it's a guided form, not a visual builder. Strong on SEL expression curation (the actual filtering logic). Core Builds generates equivalent expressions inline. |
| **[CrispyFormat](https://crispyduck.xyz/)** | Visual formatter builder for AIOStreams | Community favorite | **Formatter-only.** Drag-and-drop visual editor with live preview, starter templates (Clean, Emoji-Rich, Detailed, Power User, TV-optimized), save/export by ID. Does NOT build full templates (no scrapers, no sort, no ESE/PSE). Core Builds links to CrispyFormat for custom formatter import. |
| **[AIO.TVFlix Builder](https://aio.tvflix.co.uk/)** | Full AIOStreams + AIOMetadata config builder | Community | **Both AIOStreams AND AIOMetadata in one flow.** Generates two config files (streams + catalogs). Has bandwidth-based bitrate calculation, age rating limits (kids mode), catalog reordering, Gemini AI search toggle, RPDB/TOP poster ratings, shared API keys option. More opinionated (single template style). Less device-aware than Core Builds. |
| **[Duck Tools / QuackStart](https://duckkota.gitlab.io/stremio-tools/quickstart/)** | Quick-start installer for AIOStreams + AIOMetadata | Community | **Install-first approach.** QuackStart seamlessly installs AIOMetadata and patches Cinemeta. Account Cloner can clone configs between Stremio and Nuvio accounts. Focused on getting users running fast, not on template customization. |
| **[grabberhawk config](https://github.com/grabberhawk/stremio-aiostreams-config)** | Static optimized AIOStreams + AIOMetadata config | Small | **Single static JSON.** Optimized for Torrentio + Debrid. Simple formatter (`{stream.resolution} {stream.visualTags} CACHED`). No configurator — just download and import. |
| **AIOStreams built-in configure page** | Raw JSON editor on each host instance | N/A (built-in) | **Power user tool.** Direct JSON editing with schema validation. No device profiles, no visual previews, no smart defaults. What Core Builds replaces. |

### What Core Builds Does Better Than Everyone Else

1. **Device-aware profiles** — 20+ devices with correct AV1, DV, HDR, audio passthrough assumptions. Nobody else does this.
2. **107 ranked regex patterns** — Quality-tier scoring matching flagship templates. Tam-Taro uses synced URLs; Core Builds generates inline.
3. **IQR PSE Architecture** — Statistical bitrate filtering using Tukey fences. Unique to Core Builds.
4. **Host compatibility checking** — Pre-export validation against elfhosted/fortheweak allowlists. Nobody else catches "Forbidden URL" before deploy.
5. **CORS proxy fallback** — Cloudflare Worker races direct + proxied fetches. Solves the #1 user pain point (CORS failures on public hosts).
6. **One-click Quick Install** — Select service + performance profile → deploy in seconds. TVFlix has a similar flow but less device-aware.
7. **17 formatter previews** — Live visual previews for every formatter. CrispyFormat has a better formatter *editor*, but Core Builds has more formatter *options*.
8. **Template backup timeline** — 20-entry local backup with restore. Nobody else has this.
9. **Guided troubleshooter** — Interactive decision tree for common issues. Unique.
10. **Partial exports** — Export formatter, filtering, sorting, device limits, services/presets individually. Nobody else offers this.

### What Others Do Better (and what you should adopt)

| Gap | Who Does It Better | What to Do |
|-----|-------------------|------------|
| **AIOMetadata integration** | TVFlix Builder, Tam-Taro, Duck Tools | You have AIOMetadata config files in `/AIOMetadata/` but the configurator doesn't generate them. Add an AIOMetadata step to the Quick Install flow — generate catalog configs alongside stream templates. |
| **Bandwidth-based bitrate limits** | TVFlix Builder | TVFlix asks "What's your internet speed (Mbps)?" and calculates safe bitrate limits. Add this to the Fine-Tune panel or Quick Install. |
| **Kids mode / age ratings** | TVFlix Builder | Age rating filter (G/PG/PG-13/R/NC-17). Add to Content Preferences. |
| **Catalog reordering** | TVFlix Builder, Duck Tools | Drag-and-drop catalog order + home/discovery toggle. Add to Fine-Tune or as a dedicated step. |
| **Formatter visual editor** | CrispyFormat | CrispyFormat has drag-and-drop formatter building with live preview. You link to it — consider embedding a simplified version or deep-linking with pre-filled state. |
| **Account cloning** | Duck Tools | Clone Stremio configs between accounts. Your Account Manager (locked) plans this — prioritise it. |
| **Poster ratings** | TVFlix Builder | RPDB/TOP poster rating integration. Add as an optional catalog in Fine-Tune. |
| **Multi-language template generation** | TVFlix Builder | Generates separate addons per language. Your configurator has `langs` and `langExclusive` but doesn't generate per-language templates. |
| **Shared API keys** | TVFlix Builder | "Use shared API keys" toggle for TMDB/TVDB/Fanart. Risky but lowers barrier. Could be an opt-in in Quick Install. |
| **Synced URL auto-updates** | Tam-Taro | Tam-Taro's synced URLs auto-update when the source file changes. Core Builds generates inline (no auto-update). Consider adding a "check for template updates" feature. |

---

## Part 4: Strategic Direction

### Immediate (next 1–2 weeks)

1. **Ship Template Inspector** — You already have the validator (`validate_templates.py`). Wrap it in a web UI: paste JSON → get plain-English report with fix suggestions. Low effort, high value.
2. **Fix remaining community template issues** — `titleMatching.mode: "exact"` → `"fuzzy"`, add missing `0Cached` ISE.
3. **Fix the CORS bug in the manifest modal** — The "Push to Stremio" button inside `showManifestModal` still uses bare `fetchWithTimeout`.
4. **Add bandwidth-based bitrate limits** — Simple slider in Fine-Tune: "Internet speed (Mbps)" → auto-calculate `maxBitrate`.

### Short-term (next month)

5. **AIOMetadata integration** — Add a step to Quick Install that generates AIOMetadata catalog configs. You already have the config files — just wire them into the configurator flow.
6. **Template update checker** — Compare the user's installed template version against the latest Core Builds release. Show a diff and offer to upgrade.
7. **Account Manager (basic)** — Start with read-only: list addons, show config diffs, export backups. The "clone" and "restore" features can come later.

### Medium-term (next quarter)

8. **CLI tool** — `npx core-builds generate --service torbox --device shield --resolution 4k > template.json`. Enables automation, CI/CD, and power users.
9. **Template marketplace** — In-app browser for community templates with ratings, descriptions, and one-click install. You have `/Community-Templates/` — surface it.
10. **CrispyFormat deep integration** — Instead of linking to crispyduck.xyz, embed a simplified formatter editor or pass state between the two tools via URL parameters.

### What NOT to build

- **Don't build your own formatter visual editor** — CrispyFormat owns this space. Partner or deep-link instead.
- **Don't build a Stremio client** — WuPlay and Nuvio already exist. Focus on the config layer.
- **Don't chase Tam-Taro's synced URL model** — Inline expressions are more reliable (no external dependency, no allowlist issues). You made the right call.

---

## Summary

**Bugs fixed:** 5 (2 high, 2 medium, 1 prevention) across 12 files  
**Tests added:** 2 regression tests (199 total, all passing)  
**Competitive position:** Core Builds is the most advanced AIOStreams configurator. The main gaps are AIOMetadata integration, bandwidth-based limits, and the Template Inspector tool. The strategic direction should focus on shipping the Inspector, wiring up AIOMetadata, and building the CLI.
