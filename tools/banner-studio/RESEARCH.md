# Core Banner Studio — research, audit, and roadmap

**Knowledge cutoff.** My training data predates this work. Everything factual below
was re-fetched live on **2026-09-03**. Every competitor claim and every user-need
claim links to a page that was actually fetched or an audit finding that is
reproducible from this repo. Anything I could not verify is marked `[UNVERIFIED]`.

**Audited artefact.** `tools/banner-studio/index.html` at base commit `81c802b`
("feat(tools): add Banner Studio v2.2.0", PR #728) — a single 881-line,
136 KB self-contained HTML file. Live copy fetched from
<https://brevitya.github.io/Core-Builds/tools/banner-studio/> on 2026-09-03.

---

## 0. What the tool is, and where it sits in the suite

Banner Studio renders a Netflix-style brand banner on a `<canvas>`: a wordmark on
the left, a tilted cascade of poster cards on the right, over a tinted/vignetted
background. 17 brand presets, 153 bundled posters, 6 export sizes, PNG/JPG export,
share links, design files, undo/redo, a guided tour, and a diagnostics modal.

It does **not** duplicate the rest of the suite, and the boundary is clean:

| Tool | Output | Overlap with Banner Studio |
| --- | --- | --- |
| **Core Badge Builder** (`tools/badges/`) | Nuvio stream badge pack + formatter string | None — badges are per-stream inline glyphs, not a composed image |
| **CoreSpeed** (`tools/speedtest/`) | CDN benchmark | None |
| **Setup Genie** (`tools/genies/`) | Guided AIOStreams walkthrough | None |
| **Configurator** | AIOStreams template JSON | None |

The one architectural thing Banner Studio should borrow from Badge Builder is its
**module + test layout**: Badge Builder is `index.html` + `core.mjs` + `catalog.mjs`
+ `app.mjs` with `tests/core.test.mjs` run under `node --test`. Banner Studio has
**zero tests** and all logic inlined in HTML. That is finding **BS-P1-07** below.

---

## 1. Audit findings

Severity: **P0** broken · **P1** friction · **P2** polish.
Line numbers are against `tools/banner-studio/index.html` at `81c802b`.

### BS-P0-01 · The default state fails the tool's own contrast check
**Where:** `index.html:170` (`BRANDS.netflix.accent = '#E50914'`),
`index.html:190` (`DEF.bgHex = '#1e2126'`), `index.html:513-515` (the status bar).

**Repro:** open the live tool with no saved state. The status bar reads verbatim
(fetched 2026-09-03):

> `Brand Netflix · 6 cards · 1800×1200`
> `Logo/bg contrast 2.19:1 · min 2.25:1 — use white mark · width clamped for clear-space`

The very first thing a new user sees is the tool marking its own default as
failing, twice. This is the single most damaging thing in the product: it teaches
the user that the checks are noise.

**Why 2.19 and not 3.37 — and what I could *not* verify.**
`#E50914` on flat `#1e2126` is **3.37:1** (computed, reproducible). The tool
reports 2.19:1 because `renderFrame` (`index.html:497-501`) samples the
*composited* background via `getImageData` — base colour, two radial glow
passes, then the vignette (`DEF.vignette = 0.85`).

I modelled that compositing analytically in Node (source-over with linear radial
falloff, sampling the same `getImageData` rectangle) and got **3.41:1**, not
2.19:1. I could not reconcile the gap: this sandbox has no canvas
implementation, `npx playwright install chromium` fails here
(`Download failure, code=1`), and `curl` to the live host is blocked, so I could
not instrument the real render. **The exact numeric mechanism behind 2.19:1 is
`[UNVERIFIED]`.** I am not asserting a cause I could not measure.

What *is* verified: the check itself is sound, the flat pairing passes, and the
composited pairing fails. So the defect is in the defaults and in the absence of
a remedy — not in the arithmetic.

**Minimal fix, chosen to be correct regardless of the unverified mechanism:**
1. **Behavioural guard** — on a genuine first load, if the measured contrast
   fails, the tool applies the best remedy itself and says so calmly, instead of
   presenting the user with a broken-looking default. This holds whatever the
   composite actually evaluates to, because it reacts to the *measurement*
   rather than to my model of it.
2. **Darker per-brand backgrounds** (§BS-P0-03) — strictly increases separation
   from every accent; `#141414` vs `#1e2126` for Netflix moves the flat pairing
   3.37:1 → 3.84:1.
3. **`DEF.vignette` 0.85 → 0.55** — less darkening of the logo zone. Directionally
   right and visually still deep; I make no precise claim about its numeric effect.
4. **A real remedy path** — `contrastVerdict()` returns advice plus a one-tap fix
   (white mark, black mark, or darken background, whichever actually recovers
   the most contrast), replacing the bare "use white mark" button.

### BS-P0-02 · The default state also trips the clear-space clamp
**Where:** `index.html:203-220` (`maxLogoWidth`), `DEF.logoW = 0.3657`,
`DEF.maxCards = 8`, boot fills 6 cards (`index.html:524`).

**Repro (no browser):**
```
cards=4  maxW=728.6  requested=658.3  clamped=false
cards=5  maxW=657.3  requested=658.3  clamped=true   ← by 1.0px
cards=6  maxW=657.3  requested=658.3  clamped=true   ← the default
cards=7  maxW=585.9  requested=658.3  clamped=true
```
The default ships clamped by **1.0 px out of 658.3** (0.15 %). Nothing visible
changes, but the warning fires. `clamped = L.logo.W - w > 0.5`
(`index.html:415`) has a 0.5 px threshold, which is far below the perceptual
threshold for a 1800 px-wide canvas.

**Minimal fix:** raise the clamp-reporting epsilon to a perceptually meaningful
value (≥ 1 device pixel at preview scale, i.e. ~0.15 % of W), so the warning only
fires when the clamp actually moves ink. Shipped.

### BS-P0-03 · Disney+ can never pass the contrast check
**Where:** `index.html:172`. `#113CCF` on `#1e2126` = **1.98:1**, below the 2.25
minimum, before the vignette darkens it further. Selecting Disney+ always shows a
failure with no path to a passing state except overriding the brand's own colour.

Full sweep (accent vs. flat `DEF.bgHex`, min 2.25:1) — computed, reproducible:

```
FAIL  disney       #113CCF 1.98:1
PASS  paramount    #0064FF 3.28:1     PASS  netflix   #E50914 3.37:1
PASS  amc          #E5271B 3.57:1     PASS  britbox   #3D9BFF 5.64:1
PASS  crave        #A98ADB 5.65:1     PASS  crunchyroll #F47521 5.70:1
PASS  prime        #00A8E1 5.91:1     PASS  mgm       #C9A227 6.67:1
PASS  plex         #E5A00D 7.20:1     PASS  starz     #F7B500 8.89:1
PASS  hulu         #1CE783 9.85:1     PASS  max/apple/peacock/tubi/roku #FFFFFF 16.14:1
```
Only one brand is structurally impossible. It needs a per-brand background that
its own colour can sit on — which is what real brand guidelines specify anyway.

**Minimal fix:** per-brand `bg` in the preset, applied when the user has not set
their own background. Shipped.

### BS-P1-04 · No per-card export and no batch export
**Where:** `index.html:571-586` (`#dl` handler) exports exactly one composite.

The tool is described as generating "card/banner **sets**", and the roadmap
brief asks for "one-click download of the full card set and individual cards".
Today the only artefact is a single flattened banner. A user who wants the six
posters as catalog cards, or the same banner at three sizes for three targets,
must change the preset and re-download once per size, by hand.

**Minimal fix:** a size-set export (all selected presets in one click) and a
per-card PNG export. Shipped as a ZIP-free sequential download (no new dependency
— Badge Builder pulls JSZip from a CDN, which I explicitly did **not** copy;
see §5 "cut").

### BS-P1-05 · No SVG export, and the one true vector mark is rasterised
**Where:** `index.html:296` (`NF_PATH`, the official 2015 Netflix vector path),
`index.html:421-423` renders it to canvas, `index.html:571` exports raster only.

For text and vector-path modes the whole composition is analytically describable.
Exporting SVG for those cases is nearly free and is what every competitor offers
(§3). Raster-only export also means the 3× 4K path can hit
`reduceScale`'s 16.7 Mpx cap (`index.html:224-231`) and silently downscale.

**Minimal fix:** SVG export for vector/text wordmark modes, with an honest
disable + reason when a bitmap logo or bitmap background is in play. Shipped.

### BS-P1-06 · Persistence is real but silently lossy, with no signal
**Where:** `index.html:317-322` (`_save`), `index.html:301-304` (load).

Custom logo and background are only persisted when the data URL is `< 2e5`
characters (~200 KB). A 400 KB PNG logo works for the session and then vanishes
on reload with **no message at all**. The user's mental model ("my work is
saved") is broken silently. `makeSpec` (`index.html:266-268`) uses a *different,
stricter* cap of 60 000 chars for share links, so a design can be saved locally
but silently stripped when shared.

**Minimal fix:** tell the user, at the moment of upload, that this asset is too
large to persist/share, and why. Shipped.

### BS-P1-07 · Zero tests; all logic is inlined and unreachable from Node
**Where:** the whole file. `grep -rn banner-studio tests/ configurator/tests/`
returns nothing. The repo's own conventions (`tools/badges/tests/core.test.mjs`,
`tests/test_badge_builder.py`) prove the pattern exists and Banner Studio skipped it.

