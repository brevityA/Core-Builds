# Splash revamp — prototype & directions (2026-09-15)

Design proposal only; nothing here is wired into the configurator yet. Companion research
lived in the 2026-09-15 session (`/home/user/research/splash-revamp-competitive-2026-09-15.md`),
which a sandbox reset deleted — the load-bearing findings are restated here so they can't be lost
again, which is also why this folder is in the repo instead of a scratch dir.

**Prototype:** `index.html` in this folder is a static, self-contained mock — **v2 (2026-09-15, simplified per
the "it complicates the page" note + the add-on-stack research in `why-theyre-popular-2026-09-15.md`)**: hero =
named presets (Lean/Standard/Maximum/Backup) over one CTA "Set up my account", a "what lands in your account"
payload grid (AIOStreams · AIOMetadata 74/91 catalogs · Cinemeta patch · subtitles · services · undo), two trust
lines, and the whole policy-demo engine demoted into a collapsed "Tune it first" drawer. `directions-v1.html`
keeps the previous composite (live-policy hero + bento of truth) for comparison. Open either directly in a
browser; no build, no deps. They read nothing from the network except the counter worker (`/api/stats`) and
degrade to a dash with an honest `offline here` badge when unreachable.


## The recommendation, one paragraph

Lead with a **live proof module** (hero): device / resolution / service chips driving a real
stream list that re-sorts and re-cuts with per-row reasons — the engine as the hero image.
Underneath, a **bento of measured facts** (host versions, the pinned upstream contract ref, cut
counts, counts that are actually true for this repo). Steal from the consumer directions: the
device grid and a first-class **Update in place** CTA. Keep the validation readout to one line
("option names verified against AIOStreams e694b6a · 82 preset ids, 0 guessed"). Terminal/⌘K
energy is the *Advanced Builder* route's landing, not the front door. Move "tap the core to
support" to the footer: the hero's focal object should signal competence, not a tip jar.

## Why (competitor research, all user-reported)

| Tool | Their splash | What their users report | Our answer |
|---|---|---|---|
| AIOStreams built-in | host's own config UI | "all it does is create an aiostreams config, which is what aiostreams already does" | device/codec/host knowledge the host page doesn't have |
| QuackStart (Duck Tools) | STEP 1/2 inline form; 3 install paths; formatter image previews | "took a minute … ratings IMDb only; MediaFusion I had to install manually"; their own funnel: 72,095 loaded → 32,214 started (~42%) | steal the 3 paths + previews; win with post-install verification |
| AIO.TVFLIX Builder v3.20 | long single-page form, shared API keys ("Risk of Ban") | "sorting … HD appearing before 4k"; "formatter keep changing … every time I edit"; "installer not accepting the TVDB key — the builder added a space" | 4K-first sort test, persistence tests, key sanitising — as visible badges |
| CrispyFormat | visual formatter builder | "cannot import … missing config field"; "v2 too cluttered" | pinned schema + fixture sweep; strict UI budget |
| Tam-Taro templates | hand-written JSON + guides | the trust benchmark ("just use Tams") | zero-hand-edit re-sync when hosts bump |
| numb3rs / viren guides | written docs | read-everything-and-pray | win on time-to-first-stream, deep-link the guides |

Cross-cutting complaint ranking: 1) silent breakage after install, 2) sort/quality regressions,
3) save/import rejections, 4) clutter, 5) pooled-credential smell, 6) half-installs. The splash's
job is to answer 1–3 in five seconds, because our engineering already does.

## Repo constraints a real implementation must honor

* `configurator/tests/landing-ia.test.mjs` pins the current IA: exactly one `.splash-door`
  (Express), the verbatim step sentence, demoted secondary links, tour selector
  `.splash-doors [data-action="open-express-lane"]`. Update the fixture in the same commit.
* Splash markup lives in `splashHtml()` in `configurator/src/js/app.js`; landing styles in
  `src/styles/04-landing.css`; brand tokens in `02-brand-theme.css`.
* Numbers used in the mock, verified 2026-09-15: 74 named setups (`Templates/`, excl. Legacy/Base) ·
  14 optional extras (this branch, after aa1ccc8) · 8 public hosts · 82 preset ids
  (`src/data/generated/aiostreams-presets.js`, AIOStreams `e694b6a` v2.34.0) · 26 device audio
  profiles · `CONFIGURATOR_VERSION = 3.7` · min AIOStreams 2.32.0. Device caps/audio/AV1/DV in the
  demo mirror `src/data/devices.js`; the pool mirrors the 2026-09-14 live Torrentio probe for
  `tt17490712`. If the demo policy ever ships, it must call the real `src/core/` policies, not its
  own mirror — a splash that lies about the engine is worse than a static hero.

## Roadmap beyond the splash (ordered by pain × head-start ÷ cost)

1. **Post-install verification** — after Deploy, re-read the host config, diff vs generated, report
   missing/extra halves. Kills the "next day nothing loaded" and "MediaFusion missing" classes.
   Nobody in the table does this. All primitives already exist (status probe, schema snapshot).
2. **Sort canary as a badge** — `sort-4k-first` is CI truth; show it.
3. **Key hygiene, visible** — trim/validate/reject-with-reason; "keys stay in your browser".
4. **Formatter previews** — render one real stream row per formatter as a static asset (QuackStart's
   one genuinely better idea).
5. **Extras that survive host reality** — the remaining Health Auto-Drop (feature floor 2.34.0).
6. **Troubleshooting-as-marketing** — link `docs/troubleshooting.mdx` § "One title buffers forever"
   from the RD cell; it's better content than anything the field publishes.

Anti-goals: don't race on "free one-click" (gated P2P/HTTP lanes are deliberate), template count,
or claim bigness. No fake-live cells, no 3D/blob hero (TV browsers; LCP is conversion here).
