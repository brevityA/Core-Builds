# Phase 1 — Full Rebuild Plan: Configurator + Infrastructure (2026-08-21)

Scope (user-confirmed): **Full** — infrastructure, V3 configurator rollout, template-generation pipeline, UX preservation. Deploys via **GitHub Actions** (secrets assumed set; I prepare everything + exact release steps). Paste store decision **deferred to me** → **D1 migration** (recommended below with the KV alternative). Execution: **staged**, approve-per-stage.

Non-negotiable invariants (from `PART-6-9-IMPLEMENTATION.md`, still binding):
1. Existing golden JSON files stay byte-identical except approved volatile metadata.
2. No new network/DOM/`window`/`localStorage`/`navigator` access in `src/core/`.
3. Core modules never import `app.js`; the UI uses the extracted generator (no duplicate path).
4. Credentials never appear in diagnostics or fixtures.
5. `npm test`, `npm run validate`, `npm run build`, `npm run test:e2e`, root `pytest -q` must pass at every stage gate.
6. Intentional golden changes require explicit `UPDATE_GOLDEN=1` + explanation.
7. No `configurator/index.html` changes without a successful source build.
8. **UX is preserved** (original constraint) — every stage ships through the same screens/users.

---

## Stage map (approve per stage; each has a hard exit gate)

| Stage | Name | Risk | Deploy | Gate (exit criteria) |
|---|---|---|---|---|
| 0 | Ship & observe | Med | worker → prod | Worker fixes live; F10 root-caused; error-class dashboard readable |
| 1 | Paste store → D1 | Med | worker + migration | Paste/import flow proven on D1 with KV fallback path; rollback = flip flag |
| 2 | Proxy health batching + standby | Low–Med | worker + configurator | `/hosts/health` live; probe count per page load ≤ 1; standby doc'd (stretch) |
| 3 | Generator extraction completion (Parts 6–9) | **High** | configurator build | Goldens byte-identical; core pure; e2e green |
| 4 | V3 candidate verification & rollout | **High** | configurator route | Selector contract + import matrix pass; canary OK; **cutover decision gate** |
| 5 | UX preservation & polish pass | Med | configurator build | Parity matrix: every legacy flow exists with same UX in new route |

Cross-cutting (any stage, small PRs): canonical template mirror on GitHub raw; delete legacy `worker-contact-endpoint.js` + `configurator/worker/counter.js`; README updates.

---

## Stage 0 — Ship & observe (deploy the audit fixes)

**Why first:** the audit fixes (custom-host lane, paste verification, probe caching, write fallback) are already code-complete with 36 worker tests — the product is currently missing them because they're not deployed. Everything later builds on a stable, observable base.

**Deliverables**
- [ ] Merge `cloudflare-worker/**` to `main` → Actions deploys (verify `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` present; if not, run `wrangler login && wrangler deploy` manually once).
- [ ] Post-deploy smoke (curl / probe script): `/api/stats` returns, `/proxy/api/v1/status` per host returns + `Cache-Control: public, max-age=30`, `/paste` roundtrip works, custom-host 403/200 matrix (from the test suite) behaves live.
- [ ] F10 investigation: visit-counter collapse (741 → 56 → 20/day Aug 19–21). Check `sendBeacon` path in the published bundle, ad-blocker patterns, `/api/visit` 429s (30/min/IP), and `?fresh`/error-logger interplay. Fix root cause, then add a beacon-`navigator.onLine` guard if that's the cause.
- [ ] Observability: add a "worker status" panel/README pointer to `/api/stats`; document the new error-class counters (`proxy_err_timeout/network/oversize/status`).

**Acceptance:** smoke script green; F10 root cause documented; metrics page shows the new counters.
**Rollback:** revert the worker commit on `main` → Actions redeploys previous file (single-file worker, trivial).

---

## Stage 1 — Paste store: KV → D1 (recommended) + verify-before-promise retained

**Recommendation (my call, per your deferral): migrate to D1.** Rationale:
- The shipped client-side verification (audit F2 fix) only proves **same-colo** readability. KV's cross-colo eventual consistency (up to 60 s, negative lookups cached) means an AIOStreams host far from the user can still 404 the first import. That is the single most user-visible failure mode in the import flow ("not found or expired" → "tool is broken" reports).
- D1 gives **read-your-writes** (the write and the read resolve against the same source) at this volume (~30–90 pastes/day, ≤100 KB each) for effectively zero cost.
- Durable Objects were considered: strong consistency too, but a 128 MB storage cap per object bounds a max-size paste store at ~1,300 entries and routes all reads to one region — D1 is the better fit.

**Alternative (if you prefer zero infra churn):** keep KV + verification, accept the residual cross-colo race, and document it. Cost: occasional 404s that the retry loop on the import side (AIOStreams) may or may not mask. I do not recommend this for a "full rebuild".