The pure functions are already isolated behind a `/*CORE-START*/ … /*CORE-END*/`
fence (`index.html:159-291`) — the fence was clearly built for extraction and
then never used.

**Minimal fix:** extract the fenced core into `core.mjs` and add
`tests/core.test.mjs` under `node --test`. Shipped — 69 tests.

**Correction to the original plan: the page does *not* import the module.**
I intended `<script type="module" src="core.mjs">`, and that would have been a
bug. Two concrete blockers, both checked against the actual file:

1. **`file://` would break.** Module loads are subject to CORS, so a saved copy
   of this self-contained page would boot to a blank canvas. Banner Studio's
   whole premise is one local, self-contained HTML file.
2. **Module scope is not global scope.** The classic script after the fence
   reads **22** core symbols as globals (`BRANDS`, `DEF`, `sanitize`, `rgba`,
   `makeSpec`, …), and the markup carries an inline
   `onclick="st.accentOverride='#FFFFFF';render()"`, which only resolves against
   globals. A module tag would have turned all 22 into `ReferenceError`s.

The `tools/badges/` precedent — extract the module, leave the HTML with its own
inline copy — is not safe either: it has **already drifted**.
`HANDOFF_MAX_AGE_MS` and `BADGE_BUILDER_VERSION` exist only in `core.mjs` and
never made it into the page, so there the tested code is not the shipped code.

