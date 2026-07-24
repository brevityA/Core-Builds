# Core Builds — Roadmap & Strategic Direction

**Version:** v2.78 → v3.0  
**Date:** 24 Jul 2026  
**Author:** Automated audit + competitive analysis  

---

## Executive Summary

Core Builds is the most advanced AIOStreams configurator in the ecosystem. You have:
- **Template Builder** — live, device-aware, 17 formatters, 107 regex, IQR PSE
- **Addon Backup** — live, read-only Stremio backup
- **Template Inspector** — stub on the tools page
- **Account Manager** — locked on the tools page

Your competitive advantages are **device-aware profiles**, **IQR statistical filtering**, **host compatibility checking**, and **one-click Quick Install**. No one else does these.

The path to v3.0 is: **ship the two stub tools, integrate AIOMetadata, add bandwidth-based limits, and build a CLI**.

---

## Phase 1 — Ship What You Have (1–2 weeks)

### 1.1 Template Inspector

You already have `validate_templates.py` (199 tests passing). Wrap it in a web UI.

**What it does:**
- User pastes AIOStreams JSON or manifest URL
- Runs all validation checks locally (no server needed)
- Shows plain-English findings: errors, warnings, passed checks
- Offers safe one-click repairs (e.g., "Fix formatter ID", "Add missing 0Cached ISE")
- Shows host compatibility (elfhosted, fortheweak, self-hosted)
- Export validation report as JSON for GitHub issues

**Files needed:**
- `tools/inspector/index.html` — web UI shell
- `tools/inspector/validator.js` — port of `validate_templates.py` to JS (or run via Pyodide)

**Effort:** 3–5 days  
**Value:** High — catches the exact class of bugs we just fixed (formatter IDs, stale URLs, missing ISEs)

### 1.2 Fix Remaining Template Issues

The validator found these in community templates:

| Template | Issue | Fix |
|----------|-------|-----|
| `prism-torbox-essential-1080p.json` | `titleMatching.mode: "exact"` | Change to `"fuzzy"` |
| `rb3-torbox-pro-rd-hybrid.json` | `titleMatching.mode: "exact"` | Change to `"fuzzy"` |
| `rb3-torbox-pro-rd-hybrid.json` | `titleMatching.similarityThreshold: 1` | Change to `0.85` |
| `rb3-torbox-pro-rd-hybrid.json` | `yearMatching.strict: true` | Change to `false` |
| `rb3-torbox-pro-rd-hybrid.json` | `seasonEpisodeMatching.strict: true` | Change to `false` |
| All 3 community templates | Missing `0Cached` ISE | Add `{"expression": "0Cached == true"}` |

**Effort:** 1 hour  
**Value:** Medium — prevents "zero results" complaints from community template users

### 1.3 CORS Fix in Manifest Modal

The `showManifestModal()` function's "Push to Stremio" handler (line ~4545) still uses bare `fetchWithTimeout`. Change to `writeHostFetch` for consistency.

**Effort:** 10 minutes  
**Value:** Low — edge case but should be consistent

---

## Phase 2 — AIOMetadata Integration (2–3 weeks)

This is the **biggest gap** vs. competitors. TVFlix Builder, Tam-Taro, and Duck Tools all generate AIOMetadata configs alongside AIOStreams templates. You have the config files in `/AIOMetadata/` but the configurator doesn't generate them.

### 2.1 Add AIOMetadata Step to Quick Install

After the user picks service + device + resolution + performance profile, add an optional step:

```
📺 Catalogs & Metadata (optional)
├── TMDB catalogs (movies, TV shows)
├── Streaming service catalogs (Netflix, Disney+, etc.)
├── Anime catalogs (MAL, AniList, Crunchyroll)
├── RPDB/TOP poster ratings
├── Catalog order (drag to reorder)
└── Home vs Discovery toggle per catalog
```

**What it generates:**
- `aiometadata-config.json` — importable into AIOMetadata configure page
- Instructions for AIOMetadata install alongside AIOStreams

**Files needed:**
- `configurator/src/data/catalogs.js` — catalog definitions (you already have some in `services.js`)
- `configurator/src/js/app.js` — add AIOMetadata generation to `buildFinal()`
- `AIOMetadata/` — update existing configs with current schema

**Effort:** 1–2 weeks  
**Value:** Very high — this is the #1 feature TVFlix has that you don't

### 2.2 Bandwidth-Based Bitrate Limits

TVFlix asks "What's your internet speed?" and calculates safe bitrate limits. Add this to Fine-Tune or Quick Install.

**Formula:**
```
maxBitrate = (internetSpeed_mbps * 0.8) / 1.2  // 80% of bandwidth, 1.2x safety margin
```

