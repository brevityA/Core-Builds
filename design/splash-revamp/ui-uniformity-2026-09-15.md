# UI uniformity & mobile research — 2026-09-15

Task: "make ours more uniform for mobile and desktop… deeply research website design and where other
tools do it better." Every number below measured at `49944ef` against `configurator/src/styles/`
and `src/js/app.js`; competitor observations from the live pages/threads listed at the end.

## 1. What we actually have (the honest audit)

**Architecture — this is the real "not uniform":**
- 7 CSS files, 1,620 lines, **143 `!important`** (07-menu-parity: 39, 02-brand-theme: 39, 01-core: 26,
  03-enhancements: 21). Files override each other: `.card` is defined in 5 files, `.opt` 4,
  `.splash-door` 3, `.btn-next` 3. Three separate `min-width:1000px` blocks fight over `.cb-sidebar`.
- **`02-brand-theme.css` has zero tokens** — it is animations + 249 light-theme override selectors.
  The only variable system (`--ui-bg/--ui-line/…`) lives in `05-unified-ui.css`, and everyone else
  hardcodes: `#00d4ff` appears 64× in 01-core, 117× in app.js. "Uniform" cannot survive a palette edit.
- **13+ distinct breakpoint values** across files: 360/380/400/420/480/520/580/599/640/720/820/1000/1600.
  Nothing snaps to the same lines, so components reflow at different widths and feel patchwork.
- **Typography lives in JS**: 456 inline `font-size:` declarations in `app.js` template strings,
  ~116 of them ≤.7rem (8.3–11px at a 16px root). Stylesheets can't reach inline styles, which is
  why mobile fixes only cover class-based elements.

**Where we are already good (don't rebuild, don't mention-less):**
- `05-unified-ui.css`'s ≤599px layer is genuinely modern: `font-size:16px!important` on inputs
  (defeats iOS auto-zoom), 48px `.btn-next/.btn-back`, sticky `.nav` in thumb reach, single-column
  `.opts`, 64px `.opt` cards, safe-area `env()` padding everywhere, `100dvh/svh`, full-width
  sheet-style modals, snap-scroller for `.step-strip`.
- Both horizontal carousels (`.opt-scraper-scroll`, `.fmt-scroll`) use `scroll-snap-type:x mandatory`
  + touch scrolling — the right 2026 pattern for chip rows on phones.
- `prefers-reduced-motion`: four blocks incl. a global kill; `:focus-visible` rings exist; a
  maintained light theme (useful for daylight phone use).
- Express lane (`.fastlane-*`) already has its own 640px block: 54px choices, 16px fields.

**True mobile defects found:**
1. Landing `@media(max-width:520px)` sets `.hybrid-toplinks a{display:none}` — nav links *vanish*
   (no menu replaces them). Content loss, not adaptation.
2. Splash service chips: `padding:7px 11px` ≈ 29px tall — under the 44–48px guidance, and *outside*
   05's `.opt` min-height fix. They are the first thing a phone user taps.
3. `inputmode` and `enterkeyhint`: **zero occurrences** in app.js — the debrid-key and Stremio-email
   fields summon the wrong phone keyboard (letters+shift instead of URL/email/numeric).
4. No `touch-action:manipulation` on chips/cards — 300ms double-tap-zoom guard missing on the two
   most-tapped element families.
5. iPad/Android-tablet gap: 05's input-zoom and 48px fixes are width-based (≤599px); a 10" tablet
   with a finger gets neither. One `pointer:coarse` block exists; it doesn't cover inputs.
6. Landing hero at 520–1000px wastes the right column slot (the tap-core stage is 245px tall of
   donation glow) while the Express door sits below a 2.7rem fixed headline + lede + chips — on a
   390×844 phone the CTA starts mid-second-screen; on a 1280×800 laptop the fold is fine but the
   bento rule (below) is unmet.

## 2. What 2026 practice says (sources at end)

- **CTA/touch:** 44–48px min targets, pill shapes, sticky bottom CTA occupying ≤5% viewport, high
  contrast against dark bg, labels never replaced by placeholders. (2026 CTA/mobile-form roundups.)
- **Wizards:** chunk + progress + conditional logic + early validation + auto-save; "each step fits
  on mobile, no horizontal scrolling." We satisfy all but the *small-text* clause (defect list #typography).
