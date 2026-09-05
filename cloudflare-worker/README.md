# CORS proxy + temporary JSON imports for Core Builds

The configurator's "Create & Install" flow tries to POST a config directly to
each public AIOStreams instance's `/api/v1/user` endpoint from the browser.
Most of those instances don't send `Access-Control-Allow-Origin`, so the
browser request is blocked before a response ever comes back.

`worker.js` is a Cloudflare Worker that does two things:

## 1. CORS proxy (`/proxy/*`)

Re-issues AIOStreams API requests server-to-server (CORS doesn't apply there)
and returns the result with CORS headers. Forwards to the hardcoded
`ALLOWED_HOSTS` (8 public AIOStreams hosts + the scoped WuPlay and TorBox
lanes) or, on the **custom / self-hosted lane**, to any public `https://` host
but only for the AIOStreams config surface (see *Routes* below). Upstream
redirects are never followed.

The configurator races a direct browser fetch against a proxied fetch via
`raceHostFetch()` — whichever responds first wins.

## 2. Temporary JSON imports (`/paste`, `/t/:id`)

When the direct API call fails (CORS, host down, rate limit), the configurator
automatically uploads the template JSON to the Worker's KV store and gets back
a short URL. Users then tap an instance chip to auto-import the template into
AIOStreams via the `?template=URL` parameter. Core Badge Builder uses the same
bounded route for Nuvio Fusion badge packs. The endpoint accepts only these two
validated object shapes; it is not a generic anonymous JSON store.

**Fallback chain** (configurator tries each until one succeeds):
1. Cloudflare Worker `/paste` — your infrastructure, 30-day TTL
2. paste.rs — public paste service
3. dpaste.com — last resort

Templates and badge packs are stored in a **Durable Object** (`PasteStore`,
strongly consistent — a paste is readable everywhere the instant `/paste`
returns) with a 30-day TTL, with the legacy KV namespace as a read fallback for
ids created before 2026-09-03. Nothing is logged or inspected. Max upload size is
512 KB; badge packs are capped at 500 filters.

## Deploy

Requires a free Cloudflare account and [wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
cd cloudflare-worker

# KV namespaces STATS + TEMPLATES are already bound in wrangler.toml; the PASTES
# Durable Object and the Rate Limiting bindings need no pre-creation (the
# [[migrations]] block creates the DO class on first deploy).
npx wrangler login
npx wrangler secret put DISCORD_WEBHOOK_URL   # contact form; never commit it
npx wrangler deploy --dry-run --outdir /tmp/wr  # validates config + bundle, uploads nothing
npx wrangler deploy
node smoke.mjs --strict                         # post-deploy gate
```

The deploy output prints your Worker's URL:
`https://core-builds-cors-proxy.<your-subdomain>.workers.dev`

After deployment, `/healthz` confirms the version and which bindings are present
(200 = ready; 503 = no paste store bound):

```bash
curl -s https://<worker>.workers.dev/healthz
# {"ok":true,"version":"2026-09-03","bindings":{"STATS":true,"TEMPLATES":true,"PASTES":true,"RATELIMIT":false,"RL_PROXY":true,"DISCORD_WEBHOOK_URL":true},"breakers_open":0}
```

## Wire it into the configurator

1. Set `CORS_PROXY` in `configurator/src/js/app.js` to the Worker URL above.
2. Rebuild the published standalone configurator:
   ```bash
   cd configurator
   npm ci
   npm run build
   ```
3. Commit the source changes and regenerated `configurator/index.html`.

Set `CORS_PROXY = ''` to disable the proxy and fall back to direct-fetch-only.

## CI auto-deploy (optional)

`.github/workflows/deploy-worker.yml` deploys automatically on push to
`cloudflare-worker/**` if these repo secrets are set:

- `CLOUDFLARE_API_TOKEN` — a token with Workers Scripts:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — found on the Cloudflare dashboard's right sidebar

## Routes & limits (2026-09-03)

| Route | Method | Purpose | Limit / IP | Notes |
|---|---|---|---|---|
| `/healthz` | GET | liveness + readiness + version + bindings, no I/O | none | 200 = a paste store is bound; 503 otherwise |
| `/api/stats` | GET | all counters | 20/min | served from the colo Cache API for 60 s; `daily` windowed to 120 days |
| `/api/visit` | POST | visit beacon | 30/min | |
| `/api/generate` | POST | generate beacon `{service,device,resolution}` | 30/min | dimension values must match `^[a-z0-9][a-z0-9_-]{0,31}$` or are dropped |
| `/contact` | POST | Discord webhook relay | 5/min (binding) + 5/h (KV, if bound) | Origin allowlist, 16 KB body cap |
| `/paste` | POST | store template / badge pack | 10/min | ≤512 KB, two shapes only, 30-day TTL |
| `/t/:id` | GET | read paste | 60/min | `ACAO: *`, `no-store` |
| `/proxy<path>?host=` | GET/POST/PATCH | allowlisted lane | 60/min | any path on `ALLOWED_HOSTS`; `Authorization` forwarded **only** to `api.wuplay.app`; TorBox scoped to `GET /v1/api/speedtest` |
| `/proxy<path>?host=` | GET/POST/PATCH | custom lane | 20/min | `https://` origin → `GET /api/v1/status`, `POST/PATCH /api/v1/user`; manifest base → `GET /stream/*/*.json`; no IP literals, no userinfo/port/query, no dotless or reserved names (`.local .internal .lan .corp .home .test .example .invalid .onion .arpa`) |

Caps everywhere: 2 MB proxy request body (413), 8 MB proxy response (502
`upstream response too large`), 15 s upstream timeout (502), upstream 3xx
refused (502 `upstream redirect refused`), `/api/v1/status` 200s colo-cached
30 s with single-flight on miss. Every response carries `nosniff`,
`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `CSP default-src 'none'`,
HSTS.

### HTTP contract that deployed clients rely on (do not break)

- `POST /paste` → `{url}`; `GET /t/<id>` returns the exact stored body; ids match `^[a-z0-9]{6,20}$`.
- `/proxy` mirrors the upstream status code; JSON error bodies `{error}`.
- **A `429` from `/proxy` is only ever emitted before the upstream call.** The
  configurator's `writeHostFetch` treats 429 as "not forwarded" and retries the
  write directly; a post-forward 429 would duplicate a user's config. The
  circuit breaker therefore returns `503 + Retry-After`, not 429.
- `ACAO: *` on `/t/` and `GET /proxy/api/v1/status` only; strict origin echo everywhere else.
- `/api/stats` keeps `visits`/`generates` numeric at the top level (splash screen).

### Rate limiting — three layers

1. **Workers Rate Limiting bindings** (`RL_*` in `wrangler.toml`): counters are
   kept on the machine running the Worker, shared across isolates in the colo,
   no network round-trip. Per-colo, eventually consistent, permissive by design.
2. **KV `RATELIMIT`** (optional, cross-colo). KV allows one write per second per
   key; a write failure inside the window now counts *against* the caller
   instead of failing open.
3. **In-isolate token map** — always present, even with zero bindings.

A deny from any layer is final. Keys are `<scope>:<cf-connecting-ip>`;
`X-Forwarded-For` is never consulted. Cloudflare's guidance is that IP keys can
over-limit shared NATs; the analytics limits are generous for that reason.

### Paste store

`PasteStore` is a single SQLite-backed Durable Object (`idFromName('pastes-v1')`).
`PUT /<id>` and `GET /<id>` only; hourly alarm deletes expired rows. Reads fall
back to the `TEMPLATES` KV namespace for legacy ids; `pastes_kv_fallback_reads`
counts them — when it stays at 0 for 30 days after rollout, unbind `TEMPLATES`.
If the DO is unavailable, writes and reads degrade to KV (never a 5xx purely
because the DO blipped).

## Metrics (`GET /api/stats`)

| Counter | Meaning |
|---|---|
| `visits` / `generates` | Page-load visits, template downloads (beacon) |
| `visits_rate_limited` / `rate_limited` / `by_rate_limit.<scope>` | Beacons the visit bucket rejected / all 429s / per scope |
| `visits_write_err` / `counter_write_err` | KV increment failures (all retries exhausted) — **under-counting indicator** |
| `proxy_calls` / `by_host.<host>` | Upstream fetches through `/proxy` (custom-lane hosts are labelled `custom`) |
| `proxy_cache_hits` | Status probes served from the colo Cache API |
| `proxy_errors` / `by_host_errors.<host>` | Aggregate + per-host errors |
| `proxy_err_timeout` / `_network` / `_oversize` / `_status` / `_redirect` / `_breaker` | 15 s abort · DNS/egress/transport (incl. Cloudflare `error code: NNNN` pages) · >8 MB · upstream 4xx/5xx · refused 3xx · fast-failed while breaker open |
| `pastes_created` / `pastes_viewed` / `pastes_kv_fallback_reads` | Paste uploads / reads / reads served from legacy KV |
| `contact_messages` | Contact form deliveries |
| `daily:*` | Per-day breakdowns (last 120 days) |
| `version` | `WORKER_VERSION` of the worker that built the response |

Counters are best-effort (KV get→put, jittered retries). Structured logs
(`[observability]` in `wrangler.toml`) carry only `{event, v, cls, host, status,
scope}` — never a URL, path, body, IP or header. Query them in the dashboard
under **Workers & Pages → core-builds-cors-proxy → Observability**.

## Alerting & runbook

Read `/api/stats` twice, 10 minutes apart, and alert on the deltas (a tiny
scheduled script or an uptime monitor that evaluates JSON is enough; Cloudflare
Notifications can additionally alert on Worker error rate and CPU limits).

| Alert | Threshold | Likely cause | Runbook |
|---|---|---|---|
| **Worker down** | `/healthz` non-200 for 2 checks | bad deploy, missing paste-store binding | `wrangler rollback`; check `bindings` in the healthz body |
| **Version mismatch** | `/healthz.version` ≠ `git HEAD` `WORKER_VERSION` >10 min after a deploy | deploy failed silently | re-run the workflow; check Actions log |
| **Upstream error ratio** | Δ`proxy_errors` / Δ`proxy_calls` > 30% over 10 min | a public host is down/slow | look at Δ`by_host_errors`; if one host ≫ others, it's the host — nothing to do in the worker (breaker limits blast radius). If `proxy_err_timeout` dominates across all hosts, suspect Cloudflare egress → status.cloudflare.com |
| **Breaker open** | `/healthz.breakers_open` > 0 for >5 min, or Δ`proxy_err_breaker` > 50/10 min | one host hard-down | confirm host directly (`curl https://<host>/api/v1/status`); ask the host operator; consider removing from `ALLOWED_HOSTS` + the configurator host list if >24 h |
| **Redirect refusals** | Δ`proxy_err_redirect` > 5/10 min from a *non-custom* host | an allowlisted host changed domains, or is compromised | verify with `curl -I`; update `ALLOWED_HOSTS`; never re-enable redirect following |
| **Rate-limit storm** | Δ`rate_limited` > 500/10 min | abuse or a client bug retry-looping | check `by_rate_limit` scope; if `paste` — anonymous storage abuse: temporarily lower `PASTE_CREATE_PER_MIN`; if `proxy` — check the configurator for a probe loop (`raceHostFetch`) |
| **Counter loss** | Δ`counter_write_err` > 20/10 min | KV write pressure (same-key 1/s) or KV incident | analytics only — no user impact; if persistent, move counters to Analytics Engine (plan item 14) |
| **Paste failures** | `/paste` 5xx in smoke, or Δ`pastes_created` = 0 while Δ`visits` > 100 | DO storage full / DO outage | `/healthz.bindings.PASTES`; `wrangler tail` for `paste_do_write_failed`; writes degrade to KV meanwhile |
| **KV fallback reads** | `pastes_kv_fallback_reads` still increasing >30 days after 2026-09-03 | something still writes to KV (DO write failures) | check `paste_do_write_failed` log volume before unbinding `TEMPLATES` |
| **Contact failures** | log event `contact_upstream_error` >3/h | Discord webhook rotated/deleted | `wrangler secret put DISCORD_WEBHOOK_URL` |
| **Free-plan quota** [PLAN-DEPENDENT] | Cloudflare notification for 100k req/day or KV 100k reads/day | traffic growth or `/api/stats` scraping | `/api/stats` is cached 60 s per colo; if scraped, tighten `STATS_PER_MIN`; upgrade plan |

Known noise: Cloudflare's bot protection on `workers.dev` returns **403 to some
non-browser user agents** (e.g. `Python-urllib`, verified 2026-09-03). AIOStreams
servers fetching `/t/<id>` use Node and are unaffected; "worker returns 403"
reports from scripts are usually this, not the worker.

## Deploy, staging, rollback

- **CI**: `.github/workflows/deploy-worker.yml` runs unit tests + `wrangler deploy
  --dry-run` before deploying, then `smoke.mjs --strict` against the deployed URL.
  A failing smoke fails the run and prints the rollback command.
- **Staging**: `npx wrangler deploy --env staging` (or *Run workflow → staging*)
  deploys `core-builds-cors-proxy-staging` with its own DO and rate-limit
  namespaces. Create staging KV namespaces once and fill the ids in
  `[env.staging]` (bindings are not inherited between environments). Point a
  local configurator at it with `CORS_PROXY`/`COUNTER_URL`.
- **Secrets**: only `DISCORD_WEBHOOK_URL`, via `wrangler secret put` (per
  environment). The webhook that was committed in the deleted
  `worker-contact-endpoint.js` must be **rotated in Discord** — it is still in
  git history.
- **Rollback**: `npx wrangler rollback --message "<why>"` reverts to the last
  stable version (last 100 versions are eligible). Caveat from Cloudflare's docs:
  rollback is refused if a Durable Object class migration or a deleted KV binding
  sits between the two versions — the `v1-paste-store` migration means **you
  cannot roll back to a pre-2026-09-03 version with wrangler**; instead
  `git revert` the worker change (keep the `[[migrations]]` block and the DO
  class stub) and redeploy.
- **Canary**: `npx wrangler versions upload` then `npx wrangler versions deploy`
  to split traffic (e.g. 10/90), watch `by_host_errors`/`rate_limited`, then
  promote to 100%.

### Post-deploy smoke

```bash
node cloudflare-worker/smoke.mjs --strict        # production
node cloudflare-worker/smoke.mjs --base=http://127.0.0.1:8787   # local: npx wrangler dev --local
```

Checks `/healthz` (version, bindings, breakers), `/api/stats` counter
completeness, every allowlisted host's status probe (200 + 30 s cache header),
the custom-lane matrix (https accepted; http://, bad paths, reserved names
refused), redirect refusal, security headers, and an immediate `/paste` →
`/t/:id` round-trip. Exit 0 = deploy is healthy. Without `--strict`, an older
deployed worker produces warnings instead of failures.

### F10 — the 2026-08-19 visit-counter collapse

`daily:visits` fell 741 → 56 → 20 (Aug 19–21) while `pastes` and `proxy_calls`
stayed healthy. Client-side beacon resilience shipped 2026-08-21. The 2026-09-03
audit found the server side could not have been observed either way: the
`RATELIMIT` namespace was never bound (so `visits_rate_limited` was structurally
0) and KV's same-key write cap makes the `visits` counter lose increments under
any concurrency (verified: 12 requests → +4). `counter_write_err` and the jittered
retry now make loss visible; the daily series still oscillates (44 ↔ 1521 through
2026-09-03) and remains **[UNVERIFIED]** as real traffic until a week of the new
counters is available.

### Legacy `configurator/worker/counter.js`
**Deprecated.** The configurator points only at this consolidated worker, and `counter.js`
writes a *different* KV key schema into the same `STATS` namespace (dead writes). Repoint any
stragglers here and delete it. `worker-contact-endpoint.js` was deleted 2026-09-03 for the same
reason (and because it embedded a live webhook URL).

See `INFRA-AUDIT.md` for the full route/trust-boundary map, findings and plan.
