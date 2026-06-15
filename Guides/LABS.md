# Core Builds — Nightly Labs

Nightly / Labs templates test new ideas before they're promoted to stable. They run against real libraries — report what you find in the Nightly thread.

---

## Active Labs

### Hybrid Regex + SEL Architecture

**Templates:** 4K Apex Labs v0.4.0 · Stream Labs v0.2.0

**The idea:** Replace simple group-name regex patterns with native SEL functions (`releaseGroup()`, `encode()`, `visualTag()`). Complex multi-condition patterns (Remux T1, Bluray T1, Obfuscated, etc.) stay as regex — those can't be replicated in SEL. Only the patterns that are a single `\b(GroupName)\b` word-boundary match get replaced.

---

### What Changed vs Stable

| Area | Stable | Labs |
|---|---|---|
| Elite groups (FraMeSToR, FLUX, SiC…) | Scored via `rankedRegexPatterns` (+80–100) | Removed from patterns → `pin(releaseGroup(streams, ...), 'top')` PSE |
| IMAX streams | `rankedRegexPatterns` regex (+20) | `pin(visualTag(streams, 'IMAX'), 'top')` PSE — native AIOStreams field |
| Remux pin (4K Labs only) | `keyword(..., 'releaseGroup', ...)` ESE | `releaseGroup(...)` ESE — exact-match, not substring |
| LQ group pin (4K Labs only) | `keyword(...)` ESE bottom pin | `releaseGroup(...)` ESE bottom pin |
| Bad Dual Audio Groups | `rankedRegexPatterns` penalty (−50) | Removed from patterns → **opt-in ESE** (disabled by default) |
| x264 streams | `rankedRegexPatterns` penalty (−25) | Removed from patterns → **opt-in ESE** (disabled by default) |

**Patterns removed from `rankedRegexPatterns`:**

| Template | Removed patterns |
|---|---|
| 4K Apex Labs | 126811, FLUX, SiC, hallowed, TheFarm, BHDStudio (+80/60), Radarr Bad Dual Groups, Sonarr Bad Dual Groups (−50) |
| Stream Labs | FraMeSToR, TheFarm (+100/80), Radarr Bad Dual Groups, Sonarr Bad Dual Groups (−50) |

---

### Opt-In ESEs

Two ESEs ship disabled — enable them in AIOStreams to test:

**`x264 Hard Exclude`**
```js
negate(encode(streams, 'x264', 'h.264'))
```
Replaces the `rankedRegexPatterns` −25 score penalty for x264. Uses AIOStreams' native encode detection instead of regex. Hard-excludes x264 streams rather than soft-penalising — more aggressive.

**`Bad Dual Audio Groups`**
```js
releaseGroup(streams, 'alfaHD', 'BAT', 'BiOMA', 'BlackBit', 'BNd', ...)
```
Replaces the `rankedRegexPatterns` −50 score penalty for known bad dual-audio groups. Hard-excludes rather than soft-penalises.

To enable: open AIOStreams → Stream Expressions → Excluded → find the LABS ESE → toggle on.

---

### What to Test & Report

1. **Do elite groups still appear at the top?** FraMeSToR, FLUX, SiC, BHDStudio etc. should rank ahead of unknown groups. If they're not floating up, the `pin()` PSE may not be evaluating before the IQR tier.

2. **Is the `releaseGroup()` pin more or less reliable than the old `keyword()` pin?** The 4K Labs upgraded the Remux ESE pins from `keyword()` (substring match) to `releaseGroup()` (exact parsed field). If a group that should be pinned is no longer being caught, that's a `releaseGroup()` field-parse miss.

3. **x264 Hard Exclude** — enable it and check: are x264 streams fully removed? Any false positives (streams that look like x264 in the filename but aren't)?

4. **Bad Dual Audio Groups ESE** — enable it and check: are those group releases actually excluded? Or does the pattern miss releases where the group name doesn't match the parsed `releaseGroup` field exactly?

5. **Size/result count** — do you get roughly the same number and quality of results as the stable template?

---

### Why This Matters for Stable Templates

If the hybrid architecture validates:

- ~6 KB savings per 4K template, ~4 KB per 1080p template across 28 non-anime templates
- Native field detection (`encode()`, `visualTag()`) is more robust than regex against edge-case filename formatting
- `releaseGroup()` uses AIOStreams' own filename parser — same source as what populates the stream card display name
- Simpler `rankedRegexPatterns` arrays = easier to audit and update