**UI:**
```
Internet Speed (Mbps)
├── 25 Mbps  → maxBitrate: 16 Mbps  → caps at 1080p WEB-DL
├── 50 Mbps  → maxBitrate: 33 Mbps  → caps at 4K WEB-DL
├── 100 Mbps → maxBitrate: 66 Mbps  → caps at 4K Remux
├── 200 Mbps → maxBitrate: 133 Mbps → no cap
└── Custom   → enter your own
```

**Files needed:**
- `configurator/src/js/app.js` — add `bandwidthLimit` to state, Fine-Tune UI, and `buildFinal()` output
- `configurator/src/data/devices.js` — add bandwidth recommendations per device

**Effort:** 2–3 days  
**Value:** High — prevents the #1 playback complaint (buffering on large files)

### 2.3 Kids Mode / Age Ratings

TVFlix has age rating limits (G/PG/PG-13/R/NC-17). Add to Content Preferences.

**Implementation:**
- Add `ageRating` to state: `'none'`, `'G'`, `'PG'`, `'PG-13'`, `'R'`, `'NC-17'`
- In `buildFinal()`, add an ESE that filters by `stream.certification`
- Requires TMDB key for certification data

**Effort:** 1–2 days  
**Value:** Medium — appeals to family users

---

## Phase 3 — Account Manager (3–4 weeks)

### 3.1 Read-Only Account Inspector

Start with read-only features (no destructive operations):

**Features:**
- List all addons in a Stremio account
- Show addon metadata (name, URL, version)
- Show config details for AIOStreams addons
- Export full addon collection as JSON
- Compare two accounts side-by-side

**Files needed:**
- `account-tools/index.html` — extend existing backup page
- `account-tools/inspector.js` — addon listing + metadata display

**Effort:** 1 week  
**Value:** Medium — already have the Stremio API integration from backup tool

### 3.2 Account Cloner

Clone addons from one Stremio account to another. Duck Tools has this.

**Features:**
- Source account (email + password)
- Destination account (email + password)
- Select which addons to clone
- Preserve addon order
- Handle duplicate detection

**Files needed:**
- `account-tools/cloner.js` — clone logic
- `account-tools/cloner.html` — UI

**Effort:** 1 week  
**Value:** Medium — useful for users migrating accounts

### 3.3 Config Diff & Rollback

Compare two AIOStreams configs and show differences. Rollback to a previous version.

**Features:**
- Paste two JSON configs
- Show side-by-side diff (presets, ESEs, PSEs, sort criteria, formatter)
- Highlight what changed
- One-click rollback to a previous version

**Files needed:**
- `tools/differ/index.html` — diff UI
- `tools/differ/diff.js` — JSON diff logic

**Effort:** 1 week  
**Value:** Medium — power users love this

---

## Phase 4 — CLI Tool (2–3 weeks)

### 4.1 Core CLI

A Node.js CLI that generates templates programmatically.

**Usage:**
```bash
# Generate a template
npx core-builds generate \
  --service torbox-pro \
  --device shield \
  --resolution 4k \
  --audio lossless \
  --formatter apex-v2 \
  --output template.json

# Validate a template
npx core-builds validate template.json

# Compare two templates
npx core-builds diff old.json new.json

# List available options
npx core-builds devices
npx core-builds services
npx core-builds formatters
```

**Files needed:**
- `cli/index.js` — CLI entry point (uses commander.js)
- `cli/generate.js` — template generation logic (reuse from `app.js`)
- `cli/validate.js` — validation logic (reuse from `validate_templates.py`)
- `cli/diff.js` — diff logic
- `package.json` — npm package config

**Effort:** 2–3 weeks  
**Value:** Very high — enables automation, CI/CD, power users, and integrations

### 4.2 npm Package

Publish as `core-builds` on npm:

```json
{
  "name": "core-builds",
  "version": "2.78.0",
  "bin": {
    "core-builds": "./cli/index.js"
  },
  "keywords": ["aiostreams", "stremio", "template", "configurator"]
}
```

**Effort:** 1 day (packaging)  
**Value:** High — discoverability and ease of use

---

## Phase 5 — Template Marketplace (4–6 weeks)

### 5.1 Community Template Browser

Surface the `/Community-Templates/` directory in the app.

**Features:**
- Browse community templates with descriptions, screenshots, ratings
- One-click import into the configurator
- Filter by service, device, resolution, content type
- Show compatibility (which hosts accept this template)
- Show template metadata (author, version, last updated)

**Files needed:**
- `marketplace/index.html` — marketplace UI
- `marketplace/templates.json` — template metadata index
- `marketplace/ratings.js` — rating system (localStorage-based initially)

**Effort:** 2–3 weeks  
**Value:** High — community engagement and discoverability

### 5.2 Template Versioning

Add version tracking to generated templates.

**Implementation:**
- Add `coreBuildsVersion` and `templateVersion` to generated config metadata
- Show "Update available" banner when a newer version exists
- Generate changelog between versions

