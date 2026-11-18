# Audit — Configurator tool + CORS proxy worker (2026-08-21)

Scope: `configurator/src/js/app.js` (install/import/paste/proxy plumbing), `cloudflare-worker/worker.js` (CORS proxy + paste + contact + analytics), `wrangler.toml`, deploy workflow, and the peer research requested (how other AIOStreams tools / Stremio configurators format and host their infra, and what fallback systems the CORS-proxy ecosystem uses).

Method: code review of every fetch/paste/proxy path, live probing of the **deployed** worker and AIOStreams hosts, and research into the Cloudflare storage primitives, public CORS proxies, and paste services.

---

## 1. Verdict

The worker is genuinely well built for an open-relay edge service: host allowlist (the real SSRF control), method/path narrowing, size caps on both request and response, `AbortSignal.timeout`, edge-wide KV rate limiting, `no-store` on sensitive routes, unbiased ID generation, and a 22-test regression suite. The configurator's install pipeline is similarly thoughtful (payload-size guard vs AIOStreams' 100 KB parser limit, direct-vs-proxy race for reads, proxy-only writes to avoid duplicate configs).

The problems are **architectural gaps, not code smells**:

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| F1 | **High** | Custom / self-hosted host lane is broken end-to-end (CSP blocks direct, worker allowlist blocks proxied) | app.js CSP + worker.js `ALLOWED_HOSTS` |
| F2 | **High** | `/paste` → `/t/:id` has a KV eventual-consistency race: the first import click from a distant region can 404 | worker.js KV store |
| F3 | **Medium** | `writeHostFetch` is proxy-only — if the worker is down, Direct Install is dead even when the host itself works | app.js `writeHostFetch` |
| F4 | **Medium** | Every host status probe is a full uncached worker round-trip; a page load fires ~10–20 proxied probes, so the 60/min per-IP proxy rate limit trips after a few page loads | worker.js `NO_STORE` + app.js `selectHealthyHost` |
| F5 | **Medium** | No visibility into *why* 16% of proxied calls error (timeout vs upstream 5xx vs oversize) | worker.js stats |
| F6 | **Low** | Proxy GETs are CORS-open (`*`) including stream URLs that embed the config password (`/proxy/stremio/<uuid>/<epwd>/stream/…`) | worker.js `isPublicRead` |
| F7 | **Low** | paste.rs / dpaste fallbacks are unmonitored third parties with no SLA; the import-link UX depends on them when the worker is down | app.js `uploadJsonForImport` |
| F8 | **Low** | `worker-contact-endpoint.js` is a second, weaker copy of `/contact` (in-memory rate limit, `ACAO: *`, no origin check) that contradicts the consolidated worker | cloudflare-worker/worker-contact-endpoint.js |
| F9 | **Info** | KV-backed counters are best-effort (lost updates under concurrency) and `/api/stats` does 6 KV `list` calls per view | worker.js `increment` |
| F10 | **Info** | Live telemetry shows a sharp visit-count drop Aug 19→21 (741 → 56 → 20/day) — counter under-reporting or traffic shift; needs a look | worker.js `/api/visit` + app.js beacon |

The fixes for F1–F4 are implemented in this pass (see §7). F5–F10 are recommendations with concrete code sketches.

---

## 2. What is solid (keep it)

- **Host allowlist as the SSRF control.** The comment in `worker.js` is right: the WHATWG URL parser collapses `/..` before the handler runs, so the allowlist is the real boundary. `HOST_SCOPES` narrowing for `api.torbox.app` (GET `/v1/api/speedtest` only, `stripAuth`) is exactly the right pattern — and it's regression-tested.
- **Write-path discipline in the configurator.** `writeHostFetch` never races a mutating request, because a direct POST can succeed server-side while CORS hides the response → duplicate config. The comment documents the trade-off correctly.
- **Payload guard.** AIOStreams' Express JSON parser caps at 100 KB (102,400 bytes); `payloadSizeGuard` catches it client-side with a clear message. Verified against upstream.
- **Paste hardening.** JSON-object-only, 512 KB cap, `^[a-z0-9]{6,20}$` IDs from rejection-sampled `crypto.getRandomValues`, 30-day TTL, `no-store` on read (pastes can carry config), 10/min create + 60/min read per-IP limits.
- **Rate limiting done right at the edge.** KV-backed buckets instead of the legacy per-isolate in-memory map, with degrade-to-allow so a missing `RATELIMIT` namespace never 503s.
- **CSP discipline.** `connect-src` enumerates exactly the hosts the app talks to — no `https:` wildcard. (That discipline is also what breaks F1, see below.)
- **Testing posture.** 22 worker tests incl. concurrency (per-request CORS origin), preflight, oversized bodies, auth-drop, and the CoreSpeed scoping; configurator has golden e2e snapshots. The repo treats reliability as a feature.

