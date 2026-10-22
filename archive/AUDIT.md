# Core Builds Configurator — Code Audit & Feature Analysis

**Repo:** [brevityA/Core-Builds](https://github.com/brevityA/Core-Builds)  
**Live:** [brevitya.github.io/Core-Builds](https://brevitya.github.io/Core-Builds/)  
**Version:** v2.78 · 832 commits · 43 stars  
**Audited:** 24 Jul 2026  

---

## 1. Bug Findings

All 29 unit tests and 25 static validations pass. No syntax errors. The codebase is mature and actively maintained. That said, here are the issues I found:

### 🔴 Bugs / Defects

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | **High** | `app.js` — `saveState()` | **`stremioPassword` excluded by destructuring but `instancePassword` is persisted.** The line `const {stremioPassword: _, ...persist} = S;` correctly strips the Stremio login password, but `S.instancePassword` (the AIOStreams config password) **is** written to `localStorage`. This is intentional for UX, but means the config-edit password sits unencrypted in `localStorage` alongside UUIDs. Users with shared/browser-access machines are exposed. The share link (`shareConfig()`) correctly excludes it via `SHARE_KEYS`, but the saved state doesn't. |
| 2 | **Medium** | `app.js` — `simpleInstall()` | **Double `const` declaration of `password`** in the `showManifestModal` scope. The outer function parameter is `password`, then a separate `const password` is re-declared from `extractManifestParts()`. While JS hoisting allows this in different scopes, the shadowed variable causes the extracted password to be discarded in the `stremioInstallBtn` click handler inside the modal, which reads the outer (possibly `null`) `password` via closure. The `stremioInstallBtn` handler uses its own local `password` from `document.getElementById`, so this is benign in practice, but the naming is confusing and fragile. |
| 3 | **Medium** | `app.js` — `templateHealthCheck()` | **`eses()` called but never defined in visible scope.** The function `eses()` is referenced on line ~5556 (`const ec = eses()`) but doesn't appear anywhere in the source. This means the 1080p 2160p-exclusion guard check silently throws, caught by the caller's try/catch, and the health check returns an empty array instead of the intended warning. Users with 1080p templates won't see the "4K streams may leak through" warning. |
| 4 | **Medium** | `app.js` — regex constants | **Retags (Radarr) and Retags (Sonarr) regex arrays in `EXCLUDED_REGEX` are duplicates with slight differences** — index 6 includes `[.]VAV\b|\b(ORARBG)\b` while index 7 does not. Both are included in the excluded list but the Radarr variant will silently consume the Sonarr one since they're applied independently. This isn't a runtime bug but is confusing and wastes entries. |
| 5 | **Low** | `app.js` — `openInAIOStreams()` | **Fallback direct POST without CORS proxy** uses bare `fetchWithTimeout` instead of `writeHostFetch`. When `CORS_PROXY` is set, the auto-mode correctly uses `writeHostFetch`, but the "known host + password + no UUID" fallback path (bottom of the function) calls `fetchWithTimeout` directly. This will fail on every public host that doesn't send CORS headers — the exact case the proxy was designed to solve. |
| 6 | **Low** | `app.js` — `showManifestModal()` | **Stremio API endpoint inconsistency.** The `stremioInstallBtn` handler in the manifest modal posts to `https://api.strem.io/api/` (with trailing slash), while the standalone `pushToStremio()` function posts to `https://api.strem.io/api/login` (no trailing slash on the domain path). Both work because Stremio's API router handles both, but the inconsistency could cause issues if Stremio ever normalizes paths strictly. |
| 7 | **Low** | `app.js` — event delegation | **Inline `onmouseover`/`onmouseout` handlers in template literals** use `this.style.background=...` which breaks if the element is re-rendered or moved in the DOM. These should be delegated via CSS `:hover` pseudo-classes or the main event handler. The commit `10a5c44` (10 hours ago) already started fixing this pattern for pill buttons but not for backup timeline rows, instance chips, or credential copy buttons. |
| 8 | **Low** | `app.js` — `restoreBackup()` | **Credentials not restored.** When a user restores a backup, only `SHARE_KEYS` settings are applied via `sanitizeSharedConfig()`. API keys, TMDB tokens, and instance credentials stored in the backup's `creds` object are silently discarded. This is by design for security (backups are shareable), but there's no UI indication that credentials were not restored. |
| 9 | **Low** | `devices.js` | **`DEVICE_FORCE_LIMITED_AUDIO` includes `'lgtv'` and `'sony'`** but their `DEVICE_AUDIO_DEFAULTS` are `'standard'`, not `'limited'`. This means selecting "lossless" on LG TV or Sony Bravia shows a "device does not reliably support passthrough" warning, but the device's recommended audio is "standard" (DD+/Atmos) which also doesn't assume passthrough. The force set and default map are slightly inconsistent. |
| 10 | **Low** | `app.js` — CSS | **Hardcoded inline styles throughout** (thousands of lines) instead of CSS classes. This was noted in the modular architecture migration (v2.78) but remains largely unaddressed. It makes the code harder to maintain, increases bundle size, and prevents CSS-only hover/focus states from working reliably. |

### ⚠️ Potential Issues (Not Bugs)

- **State schema migration** (`migrateState`) only runs on load, so users who never refresh won't get migrated. This is acceptable for a SPA.
- **`backupTimelineHtml()`** generates HTML with inline event handlers (`onmouseover`, `onmouseout`) that set `this.style.background` directly. These won't respect `prefers-reduced-motion` or the dark/light theme.
- **`CORS_PROXY` is hardcoded** to a Cloudflare Worker URL. If that worker goes down, all proxied operations silently fail and fall back to direct (which also fails due to CORS). There's no user-visible degradation indicator.
- **`qrcode` library** (`vendor/qrcode.min.js`) is loaded as a global script tag, not as an ES module, which is inconsistent with the modular architecture.
- **The `stremioPassword` is excluded from `saveState()` but `stremioEmail` is persisted.** This means email is saved but password is not, which is correct behavior, but the user must re-enter their Stremio password every session for direct installs.

---

## 2. Features You Were Working On

Based on the changelog, commit history, and code patterns, here's what's actively in development or recently completed:

### Just Completed (v2.77–2.78, Jul 22–23)
1. **Modular architecture migration** — Monolithic `index_src.html` → ES modules under `src/` with esbuild bundling. Unit tests, static validation, CI gating.
2. **Quick Install flow** — One-page "Duck-inspired" flow: app → service → credentials → performance profile → deploy.
3. **Additional services & scrapers popup** — Shared modal for P2P, HTTP, Debridio, Usenet indexers, accessible from both Quick Install and Advanced Builder.
4. **Clean install / replace mode** — Opt-in removal of older AIOStreams manifests from known hosts before pushing a new one.
5. **Diagnostics & preflight** — Sanitized issue reports, template structure validation, credential checks, host compatibility checks.
6. **Unified UI overhaul** — Glassmorphic surfaces, editorial typography, responsive layouts for phone/tablet/desktop.
7. **Account Backup tool** — Read-only Stremio addon backup page at `/account-tools/`.
8. **Core Tools hub** — Launcher page at `/tools/` with Template Builder, Account Backup, Template Inspector (coming), Account Manager (coming).
9. **Playwright CI** — Desktop + mobile stability tests, duplicate host-write prevention, preload toggle, autoplay method selector, global addon timeout, partial exports.
10. **Tooltip z-index fix, pill active states, raw torrents card toggle** (commit `10a5c44`, 10 hours ago).

### In Progress / Coming Soon (from code stubs and changelog mentions)
1. **Template Inspector** — Listed as "coming" on the Core Tools hub page. No implementation yet.
2. **Account Manager** — Listed as "coming" on the Core Tools hub page. No implementation yet.
3. **AIOMetadata integration** — Full and Movies & TV configs for AIOMetadata catalog management.
4. **Playwright CI expansion** — Currently tests desktop + mobile stability; likely expanding to cover more flows.
5. **Light mode completeness** — Changelog notes ongoing work on light theme states.
6. **Partial exports** — Formatter, filtering, sorting, device limits, services/presets can be exported individually (recently added).

### Architectural Direction
- Moving from inline styles → CSS classes (slow progress)
- Moving from monolithic source → modular ES modules (done in v2.78)
- Moving from manual config → one-click Quick Install (done in v2.77)
- Moving from single-host → multi-host health probing with CORS proxy (done)

---

## 3. Comparison with Similar Tools

### What Core Builds Does
Core Builds is an **AIOStreams template configurator** — it generates JSON configuration files that control how AIOStreams (a Stremio addon aggregator) finds, filters, sorts, and displays streams. It's the only dedicated configurator for AIOStreams templates.

### Comparable Tools / Ecosystem

| Tool | What It Does | How Core Builds Compares |
|------|-------------|--------------------------|
| **AIOStreams Configure Page** | Each AIOStreams host (elfhosted, fortheweak, etc.) has a built-in configure page where you manually set options via the AIOStreams UI. | Core Builds is **far more advanced** — it has device-aware profiles, 107 ranked regex patterns, IQR statistical filtering, 17 formatter previews, smart dedup, ESE/PSE/ISE stacks, and one-click install. The built-in configure pages are raw JSON editors. |
| **Stremio Addon Manager** | Stremio's built-in addon management — install/remove addons via manifest URLs. | Core Builds **wraps** Stremio's API for direct install, but also generates the template itself. Stremio's manager is just a consumer; Core Builds is a producer. |
| **crispyduck.xyz** | Visual formatter designer — lets you build custom AIOStreams formatters visually. | Core Builds **links to crispyduck.xyz** for custom formatter design and supports importing custom formatter JSON. They're complementary — crispyduck for formatters, Core Builds for the full template. |
| **Tamtaro / SEL-Filtering-and-Sorting** | Community-maintained synced regex/expression URLs for AIOStreams. | Core Builds previously synced Tamtaro URLs but has moved to **inline expressions** (as of v2.36+). Tamtaro is now only referenced for community templates (RB3). Core Builds generates its own 107-entry ranked regex set. |
| **AIOMetadata** | Separate Stremio addon for catalog/metadata management (TMDB, Trakt, anime catalogs). | Core Builds now includes **AIOMetadata config presets** (full anime + movies/TV). They're separate addons but Core Builds integrates catalog selection into its configurator. |
| **WuPlay / Nuvio** | Third-party Stremio-compatible apps with their own addon management. | Core Builds has **dedicated install tabs** for both WuPlay and Nuvio, with auto-copy manifest URLs and setup instructions. These apps consume Core Builds output. |

### Core Builds' Unique Advantages
1. **Device-aware profiles** — 20+ device profiles with correct AV1, DV, HDR, audio passthrough assumptions
2. **One-click Quick Install** — Select service + performance profile → deploy in seconds
3. **107 ranked regex patterns** — Quality-tier scoring matching flagship templates (4K Apex, etc.)
4. **IQR PSE Architecture** — Statistical bitrate filtering using Tukey fences
5. **17 formatter previews** — Live visual previews for every formatter
6. **Host compatibility checking** — Pre-export validation against elfhosted/fortheweak allowlists
7. **CORS proxy fallback** — Cloudflare Worker races direct + proxied fetches
8. **Template backup timeline** — 20-entry local backup with restore
9. **Guided troubleshooter** — Interactive decision tree for common issues
10. **Diagnostics modal** — Sanitized issue reports for GitHub issues

### What Could Be Improved (vs. ecosystem)
1. **No self-hosted mode** — Core Builds runs as a static site. A CLI tool or Node.js server could generate templates programmatically (CI/CD, automated updates).
2. **No template versioning** — Generated templates don't include a version field or changelog. Users can't tell if their template is outdated without re-generating.
3. **No template diff** — The "Update Existing Setup" flow exists but could show a more detailed diff of what changed between versions.
4. **No community template marketplace** — Community templates exist in `/Community-Templates/` but there's no in-app browser or rating system.
5. **No API** — Everything is client-side JavaScript. A REST API would enable integrations with other tools.

---

## Summary

**Bugs:** 10 found (2 high/medium, 8 low). The most impactful is the undefined `eses()` function call in `templateHealthCheck()` which silently disables the 1080p 4K-leak warning. The CORS proxy fallback gap in `openInAIOStreams()` is also worth fixing.

**Features:** Actively building toward a complete "one-click streaming config" experience. Quick Install, modular architecture, and the Core Tools hub are the latest additions. Template Inspector and Account Manager are planned but not yet implemented.

**Ecosystem:** Core Builds is the most advanced AIOStreams configurator available. It's well ahead of the built-in host configure pages and complementary to crispyduck.xyz (formatters) and AIOMetadata (catalogs). The main gap is programmatic/API access for automation.