**Effort:** 1 week  
**Value:** Medium — reduces "is my template outdated?" support requests

---

## Phase 6 — Advanced Features (ongoing)

### 6.1 CrispyFormat Deep Integration

Instead of linking to crispyduck.xyz, pass state between tools:

**Options:**
- Embed a simplified formatter editor in the configurator
- Pass formatter JSON via URL parameters to CrispyFormat
- Import CrispyFormat exports directly into the configurator (already works via "Import Custom Formatter")

**Effort:** 1–2 weeks  
**Value:** Medium — better UX for formatter customization

### 6.2 Multi-Language Template Generation

TVFlix generates separate addons per language. Add this as an option:

**Implementation:**
- When user selects multiple languages, generate separate AIOStreams configs per language
- Each config has `requiredLanguages` set to that language
- Install all as separate Stremio addons

**Effort:** 1 week  
**Value:** Medium — appeals to non-English users

### 6.3 Stremio Account Creation Flow

You already have `createRandomStremioAccount()`. Extend this:

**Features:**
- Guided account creation flow
- Auto-fill email + password in the configurator
- One-click "Create account + Generate template + Install" flow

**Effort:** 2–3 days  
**Value:** Low-medium — reduces friction for new users

### 6.4 PWA / Offline Support

Make the configurator work offline:

**Implementation:**
- Add service worker for caching
- Add manifest.json for PWA install
- Cache all static assets (JS, CSS, fonts, icons)

**Effort:** 1 week  
**Value:** Medium — better mobile experience

---

## What NOT to Build

| Feature | Why Not |
|---------|---------|
| **Formatter visual editor** | CrispyFormat owns this space. Partner or deep-link instead. |
| **Stremio client** | WuPlay and Nuvio already exist. Focus on the config layer. |
| **Synced URL system** | Your inline expressions are more reliable (no external dependency, no allowlist issues). |
| **User accounts / cloud sync** | Increases complexity and security surface. localStorage + export/import is sufficient. |
| **Mobile app** | PWA is sufficient. Native app adds 10x maintenance burden. |

---

## Priority Matrix

| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Template Inspector | 3–5 days | High | **P0 — Do now** |
| Fix community template issues | 1 hour | Medium | **P0 — Do now** |
| CORS fix in manifest modal | 10 min | Low | **P0 — Do now** |
| AIOMetadata integration | 2–3 weeks | Very High | **P1 — Next** |
| Bandwidth-based bitrate limits | 2–3 days | High | **P1 — Next** |
| Kids mode / age ratings | 1–2 days | Medium | **P1 — Next** |
| CLI tool | 2–3 weeks | Very High | **P2 — Soon** |
| Account Manager (read-only) | 1 week | Medium | **P2 — Soon** |
| Template Marketplace | 2–3 weeks | High | **P3 — Later** |
| Account Cloner | 1 week | Medium | **P3 — Later** |
| Config Diff & Rollback | 1 week | Medium | **P3 — Later** |
| CrispyFormat deep integration | 1–2 weeks | Medium | **P3 — Later** |
| Multi-language templates | 1 week | Medium | **P4 — Future** |
| PWA / Offline support | 1 week | Medium | **P4 — Future** |

---

## Technical Debt to Address

| Item | Impact | Effort |
|------|--------|--------|
| Inline styles → CSS classes | Maintainability | 2–3 weeks (incremental) |
| `eses()` / `buildFinal()` → extract to modules | Testability | 1 week |
| `Formatters/*.json` standalone files — fix IDs | Clarity | 1 hour |
| `instancePassword` in localStorage | Security | 1 day (add encryption or move to sessionStorage) |
| `stremioEmail` persistence inconsistency | UX | 1 hour |
| QR code library → ES module | Architecture | 1 hour |
| `CORS_PROXY` hardcoded → configurable | Resilience | 1 hour |

---

## Metrics to Track

| Metric | Current | Target (v3.0) |
|--------|---------|---------------|
| GitHub stars | 43 | 200+ |
| Template generations (counter) | ~1,000+ | 10,000+ |
| Test coverage (pytest) | 199 tests | 300+ |
| Template files validated | 72 | 100+ |
| Device profiles | 20 | 30+ |
| Formatter options | 17 | 25+ |
| Community templates | 3 | 20+ |
| CLI downloads (npm) | 0 | 500+/month |

---

## Summary

**Ship now:** Template Inspector + community template fixes + CORS fix  
**Build next:** AIOMetadata integration + bandwidth limits + kids mode  
**Build soon:** CLI tool + Account Manager  
**Build later:** Template Marketplace + Account Cloner + Config Diff  

The single highest-impact feature is **AIOMetadata integration** — it's the gap that TVFlix, Tam-Taro, and Duck Tools all fill, and you're the only advanced configurator that doesn't have it.
