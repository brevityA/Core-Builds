# Infra audit — Core Builds Cloudflare Worker (2026-09-03)

Scope: `cloudflare-worker/worker.js` @ `81c802b` (693 lines), `worker-contact-endpoint.js`,
`smoke.mjs`, `worker.test.js` (42 tests), `wrangler.toml`, `.github/workflows/deploy-worker.yml`,
and every worker caller in `configurator/src/js/app.js`, `configurator/src/js/contact-widget.js`,
`tools/{badges,preflight,speedtest}/index.html`, `tools/genies/**/*.html`.

Method: line-by-line review of the worker, grep of all client callers to establish the HTTP
contract that deployed clients depend on, and **live probing of the deployed worker**
(`core-builds-cors-proxy.tlorenzato26.workers.dev`, served from colo SEA for this sandbox) on
2026-09-03. Every claim marked *verified live* was reproduced against production; anything
that could not be reproduced is marked **[UNVERIFIED]**.

Knowledge cutoff note: my training data ends well before today's date; every Cloudflare
platform limit below was re-read from the current docs on 2026-09-03 and is cited inline.
Plan (free vs paid) was not supplied by the owner — items whose behaviour or availability
differs by plan are marked **[PLAN-DEPENDENT]**.

---

## 0. Verdict in one paragraph (pre-change baseline — 2026-09-03)

> **Note:** Sections 0–5 describe the state of the worker as audited on 2026-09-03
> at commit `81c802b` (42 tests). Section 6a documents the fixes applied in this PR
> (75 tests at commit `2ef485c`+). Read Sections 0–5 as the baseline that motivated
> the hardening; Section 6a is the current remediation status.

The worker's *design* is sound (host allowlist + path scoping as the SSRF control, size caps,
timeouts, no-store on sensitive routes, narrowed CORS). Its *operational reality* diverges from
its documentation in three important ways, all verified live: (1) **no rate limit is enforced
in production at all** — the `RATELIMIT` KV binding is commented out and every limiter
degrades to allow, and even if bound the KV limiter fails open under burst because of KV's
1-write/second/key rule; (2) **the proxy follows HTTP redirects**, so any custom (or
compromised allowlisted) host can bounce the worker to an arbitrary public URL with the
caller's method/body and the response is returned — on the status-probe path with
`Access-Control-Allow-Origin: *`; (3) **counters materially under-count** (same 1-write/s/key
rule, verified: 12 requests → +4 counted) and two counters are write-only or misclassified,
so the dashboards the previous audit added are not yet trustworthy. A live Discord webhook
URL is committed in `worker-contact-endpoint.js` (verified still valid). None of these
require a breaking change to fix.

---

## 1. Route map and trust boundaries

### 1.1 Routes (as deployed — `worker.js` line refs are pre-change)