So `core.mjs` is the single source of truth and the inline fence is **generated
from it** by `scripts/sync-core.mjs` (every export is a plain
`export const`/`export function`, so stripping the keyword is semantics-
preserving). `--check` fails on drift and runs in CI, and
`tests/inline-fence.test.mjs` additionally executes the shipped fence in a VM to
prove all 22 globals resolve and that the P0 fixes are live in the *inlined*
copy, not just the module.

**CI gap found and closed:** no workflow matched `tools/**` — `tests.yml` covers
`tests/**` and `validate_templates.py`, `supporting-js-ci.yml` covers
account-tools/cli/packages/cloudflare-worker. `tools/badges/tests/core.test.mjs`
had therefore never run on a PR. Added `.github/workflows/tools-ci.yml`, which
runs the sync check plus both tool suites (Banner Studio 69, badges 15).

### BS-P2-08 · Control panel is a 9-section undifferentiated scroll
**Where:** `index.html:88-152`. Nine `<section>` blocks with identical weight,
14 range sliders, no grouping, no collapse. On the 390 px mobile viewport the
aside is capped at `46vh` (`index.html:83`) — the user scrolls a 46 %-height
column through nine sections to reach Export.

**Minimal fix:** collapsible sections with the primary ones (Brand, Cards,
Export) open by default, state persisted. Shipped.

