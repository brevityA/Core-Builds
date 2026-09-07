# Core-Builds Configurator — Verification & Shipping Record
**File 2 of 2 · Companion to `core-builds-changes.md`** (which carries the state table, the seven fix write-ups, the full sources of all 12 new files, and every modified-file diff). Final tree: `fix-7-regex-predeploy` = `a743ac5` (six audit fixes) + `2b00fa6` (regex preflight) on base `b07efba` — all gates green: unit **538/538** · validate **29/29** · no upstream drift (v2.34.0 @ e694b6a) · build · Playwright **160/160** · packages/core **39/39** · cli **74/74**.

## Part 4 — Verification, as run (final tree `2b00fa6`)

```text
$ npm test
# tests 538
# suites 0
# pass 538
# fail 0
# cancelled 0
# skipped 0

$ npm run validate  (PASS count)
29

$ npm run sync:upstream:check

No schema drift. Generated files are already up to date.

Generated files match the pinned contract.

```

```text
packages/core/ npm test  → # tests 39   # pass 39   # fail 0
cli/           npm test  → # tests 74   # pass 74   # fail 0   (after npm ci — @core-builds/core is a file: dep)

configurator/  npx playwright test → 160 passed (5.1m)  [desktop + mobile projects; 0 flakes]
                                        includes e2e/direct-install-gate.spec.mjs 9/9
configurator/  npm run build → Built standalone: 1031257 bytes
                                 Built web assets: 819969 JS bytes, 173262 CSS bytes
```

**Test-count ledger:** 484 (baseline) → +9 version-honesty +10 install-policy +10 host-routing +5 easynews-library
+5 landing-ia +8 regex-access-policy = **530** after commit 1 → **538** after fix 7. Playwright 148 → 154 (fixes
3/4 spec) → **160** (fix 7). Known flake class #682 (loaded-box) observed once on the six-fix tree; passed on
retry, isolated rerun, and stash baseline; 0 flakes on the final tree.

---

## Part 5 — Shipping

### 5.1 Push (sandbox has no credentials — run from your local clone)

```bash
# with fix7-regex-predeploy.bundle next to your clone:
git fetch ../fix7-regex-predeploy.bundle fix-7-regex-predeploy:refs/tmp/fix7
git push --force origin refs/tmp/fix7:refs/heads/arena/01a07654-core-builds   # updates PR #739 in place
git update-ref -d refs/tmp/fix7

# alternative — two PRs: push pr739-replacement.bundle's a743ac5 to the #739 branch,
# then 2b00fa6 as a stacked fix-7-regex-predeploy branch.
```

### 5.2 PR #739 description (paste-ready)

