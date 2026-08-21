# VERIFY-HANDOFF — Independent verification of the Stage-0 configurator/worker changes

**Hand this document to an independent Claude (QA reviewer).** Your job: execute the test
protocol below, review the diff against the checklist, and return a **GO / NO-GO / CONDITIONAL**
verdict on whether this work is solid enough to update the deployed tool (merge PR #707 →
worker auto-deploy). Do not assume the author's tests are correct — re-run and re-derive.

---

## 1. Context (read first)

- **Repo:** `brevityA/Core-Builds`, working branch `arena/01a022e4-core-builds`.
- **PR to judge:** https://github.com/brevityA/Core-Builds/pull/707 (base `main`).
- **Commits under review:** `1313699` (audit fixes), `e124413` (Phase-3 review fixes), `c3c5d69` (Stage 0 / F10 beacon fix + observability).
- **What the change does** (claimed):
  1. `cloudflare-worker/worker.js` — scoped **custom/self-hosted host lane** (fixes a broken "Custom / Self-hosted" install path), **status-probe caching** via the Cache API (30 s), **CORS narrowing** (`ACAO:*` only for `/t/` + `/proxy/api/v1/status`), **error-class counters**, and **F10 visibility counters** (`visits_rate_limited`, `visits_write_err`).
  2. `configurator/src/js/app.js` — **paste read-verification** before showing import chips (KV eventual-consistency race), **write fallback to direct on network-fail/429 only**, and a **resilient analytics beacon** (`beaconPost`).
  3. `cloudflare-worker/smoke.mjs` — post-deploy smoke script (15 checks).
- **Docs:** `AUDIT-CONFIGURATOR-INFRA-2026-08-21.md`, `PLAN-FULL-REBUILD-2026-08-21.md` (Stage 0 section).
- **"Update the tool" =** merge #707 → GitHub Actions deploys the worker (`cloudflare-worker/**` path); configurator Pages deploys separately. UX is unchanged by design.

---

## 2. Environment setup

```bash
cd <repo-root>
git fetch origin && git checkout arena/01a022e4-core-builds
cd configurator && npm ci && cd ..        # ~5 packages, no vulnerabilities expected
```