**Deliverables**
- [ ] `wrangler d1 create core-builds-pastes`; add binding + `migrations_dir` to `wrangler.toml` (CI needs a `wrangler d1 migrations apply` step before deploy).
- [ ] Schema: `pastes(id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at INTEGER NOT NULL)`; index on `created_at`.
- [ ] Worker `/paste`: insert; `/t/:id`: select; keep ID validation/rate limits/TTL logic identical.
- [ ] Cleanup: `wrangler cron` (scheduled handler) `DELETE WHERE created_at < unixepoch()-30d` (D1 has no per-row TTL).
- [ ] **Cutover safety:** during a one-week dual period, write to both KV and D1, read D1-first → KV-fallback; flag `PASTE_STORE=d1` in wrangler vars; rollback = set `PASTE_STORE=kv`.
- [ ] Keep the app-side `verifyPasteReadable` — it now also covers D1-first-read health and stays as defense-in-depth.
- [ ] Tests: worker paste/read against a D1 mock; migration script tested locally with `wrangler d1 migrations apply --local`.

**Acceptance:** paste→import works with D1; KV fallback path verified by flipping the flag; 30-day purge proven (fixture with old `created_at`).
**Rollback:** flip `PASTE_STORE=kv`; redeploy.

---

## Stage 2 — Proxy health batching + standby (stretch)

**Why:** audit F4 measured ~10–20 proxied status probes per page load; the Stage-0 cache fix absorbs repeats, but N parallel probes still cost N upstream fetches on first load per colo.

**Deliverables**
- [ ] Worker `GET /proxy/status?hosts=a,b,c` (or `/hosts/health`) → batched status JSON, same cache treatment, same custom-lane rules per host.
- [ ] Configurator: `selectHealthyHost`/`probeHostDetail`/`probeExpressHost` call the batch endpoint once per page load; 30–60 s in-page probe TTL.
- [ ] Standby worker (stretch, needs your second CF account): same source, second `wrangler.toml`, `PROXY_URLS = [primary, standby]` in app.js with the F3-style network-fail fallback between them. Documented; not a blocker.
- [ ] e2e: link-integrity + a new host-picking spec asserting ≤1 probe round-trip.

**Acceptance:** probe traffic per page load ≤ 1 batch call; e2e green.
**Rollback:** keep old probe path behind a flag (`HOSTS_BATCH=0`).

---

## Stage 3 — Generator extraction completion (Parts 6–9)

**Why:** the app.js comment marks the current state: *"policy composition is now routed through the pure facade; legacy assembly remains the injected adapter until Part 8's full config assembly migration is complete."* The product's core logic still partially lives in browser-bound `app.js` — the single biggest source of template drift risk and the thing that makes V3 rollout (Stage 4) risky.

**Deliverables** (each a small PR, per `PART-6-9-IMPLEMENTATION.md` contract)
- [ ] Finish Part 8: migrate the remaining assembly steps in `build()`/`buildFinal()` into `src/core/` (assemble → applyOutputProfile → metadata), keeping `generateTemplate` as the single facade the UI calls.
- [ ] Part 9: e2e + UI integration — golden-configs spec already exists; extend to cover every route (express, advanced, update wizard, nuvio, wuplay).
- [ ] Enforce invariants with a lint/test gate: no `window|document|fetch|localStorage` tokens in `src/core/` (source-pattern test, repo convention).
- [ ] `UPDATE_GOLDEN=1` only for approved volatile metadata; every other diff must be zero.

**Acceptance:** goldens byte-identical; all 349 unit tests + e2e green; `grep`-gate for browser globals in core passes.
**Risk control:** this stage changes NO generated output by definition — the golden gate is the tripwire.

---

## Stage 4 — V3 candidate verification & rollout (decision-gated)

**Context:** `configurator/src/rebuild/` is a deliberate parallel, network-free candidate (`REBUILD_VERSION 0.1.0`) verified only against AIOStreams **2.31.1**; 2.32.0 is "review" status (Newznab config changed, `torbox-search` preset removed). Its runtime gates (`reliability/README.md`) require pinned upstream checkouts (`AIOSTREAMS_V231_ROOT`, `AIOSTREAMS_V232_ROOT`) and are credential-free.

