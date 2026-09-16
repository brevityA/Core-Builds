# Two queued verifications, run and resolved — 2026-09-16

Both were flagged in `ui-uniformity-2026-09-15.md` §4 and the leverage audit as
"verify at implementation." Done early, so the queued PRs carry no open questions.

## 1. Contrast audit of the palette the prototypes + splash copy use
Measured WCAG ratios (relative-luminance formula) on the two actual surfaces
(panel `#0d151f`, page `#070b12`):

| pair | ratio | verdict |
|---|---|---|
| ink `#e6edf3` on panel / page | 15.5 / 16.7 | PASS |
| mut `#8b949e` | 5.97 / 6.41 | PASS (this is the safe floor) |
| **dim `#637185`** | **3.70** | large-text-only — our footnotes/captions are 10–11px → FAIL in practice |
| **`#4b5563` (`.foot2`, diffs notes)** | **2.43** | FAIL everywhere |
| **sidebar sub `#526174`** | **2.90** | FAIL |
| accents: `#00d4ff` 10.4 · `#34d399` 9.6 · `#67e8f9` 12.7 · `#fbbf24` 11.0 · `#f87171` 6.6 | | PASS |
| CTA: `#04121b` on `#00d4ff` | 10.7 | PASS |
| composited `#5eead4@.66` | 6.0 | PASS |

**Finding:** the accent system is fine; the *grey ladder's bottom two rungs are the debt* — and they
are exactly where the small microcopy lives (captions, footnotes, `sb-step-sub`). Fix in the P0 PR:
footnote/caption text steps up to `--mut` (`#8b949e`, ~6:1), and `#637185`/`#4b5563`/`#526174` get
restricted to ≥19px bold or decorative use. Small, targeted, zero layout risk.

## 2. "Deeplink" verification — the shape is better than a deeplink
Source: Tam-Taro README + host env-var instructions (README fetched 2026-09-16; their repo moved to
380 commits / 825 stars with **v3.2.6** and consolidated to *two* templates + an import wizard —
further evidence for naming presets over enumerating setups).

AIOStreams instances ship a **native template-import system**:
- Hosts set `TEMPLATE_URLS=["<raw json url>"]`, `TEMPLATE_REFRESH_INTERVAL=3600`,
  `FEATURED_TEMPLATE_IDS=tamtaro.complete,…`, `SEL_SYNC_ACCESS=all` (hotfix lane for synced URLs).
- Users: *Save & Install → Import Template →* paste a JSON URL (e.g. `https://git.tamtaro.de/complete.json`,
  a vanity redirect to the repo's raw file). "Most public instances should already have [the] template."
- The AIOStreams config UI also answers `?menu=save-install` query params (seen live on nhyira's instance).

**Consequences for our roadmap:**
1. **A fourth install path, hosting-free:** publish `core-builds-templates.json` (AIOStreams Template
   schema, built from our `Templates/` collection) on raw GitHub + optionally a vanity short URL.
   Then any user on any public instance imports Core Builds' 74 setups *inside the host UI* —
   Tam-Taro's exact distribution trick, but generated from verified data with our validation story.
   ⚠ One schema check remains: our `Templates/*.json` are config-preset shapes; the import format is the
   AIOStreams *template* schema — verify the mapping at the pinned ref before emitting the file (this
   repo's rule: no guessed option/URL shapes).
2. **Update-in-place becomes concrete:** if hosts refresh `TEMPLATE_URLS` hourly, a fix we push is a
   re-import on their side — the splash sentence "configs that update themselves" becomes "template
   refreshes hourly on 8 hosts" *if* we get whitelisted; keep as future claim, not copy, until then.
3. The splash's install-path trio (v2/v3 mock) gains a real fourth tile: "Import in your instance".
4. `?menu=save-install` makes the current "Update Existing Setup" route deeplinkable — one parameter,
   verifiable against the live UI at implementation time (fetch the page, grep the router; no guessing).

Nothing shipped to `src/` from either finding yet; these slot into the queued P0 PR (contrast) and the
splash implementation PR (fourth install path, once the schema mapping is verified).
