# 04 — Configurator refinement research and audit (2026-09-03)

**Knowledge cutoff.** Training data predates this work. Everything below was
re-verified against the live tree and live pages on **2026-09-03**. Sources are
linked; unverifiable items are marked `[UNVERIFIED]`.

**Scope.** This report is deliberately *narrow*. Reports `01-research.md`,
`02-audit.md` and `03-changes.md` already cover the correctness layer (sorting,
upstream pinning, host capability) from the previous engagement. This pass looks
only at **user-error and setup-friction refinements** in the shipping UI, per the
task brief's Phase 2. It does not revisit template-generation logic.

**Baseline, measured before any change:**

```
$ cd configurator && npm test
# tests 484
# pass 484
# fail 0
```

Live tool fetched: <https://brevitya.github.io/Core-Builds/configurator/index.html>
(reports v3.0 in the footer; the brief says v2.99 — the deployed build has moved on).

**Playwright note.** `npx playwright install chromium` fails in this sandbox
(`Download failure, code=1`, and `--with-deps` cannot resolve `fonts-liberation`
et al. on this base image). E2E specs are therefore **written but not executed
here**; they run in CI via `.github/workflows/configurator-e2e.yml`. Marked
`[UNVERIFIED]` where that matters.

---

## 1. Audit findings

Severity: **P0** broken · **P1** friction · **P2** polish.
Line numbers against `configurator/src/js/app.js` at base `81c802b`.

### CFG-P0-01 · Pre-install validation duplicates every warning, in a `confirm()`
**Where:** `src/js/app.js:6430-6462` (`preflightCheck`) and
`src/js/app.js:5892-5918` (`templateHealthCheck`), joined at `:6448`
(`health.forEach(w => { if (!warns.includes(w)) warns.push(w); })`), rendered at
`:7113-7118`.

The de-dupe is `Array.includes` on the **exact string**. The two functions check
the *same conditions* with *differently worded strings*, so nothing de-dupes:

| Condition | `preflightCheck` wording | `templateHealthCheck` wording |
| --- | --- | --- |
| no debrid key | `No API key entered — streams will not load without one` | `No debrid API key — streams won't load` |
| Fire Stick HD + 4K | `Fire Stick HD cannot play 4K — consider 1080p resolution` | `4K resolution on Fire Stick HD — device cannot play 2160p` |
| lossless on limited device | `Lossless audio selected but this device profile does not reliably support passthrough` | `Lossless audio selected for a profile that does not reliably support passthrough` |
| EasyNews creds | two bullets (`no username`, `no password`) | one bullet (`username or password is missing`) |

**Repro (pure, no browser):** TorBox · Fire Stick HD · 4K · lossless · EasyNews
selected · no credentials. The user sees a native `confirm()` containing:

```
⚠ Config check:

• No API key entered — streams will not load without one
• Fire Stick HD cannot play 4K — consider 1080p resolution
• EasyNews selected but no username entered
• EasyNews selected but no password entered
• Lossless audio selected but this device profile does not reliably support passthrough
• EasyNews selected but username or password is missing — Usenet streams won't load
• Lossless audio selected for a profile that does not reliably support passthrough
• 4K resolution on Fire Stick HD — device cannot play 2160p
• No debrid API key — streams won't load

Continue anyway?
```

**Nine bullets for four distinct problems.** Every problem is stated twice in
different words, which reads as nine unrelated failures. And it is a native
`confirm()`, so it is unstyled, unscrollable on small screens, has no per-item
"fix this" affordance, and its only options are OK / Cancel.

This is P0 because it is the last gate before an irreversible action (writing a
config to a third-party host) and it actively misinforms about *how much* is wrong.

**Minimal fix:** give every check a stable **id** and a severity, de-dupe on the
id rather than the prose, and render the result in the app's own modal with
blocking vs. advisory separated. Shipped — `src/core/preflight-policy.js`.

### CFG-P0-02 · Export path has no validation at all
**Where:** `src/js/app.js:4230-4250` (`generate()`), wired at `:2890`.

`generate()` checks exactly one thing — `if (!S.service)` — then downloads.
Direct install runs the nine-bullet `preflightCheck`; **Export Template JSON runs
nothing.** A user can export a template with no API key, an impossible
device/resolution pair, and missing EasyNews credentials, get a clean download,
import it into AIOStreams, and only discover the problem when no streams appear.