> **v3.7.0 stamps, AIOStreams-v2.34 host truth, install-gate fixes + regex preflight**
>
> Replaces the previous head (its CI failed the cli gate 8/74 — `cli`/`packages/core` still stamped 3.1.0 and the shared engine unpatched for the library-preset rule — plus 2 CodeQL highs; that diff is archived in the thread).
>
> Two commits, all suites green before push: **538/538** unit · **29/29** validate · **no upstream drift** (v2.34.0 @ e694b6a) · build · **160/160** Playwright (desktop+mobile) · packages/core **39/39** · cli **74/74**.
>
> 1. **Version honesty** — `CONFIGURATOR_VERSION='3.7'` is the single source (badge/package×3/versions.json/changelog/golden stamps agree; guarded by `version-honesty.test.mjs`); default target 2.34.0; compat lanes 2.31.1–2.34.0.
> 2. **EasyNews 400 root cause** — Library preset omitted when no library-capable service is enabled, in app.js **and** `packages/core` (the CLI equivalence suite catches an engine gap). Goldens byte-stable except version stamps + the intended library removal in `easynews-1080p.json`.
> 3. **Direct Install key gate** — names the exact missing key inline before any POST; Export JSON stays keyless. e2e: blocked empty / enabled with key / zero POSTs when blocked.
> 4. **Truthful host picker** — per-host capability+version labels ("ElfHosted — Debrid only — no P2P/HTTP · v2.34.0"); routing matrix blocks P2P→ElfHosted and 2.34-only→2.33.2 hosts at POST, pre-Deploy chip, and `auto`.
> 5. **Express-first landing** — one door; Advanced/Update demoted to text links (same `data-action`s: deep links + tour intact); Genie card removed, route kept (`GET /tools/genies/` 200).
> 6. **Verification** — every behavioral change ships with a test that fails without it (484→538 unit; Playwright +12).
> 7. **Regex-allowlist preflight (addendum)** — explains the "3 / 180 regexes" host bounce before the POST. Root cause reproduced exactly (3 stale inline constants in the pre-#737 generator — #737 fixed them, so a retry today installs — plus the structural synced-URL race). New `src/core/regex-access-policy.js` + `regexGateForHost` in app.js (rides `raceHostFetch`; skips on every unknown — explains a predictable 400, never creates one). No regex/config output changes; goldens untouched.
>
> **Manual checklist (not automatable):** real-key Test Drive → 201; real-cred EasyNews-only Direct Install → 201; Stremio one-click open; WuPlay/Nuvio one-click opens.
> **Filed separately:** CoreBuildsApps icon-pack version-stamp bug (cross-repo follow-up).

### 5.3 Support reply for the "3 / 180 regexes" user (paste-ready)

> That error is the host's regex allowlist, and it's fixed on our side — **retrying the same build (Advanced › Apex › 1080p) now will install**. What happened: your config carries a synced community regex list (177 patterns) plus a few built-in patterns; three of those built-ins were outdated versions that hosts no longer allow, which made the host reject the save ("3 / 180 regexes that are not allowed"). A configurator update shipped the following day re-synced them. Longer term we've also added a pre-install check that names this problem before you hit it, with options (different host / retry later / Export JSON and import manually).

### 5.4 Cross-repo issue — CoreBuildsApps icon pack (file separately)

> **Title:** Version-stamp honesty: badge / package.json / release tag disagree (same class as Core-Builds configurator fix)
> **Body:** The configurator had the same bug (badge said v3.1 while the release tag was v3.7.0 — fixed in Core-Builds PR #739 with a single-source `CONFIGURATOR_VERSION` + `version-honesty` test failing on any disagreement between badge, package.json, versions.json, changelog and golden stamps). Audit the icon pack's version stamps against its latest release tag and wire a single source of truth + a test. Reference implementation: `configurator/src/js/app.js` (`CONFIGURATOR_VERSION`) and `configurator/tests/version-honesty.test.mjs`.

---

## Part 6 — ≤20-line summaries

**Commit 1 — six audit fixes (`a743ac5`):**
1. v3.7 honesty: single-source `CONFIGURATOR_VERSION='3.7'`; package×3/versions.json/changelog/badge/goldens agree; default target 2.34.0; lanes 2.31.1–2.34.0. Guard: `version-honesty.test.mjs`.
2. Library preset root cause: emitted only with a library-capable enabled service — app.js **and** `packages/core` (`install-policy.js`/`library-policy.js` + cross-copy drift alarm). EasyNews-only no longer 400s; debrid/usenet keep Library.
3. Key gate: `missingDirectInstallCredentials()` names the exact missing key inline pre-POST; Export stays keyless. e2e 6/6.
4. Host truth: capability+version labels; matrix blocks P2P→ElfHosted & 2.34-only→2.33.2 at POST/chip/auto; lag warns. `minVersions` override is the sanctioned test hook.
5. Express-first landing: one door; Advanced/Update as secondary links (same actions; deep links+tour work); Genie card gone, route 200.
6. Goldens byte-stable except 3.1→3.7 stamps (15 files) + intended library drop in `easynews-1080p.json`.
Gates: 530/530 · 29/29 · no drift · build · Playwright 154/154 · core 39/39 · cli 74/74.
Not here: CoreBuildsApps icon-pack bug (separate issue). Manual: real-key Test Drive 201; EasyNews-cred 201; Stremio/WuPlay/Nuvio opens.

**Commit 2 — fix-7 regex preflight (`2b00fa6`):**
1. "3 / 180" reproduced exactly: 3 stale inline constants (pre-#737 generator) over the 177-entry synced set → union 180, rejected 3; #737 fixed the constants — retry installs. The synced-`main` vs cached-host-allowlist race remains structural.
2. New `src/core/regex-access-policy.js` mirrors upstream `validateRegexes` (5 top-level arrays, exact-string dedupe; `skip` on every unknown).
3. `regexGateForHost` rides `raceHostFetch`; blocked verdict stops the POST with a plain-language notice; chip advisory. No output/regex changes.
4. Tests: 8 unit (recorded race strings) + 3 e2e via the real `simple-install` delegate. Express lane immune (base config, no synced URL).
Gates: 538/538 · 29/29 · no drift · build · 160/160 · core 39/39 · cli 74/74.

---

## Part 7 — Manual checklist (needs real environment/credentials)

- [ ] Real-key Test Drive: Direct Install → HTTP 201 on a 2.34.0 host (e.g. ForTheWeak) with a real TorBox key
- [ ] EasyNews-only Direct Install with real EasyNews credentials → 201 (the audited 400 path)
- [ ] Stremio one-click open after Full-Stack install
- [ ] WuPlay / Nuvio one-click opens from the Deploy row
- [ ] (fix-7, opportunistic) Confirm the preflight notice on a host whose allowlist lags — not schedulable; covered by e2e stubs

---

## Appendix A — The "3 / 180 regexes" investigation (full record)

**Report:** screenshot 2026-09-05 22:53 (user-local), host 400: *"You are only permitted to use specific regex
patterns, you have 3 / 180 regexes that are not allowed. Please remove them from your config."* Build:
**Advanced › Apex (IQR) › 1080p**.

**Mechanism (from pinned upstream source `packages/core/src/utils/config.ts` @ v2.34.0/e694b6a):** at save,
`validateRegexes()` dedupes the five top-level user regex arrays **plus every pattern resolved from synced
regex URLs**, then exact-string matches against the host allowlist (`settings.regexAccess.patterns`). Stream
expressions are NOT part of this gate. `level: all` skips validation; `trusted`/`none` enforce.

**The numbers, reproduced from the actual generator versions:**

| Generator | synced? | inline unique | union | rejected (ElfHosted, today) |
|---|---|---|---|---|
| pre-`b07efba` (what the user ran 09-05 12:53 UTC) | yes | 79 | **180** | **3** |
| current (`b07efba`+this branch) | yes | 79 | 177 | 0 |

**The 3 rejected patterns** (stale inline constants in the old generator, absent from the community list on
every vintage): `/\b(CtrlHD|W4NK3R|DON)\b/i` and two BluRay-group lookahead patterns. Fixed by #737's
"standalone template regex re-sync" (merged 2026-09-06 04:48 UTC, ~16h after the attempt).

**Secondary mechanism (real, verified, not dominant here):** the synced URL pins Vidhin05 Releases-Regex
`main`; hosts resolve it live at save but validate against cached allowlists. Two patterns changed upstream
2026-09-05 05:58 UTC (`30600174`, `3215706f`); hosts caught up only hours later — any 4K/mixed/regex-scoring
install in that window bounced. Live allowlist sizes observed 2026-09-06: ForTheWeak 298 · Viren 1344 · Kuu
284 · Omni 253 (all `trusted`); ElfHosted 253 (`none`); ATBP (`all`).

**Why the gate exists even though current output is clean:** both failure shapes (list-race; stale-constant
regression) surface as the same cryptic host 400 after the POST. Fix 7 resolves the exact union client-side
(synced list via `raw.githubusercontent.com` — CORS `*` confirmed; host status via the app's existing
`raceHostFetch` lane) and names the problem before the POST. Every unknown (status unfetchable, allowlist not
exposed, list unfetchable) skips — the gate explains a predictable 400, never creates one. Edge not covered:
a host rejecting the synced **URL** itself (upstream `validateUrls` — different error; that allowlist isn't
exposed via status).

## Appendix B — PR #739 post-mortem (why the branch was replaced)

The arena bot's pushed head (`bfbc214`, "…replay coverage") was a parallel implementation, not this verified
tree. CI on 2026-09-06: **3 of 12 checks failing** —

| Check | Root cause (reproduced locally in a worktree) |
|---|---|
| `test` — "Test CLI" | cli suite 8/74: `cli`+`packages/core` stamped **3.1.0** (version-consistency fail) and the shared engine still emitted the Library preset unconditionally (all 7 golden-equivalence fails — the exact gap commit 1 fixes, caught by the same cli gate) |
| `CodeQL` | 2 high alerts — `api.strem.io/` substring URL checks in its new e2e specs |
| `e2e` | failed (environment; moot after replacement) |

Its diff is archived at `/home/user/pr739-parallel-implementation.archive.diff` (4,139 lines; includes a 16th
golden and an `install-readiness` concept worth cherry-picking later). The replacement makes the red legs
green by construction (74/74 cli proven) and removes the CodeQL-flagged files. Note: **PR #733** also touches
configurator — expect a rebase conversation before either merges.

## Appendix C — Caveats, incidents, artifacts

- **Known flake:** #682 loaded-box class (mobile `express-install:148` / `security-sinks` C3) — seen once across many full runs; passed on retry, isolated rerun, and stash baseline. Note by issue number; don't chase.
- **`.splash-tertiary-btn`** reuses the existing `.splash-tertiary` container style (quiet text link); an explicit 3–4-line rule in `07-menu-parity.css` is available on request (CSS left untouched per the no-restyle constraint).
- **cli tests** require `npm ci` first (`@core-builds/core` is a `file:` dependency).
- **Sandbox incident (resolved):** the sandbox rebuilt mid-session and dropped `.git`; recovered losslessly from the exported bundle. All verification numbers in this document are post-recovery, from the final tree.
- **Live snapshot (2026-09-06):** ElfHosted/ForTheWeak/Viren/Kuu/ATBP = AIOStreams 2.34.0; Midnight/Omni/Wizaardd = 2.33.2. Vidhin05 English list @`main` = 177 patterns.
- **Artifacts (`/home/user/`):** `fix7-regex-predeploy.bundle` (both commits — push source of truth) · `pr739-replacement.bundle` (commit 1) · `0001/0002-*.patch` (same as patches) · `core-builds-fixes-report.html` (visual report) · `HANDOFF.md` (compact handoff) · `pr739-parallel-implementation.archive.diff`.
- **In-repo:** `FIXES.md` ships with the PR (§1–§7 + manual checklist).