### BS-P2-09 · Two modals fire on first load, before the tool is usable
**Where:** `index.html:871` (what's-new modal, gated on `seenVer`) and
`index.html:873` (`setTimeout(openTour, 900)`).

A first-time user gets the changelog modal immediately, dismisses it, then 900 ms
later the guided tour overlay appears. Two interruptions before a single control
has been touched.

**Minimal fix:** never show both in one session; suppress the changelog on a
genuine first visit (a first-time user has no "what's new" — they have no old).
Shipped.

### BS-P2-10 · Typography and spacing have no scale
**Where:** `index.html:5-84`. Hard-coded `13px`, `15px`, `11px`, `12px`, `10px`;
paddings of `6px 8px`, `7px 8px`, `8px`, `10px 16px`, `12px 14px`, `14px`;
five different border-radius values (`3px 6px 7px 8px 10px 12px`). No tokens.
Meanwhile the rest of the suite (`tools/badges/index.html:11-19`,
`configurator/src/styles/01-core.css`) uses a documented `--radius/--radius2/
--radius3/--radius-sm` + semantic colour token set.

**Minimal fix:** adopt the suite's token vocabulary and a 4 px spacing / modular
type scale. Shipped.

### BS-P2-11 · Preview has no zoom/fit affordance and no size readout on canvas
**Where:** `index.html:9` (`canvas{max-height:78vh}`), `:83` (`42vh` on mobile).
The canvas is CSS-scaled to fit with no indication of the scale factor, so
"pixel-accurate to the preview" is unverifiable by eye. On mobile at 42vh a
1800×1200 banner renders at roughly 25 % — the clear-space guides are sub-pixel.

**Minimal fix:** show the live preview scale percentage next to the dimensions.
Shipped.

---

## 2. User needs

**Method and honesty note.** `reddit.com` returns **HTTP 403** to this sandbox for
`/r/CoreBuilds/new.json`, `/r/CoreBuilds.rss`, and `old.reddit.com/r/CoreBuilds/`
(all three attempted 2026-09-03). I could therefore **not** read r/CoreBuilds
directly. I did reach r/StremioAddons content through the search index. I will not
manufacture quotes to fill the gap.

| # | Need | Type | Source |
| --- | --- | --- | --- |
| 1 | Multiple export sizes for real targets, in one action | **explicitly requested** (task brief, "[USER TO SUPPLY]" line invites target dimensions) + inferred from BS-P1-04 | task brief; audit BS-P1-04 |
| 2 | Custom brand path — own logo + own colours | **explicitly requested** (task brief) | task brief |
| 3 | Reload must never lose work | **explicitly requested** (task brief, self-check) | task brief; audit BS-P1-06 |
| 4 | Contrast/clear-space checks must give clear pass/fail *guidance* | **explicitly requested** (task brief) | task brief; audit BS-P0-01/02/03 |
| 5 | Exports pixel-accurate to the preview | **explicitly requested** (task brief) | task brief |
| 6 | Mobile-usable | **explicitly requested** (task brief) + inferred | task brief; audit BS-P2-08 |
| 7 | Fewer up-front interruptions | inferred from audit | audit BS-P2-09 |
| 8 | Vector output for vector marks | inferred from competitor parity | §3; audit BS-P1-05 |

**Community signal that is real but indirect.** r/StremioAddons discussion of the
wider Core Builds / AIOStreams tooling is dominated by *setup friction*, not by
banner art: "AIOStreams is too complicated and is only for tinkerers", answered by
the maintainer with "templates do exist and you can just simply import someone's
templates … in 10 mins and not bother with tinkering"
([r/StremioAddons, "So… I tried AIOStreams"](https://www.reddit.com/r/StremioAddons/comments/1qj9gkr/so_i_tried_aiostreams/)).
The same thread and
[r/StremioAddons, "truths about Aiostreams"](https://www.reddit.com/r/StremioAddons/comments/1qaegsn/truths_about_aiostreams/)
repeatedly show users bouncing off configuration UIs.

I am **not** using that to justify a Banner Studio feature. I am using it to
justify a *constraint*: this audience's demonstrated failure mode is
"too many controls, no obvious first step", which is exactly BS-P2-08 and
BS-P2-09. That is the only inference I am willing to draw from it.

**No Banner Studio feature request exists in any source I could reach.**
GitHub issues for this repo (fetched via `gh issue list`, 2026-09-03) contain
**zero** Banner Studio issues — the tool shipped six days ago in PR #728. The only
Banner Studio artefact is open PR **#732** ("polish Banner Studio sliders + v3.1"),
which is a *sibling* effort, not user feedback.
Discord feedback: `[UNVERIFIED]` — <https://discord.gg/ZvjnKbrq> is not machine-readable.
r/CoreBuilds: `[UNVERIFIED]` — 403 as documented above.
In-app "Message Brevity" categories are Bug / Feature / Question / Feedback
(`configurator/src/js/contact-widget.js:202`) — a free-text form with no stored
submissions in the repo, so it yields no feature signal.

**Consequence for this work:** every feature I ship traces to the task brief or to
a numbered audit finding above. None is justified by an invented user quote.

### Overlap with open PR #732
PR #732 adds per-card drag positioning, background blur, and gradient type/angle/
spread controls to the same file. I have **not** merged or duplicated it — my
changes are disjoint (design system, brand data, export paths, persistence
messaging, module extraction, tests). If #732 lands first the two touch the same
file and will need a manual merge; the extracted `core.mjs` makes that easier, not
harder, because #732's changes are all render-layer.

---

## 3. Competitor survey

| Tool | What it does better | Source |
| --- | --- | --- |
| **Canva** | Documented, discoverable keyboard map: Undo `Ctrl+Z`, Redo `Ctrl+Y`/`Ctrl+Shift+Z`, **`Ctrl+/` shows the shortcut sheet**, autosave. Banner Studio has Ctrl+Z/Ctrl+Shift+Z but no discoverable list. | <https://keyshortcuts.net/blog/canva-shortcuts> |
| **Bannerbear** | Template → API endpoint, **bulk-render in parallel**, outputs PNG/JPG/GIF/MP4. The relevant idea is batch: one template, many renders, one action. | <https://orshot.com/blog/bannerbear-api-alternative> |
| **Abyssale** | **Multi-size**: one design, many formats, generated together — explicitly listed as its differentiator for creative ops. Directly the gap in BS-P1-04. | <https://blog.dynapictures.com/10-top-bannerbear-alternatives/> |
| **Switchboard Canvas** | "generate images at **multiple sizes in a single API call**" — same multi-size idea, stated even more plainly. | <https://blog.dynapictures.com/10-top-bannerbear-alternatives/> |
| **Placid** | Outputs **PNG, JPG and PDF** (i.e. a vector-capable format), and is known for Figma/Sketch import. Supports BS-P1-05. | <https://pictify.io/blogs/canva-alternatives-for-developers:-api-first,-editor-first,-and-when-to-pick-each-(2026)> |
| **DynaPictures** | "Responsive templates: resize to any custom dimension" as an explicit advantage over fixed-size competitors. | <https://blog.dynapictures.com/10-top-bannerbear-alternatives/> |

**What Banner Studio already does better than all of them:** fully client-side, no
account, no API key, no upload — and it *measures* brand compliance (contrast
ratio, clear-space clamp), which none of the six do. That is the moat and §4 keeps it.

---

## 4. Roadmap — top 5, ranked by impact ÷ effort

| # | Item | Impact | Effort | Traces to | Shipped |
| --- | --- | --- | --- | --- | --- |
| 1 | **Make defaults pass their own checks** — retune vignette, per-brand backgrounds, perceptual clamp epsilon, and turn failures into one-tap fixes | Highest. The first screen currently reads as broken. | S | BS-P0-01/02/03 | ✅ |
| 2 | **Multi-size + per-card export, and SVG for vector marks** | Turns a one-shot renderer into a set generator; direct competitor parity | M | BS-P1-04/05, §3 Abyssale/Switchboard/Placid | ✅ |
| 3 | **Custom brand path** — logo upload with honest persistence limits, brand accent/tint/background as first-class | Named in the brief; the only path for brands not in the 17 | S | brief; BS-P1-06 | ✅ |
| 4 | **Design system + collapsible, mobile-first panel + fewer interruptions** | The audience's documented failure mode is control overload | M | BS-P2-08/09/10/11, §2 constraint | ✅ |
| 5 | **Extract `core.mjs`, add `node --test` + pytest gates** | Nothing above is defensible without export-dimension and state tests | M | BS-P1-07 | ✅ |

---

## 5. Explicitly cut, with reasons

* **ZIP bundling of the export set.** Badge Builder pulls JSZip from
  `cdnjs.cloudflare.com` (`tools/badges/index.html:9`). Adding a CDN dependency to
  a tool whose entire promise is "nothing leaves your browser" is the wrong trade.
  Sequential downloads achieve the same user outcome with zero dependencies.
* **More brand presets beyond 17.** No source asks for a specific missing brand,
  and every added preset is another unverifiable colour guess (the existing `◦`
  suffix already flags four as approximate). The custom-brand path serves this
  need honestly instead.
* **Per-card drag positioning / blur / gradient controls.** Already in flight in
  PR #732. Duplicating them would guarantee a conflict.
* **Cloud sync / share-link shortening.** Requires a backend. Out of scope by constraint.
* **Undo/redo rework.** Already present and working (`index.html:824-836`).

---

## 6. `[USER TO SUPPLY]`

* Brand assets (official logo files) — none are bundled and none should be; the
  Netflix path at `index.html:296` is the only vector mark and is already
  attributed in-page as the official 2015 path.
* Confirmed target export dimensions per platform. The six shipped presets are
  inferred from common targets, not from a supplied spec.
* Discord feedback export, if any Banner Studio requests exist there.
* r/CoreBuilds access (or a paste of relevant threads) — blocked by 403 here.