**Deliverables**
- [ ] Gate harness: documented, scripted setup of pinned upstream checkouts + `npm run test:upstream-selector` + `npm run test:upstream-v232-nab` + `npm run validate:import-matrix` (these are currently manual; make them CI-runnable with cached checkouts).
- [ ] v2.32.0 verification: run the selector contract + Newznab migration gate; if green, flip the capability manifest entry to `verified` (small, reviewable diff).
- [ ] Canary: publish `/rebuild/` route (already built into `dist/web/rebuild/`) behind a `?v3=1` query or a menu entry; collect feedback; NO traffic default.
- [ ] **Cutover decision gate (your call):** opt-in route first (recommended default), then phased replacement only when: import matrix complete, canary feedback collected, feature-parity matrix (below) satisfied, and you approve. Full replacement is NOT assumed by this plan.
- [ ] Feature-parity matrix: every legacy capability mapped to V3 or explicitly dropped-with-reason (V3 intentionally drops synced SEL URLs, Groups, Direct Install, import-URL upload; these must each get a UX-visible story: "use the legacy route" or "not supported, here's why").

**Acceptance:** gates green in CI; canary live; parity matrix reviewed by you at the cutover gate.
**Rollback:** V3 stays a separate route — reverting is deleting a link, never touching the legacy route.

---

## Stage 5 — UX preservation & polish pass

**Why:** the original constraint is *keep the UX*. After Stages 3–4 the same screens must feel identical; this stage audits that claim.

**Deliverables**
- [ ] Walkthrough parity: splash doors, express lane, advanced wizard, review/install, update wizard, backup timeline, troubleshoot modal — screenshots before/after (Playwright `toHaveScreenshot` at both routes).
- [ ] Error-copy pass: replace "Paste service blocked or timed out" class messages with actionable, stage-aware copy (worker down vs host down vs rate limit — the new error-class counters feed this).
- [ ] Fallback UX: import-link expiry language, credential re-entry reminders, offline export — already partially present; verify on the new route.

**Acceptance:** screenshot parity passes; no user-facing copy regression.

---

## Release mechanics (all stages)

- Worker/configurator changes flow as small PRs to `main`; Actions deploys worker on `cloudflare-worker/**` push; configurator deploys via the existing Pages workflow (`deploy-configurator.yml`).
- Every stage has a **rollback** (listed above) — most are flag flips or single-file reverts.
- All tests (`npm test`, `validate`, `build`, `test:e2e`, `pytest`) are the per-stage gate; CI already runs them (`configurator-ci.yml`, `supporting-js-ci.yml`).

---

# Phase 2 — Risk register (most → least product risk), mitigations baked in above

**R1 — Template output drift during generator extraction (Stage 3).** *Why riskiest:* the template IS the product; a silent byte change breaks every install and is hard to detect. *Mitigation:* goldens byte-identical is a hard CI gate (fails the build), `UPDATE_GOLDEN=1` requires explicit approval + explanation, browser-global grep-gate keeps core pure, and every extraction PR is diff-reviewed against goldens. Zero-output-change is the definition of done.

**R2 — Paste/import flow regression during D1 migration (Stage 1).** *Why:* the import-link flow is the most-used deployment path (773 pastes / ~2,200 views live). *Mitigation:* dual-write KV+D1 with flag-based cutover, D1-first read with KV fallback, verify-before-promise retained client-side, worker tests with D1 mock, rollback = one flag flip. Never a big-bang swap.

**R3 — V3 replacement strips features users rely on (Stage 4).** *Why:* V3 deliberately drops synced SEL URLs, Groups, Direct Install, and import-URL upload — exactly the power features the current configurator sells. *Mitigation:* the plan **does not assume replacement**; it ships V3 as opt-in/canary with a feature-parity matrix and a cutover decision gate that is yours. Dropped features get explicit UX stories, not silent absence.

**R4 — Worker deploy regression (custom-host lane, caching, CORS narrowing).** *Why:* affects every install attempt and the tools pages the moment it ships. *Mitigation:* 36 worker tests are the CI gate before deploy, post-deploy smoke script, error-class counters added in Stage 0 for fast detection, single-file worker makes rollback a revert.

**R5 — Telemetry blindness (F10) hides regressions.** *Why:* the visit counter collapse means current growth/health signals are unreliable. *Mitigation:* root-cause in Stage 0, add beacon health guard, keep `/api/stats` CDN-cached; new error classes make proxy health legible.

**R6 — Deploy pipeline stalls (secrets/migrations in CI).** *Why:* Actions-only deploy means D1 migrations must run in CI before the worker deploys. *Mitigation:* Stage 1 adds the `wrangler d1 migrations apply` CI step + local migration test; Stage 0 verifies secrets; documented manual fallback.

**R7 — Batch health endpoint (Stage 2) introduces a new proxy surface.** *Why:* new endpoint = new abuse surface. *Mitigation:* same allowlist/custom-lane rules per host, same caching, flag-gated rollout, covered by worker tests.

**R8 — Canonical template mirror churn.** *Why:* lowest risk; static files. *Mitigation:* only publish from release artifacts, keep the dynamic paste for user-specific configs (ecosystem standard per research).