**Environment caveats (verified in the author's sandbox — plan around them):**
- The sandbox blocks `curl` egress to `workers.dev`/most hosts (returns `000`). A **browser-based fetch tool** or a machine with real network is required for live checks (§4-G). Local tests in §4-A..D need no network.
- Playwright browsers may not be installed locally; `npm run test:e2e` locally needs `npx playwright install`. **CI e2e is authoritative** — it already passed on PR #707 (see §4-E).
- GitHub repo **secrets are admin-only** (bot token → `403`). You likely cannot read `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`; note their presence as an ops caveat, not a code blocker.

---

## 3. Expected baseline (author's last clean run — re-derive, don't trust)

| Check | Expected |
|---|---|
| `node --test cloudflare-worker/worker.test.js` | 40 tests, 0 fail |
| `cd configurator && node --test tests/*.test.mjs` | 353 tests, 0 fail |
| `npm run build` (in configurator) | `Built standalone: 989455 bytes` (approx) |
| `npm run validate` | `PASS …` (multi-provider quick install, e2e golden hook, …) |
| `node cloudflare-worker/smoke.mjs --base=<local stub>` | `15/15 checks passed`, exit 0 |
| PR #707 CI | pytest, test×2, gate, e2e, CodeQL, socket — all pass |

---

## 4. Test protocol (top to bottom; record results as you go)

### A. Worker unit tests
```bash
node --test cloudflare-worker/worker.test.js
```
Read the test file. Confirm the tests actually exercise what they claim (no vacuous assertions):
- custom-host lane: accept https origin status/user, accept manifest-base stream probe; **refuse** `http://`, IP literals (`127.0.0.1`, `10.x`, `192.168.x`, `[::1]`), **IPv4-mapped IPv6 `[::ffff:127.0.0.1]`**, userinfo/port, deep paths, 3-segment `/stremio/<uuid>`, non-AIOStreams paths, and enforce the 20/min `proxy_custom` bucket.
- status-probe Cache API: hit serves cached body without upstream/rate-limit touch and increments `proxy_cache_hits`; miss stores a 200 with `s-maxage=30`; non-status paths never stored.
- CORS: `/t/` and `/proxy/api/v1/status` get `ACAO:*`; stream probes get strict echo (not `*`); OPTIONS mirrors.
- writes: no `Authorization` forwarded on the custom lane; `api.torbox.app` scoping intact (GET `/v1/api/speedtest` only, key dropped).

### B. Configurator unit tests + build + validate
```bash
cd configurator && node --test tests/*.test.mjs && npm run build && npm run validate
```
New test files to scrutinize: `tests/beacon-resilience.test.mjs`, the added test in `tests/host-selection.test.mjs` (writeHostFetch fallback semantics).

### C. Standalone bundle spot-checks (the shipped artifact)
The build regenerates `configurator/index.html` (minified). Verify the new behavior is actually in the shipped bundle:
```bash
grep -o 'beaconPost' configurator/index.html | head -1                 # resilient beacon
grep -o 'keepalive:!0' configurator/index.html | head -1              # keepalive fallback
grep -o '429?j' configurator/index.html | head -1                     # writeHostFetch 429 fallback
grep -o 'core-builds-cors-proxy.tlorenzato26.workers.dev' configurator/index.html | head -1  # CSP + const
```
Also confirm the CSP in the built file still contains `connect-src … https://core-builds-cors-proxy.tlorenzato26.workers.dev https://paste.rs https://dpaste.com …` (no loosening to `https:`).

### D. Smoke script (logic validation)
The author validated against a local stub. Re-derive the stub yourself (`/tmp/worker-stub.mjs` in the author's sandbox; rewrite it from scratch if you prefer) covering: `/api/stats` with the new keys, per-host status + `Cache-Control: public, max-age=30`, custom-lane accept/refuse matrix, `/paste` → `/t/:id` roundtrip. Run:
```bash
node cloudflare-worker/smoke.mjs --base=http://127.0.0.1:<stub-port>
```
Expect `15/15`. **Check the smoke script for blind spots** (e.g., does it verify the 429-fallback, CORS headers, or error-class counters? If not, note it).

### E. CI status on PR #707
```bash
gh pr checks 707
```
Require: pytest, both `test` jobs, `gate`, `e2e` (3m-ish), CodeQL, socket — **all pass**. Any red = NO-GO unless you can attribute it to pre-existing infra unrelated to this diff (say so explicitly).

### F. Targeted security re-verification (code-level, do NOT skip)
Read the diff (`git diff 3f2a8c0..c3c5d69 -- cloudflare-worker/worker.js configurator/src/js/app.js`) and confirm each invariant:

1. **Custom lane** — `customHostScope()`: https-only; no userinfo/port; hostname not `localhost`/`0.0.0.0`/`::1`/`127.*`; **no IP literals incl. IPv4-mapped IPv6**; path is exactly `/` (→ GET `/api/v1/status`, POST/PATCH `/api/v1/user`) or exactly `/stremio/<uuid>/<epwd>` (→ GET `/stream/<type>/<id>.json`); rate bucket `proxy_custom` at 20/min; `stripAuth: true` (Authorization never forwarded). Confirm a **DNS-rebinding** note is honest: the runtime blocks private-IP subrequests, so the residual surface is public-hostname rebinding only.
2. **writeHostFetch()** — proxy first; on thrown error: **`AbortError` is rethrown** (never duplicate), other network errors fall back to direct; **`res.status === 429` falls back to direct** (write was never forwarded — provably safe). Confirm there is NO fallback on timeout.
3. **verifyPasteReadable()** — bounded retries (4, ~5.5 s worst case), only runs after a successful worker paste, and on failure **falls through to paste.rs then dpaste**. Confirm the comment honestly states same-colo-only verification (KV cross-colo race remains; D1 is the planned durable fix).
4. **Status-probe cache** — only `GET /proxy/api/v1/status` 200s are cached, via `caches.default` (Cache API; `s-maxage` alone would NOT cache on Workers — workers sit in front of the edge cache); cache hit happens **before** the rate-limit check; failures are never cached; all other proxy responses keep `Cache-Control: no-store`; `/t/` reads keep `no-store`.
5. **CORS narrowing** — `isPublicRead` = GET on `/t/*` or exactly `/proxy/api/v1/status`; anything else (incl. `/proxy/stremio/...` stream probes whose URL embeds the config password) gets the strict origin echo; `Vary: Origin` dropped only for public-read.
6. **Beacon** — `beaconPost()`: `navigator.onLine` guard; sendBeacon first; keepalive-fetch fallback; never throws; **no bare `navigator.sendBeacon(` outside the helper**; usage beacon still gated on `S.telemetryOk`.
7. **Counter honesty** — `/api/stats` keys include `proxy_cache_hits`, `visits_rate_limited`, `visits_write_err`, `proxy_err_timeout/network/oversize/status`; rate-limited visits increment `visits_rate_limited` (never silent).
8. **Credential hygiene** — no API keys/tokens/passwords in any test, fixture, or doc; paste body validation unchanged (JSON object only, 512 KB cap, 30-day TTL, `^[a-z0-9]{6,20}$` IDs).

### G. Live behavior (only if you have real network egress or a browser-based fetch tool)
From the sandbox, `fetch_page`/a browser tool can reach the **currently deployed** worker (which does NOT yet have these changes — the PR is unmerged). You can still sanity-check current behavior and note deltas:
- `GET https://core-builds-cors-proxy.tlorenzato26.workers.dev/api/stats` — record current counters (baseline before deploy).
- `GET .../proxy/api/v1/status?host=https%3A%2F%2Faiostreams.elfhosted.com` — expect 200 + version.
- `POST .../paste` with a tiny JSON object → expect `{url}`; then GET the url (roundtrip).
After the PR is merged, re-run **smoke.mjs against production** (`node cloudflare-worker/smoke.mjs`, no `--base`).

---

## 5. Code-review checklist (things a reviewer should specifically poke at)

- Are there any **unhandled promise rejections** in `beaconPost` / `verifyPasteReadable` / `statusProbeCachePut` paths that could throw in production?
- Does the **rate-limit double-burn** regression test for cache hits actually pass (cache hit must NOT touch the rate-limit KV)?
- Is the **30 s cache TTL** sane for host picking (health/version are public; 30 s staleness acceptable)? Any risk a dead host is masked by a stale 200? (Failures are not cached — confirm.)
- Does `customHostScope` accept anything a browser could be tricked into sending that maps to a **non-AIOStreams** upstream? (e.g., host with a path prefix, `@` userinfo, control chars, port 443 explicit — confirm explicit `:443` is refused or benign.)
- Is the **`host=` param stripping** (`replace(/(^|&)host=[^&]*/g, '')`) correct for doubled/encoded params?
- Does the app's `verifyPasteReadable` use the right HTTP method/headers (simple GET, no preflight) so it never gets blocked by CORS itself?
- Are **timeouts** everywhere they should be (`fetchWithTimeout` on all app-side network calls; `AbortSignal.timeout` on worker upstream fetch)? Any unbounded await?
- Anything that could **regress the golden template e2e** (the standalone build must be byte-stable for unchanged logic)?

---

## 6. Decision framework

### GO (safe to update the tool)
- §4-A..E all pass with the expected results, **and** §4-F invariants 1–8 all hold on your own reading, **and** §5 items have no **P0/P1** (security/correctness/data-loss) findings.

### NO-GO (do not merge/deploy; list the blocking finding)
Any of:
- Any unit/e2e/CI failure that isn't provably pre-existing and unrelated.
- Custom lane accepts `http://`, an IP literal (incl. IPv4-mapped), userinfo/port, or a non-AIOStreams path.
- `writeHostFetch` falls back on **timeout/AbortError** (duplicate-config risk) or does not fall back on 429.
- `ACAO:*` leaks to stream probes or any endpoint other than `/t/` + status probes.
- Cache stores non-status or non-200 responses, or any paste/config path loses `no-store`.
- Any credential appears in tests, fixtures, docs, or response bodies.
- Beacon code can throw synchronously into the UI or leaks a bare `sendBeacon` call site.

### CONDITIONAL (GO with noted caveats, your call)
- **P2/P3** findings (style, naming, docs, edge cases with no security/correctness impact) — document and decide.
- **Ops caveats** (not code): cannot verify repo secrets (`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`) — merge is fine but deployment may be skipped by the workflow (it fails safe with a warning); post-merge production smoke must then be run manually.
- Cannot run live production checks from the sandbox (network-restricted) — record what was verified locally + via CI + via browser-fetch, and what remains to be verified post-deploy.

---

## 7. Verdict template (fill this in and return it)

```markdown
## Verification verdict — Stage 0 / PR #707
Date / reviewer: 
Environment: (sandbox network? CI? local stub? live?)

### Results table
| Check | Expected | Actual | Notes |
|---|---|---|---|
| worker tests (40) | pass | | |
| configurator tests (353) | pass | | |
| build + validate | pass | | |
| smoke vs stub (15/15) | pass | | |
| PR CI (incl. e2e) | pass | | |
| custom-lane security matrix | pass | | |
| CORS narrowing | pass | | |
| writeHostFetch 429/network/abort | pass | | |
| paste verification bounds | pass | | |
| beacon resilience | pass | | |

### Findings (P0–P3)
- ...

### Verdict
**GO / NO-GO / CONDITIONAL**
Rationale (2–4 sentences): ...
Caveats that must be actioned before/after deploy: ...
```

---

## 8. After a GO verdict (what "update the tool" means)

1. Merge PR #707 to `main` → `deploy-worker.yml` deploys the worker (needs the two CF secrets; else it skips safely — deploy manually via `npx wrangler login && npx wrangler deploy` in `cloudflare-worker/`).
2. Run `node cloudflare-worker/smoke.mjs` against production → expect 15/15.
3. `curl https://core-builds-cors-proxy.tlorenzato26.workers.dev/api/stats` → new keys present (`proxy_cache_hits`, `visits_rate_limited`, `visits_write_err`, `proxy_err_*`).
4. Spot-check the configurator at https://brevitya.github.io/Core-Builds/configurator/ after the Pages deploy — splash stats load, import-link flow still works.
5. Then Stage 1 (paste store → D1) can proceed per `PLAN-FULL-REBUILD-2026-08-21.md`.