- **SaaS landing 2026 (Linear/Raycast school):** the hero and the bento must show **real product
  screenshots — explicitly "no icons, no illustrations"**; <5 nav links; one primary CTA color; CTA
  above the fold at 1280×800; dark theme is the *correct* choice for dev/TV tools ("makes
  screenshots pop"). Our v3 mock's icon-tiles and text-receipt go against this rule.
- **Container queries:** fine as progressive enhancement, not load-bearing — old TV WebViews lag.
- **Fluid type:** `clamp()` for headline scales instead of breakpoint-steps; root-rem strategy is
  valid precisely because our inline sizes are rem — a `html{font-size}` media step lifts all 456
  declarations at once (cheap, surgical).

## 3. Where other tools do it better (specifically, UI-wise)

| Tool | What they do better | Evidence | Our answer |
|---|---|---|---|
| **QuackStart** | Shows **PNG images of what each formatter looks like** on a Stremio row — "see it, pick it" instead of describing; clean 2-step cards with fat fields | live page | Render one real stream row per formatter as static PNGs; put them in the preset tiles AND the landing (the bento "screenshots not icons" rule — we own the only formatter set in the field that can screenshot *itself*) |
| **Bootstrapper** | Numbered steps, 8 of 10 marked *(optional)* — progressive disclosure is *labelled*, so phones see a short task list; explicit "you will wipe" + backup button before destructive step | live page | Label advanced-drawer sections optional; move Backup affordance next to the replace tick (tool already exists in 03) |
| **AIO.TVFLIX builder** | Nothing on mobile — the counter-example: one endless form, no fold discipline | users report "3–4 min per episode" fatigue + our own fetch | The field's mobile gap is open: nobody in this niche ships a genuinely good phone experience. Our 05-layer means we're 80% there; finishing it is *marketing-differentiating*, not just hygiene |
| **Stremio (the app itself)** | — | Feb-2026 threads: "Stremio app is a broken mess on Android" | Users set this up on phones *because* the app's mobile story is shaky → polish at our layer is disproportionately felt |
| **viren070/numb3rs guides** | Readable, mobile-first *documentation* typography | the incumbents' single strength | Deep-link them rather than compete on prose; keep our step copy at the same size floor (≥13px everywhere on ≤599px) |

## 4. Recommendations (P0 → P2, each already scoped to files)

**P0 — mobile defect fixes (each ≤ ~10 lines):**
1. `.splash-chip`, `.sca`: `min-height:44px;touch-action:manipulation` at ≤599px + `pointer:coarse` (04/05).
2. ≤520px topbar: stop hiding links — make `.hybrid-toplinks` a snap-scroll row (reuse splash-chip skin).
3. `inputmode="url"|"email"`, `enterkeyhint="go"`, `autocapitalize="none" spellcheck="false"` on the
   six credential fields in app.js (the debrid-key field is where phones currently hurt most).
4. Input-zoom + 48px button rules **also under `@media(pointer:coarse)`** (not just ≤599px) in 05.
5. Root-type lift: `@media(max-width:599px){html{font-size:17px}}` — scales all 456 rem-inline
   declarations +10% without touching app.js; re-audit the .52/.58/.6rem sites afterwards and class-ify
   only the survivors (the ≤.7rem hot spots: step headers, receipt rows, stat captions).

**P1 — uniformity (the actual ask):**
6. Make `02-brand-theme.css` a real token file: lift 05's `--ui-*` into `:root` as `--cb-*`
   (accent, bg-1/2, line, ink-1/2/3, ok/warn/bad), codemod the 64+117 `#00d4ff` literals and the
   rgba-ink family; light theme then retints ~30 var lines instead of 249 selectors.
7. Breakpoint discipline: two steps — **600 and 1000** (+1500 cap). Migrate 360/380/400/420/480/520/
   580/599/640/720/820 onto them; forbid new magic widths in review.
8. Layer ownership: one file per component family (01 wizard-core, 04 landing, 06 features,
   05 responsive-shell); fold 07-menu-parity + 03-enhancements overrides in and delete the files;
   `!important` budget → zero outside 05's mobile layer. Add a CI grep test à la `landing-ia.test.mjs`
   ("no !important in 01/03/07", "no font-size < .7rem in app.js outside a `.micro` class") — this
   repo already proves it trusts tests more than comments.
9. Landing: fluid headline `clamp(1.9rem, 1.1rem+3.4vw, 2.7rem)` replaces the 2.7rem/520 step;
   hero right column (05-defect #6) gets a real payload receipt from the v3 mock instead of glow.

**P2 — the field-tested adds:**
10. **Formatter image previews** (QuackStart's best idea × 2026 bento rule): a small esbuild-time
    render of one formatted stream row per formatter → `docs/previews/*.png` (or generated at build),
    used in the landing bento *and* the formatter step. This is the single highest-leverage UI add
    in this research: it shows the product doing its actual magic.
11. Mobile sticky mini-CTA on the landing until the door is in view (pattern: 2026 mobile SaaS).
12. *(optional)* `aria-keyshortcuts` + palette energy for desktop (kept out of landing per prior verdict).

**Anti-list (decided by evidence):** no hamburger on the landing (scrollable chips keep links one
tap AND visible); no light-mode landing redesign; no px conversion of inline rem sizes; no
container-query dependencies; never ship a preview as emoji/icon tiles where a real screenshot
exists; keep `prefers-reduced-motion` and light-theme layers as regression fixtures in any refactor.

**Sources:** live pages `duck-tools.pages.dev/quackstart`, `bootstrapper.stremaddon.net`,
`aio.tvflix.co.uk` (fetched this session); r/Stremio `1r24o0i` "Stremio app is a broken mess on
Android" (2026-02) + `1r5r2yt`; landdding.com "Minimal landing page design examples" 2026-02;
framiq.app "Best SaaS landing pages 2026" (Linear/Raycast bento analysis); designstudiouiux.com
"CTA button UX 2026" (44px/pill/sticky ≤5% rules); dohost mobile-form strategy 2026-08 (48px,
visible labels, sticky); eleken "Wizard UI pattern" 2026-05 (mobile-first clauses). Local: `git grep`
counts quoted in §1, reproducible with the commands in this session's transcript.