The two paths produce the *same config object* (`buildFinal().config`) and deserve
the same gate. The size guard (`payloadSizeGuard`, `:99`) is likewise only applied
on the install path (`:7145`), even though issue **#107**
("Template exceeds AIOStreams' 100 KB request limit and can't be imported",
<https://github.com/brevityA/Core-Builds/issues/107>) is precisely the failure
mode of an *exported* file being imported by hand.

**Minimal fix:** run the same id-based preflight before export, including the
payload-size check, in the same modal. Shipped.

### CFG-P1-03 · Resolution feedback is real, but only on one of three surfaces
**Where:** `src/js/app.js:635-655` (`resolutionLockNote`, `refreshResolutionLockNote`).

The note is genuinely good — it explains that 1080p on Stable/Balanced *excludes*
2160p/1440p outright, which is the exact confusion behind
[r/StremioAddons "Setting up AIOStreams"](https://www.reddit.com/r/StremioAddons/comments/1pd39b1/setting_up_aiostreams/)
and the "my filters removed everything" class of report. But `refreshResolutionLockNote`
inserts it `afterend` of `.svc-list` only (`:651`), so it is absent from the
review step where the user actually commits.

**Minimal fix:** surface the same resolution consequence as a first-class,
id-tagged preflight advisory so it appears at both decision points. Shipped
(`resolution-4k-excluded` advisory).

### CFG-P1-04 · The 100 KB limit is checked at the wrong moment
**Where:** `:99-108`, called only at `:7145` — *after* the password prompt, *after*
`buildFinal()`, immediately before the network write.

Issue #107 is closed, but the guard placement means a user picks a template, fills
credentials, enters a password, and only then learns the payload is too large. The
information exists at build time.

**Minimal fix:** include size in preflight (warn at the `near` threshold, block at
`over`) so it surfaces before the password step and on export. Shipped.

### CFG-P2-05 · `preflightCheck` swallows its own failure into the warning list
**Where:** `:6460` — `catch(e) { warns.push('Template preflight could not complete: '+e.message); }`.

If `buildFinal()` throws, the user sees an internal error message rendered as if
it were a configuration warning, alongside real warnings, with "Continue anyway?".
Continuing past a *thrown template build* is not a decision a user can make.

**Minimal fix:** classify that as a distinct **blocking** severity, not an
advisory. Shipped (`severity: 'blocker'`).

---

## 2. User needs

| # | Need | Type | Source |
| --- | --- | --- | --- |
| 1 | Stop presenting the same problem multiple times | inferred from CFG-P0-01 | audit |
| 2 | Validate before export, not just before install | **explicitly requested** (task brief Phase 2) | brief; audit CFG-P0-02 |
| 3 | Clearer device/service/resolution feedback | **explicitly requested** (brief) | brief; audit CFG-P1-03 |
| 4 | Better error/empty/loading states | **explicitly requested** (brief) | brief |
| 5 | Don't hit the 100 KB wall late | inferred, but grounded in a real closed issue | [#107](https://github.com/brevityA/Core-Builds/issues/107) |
| 6 | Filters silently removing all results is the #1 community confusion | **explicitly requested** (community) | see below |

**Need 6 is the best-sourced item in this report.** It recurs across independent
r/StremioAddons threads:

* "I had set the required language of English which was limiting the results.
  Check your filters" — [r/StremioAddons](https://www.reddit.com/r/StremioAddons/comments/1qj9gkr/so_i_tried_aiostreams/)
* "Config issue. Filters are hard to get your head around. … If you have used an
  INCLUDE filter anywhere, then that content will be included, regardless… So if
  you're struggling to get filters working start by using EXCLUDEs only"
  — same thread
* "The resolution of my configuration is set to a minimum of 1080p… When every
  available link is filtered out, the addon redirects you to the GitHub page"
  — [r/StremioAddons](https://www.reddit.com/r/StremioAddons/comments/1ps88f0/as_promised_10minute_video_tutorial_for_my_2/)
* "fix your filters or add more addons to get the results" — the AIOStreams
  maintainer, [r/StremioAddons](https://www.reddit.com/r/StremioAddons/comments/1qj9gkr/so_i_tried_aiostreams/)

The configurator's `resolutionLockNote` is the right answer to exactly this and is
under-deployed (CFG-P1-03). That is the highest-confidence refinement in this pass.

**In-app feedback categories** (visible, `src/js/contact-widget.js:202`):
Bug / Feature Request / Question / Feedback. Free-text, delivered to Discord; no
submissions are stored in the repo, so it yields no feature signal here.
r/CoreBuilds: `[UNVERIFIED]` — reddit.com returns **HTTP 403** to this sandbox on
`/r/CoreBuilds/new.json`, `/r/CoreBuilds.rss` and `old.reddit.com` (all tried).
Discord: `[UNVERIFIED]` — not machine-readable.

---

## 3. Competitor survey

Extends the matrix in `01-research.md` §1.1; only *validation and error-prevention*
behaviour is compared here.

| Tool | Relevant behaviour | Source |
| --- | --- | --- |
| **AIOStreams `/configure`** (the baseline) | Validates server-side on save and returns structured errors; users see them as raw strings, e.g. `The value for option 'Sources' in preset 'TorBox Search' is invalid: Error: Option sources must be at least 1 items, got 0` and `You are only permitted to use specific regex patterns, you have 15/35 regexes that are not allowed`. Accurate, but post-hoc and unfriendly. Core Builds' advantage is catching these *before* the round-trip. | [r/StremioAddons](https://www.reddit.com/r/StremioAddons/comments/1mxikg4/make_stremio_super_friendly_simple_with_the/) |
| **AIO.TVFLIX Builder v3.20** | Export-only, no direct install, hardcodes one host — so it has no install-time validation at all. A reviewer's stated gap is customisation, not validation: "it doesn't let you do some changes like how many results, sorting like mine". | <https://aio.tvflix.co.uk/> · [r/StremioAddons](https://www.reddit.com/r/StremioAddons/comments/1qithnc/update_the_ultimate_stremio_aio_build_now_with_a/) |
| **Tamtaro SEL Filtering & Sorting** | Ships an *onboarding wizard inside AIOStreams* and documents the cached/uncached sort trap. Its strength is teaching the consequence of a choice at the moment of choosing — the same idea as CFG-P1-03. | <https://github.com/Tam-Taro/SEL-Filtering-and-Sorting> |
| **Canva** (generic UX reference) | `Ctrl+/` surfaces the full shortcut sheet; autosave is continuous. Cited only for the principle that a tool should make its own affordances discoverable. | <https://keyshortcuts.net/blog/canva-shortcuts> |

**Takeaway:** no competitor validates *before* producing the artefact. Core Builds
already half-does (install path only). Closing that to cover export is a genuine
differentiator, not catch-up.

---

## 4. Roadmap — top 5, ranked by impact ÷ effort

| # | Item | Impact | Effort | Traces to | Shipped |
| --- | --- | --- | --- | --- | --- |
| 1 | **Id-based preflight policy** — one finding per real problem, stable ids, severities | Removes 5 of 9 phantom bullets at the highest-stakes moment | S | CFG-P0-01 | ✅ |
| 2 | **Validate before export**, same policy, incl. payload size | Closes the untested path; #107's failure mode | S | CFG-P0-02, CFG-P1-04, [#107](https://github.com/brevityA/Core-Builds/issues/107) | ✅ |
| 3 | **In-app preflight modal** replacing native `confirm()` — blockers vs advisories, scrollable, styled, keyboard-dismissable | Native `confirm()` is unreadable on mobile with 9 bullets | S | CFG-P0-01 | ✅ |
| 4 | **Resolution-exclusion advisory at the commit point** | Best-sourced community confusion in this report | S | CFG-P1-03, §2 need 6 | ✅ |
| 5 | **Blocking severity for internal build failure** | "Continue anyway?" past a thrown build is not a real choice | XS | CFG-P2-05 | ✅ |

---

## 5. Explicitly cut, with reasons

* **Any change to template generation.** The brief forbids it and
  `02-audit.md` already did that work. The new policy module is *read-only* over
  `buildFinal().config`; a fixture test proves generated JSON is byte-identical.
* **Rewriting `templateHealthCheck` / `preflightCheck` call sites wholesale.**
  Both are kept and now *delegate*, so the existing review-panel health strip
  (`:1810`) and its tests keep working unchanged.
* **Replacing the other two `confirm()` calls** (`:2865` reset, `:2879` restore).
  Both are single-sentence, reversible, and not on the export/install path.
* **Localisation.** AIO.TVFLIX has 12 languages; nothing in this repo's sources
  asks for it, and it is a large surface for zero measured demand.
* **Touching the host-capability gate.** Landed and tested in PR #721.

---

## 6. `[USER TO SUPPLY]` / `[UNVERIFIED]`

* r/CoreBuilds threads — 403 from this sandbox.
* Discord `#feedback` content — not machine-readable.
* Playwright e2e execution — browser download blocked in this sandbox; specs are
  authored and run in CI.
* Whether PR #732 (Banner Studio v3.1 + version bumps to 3.1.0) is intended to
  land before or after this branch; both touch `versions.json` and
  `src/data/changelog.js`. This branch deliberately does **not** bump versions to
  avoid a guaranteed conflict.