| Route | Purpose | Caller (surface) | Upstream | Data in → out | Secrets crossing | Cache | Rate limit (config → **live**) | Failure mode today |
|---|---|---|---|---|---|---|---|---|
| `OPTIONS *` (L350) | CORS preflight | browsers | — | — | — | browser 86400s | none | — |
| `GET /api/stats` (L356) | usage counters | configurator splash (`app.js:2508`), smoke | KV `STATS` (13 gets + 6 `list` + ~200 gets) | → JSON totals/breakdowns | none, **but** `by_host` publishes self-hosted hostnames users typed into the custom lane (verified live: `aio.deuspi.xyz`, `aiostreams-2cf65e15…nodstack.com`) | `Cache-Control: public,max-age=60` — **not honoured**: Workers run before the cache, no Cache API used → every hit is ~220 KV ops | 20/min → **unlimited** (25 burst = 25×200, verified) | KV read quota burn; 6 unbounded `list`s (`daily:` grows +5 keys/day forever → will hit the 1000 ops/invocation cap) |
| `POST /api/visit` (L388) | visit beacon | `beaconPost()` `app.js:2521` (sendBeacon → keepalive fetch) | KV `STATS` | → `{visits}` | none | no-store | 30/min → **unlimited** | KV same-key write cap → lost increments (see O1) |
| `POST /api/generate` (L413) | generate beacon | `app.js:4241` | KV `STATS` | `{v,service,device,resolution}` → `{generates}` | none | — | 30/min → **unlimited** | unvalidated strings become KV keys (`gen:service:<anything>`) — key pollution + `/api/stats` noise |
| `POST /contact` (L440) | contact form → Discord | `contact-widget.js:8` (origin-gated) | `DISCORD_WEBHOOK_URL` secret | name/email/msg → `{ok}` | webhook URL (server-side secret, correct) | — | 5/h → **unlimited** (Origin check still applies) | `request.json()` is unbounded (Cloudflare caps request bodies at 100 MB on Free/Pro [1]) |
| `POST /paste` (L497) | store template / badge pack | `uploadJsonForImport()` `app.js:7548`; badge builder posts to **`/upload`** (`tools/badges/index.html:1029`) which 404s — dead first hop, falls through to paste.rs | KV `TEMPLATES` (30 d TTL) | ≤512 KB JSON (shape-checked) → `{url}` | body is a **credential-stripped** template (`import-template.js` `sanitizeTemplateForRemoteImport`) — but the shape check accepts *any* `{config:{}}` so a raw AIOStreams config with credentials pasted by hand *would* be stored | no-store | 10/min → **unlimited** | KV write → eventually consistent; see R1 |
| `GET /t/:id` (L524) | read paste | AIOStreams hosts (server-side, `?template=URL`), `verifyPasteReadable()` `app.js:7532`, users | KV `TEMPLATES` | → stored JSON, `ACAO:*` | may contain config (never creds if produced by configurator) | no-store | 60/min → **unlimited** (65 burst all 404, verified) | 404 race after write (R1) |
| `GET /proxy/api/v1/status?host=` (L587) | host health/version | `raceHostFetch()` ×N hosts per page load, preflight tool, smoke | allowlisted host **or any https host** (custom lane) | → upstream JSON, `ACAO:*` | none | Cache API 30 s, checked **before** rate limit (verified working on workers.dev: hits counted, ~80 ms vs 240–700 ms direct) | 60/min (custom 20/min) → **unlimited** | thundering herd on miss; **follows redirects** (S2) |
| `POST/PATCH /proxy/api/v1/user[/:uuid]?host=` (L541–691) | direct install (create/update config) | `writeHostFetch()` `app.js:7511,7653` (proxy first, direct fallback on network error/429) | allowlisted or custom host | body `{config, password}` ≤2 MB → upstream JSON, strict-origin CORS | **config password in request body** (transits worker memory only; never logged/stored) | no-store | as above | 15 s timeout → 502; body buffered fully |
| `GET /proxy/stremio/<uuid>/<epwd>/stream/...` and `/manifest.json` | "Test streams" probe, preflight doctor | `app.js:5160,5513`, `tools/preflight:434,489` | allowlisted host (any path) / custom host (manifest-base form, `stream/*/*.json` only) | → upstream JSON, strict-origin CORS | **encrypted config password in the URL path** | no-store | as above | hostname (only) enters stats; full URL never logged |
| `GET /proxy/v1/api/speedtest?host=https://api.torbox.app` | CoreSpeed | `tools/speedtest:925` | api.torbox.app (HOST_SCOPES: GET, one path, stripAuth) | → JSON | user's TorBox key is **dropped** if sent (tested) | no-store | as above | — |
| `/proxy/app/version`, `/devices/register`, `/sync/**` `?host=https://api.wuplay.app` | WuPlay genie | `tools/genies/*catalogs.html` | api.wuplay.app, **Authorization forwarded** | device token in header | bearer token relayed to the intended host only… but see S3: today *every* non-scoped allowlisted host receives a caller's `Authorization` | no-store | as above | — |
| anything else | — | — | — | 404 JSON | — | — | — | — |

Backward-compat contract that deployed clients depend on (must not change):
`{url}` from `/paste`; `/t/<id>` with `^[a-z0-9]{6,20}$` ids and raw stored body;
`/proxy<path>?host=<origin-or-manifest-base>` with upstream status mirrored, `res.ok`
semantics, JSON error bodies; 429 from the proxy means "not forwarded" (`writeHostFetch`
falls back to direct on 429 — so **a 429 must never be emitted after the upstream call**);
`visits`/`generates` numeric fields in `/api/stats`; `ACAO:*` on `/t/` and the status probe.