---

## 3. Live telemetry (deployed worker, fetched 2026-08-21)

```
visits 26,469 · generates 280 · proxy_calls 6,918 · proxy_errors 1,117 (16%)
pastes_created 773 · pastes_viewed 2,182 (~2.8 views/paste)
```

Per-host proxy error share (proxy_errors / proxy_calls):

| Host | calls | errors | err % |
|---|---|---|---|
| elfhosted | 2,545 | 241 | 9.5% |
| fortheweak | 1,384 | 266 | 19.2% |
| midnight | 1,150 | 190 | 16.5% |
| forthewizards.uk | 941 | 146 | 15.5% |
| stremio.ru | 897 | 168 | 18.7% |
| atbphosting | 678 | 54 | 8.0% |

Both the worker and all proxied hosts respond healthy today (`/api/v1/status` returns v2.33.2 through the proxy for elfhosted, fortheweak, forthewizards.uk — verified live). The ~16% error share is upstream (5xx/timeout/oversize), not worker failure — but it is exactly why F3 (fallback to direct) and F5 (error classification) matter: with `raceHostFetch` the direct attempt often wins on hosts that *do* send CORS, and on hosts that don't, a proxied upstream error looks identical to "host down".

`daily:` counters show a sharp drop-off: visits 2026-08-19: 741 → 08-20: 56 → 08-21: 20, generates 10+ → 4 → 1. Either traffic collapsed or the beacon stopped firing (e.g. an ad-blocker pattern change, CSP, or a `sendBeacon` path bug). Worth checking before trusting growth numbers.

---

## 4. Findings in detail

### F1 — Custom / self-hosted host lane is broken end-to-end (High)

The Advanced → Hosts → Custom / Self-hosted option lets a user type their own AIOStreams URL. It cannot work today:

1. **Direct path:** `raceHostFetch(customUrl, …)` and `writeHostFetch(customUrl, …)` fetch the URL directly from the browser, but the page CSP is `connect-src 'self' https://*.elfhosted.com …` — no wildcard, and a user's custom domain isn't in the list. The browser **blocks** the fetch before it leaves.
2. **Proxied path:** `CORS_PROXY` is set, so `raceHostFetch` also fires `${CORS_PROXY}/proxy/api/v1/status?host=<customUrl>` — but the worker's `ALLOWED_HOSTS` is a fixed set of 8 hosts. The worker returns `403 host not allowed`.

Result: `resolveInstallHost('custom')` → `checkHostVersion(customUrl)` → both attempts fail → user sees "…isn't answering / All hosts unreachable". This has likely been silently broken since the CSP was tightened and the worker moved to an allowlist.

**Fix (implemented):** a *scoped custom-host lane* in the worker: an arbitrary `https://` host is accepted only for the AIOStreams config surface —
- `host` = origin → `GET /api/v1/status`, `POST|PATCH /api/v1/user`; `host` = manifest base (`/stremio/<uuid>/<epwd>`) → `GET /stream/<type>/<id>.json` (the "Test Streams" probe),
- https only, no userinfo/port, bounded path depth, tighter per-IP rate limit (20/min), never forwards `Authorization`,
- CF's runtime blocks subrequests to RFC1918/loopback/link-local addresses at the network layer, and Cloudflare Tunnel-based self-hosts present public hostnames anyway — the residual DNS-rebinding surface is the same class as the existing open-relay design, which is rate-limited and path-scoped.

The CSP stays strict: custom-host traffic now goes **through the worker** (already in `connect-src`), so no CSP change is needed.

### F2 — KV eventual consistency: first import click can 404 (High)

`/paste` writes to KV; the AIOStreams host (or the user's browser) reads `/t/:id` moments later, **from a different Cloudflare PoP**. KV is eventually consistent: *"changes may take up to 60 seconds or more to be visible in other global network locations… Negative lookups… are also cached"* — Cloudflare's own docs. So the freshly-pasted template can 404 on the first import attempt ("not found or expired"), especially for hosts far from the user's region. 773 pastes created vs 2,182 viewed shows the flow is used heavily; any silent 404s become "the tool is broken" reports.

**Fix (implemented):** the configurator now **verifies the paste is globally readable before showing the import chips** — retry loop against `/t/:id` with backoff (up to ~5 s) after `/paste` succeeds, and only then returns the URL; if verification never passes it falls through to paste.rs/dpaste as today. This converts a silent race into a deterministic "wait until it's there" (typical propagation is < 2 s).

**Deeper fix (follow-up):** move the paste store to D1 (strong consistency, SQL, TTL column + cron cleanup) or a single Durable Object (`storage.put(..., { expirationTtl })` is supported and gives read-your-writes + auto-expiry). D1 is the better fit here: pastes are write-then-read-once, ~1 KB–100 KB, low volume. KV remains fine for counters/rate limits where staleness is acceptable. Note DO's 128 MB storage cap would bound a KV-style paste store at ~1,300 max-size pastes — another reason D1 wins.

### F3 — `writeHostFetch` has no fallback when the worker is down (Medium)

Writes go proxy-only by design (correct — avoids duplicate configs). But if the worker is unreachable, Direct Install fails outright even when the chosen host itself responds and sends CORS. The safe middle ground: fall back to direct **only on a network-level failure of the proxy request** (never on timeout/abort, because the proxy may still have forwarded the write and a direct retry would duplicate the config). Implemented with exactly that guard.

### F4 — Uncached status probes × 10–20 per page load (Medium)

`selectHealthyHost` races direct + proxied `/api/v1/status` for ~7 stable hosts in parallel, and the express lane, review screen, and health chips re-probe constantly. The worker returns `Cache-Control: no-store` on **all** proxy responses, so every probe is a full worker execution, counted against the 60/min per-IP proxy bucket. ~4–6 page loads per minute per IP can trip 429s, after which the proxied leg of `raceHostFetch` fails and only CORS-able hosts answer — the exact "paste service blocked or timed out" / "All hosts unreachable" complaints.

**Fix (implemented):** `/proxy/api/v1/status` 200s are now colo-cached via the **Cache API** for 30 s (health + version are public data; 30 s staleness is fine for host picking). Important detail: Workers run *in front of* the CDN edge cache, so `Cache-Control: s-maxage` alone caches nothing — the Cache API is the actual mechanism, and the response still advertises `public, max-age=30, s-maxage=30` for any downstream caching. Repeated probes now hit the colo cache before the rate-limit check: no upstream fetch, no rate-limit burn, faster UI. `Vary: Origin` is dropped for public-read responses so the cache key doesn't fragment per origin.

**Follow-up:** batch probing — one `/proxy/status?hosts=a,b,c` call (or a `/hosts/health` endpoint on the worker) instead of N round-trips; and probe once per page load with a 30–60 s in-page TTL.

### F5 — Error-class blind spot (Medium)

`proxy_errors` is a single bucket (+ per-host). 16% aggregate tells you nothing about *why* (upstream 5xx? 15 s timeout? 8 MB oversize? DNS?). Implemented: new totals `proxy_err_timeout`, `proxy_err_network`, `proxy_err_oversize`, `proxy_err_status` (with per-host kept as-is). Add a Grafana/Workers-analytics alert on `proxy_errors/proxy_calls > 20%` and per-host spikes (fortheweak at 19% and stremio.ru at 18.7% are the current outliers).

### F6 — Proxy GET CORS is wider than it needs to be (Low)

`isPublicRead` treats every `/proxy` GET as `ACAO: *`. The only true cross-origin readers are AIOStreams hosts fetching `/t/:id`. Proxy GETs include `/proxy/stremio/<uuid>/<epwd>/stream/…` — the encrypted password is in the URL — and are only ever fetched by the configurator/tools origins (brevitya.github.io + localhost, all already in `ALLOWED_ORIGINS`). Implemented: `ACAO: *` only for `/t/` and `/proxy/api/v1/status`; all other proxy GETs get strict origin echo.

### F7 — Third-party paste fallbacks (Low)

paste.rs has no SLA and has been flaky historically; dpaste is fine but also unmonitored. Both are browser-CORS-compatible, which rules out 0x0.st (curl-oriented, no ACAO) and rentry (CSRF token dance) and GitHub Gist (needs auth). Recommendation: keep them as last-resort, but (a) with F2's verify-before-promise they only run when the worker is genuinely down, and (b) consider a **GitHub raw mirror** for the canonical templates — that's what the AIOStreams ecosystem actually standardizes on (see §5).

### F8 — `worker-contact-endpoint.js` contradicts the consolidated worker (Low)

It's a reference copy of `/contact` with the *old* weaknesses (in-memory rate limit that resets on cold start, `ACAO: *`, no origin CSRF check). Anybody wiring it in re-introduces what the consolidated worker fixed. Recommend deleting it (same treatment the README already prescribes for the legacy `counter.js`).

### F9 — KV counters / stats cost (Info)

`increment()` is get→put with retry on transient failures; concurrent increments still lose updates. Fine for marketing numbers (state that in the README). `/api/stats` runs 6 KV `list` calls per request — with the 60 s CDN cache it's already bounded; keep the cache.

### F10 — Visit counter drop (Info)

`navigator.sendBeacon('/api/visit')` fires on page load; generates beacon includes service/device/resolution. The Aug 19→21 collapse (741→56→20) is worth a quick investigation: check whether the beacon path is still reached in the current bundle (e.g. `?fresh`, error-logger interplay, or an ad-blocker pattern on `workers.dev`). The `/api/visit` rate limit (30/min/IP) is also a candidate if a single user/office IP spikes — 429s drop silently in `sendBeacon` callers.

---

## 5. Peer research — how other tools do it

### AIOStreams template ecosystem (the closest peers)

- **Tam-Taro (SEL-Filtering-and-Sorting)** — the reference SEL pack — hosts its templates as **static JSON on GitHub raw** (`raw.githubusercontent.com/Tam-Taro/…/Tamtaro-All-Templates-for-AIOStreams.json`) plus a short `https://git.tamtaro.de/complete.json` alias, and distributes per-instance deep links that open `AIOStreams → Import → URL`. No paste service, no worker, no expiry: GitHub raw + Fastly CDN is the entire "infrastructure", and instance hosts are told to add the URL to their `TEMPLATE_URLS` env so the instance itself can fetch it. That's the *format* the ecosystem trusts: a stable URL to a JSON file, CDN-cached, forever.
- **Numb3rs guide** — same pattern: a raw GitHub URL pasted into the import box.
- Core Builds differs legitimately: it generates **per-user custom configs**, so a static URL won't do — the *dynamic* paste is a real requirement. But the lesson applies to the canonical/static templates: put them on GitHub raw (already done for Templates/) and keep the dynamic paste only for user-specific configs.

### CORS proxy landscape (what "better systems" look like)

- The consensus across every comparison source (CorsProxy.io's own matrix, Grokipedia's proxy list, Nordic APIs' roundup): **free public proxies (allorigins, corsproxy.io, cors.sh, whateverorigin) are dev-only** — no SLA, undocumented rate limits, some always return 200 and never mirror status codes (allorigins), most are GET-only. **Self-hosting your own edge proxy is the recommended production pattern**, which is exactly what Core Builds already does with its Cloudflare Worker. Do not switch to a public proxy.
- What the *good* managed ones add that Core Builds can steal cheaply:
  - **Edge caching of public responses** (corsproxy.io advertises exactly this; it's what makes their "sub-50 ms" claim work) → implemented as F4.
  - **Status-code mirroring** (already correct here — `upstreamRes.status` is passed through; allorigins fails this).
  - **Header override / credential scoping** (Corsfix) → already partially present via `HOST_SCOPES`/`stripAuth`.
  - **Health-check + fallback across two deployments** → follow-up: deploy the same worker to a second account/region and have the configurator try `PROXY_URLS[0]`, then `PROXY_URLS[1]` on network failure (same safe pattern as F3).

### Storage primitives (Cloudflare)

- KV: globally cached reads, **eventually consistent (≤60 s)**, no read-your-writes, counters impossible atomically. Right for: rate-limit buckets, analytics, feature flags. Wrong for: paste store (F2).
- D1: strong consistency, SQL, cheap. Right for: paste store with TTL column + scheduled cleanup.
- Durable Objects: strong consistency + coordination, but 128 MB storage cap per object and request routing to a single location. Overkill here.
- The Cloudflare architecture docs are explicit: *"If you need another request to see the write… consider whether D1 or Durable Objects better fits your consistency requirements."* — that's F2 verbatim.

### Paste services (browser-feasible fallbacks, ranked)

1. **Own worker `/paste`** — the only one with an SLA (yours), keep primary. With F2's verification it's now dependable.
2. **paste.rs** — `POST /` → plain-text URL, `ACAO: *`, no auth, ~1 MB cap. No SLA, historically flaky. Keep as fallback #1.
3. **dpaste.com `/api/v2/`** — form-encoded, `ACAO: *`, expiry up to 365 d. Keep as fallback #2.
4. 0x0.st — no CORS headers for browsers → unusable from the configurator (curl-only). GitHub Gist — needs auth → no. rentry — CSRF token → no.

---

## 6. Target architecture (UX unchanged, infra rebuilt)

```
Browser (GitHub Pages, strict CSP)
  │
  ├─ raceHostFetch (reads)      → direct (CORS-able hosts)  ⊕  worker /proxy (allowlisted lane)
  ├─ writeHostFetch (writes)    → worker /proxy  → direct fallback ONLY on proxy network-fail
  ├─ uploadJsonForImport        → worker /paste  → VERIFY /t/:id readable (retry ~5s)
  │                                → paste.rs → dpaste (last resort)
  └─ analytics                  → worker /api/visit|generate (sendBeacon, best-effort)

Worker (Cloudflare, single consolidated script)
  ├─ /proxy/*        → ALLOWED_HOSTS lane + SCOPED custom-host lane (https, AIOStreams paths only)
  │                     status probes colo-cached (Cache API) 30s · error-class counters
  ├─ /paste, /t/:id  → KV today → D1 (follow-up) for read-your-writes + TTL cleanup
  ├─ /contact        → origin-allowlisted, KV rate-limited, Discord webhook
  └─ /api/*          → KV counters (best-effort), /api/stats CDN-cached 60s
```

Follow-ups (owner action, not code in this pass):
1. Deploy the worker (`wrangler deploy` or push to `cloudflare-worker/**` with secrets set).
2. Migrate paste store KV → D1 (schema `pastes(id TEXT PK, body TEXT, created_at INTEGER)`; `DELETE WHERE created_at < now()-30d` via cron; keep KV for counters).
3. Second worker deployment on another CF account as a hot standby; configurator `PROXY_URLS = [primary, standby]` with the F3 safe-fallback pattern between them.
4. Optional: `/hosts/health` batch endpoint on the worker to collapse N probes into 1.
5. Delete `worker-contact-endpoint.js` and the legacy `configurator/worker/counter.js`.
6. Investigate the Aug 19→21 visit-counter collapse (F10) and add a per-error-class dashboard.

---

## 7. Changes implemented in this pass

### cloudflare-worker/worker.js
- **F4** — `GET /proxy/api/v1/status` 200 responses are colo-cached via the Cache API for 30 s (checked before the rate-limit gate, so cache hits skip upstream and the rate-limit bucket); the response also carries `Cache-Control: public, max-age=30, s-maxage=30`. Other proxy responses keep `no-store`.
- **F6** — public-read CORS (`ACAO: *`, no `Vary: Origin`) narrowed to `/t/` reads and `/proxy/api/v1/status`; every other proxy request gets the strict origin echo.
- **F1** — scoped custom-host lane: `host` not in `ALLOWED_HOSTS` is accepted only when https + no userinfo/port + bounded path depth, and the combination is exactly one of: `host` = origin → `GET /api/v1/status`, `POST|PATCH /api/v1/user`; or `host` = manifest base (`/stremio/<uuid>/<epwd>`) → `GET /stream/<type>/<id>.json` (the manifest modal's "Test Streams" probe). Tighter per-IP rate limit (20/min), never forwards Authorization. The CSP stays strict — custom-host traffic now routes through the worker.
- **F5** — error classification counters: `proxy_err_timeout`, `proxy_err_network`, `proxy_err_oversize`, `proxy_err_status` (per-host breakdown untouched, so `/api/stats` shape is stable).

### configurator/src/js/app.js
- **F2** — `uploadJsonForImport` verifies the worker paste is globally readable (GET `/t/:id` retry with backoff, ~5 s budget) before returning the URL; falls through to paste.rs/dpaste on verification failure.
- **F3** — `writeHostFetch` falls back to the direct host fetch **only** on a network-level failure of the proxy request; timeouts/aborts are rethrown so a write the proxy may have already forwarded is never duplicated.

### Tests
- `cloudflare-worker/worker.test.js` extended to 36 tests: custom-lane allow/deny matrix (status probe, config write, Test-Streams manifest-base probe, http:// rejection, path/port/userinfo rejection, deep-path rejection, tight rate limit), status-probe Cache API hit/miss/populate + `no-store` preserved elsewhere, strict-echo for non-status proxy GETs, no-Authorization-forward on the custom lane.
- All 22 pre-existing tests still pass; 14 new tests added.
- `configurator`: `npm ci && npm run build` succeeds and regenerates the published standalone `configurator/index.html` (verified it contains the new paste-verification code); all 349 configurator unit tests pass.

### Not changed (deliberately)
- The strict CSP (custom hosts now route through the worker, so no `connect-src` loosening was needed).
- The golden e2e template snapshots (generation logic untouched).
- The 100 KB payload guard, write-no-race semantics, and all rate-limit defaults.