### 1.2 Trust-boundary diagram

```text
 ┌──────────────────────────── untrusted ────────────────────────────┐
 │ Browser @ brevitya.github.io / localhost (strict CSP)             │
 │   also: ANY web origin (routes with ACAO:*), curl, bots           │
 └───┬───────────────┬──────────────────┬─────────────────┬──────────┘
     │ (a)           │ (b)              │ (c)             │ (d)
     │ status probe  │ install write    │ paste body      │ beacons/contact
     │ ?host=USER-   │ {config,         │ (creds stripped │ free-text fields
     │  SUPPLIED URL │  PASSWORD}       │  client-side)   │ (PII: name/email)
     ▼               ▼                  ▼                 ▼
 ╔══════════════════════════ Cloudflare Worker (trusted code, untrusted inputs) ═══════════╗
 ║  cf-connecting-ip (set by CF edge, not spoofable)  ──► rate-limit key                    ║
 ║  host param ──► ALLOWED_HOSTS exact match │ customHostScope() (https, no userinfo/port,  ║
 ║                 no IP literal) ──► fetch()  ◄── (S2) redirect:'follow' = scope escape    ║
 ║  Authorization header ──► forwarded to every non-scoped allowlisted host (S3)           ║
 ║  hostname ──► STATS key  proxy:<hostname>  (custom hostnames leak to /api/stats, S8)    ║
 ║  Cache API key = full request URL (status probe only — no credential in that URL ✔)    ║
 ║  console.*: none today (nothing logged) ✔                                               ║
 ╚═╤═══════════════╤══════════════════════╤══════════════════╤════════════════════════════╝
   │ (1)           │ (2)                  │ (3)              │ (4)
   ▼               ▼                      ▼                  ▼
 AIOStreams hosts  api.wuplay.app         KV TEMPLATES       KV STATS / RATELIMIT(unbound)
 (8 allowlisted    api.torbox.app         30-day pastes,     counters (lossy), rl buckets
  + ANY https      (scoped)               eventually         (never written in prod)
  custom host)                            consistent
   │ redirect 3xx ──► worker follows to ANY public URL (S2)  ┆
   ▼                                                          ▼
 Discord webhook (secret env; ALSO hard-coded in worker-contact-endpoint.js, S1)
 External paste fallbacks (client → paste.rs, dpaste — worker not involved; unmonitored)
```

Credential crossings: (b) password in body → upstream only; (URL) encrypted password in
`/proxy/stremio/<uuid>/<epwd>/…` → upstream only, hostname-only label in stats, strict
CORS; (header) `Authorization` → intended for wuplay, currently reaches any allowlisted
non-scoped host (S3). No credential reaches logs, cache keys, stats values, or error bodies
(verified by reading every `respond()` / `bgIncrement*()` call site).

---

## 2. Security findings

Severity: P0 = exploitable now with material impact; P1 = exploitable/likely with bounded
impact or a documented control that is not actually in force; P2 = hardening / narrowing.

| # | Sev | Where | Finding | Attack scenario | Minimal fix |
|---|---|---|---|---|---|
| S1 | **P1** | `worker-contact-endpoint.js:120` | A **live** Discord webhook URL is committed in the repo (`GET` returns 200 today — verified). The file is also the stale, weaker copy of `/contact` flagged as F8 in the 2026-08-21 audit and is still present. | Anyone can `POST` arbitrary embeds/spam to the maintainer's Discord channel, or delete the webhook (`DELETE` needs no auth on webhook URLs). | Delete the file (done); **rotate the webhook in Discord** and set the new value only via `wrangler secret put DISCORD_WEBHOOK_URL` (owner action — it remains in git history). |
| S2 | **P1** | `worker.js:640-651` (`new Request(upstreamUrl, …)` — default `redirect: 'follow'`) | Upstream 3xx are followed. `customHostScope()` validates only the *first* hop. Verified live: `?host=https://www.github.com` → 301 → github.com followed → 410 returned. | Attacker hosts `https://evil.example/api/v1/status` → `302 https://victim.example/any/path?…`. Worker fetches the redirect target with the caller's method/body (POST `/api/v1/user` body included), returns the response — on the status route with `ACAO:*`, i.e. a **cross-origin read of any public URL** through a first-party host the configurator's CSP trusts. Same applies if an allowlisted domain lapses. Cloudflare blocks private/loopback targets at the network layer (verified: `10.0.0.1.nip.io` → CF error 1002), so this is an *open relay to the public internet*, not an internal-network SSRF. | `redirect: 'manual'`; treat any 3xx as an upstream error (`502 upstream redirect refused`), count `proxy_err_redirect`. All 10 allowlisted host/paths answer 200 without redirecting (verified), so no client regresses. |
| S3 | **P1** | `worker.js:634-639` | `Authorization` is forwarded to **every** allowlisted host that is not in `HOST_SCOPES` (8 AIOStreams hosts + wuplay), although only the WuPlay lane needs it. Comment says "WuPlay device tokens" but the code is host-agnostic. | Not a credential *theft* (the caller supplies the header) but it widens the worker into an authenticated relay for 9 hosts and any future allowlist addition inherits it silently. | Explicit `AUTH_FORWARD_HOSTS = {api.wuplay.app}`; drop the header for everyone else. No configurator/tool sends `Authorization` to AIOStreams hosts (grepped). |
| S4 | **P1** | `wrangler.toml:17-19`, `worker.js:36-49` | **Rate limiting is documented but not enforced in production.** `RATELIMIT` is commented out ⇒ `rateAllow` returns `true` for every route. Verified live: 65×`GET /t/…` and 25×`GET /api/stats` in <10 s, zero 429s. Even when bound, the KV limiter does get→put on one key per IP per minute; KV allows **1 write/second to the same key** [2] ⇒ under exactly the burst it should stop, `put` throws and the `catch` returns *allow*. | Amplification against the allowlisted hosts (worker IPs, not attacker's), anonymous paste storage at line rate, KV read-quota exhaustion via `/api/stats` (Free: 100k reads/day [2]), `/contact` spam. | Layered limiter: Workers **Rate Limiting binding** [3] (per-colo, in-memory counters, no extra cost, `period` 10 or 60 s) → KV (only if bound; now with the write-cap handled) → always an in-isolate token bucket as a floor. Bind it in `wrangler.toml` (done). Header spoofing: `cf-connecting-ip` is set by the Cloudflare edge on every request to the Worker [4]; `X-Forwarded-For` is not used — *this vector does not apply*. |
| S5 | P2 | `worker.js:157-182` | Custom-lane host encodings: WHATWG parsing normalises `2130706433`, `0x7f000001`, `0177.0.0.1`, `127.1` → `127.0.0.1` (caught by the dotted regex), brackets/`::ffff:` caught, `user@host` and ports caught (all re-tested). Residual: dotless names (`https://intranet/`), `*.localhost`, `*.internal`, `*.local`, `*.arpa`. Cloudflare's resolver/egress blocks these in practice **[UNVERIFIED for every TLD]**. | DNS-rebinding style names (`10.0.0.1.nip.io`) — verified blocked by the runtime (error 1002). | Reject dotless hostnames and the reserved suffixes above (defense in depth, zero client impact — AIOStreams self-hosts are public FQDNs behind tunnels/proxies). |
| S6 | P2 | `worker.js:413-437` | `/api/generate` turns unvalidated `service/device/resolution` strings into KV keys and publishes them in `/api/stats` (`by_service`, …). | Key pollution (unbounded key count, 512 B key limit → put throws → 4 wasted retries), garbage/offensive labels in a public JSON, and a `list` cost multiplier for S4. Configurator only formats `visits`/`generates` with `Number()` (safe from XSS). | Validate against `^[a-z0-9][a-z0-9_-]{0,31}$`, drop otherwise. |
| S7 | P2 | `worker.js:440-495` | `/contact` reads `request.json()` with no size cap (other routes use `readCapped`). | 100 MB body parse on Free CPU budget of 10 ms [1] → 1102 errors (self-DoS of that isolate). | `readCapped(request, 16 KB)`. |
| S8 | P2 (privacy) | `worker.js:647, 665, 669` | Custom-lane hostnames (users' private self-hosted instances) are written to `proxy:<hostname>` and published by `/api/stats`. Verified live: 4 non-allowlisted hostnames visible publicly. | Enumerates users' personal AIOStreams servers; unbounded key growth from attacker-supplied hosts. | Label every custom host as `custom` in stats; keep per-hostname state (circuit breaker) in memory only. |
| S9 | P2 | `worker.js:242-245` | Security headers: `nosniff` + `Referrer-Policy` only. | Low: responses are JSON; a browser navigation to `/t/<id>` renders JSON text. | Add `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, HSTS. |
| S10 | P2 | `worker.js:226-240` | Paste shape: `{config:{…}}` accepts any object under `config`, so a hand-pasted raw AIOStreams config containing service API keys would be stored for 30 days at a public URL. The configurator strips credentials before upload (`import-template.js`), so this needs a user or third-party tool to do it. | Accidental credential publication. | Out of scope to deep-scan values (would reject legitimate templates whose option names collide); documented. Not changed. |
| — | n/a | — | **Request smuggling / header injection**: the worker constructs the upstream `Request` from a fixed header set plus the caller's `Content-Type` and `Authorization`; the Fetch `Headers` API rejects CR/LF and the runtime speaks HTTP/1.1–2 to origins itself. Does not apply. | | |
| — | n/a | — | **Replay of install/write requests**: the worker adds no state or auth; a replay against the worker is exactly a replay against the host (AIOStreams has no idempotency key). The only proxy-side mitigation is the rate limit (S4). Not a worker defect. | | |
| — | n/a | — | **Paste enumeration**: ids are 10 chars from a 36-symbol alphabet (~3.6×10¹⁵) from `crypto.getRandomValues` with rejection sampling; with S4 fixed, brute force is infeasible. Content is always served as `application/json` + `nosniff` (no stored-XSS path). TTL 30 d, ≤512 KB, ≤500 badge filters. Adequate. | | |
| — | n/a | — | **CORS on credential-bearing routes**: `/proxy/stremio/<uuid>/<epwd>/…` echoes only allowlisted origins (verified live: `Origin: https://evil.example` → `ACAO: https://brevitya.github.io`). Correct since 2026-08-21 (F6). | | |
| — | n/a | — | **Cache-key credential leakage**: only `/proxy/api/v1/status?host=…` is cached; that URL carries no credential. Correct. | | |

---

## 3. Reliability findings

| # | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| R1 | **P1** | `/paste` → `/t/:id` (KV) | KV is eventually consistent: "changes may take up to 60 seconds or more to be visible in other global network locations … negative lookups … are also cached" [5]. The AIOStreams host importing `?template=URL` reads from a different colo than the writer. The client-side `verifyPasteReadable()` only proves readability at the **user's** colo (comment in `app.js:7525-7531` admits this). Prior audit F2 = *partially fixed*. Live check from one colo: 3 pastes readable immediately (as expected — same colo). | Durable Object paste store (`PasteStore`, SQLite-backed, available on the **Free** plan [6]) — a single strongly consistent object with alarm-driven expiry; KV kept as **read fallback for legacy ids** for 30 days, then removable. Same URLs, same id format ⇒ zero client change. **[PLAN-DEPENDENT]**: Free = 100k DO requests/day, 13k GB-s/day [6] — current volume is ~50 pastes + ~110 reads/day. |
| R2 | P2 | status probe cache miss (`worker.js:587-608`) | No single-flight: a page load fires ~8 probes/host set; on a cold colo N concurrent misses all go upstream and all hit the rate-limit bucket. | Per-isolate in-flight map keyed by cache URL; concurrent misses share one upstream fetch. |
| R3 | P2 | upstream failure handling (`worker.js:649-659`) | No circuit breaker: a dead host costs every caller the full 15 s timeout, ×N callers, and holds one of the 6 simultaneous outbound connection slots per invocation [1]. Also, Cloudflare returns DNS/egress failures as **HTTP 530/1016 / 403/1002 responses**, not thrown errors — verified live (`host=https://does-not-exist-zz9.example` → `530 error code: 1016`), so they are passed through as `text/plain` and counted as `proxy_err_status`; `proxy_err_network` is **0** in production after 8.7k calls. | Per-hostname breaker (5 consecutive transport failures → 30 s open → half-open), fast `503 + Retry-After`, counter `proxy_err_breaker`. Classify CF `52x/530` `error code:` bodies as `network`, return a JSON 502 (don't leak the CF page). Client impact: `writeHostFetch` falls back to direct only on network error / 429 — a 503 is surfaced as `API_ERROR` like any 5xx today (same UX, just 15 s faster). |
| R4 | P2 | `readResponseCapped` (`worker.js:61-67`) | Decodes up to 8 MB to a JS string then re-encodes on the way out — CPU-bound work counted against the **10 ms Free CPU budget** [1]; also mangles non-UTF-8 bodies. | Pass the capped `ArrayBuffer` through. |
| R5 | P2 | `/api/stats` (`worker.js:356-386`) | ~220 KV ops per request, `daily:` prefix grows unbounded (175 keys today), no effective cache (Workers run before the CDN cache [7]; the header does nothing on this route). Limit: 1000 KV ops/invocation [2]. | Cache API for 60 s keyed on the path only (query-busting-proof); `daily` window limited to the last 120 days (no client reads `daily` — grepped). |
| R6 | P2 | counters (`increment`, `worker.js:271-299`) | Retries are immediate, so all four attempts land inside the same 1-second KV write window and fail together. Verified: 12 cache-hit requests → `proxy_cache_hits` +4. | Jittered backoff (≈0.3/0.8/1.5 s) inside `waitUntil` (30 s budget [1]); expose `counter_write_err`. Residual lost updates from concurrent get/put remain (analytics-grade); the durable fix is Analytics Engine or a DO counter — plan item. |
| R7 | P2 | external paste fallbacks (client) | paste.rs (201 in 0.11 s today) and dpaste are unmonitored; badge builder's first hop is the non-existent `/upload` route so it *always* falls to paste.rs. | Point the badge builder at `/paste` (one-line client fix, listed in plan; not part of this worker change). Worker cannot monitor third parties without widening its surface — not added. |
| R8 | info | cold starts | Module-level state (breaker, single-flight, memory rate-limit floor) resets per isolate. All three are optimisations layered on durable controls, so a cold start only means "back to today's behaviour" for that isolate. | Documented. |
| R9 | info | subrequests | Worst case per invocation: 1 upstream + ≤8 KV/DO ops ≪ 50 (Free) [1]. `/api/stats` was the outlier (R5). | — |

---

## 4. Observability findings

| # | Sev | Finding | Fix |
|---|---|---|---|
| O1 | **P1** | Counters under-count under any concurrency (R6) and the operator cannot tell — there is no write-error counter or log. `visits` swings 44 → 1521/day with no external corroboration. | `counter_write_err` + a structured `console.warn` (Workers Logs, enable `[observability]` in `wrangler.toml` [8]); jittered retry. |
| O2 | P1 | `proxy_err_network` is structurally 0 (R3) — the "dead host vs slow host" split the prior audit added (F5) does not work. | Classify CF error pages as network. |
| O3 | P2 | `contact_messages` is incremented (`worker.js:485`) but not listed in `/api/stats` keys — **write-only counter** (the exact bug class the existing test guards against; the test's list was incomplete). | Add to keys + extend the regression test. |
| O4 | P2 | Rate-limit rejections are invisible except for visits. | `rate_limited` total + `rl_hit:<scope>` breakdown (`by_rate_limit`). |
| O5 | P2 | No health/readiness signal; smoke uses `/api/stats` (expensive) as the liveness probe. | `GET /healthz` — no I/O, reports which bindings are present and the deployed version tag. |
| O6 | P2 | Log content: the worker logs nothing today (safe). New logs are structured, contain error class + hostname label (`custom` for user hosts) only — never URL, path, body, IP, or headers. | Enforced by a single `logEvent()` helper. |
| O7 | P2 | `/api/stats` abuse: public, uncached, ~220 KV ops — a cheap way to exhaust the Free KV read quota (100k/day [2]). | R5 + S4. |
| O8 | info | Bot Fight Mode / browser integrity on workers.dev returns 403 to some non-browser UAs (verified: `Python-urllib` 403, `python-requests`/`curl`/`node` 200). AIOStreams servers fetching `/t/<id>` use Node/undici → unaffected, but keep in mind when reading "worker down" reports. **[UNVERIFIED which rule]** | Documented in runbook. |

---

## 5. Status of the 2026-08-21 audit findings

| Prior | Claimed | Verified status today |
|---|---|---|
| F1 custom lane | fixed | **Fixed** (custom lane works live: `example.com` status probe → 404 from example.com, not 403). New gap S2 (redirects) found on that lane. |
| F2 paste 404 race | client verify | **Partially fixed** — verification happens at the writer's colo only; durable fix (this pass: DO store). |
| F3 write fallback | fixed | **Fixed** (`writeHostFetch` falls back only on network error/429). New constraint recorded: worker must never emit 429 after forwarding. |
| F4 status cache | fixed | **Fixed and working on workers.dev** (hit counter increments; latency 80 ms vs 240–700 ms). Note: docs only guarantee Cache API on custom domains [9] — **[PLAN/DOMAIN-DEPENDENT]**. No single-flight (R2). |
| F5 error classes | fixed | **Partially** — counters exist but `network` is structurally 0 (O2). |
| F6 CORS narrowing | fixed | **Fixed** (verified live). |
| F7 third-party fallbacks | recommendation | **Open** (R7); badge builder still targets a dead `/upload` route. |
| F8 delete contact copy | recommendation | **Open → now worse**: still present and contains a live webhook (S1). Deleted in this pass. |
| F9 counter loss | info | **Confirmed and quantified** (R6/O1). |
| F10 visit collapse | fixed (client) | `visits_rate_limited` = 0 live, but that proves nothing because the limiter is unbound (S4). Daily visits still oscillate 44 ↔ 1521 — **[UNVERIFIED]** whether real traffic or counter loss; O1 fixes will disambiguate. |

---

## 6a. Implementation notes (post-change, 2026-09-05)

- Binding names as shipped: Durable Object `PASTES` (class `PasteStore`, migration
  `v1-paste-store`), Rate Limiting `RL_PROXY / RL_PROXY_CUSTOM / RL_PASTE / RL_PASTE_READ /
  RL_ANALYTICS / RL_STATS / RL_CONTACT` (namespace ids 3001–3007 prod, 3101–3107 staging),
  KV `STATS` + `TEMPLATES` (legacy read fallback), optional KV `RATELIMIT`.
- Verified in real `workerd` (`wrangler dev --local`, not the test shims): worker boots with all
  bindings; 25 custom-lane probes from one IP → 20×pass then 5×429 from the Rate Limiting
  binding, a second IP unaffected; DO paste write → 3 immediate reads 200; `www.github.com`
  301 → JSON 502 `upstream redirect refused`; NXDOMAIN → JSON 502 `upstream unreachable`
  (`proxy_err_network` = 1, previously structurally 0); structured log lines contain only
  `{event, v, cls, host, status}`; `smoke.mjs --strict` 25/25.
- `workerd` rejects non-handler module exports (`WORKER_VERSION`, `_resetBreakers` broke boot
  with *"Incorrect type for map entry"*); they are attached to the default export instead. The
  `wrangler deploy --dry-run` did **not** catch this — only a local boot or a real deploy does,
  which is why the CI smoke gate matters.
- Rollback caveat: the `v1-paste-store` DO migration means `wrangler rollback` to any
  pre-2026-09-03 version is refused [10]; the README runbook documents the `git revert`
  path (keep the migration + class stub).

## 6. Ranked hardening plan

Impact H/M/L × effort S/M/L. ✅ = shipped in this pass.

| Rank | Item | Area | Impact/Effort | Status |
|---|---|---|---|---|
| 1 | Refuse upstream redirects (S2) | security | H/S | ✅ |
| 2 | Enforce rate limits: Rate Limiting binding + KV + in-isolate floor; bind in wrangler (S4) | security | H/S | ✅ (binding config needs a deploy; **[PLAN-DEPENDENT]** none known — binding is free on all plans per docs [3]) |
| 3 | Delete `worker-contact-endpoint.js`; **rotate the Discord webhook** (S1) | secrets | H/S | ✅ file / ⏳ owner rotates |
| 4 | Paste store on a Durable Object with KV legacy fallback (R1) | reliability | H/M | ✅ (**[PLAN-DEPENDENT]** free-tier DO quotas [6]) |
| 5 | Authorization forwarding allowlist (S3) | security | M/S | ✅ |
| 6 | Circuit breaker + CF-error classification + JSON 502 (R3/O2) | reliability/observability | M/S | ✅ |
| 7 | Counter backoff + `counter_write_err` + structured logs + `[observability]` (O1/R6) | observability | M/S | ✅ |
| 8 | `/api/stats`: Cache API, `daily` window, hide custom hostnames, `contact_messages`, `by_rate_limit` (R5/S8/O3/O4) | observability/cost | M/S | ✅ |
| 9 | Single-flight on status-probe miss (R2) | performance | M/S | ✅ |
| 10 | `/healthz` (O5) | observability | M/S | ✅ |
| 11 | Input validation on `/api/generate`, cap `/contact` body, reserved-hostname denylist, security headers, ArrayBuffer passthrough (S5/S6/S7/S9/R4) | hardening | L–M/S | ✅ |
| 12 | Deploy safety: CI test gate → dry-run → deploy → smoke gate; `staging` env; rollback runbook | deploy | H/S | ✅ workflow + README (staging KV/DO ids must be created by owner) |
| 13 | Client: badge builder → `/paste` instead of `/upload` (R7) | client | M/S | ⏳ (out of worker scope; one line in `tools/badges/index.html:1029`) |
| 14 | Counters → Workers Analytics Engine or a DO counter for exact analytics | observability | M/M | plan (**[PLAN-DEPENDENT]** — verify Analytics Engine availability on the account) |
| 15 | Custom domain for the worker (guaranteed Cache API, Cache Rules, WAF rate-limit rule as an outer layer) | performance/security | M/M | plan (**[PLAN-DEPENDENT]** needs a zone on Cloudflare) |
| 16 | Second deployment (other account/region) + client `PROXY_URLS` failover | resilience | M/M | plan |
| 17 | Remove KV legacy paste fallback after 30 days (2026-10-03+) | cleanup | L/S | plan |

Cloudflare limits relied on (all re-read 2026-09-03):
[1] Workers limits — Free: 100k req/day, 10 ms CPU, 50 subrequests/invocation, 6 simultaneous outbound connections, `waitUntil` ≤30 s, request body 100 MB (Free/Pro) — https://developers.cloudflare.com/workers/platform/limits/
[2] KV limits — 1 write/s to the same key, 1000 ops/invocation, Free: 100k reads/day, 1k writes/day, 25 MiB value — https://developers.cloudflare.com/kv/platform/limits/
[3] Rate Limiting binding — `period` 10 or 60 s, per-Cloudflare-location, eventually consistent/permissive, no network round-trip — https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
[4] `CF-Connecting-IP` is added by Cloudflare's edge — https://developers.cloudflare.com/fundamentals/reference/http-headers/
[5] KV consistency — https://developers.cloudflare.com/kv/concepts/how-kv-works/
[6] Durable Objects pricing/limits — Free plan: SQLite-backed only, 100k requests/day, 13k GB-s/day, 5 GB storage, key+value ≤2 MB — https://developers.cloudflare.com/durable-objects/platform/pricing/ , https://developers.cloudflare.com/durable-objects/platform/limits/
[7] Workers run before the cache; Cache API is colo-local — https://developers.cloudflare.com/workers/reference/how-the-cache-works/
[8] Workers Logs `[observability]` — https://developers.cloudflare.com/workers/observability/logs/workers-logs/
[9] Cache API availability ("Workers deployed to custom domains have access to functional cache operations") — https://developers.cloudflare.com/workers/runtime-apis/cache/
[10] Rollbacks (last 100 versions; blocked if bindings/DO classes changed) and gradual deployments — https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/ , https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/
