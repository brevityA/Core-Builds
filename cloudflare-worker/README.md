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

## Operator API (stats admin token)

Full `/api/stats` and `/healthz` internals are **not** a Cloudflare API. They
are routes on this Worker gated by the `ADMIN_TOKEN` wrangler secret.

See **[OPERATOR.md](./OPERATOR.md)** for:
- generating the token (`openssl rand -hex 24`)
- storing it as GitHub secret `STATS_ADMIN_TOKEN` and Worker secret `ADMIN_TOKEN`
- `curl` / `./operator-stats.sh` against `/healthz` and `/api/stats`

CI copies `STATS_ADMIN_TOKEN` onto the Worker on every deploy (and via the
**Sync Worker ADMIN_TOKEN** workflow). `CLOUDFLARE_API_TOKEN` cannot unlock
those routes.

## Deploy

Requires a free Cloudflare account and [wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
cd cloudflare-worker

# KV namespaces STATS + TEMPLATES are already bound in wrangler.toml; the PASTES
# Durable Object and the Rate Limiting bindings need no pre-creation (the
# [[migrations]] block creates the DO class on first deploy).
npx wrangler login
npx wrangler secret put DISCORD_WEBHOOK_URL   # contact form; never commit it
npx wrangler secret put ADMIN_TOKEN           # operator view: >=16 chars, random; never commit it
npx wrangler deploy --dry-run --outdir /tmp/wr  # validates config + bundle, uploads nothing
npx wrangler deploy
STATS_ADMIN_TOKEN=<same ADMIN_TOKEN> node smoke.mjs --strict   # post-deploy gate (full checks)

The deploy output prints your Worker's URL:
`https://core-builds-cors-proxy.<your-subdomain>.workers.dev`

After deployment, `/healthz` confirms the version (200 = ready; 503 = no paste
store bound). Since 2026-09-08 the public payload is minimal — deployment
internals (which bindings exist, breaker state) are operator data:

```bash
curl -s https://<worker>.workers.dev/healthz
# {"ok":true,"version":"2026-09-11"}

curl -s https://<worker>.workers.dev/healthz -H "Authorization: Bearer $ADMIN_TOKEN"
# {"ok":true,"version":"2026-09-11","bindings":{"STATS":true,"TEMPLATES":true,
#  "PASTES":true,"RATELIMIT":false,"RL_PROXY":true,"DISCORD_WEBHOOK_URL":true,
#  "ADMIN_TOKEN":true},"ready":true,"breakers_open":0}
```

The same `Authorization: Bearer $ADMIN_TOKEN` header unlocks the full
`/api/stats` payload (see Routes below).

## Core Streams (private Stremio add-on)

Core Streams is an independent Stremio stream-list add-on served by this Worker. It federates bounded stream-result requests to Torrentio and TorrentsDB, queries the Stremio Public Domain Movies add-on for movie torrent results, includes a carefully filtered Internet Archive source for matching movie MP4s with an uploader-declared CC0/Public Domain Mark/CC BY/CC BY-SA license, includes four exact-match Library of Congress films from a collection explicitly declared public domain by LOC, includes the publisher's official Blender Open Movies PeerTube source for six explicitly mapped titles: Big Buck Bunny, Elephants Dream, Sintel, Tears of Steel, Glass Half, and Coffee Run, and supports one optional operator-configured Stremio-compatible source. Configured sources may return validated native YouTube video IDs (`ytId`) as well as HTTPS URLs or torrent hashes; Stremio's YouTube-capable clients resolve those IDs without Core Streams fetching or proxying video. It does not depend on AIOStreams and never relays media bytes. The `/proxy/*` AIOStreams lane remains unchanged. Internet Archive license metadata is uploader-declared and not independently verified; the Public Domain Movies add-on's classification is not a guarantee of public-domain status in Australia or another viewer's country. These are discovery filters, not legal clearance or a guarantee that a file plays.

### Use it

1. **Create a private install token and store it on the Worker** (never commit or post it):
   ```bash
   cd cloudflare-worker
   CORE_STREAMS_INSTALL_TOKEN=$(openssl rand -hex 32)
   printf '%s' "$CORE_STREAMS_INSTALL_TOKEN" | npx wrangler secret put CORE_STREAMS_INSTALL_TOKEN --env=""
   ```
2. *(Optional)* Configure a compatible Stremio stream add-on as described below.
3. **Deploy the Worker code.** After the code is merged to `main`, the existing deploy workflow handles it; to deploy this checkout manually, run `npx wrangler deploy --env=""` from `cloudflare-worker/` (or deploy with `--env staging` first).
4. **Build the install link** using your Worker base URL:
   ```bash
   printf 'https://core-builds-cors-proxy.tlorenzato26.workers.dev/core-streams/%s/manifest.json\n' "$CORE_STREAMS_INSTALL_TOKEN"
   ```
   Replace the base URL if your Worker has a different account subdomain.
5. In Stremio, open **Add-ons → Install from URL** (wording varies by client), paste the link and install. Share the link only with the friends you intend to allow; it is a bearer credential.

To revoke access, replace the `CORE_STREAMS_INSTALL_TOKEN` Worker secret and redeploy/reinstall using the new link. For local `wrangler dev`, put `CORE_STREAMS_INSTALL_TOKEN=<64 hex chars>` in the ignored `cloudflare-worker/.dev.vars` file.

Movie/episode lookups are rate-limited using the existing `RL_PROXY_CUSTOM` lane. Torrentio, TorrentsDB, the movie-only Public Domain Movies add-on, and any configured add-on have a 5.5-second timeout; open-media metadata lookups are separately bounded to 4 seconds and 768 KiB per JSON response. Each source has an isolate-local circuit breaker: after three consecutive failures it is skipped for 30 seconds while other sources keep running.

Results use a best-effort ordering heuristic: within each source, recognizable resolution, seed-count hints, release tags, and direct-play URLs contribute to ranking; the best first result is shown first, then provider lists are interleaved before the 80-result cap. This prevents a high-volume source from hiding every other provider. Labels can be inaccurate, so the ordering is advisory—not a guarantee of quality, playback, seed availability, or safety.

The Public Domain Movies endpoint currently returns torrent hashes from its curated collection. Its results carry a warning to verify local public-domain status: the add-on does not establish copyright status for Australia or every other territory.

The Internet Archive adapter handles movies only, requires an exact normalized title/year match from Cinemeta and item metadata, and returns MP4 files only when the item has an explicit allowlisted CC0, Public Domain Mark, CC BY, or CC BY-SA license URL. It filters restricted files and excludes non-commercial/no-derivatives license variants. The license declaration is uploader-supplied, not independently verified; results include the item, creator, license and caveat.

The LOC source is limited to four static mappings from the *Before and After the Great Earthquake and Fire* collection: A Trip Down Market Street Before the Fire (`tt0205480`, 1906), Panoramic View of the Golden Gate (`tt0366872`, 1902), Bird's-Eye View of San Francisco, Cal., from a Balloon (`tt0309365`, 1902), and San Francisco Earthquake & Fire: April 18, 1906 (`tt1811321`, 1906). Each is guarded by exact Cinemeta title/year (one catalog-title alias is explicit), pinned to its official LOC MP4 path, and linked to the item and collection rights statement, which says those collection contents are public domain and free to use and reuse. The returned record notes the preserved viewing-copy duration; some editions are shorter than the IMDb/Cinemeta duration. This is an official collection statement, not legal advice for every territory.

Blender Open Movies is statically mapped only for six exact IMDb/title/year matches: Big Buck Bunny (`tt1254207`), Elephants Dream (`tt0807840`), Sintel (`tt1727587`), Tears of Steel (`tt2285752`), Glass Half (`tt5243642`), and Coffee Run (`tt13716914`). Official account/channel, exact title, public status, license evidence and publisher MP4 checks are required. Each entry carries its own rights-page attribution (Big Buck Bunny and Glass Half CC BY 3.0; Elephants Dream CC BY 2.5; Sintel and Tears of Steel CC BY 3.0; Coffee Run CC BY 4.0). Four PeerTube records report unknown license metadata; that is accepted only for these statically mapped titles where the canonical Blender project page independently states the license. This is not a general PeerTube license exception.

These are best-effort per-isolate controls, not global guarantees. `.mp4` does not prove a supported codec/container profile. The Internet Archive documents H.264 video, AAC audio, `yuv420p`, and a front-loaded `moov` atom for MP4 web playback, but Core Streams does not inspect media bytes. Codec compatibility and actual playback remain untested until checked in the target Stremio client.

### Optional configured stream add-on

If you have a Stremio-compatible stream add-on manifest URL and its terms allow forwarding its stream results, store the URL as a Worker secret:

```bash
npx wrangler secret put CORE_STREAMS_HTTP_SOURCE_MANIFEST --env=""
```

Use the add-on's **manifest URL**, not its configure page. HTTPS required; no query string, fragment, userinfo, explicit port, IP literal, or reserved hostname. Configuration tokens may be in path segments. This secret is shared by everyone using the Core Streams install token; do not configure a personal service credential for friends unless the service explicitly permits that. PenguPlay has not been live-integrated or verified—the supplied configure URL requires sign-in before the personal install URL is available. The optional source can also return a Stremio-native `ytId`; this enables a compatible YouTube add-on such as a privately operated YouStream instance to pass video IDs to Stremio's own YouTube player. It does not make YouTube search results rights-cleared: use only source add-ons and videos you are authorized to access, and do not share a personal YouTube API key through a multi-user Core Streams install. For direct streams, only HTTPS links are accepted. Playback request headers are restricted to `Accept`, `Accept-Language`, `Origin`, `Referer`, and `User-Agent`; cookies, authorization, and fixed `Range` headers are intentionally stripped.

Core Streams remains a bounded aggregator, not a new indexer scraper or debrid resolver: public add-on availability and overlap can change, the Archive source covers only exact-title/year matching movies with uploader-declared open-license MP4s, IMDb movie/episode IDs are accepted, and a failed source is skipped while others may still return results. It does not provide mainstream catalogue coverage through the Archive and does not prove playback from a stream-list response. See **[CORE-STREAMS-RESEARCH.md](./CORE-STREAMS-RESEARCH.md)** for provider research, Cloudflare constraints, and known gaps.

Tests:

```bash
node --test cloudflare-worker/*.test.js
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
- `STATS_ADMIN_TOKEN` — same value as Worker `ADMIN_TOKEN` (≥16 chars). Optional
  for deploy; required for operator smoke checks and for CI to `wrangler secret put`
  it. See [OPERATOR.md](./OPERATOR.md).

## Routes & limits (2026-09-08)

| Route | Method | Purpose | Limit / IP | Notes |
|---|---|---|---|---|
| `/healthz` | GET | public liveness + readiness + version, no I/O, no token | none | 200 = a paste store is bound; 503 otherwise. Payload is `{ok, version}` only |
| `/healthz` | GET | operator view (bindings incl. `DISCORD_WEBHOOK_URL` presence, `breakers_open`) | none | requires `Authorization: Bearer ADMIN_TOKEN`; 503 when not ready |
| `/api/stats` | GET | public: **`{visits, generates}` only** (the configurator splash's two counters) | 20/min | served from the colo Cache API for 60 s |
| `/api/stats` | GET | operator: all counters + breakdowns (`by_host` allowlist-filtered, `by_service/device/resolution`, `by_rate_limit`, `daily` windowed to 120 days) | 20/min | requires `Authorization: Bearer ADMIN_TOKEN`; always `no-store`, never cached |
| `/api/visit` | POST | visit beacon | 30/min | |
| `/api/generate` | POST | generate beacon `{service,device,resolution}` | 30/min | dimension values must match `^[a-z0-9][a-z0-9_-]{0,31}$` or are dropped |
| `/contact` | POST | Discord webhook relay | 5/min (binding) + 5/h (KV, if bound) | Origin allowlist, 16 KB body cap |
| `/paste` | POST | store template / badge pack | 10/min | ≤512 KB, two shapes only, 30-day TTL |
| `/t/:id` | GET | read paste | 60/min | `ACAO: *`, `no-store` |
| `/core-streams/:token/manifest.json` | GET | private Stremio add-on manifest | none | token is a bearer secret; `ACAO: *`, `no-store` |
| `/core-streams/:token/stream/{movie|series}/{imdb-id}.json` | GET | Torrentio + TorrentsDB + movie-only Public Domain Movies + optional configured add-on (HTTPS, torrent, or native YouTube ID); open-media lookup via Cinemeta/Internet Archive, four LOC films, and six mapped Blender films | 20/min/IP | ≤10 total upstream requests worst case and ≤6 concurrent; add-on timeout 5.5 s / metadata timeout 4 s; per-source isolate-local breakers; no media relay; `ACAO: *`, `no-store` |
| `/proxy<path>?host=` | GET/POST/PATCH | allowlisted lane | 60/min | every allowlisted host is scoped to its own surface — AIOStreams hosts: `GET /api/v1/status`, `POST/PATCH /api/v1/user[/id]`, `GET /stremio/<uuid>/<pwd>/{manifest.json,stream/*/*.json}` (origin form) or `GET /stream/*/*.json` (manifest-base form); `api.wuplay.app`: `GET /app/version`, `POST /devices/register`, `GET/POST/PATCH /sync/**` and is the **only** host that receives `Authorization`; `api.torbox.app`: `GET /v1/api/speedtest`. An allowlisted host matching no scope is refused |
| `/proxy<path>?host=` | GET/POST/PATCH | custom lane | 20/min | `https://` origin → `GET /api/v1/status`, `POST/PATCH /api/v1/user[/id]` (same bounded id shape as the allowlisted lane, so a self-hosted config can be updated in place); manifest base → `GET /stream/*/*.json`; no IP literals, no userinfo/port/query, no dotless or reserved names (`.local .internal .lan .corp .home .test .example .invalid .onion .arpa`) |

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

Read the **operator** `/api/stats` (send `Authorization: Bearer $ADMIN_TOKEN`)
twice, 10 minutes apart, and alert on the deltas (a tiny scheduled script or an
uptime monitor that evaluates JSON is enough; Cloudflare Notifications can
additionally alert on Worker error rate and CPU limits).

| Alert | Threshold | Likely cause | Runbook |
|---|---|---|
| **Worker down** | `/healthz` non-200 for 2 checks | bad deploy, missing paste-store binding | `wrangler rollback`; check operator healthz `bindings` (`curl -H "Authorization: Bearer $ADMIN_TOKEN"`) |
| **Version mismatch** | `/healthz.version` ≠ `git HEAD` `WORKER_VERSION` >10 min after a deploy | deploy failed silently | re-run the workflow; check Actions log |
| **Upstream error ratio** | Δ`proxy_errors` / Δ`proxy_calls` > 30% over 10 min | a public host is down/slow | look at Δ`by_host_errors` (operator `/api/stats`); if one host ≫ others, it's the host — nothing to do in the worker (breaker limits blast radius). If `proxy_err_timeout` dominates across all hosts, suspect Cloudflare egress → status.cloudflare.com |
| **Breaker open** | operator `/healthz.breakers_open` > 0 for >5 min, or Δ`proxy_err_breaker` > 50/10 min | one host hard-down | confirm host directly (`curl https://<host>/api/v1/status`); ask the host operator; consider removing from `ALLOWED_HOSTS` + the configurator host list if >24 h |
| **Redirect refusals** | Δ`proxy_err_redirect` > 5/10 min from a *non-custom* host | an allowlisted host changed domains, or is compromised | verify with `curl -I`; update `ALLOWED_HOSTS`; never re-enable redirect following |
| **Rate-limit storm** | Δ`rate_limited` > 500/10 min | abuse or a client bug retry-looping | check `by_rate_limit` scope; if `paste` — anonymous storage abuse: temporarily lower `PASTE_CREATE_PER_MIN`; if `proxy` — check the configurator for a probe loop (`raceHostFetch`) |
| **Counter loss** | Δ`counter_write_err` > 20/10 min | KV write pressure (same-key 1/s) or KV incident | analytics only — no user impact; if persistent, move counters to Analytics Engine (plan item 14) |
| **Paste failures** | `/paste` 5xx in smoke, or Δ`pastes_created` = 0 while Δ`visits` > 100 | DO storage full / DO outage | operator healthz `bindings.PASTES`; `wrangler tail` for `paste_do_write_failed`; writes degrade to KV meanwhile |
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
- **Secrets**: `DISCORD_WEBHOOK_URL` (contact form) and `ADMIN_TOKEN` (operator
  view of `/api/stats` + `/healthz`; generate with e.g.
  `openssl rand -hex 24` — must be ≥16 chars or the operator view is disabled),
  via `wrangler secret put` per environment. The webhook that was committed in
  the deleted `worker-contact-endpoint.js` must be **rotated in Discord** — it
  is still in git history. For the CI smoke gate to verify the operator view,
  mirror `ADMIN_TOKEN` as the GitHub secret `STATS_ADMIN_TOKEN` (optional: the
  smoke skips operator checks with a warning when it is unset).
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

Checks public `/healthz` (minimal payload + version) and public `/api/stats`
(exactly `{visits, generates}`), then — when `STATS_ADMIN_TOKEN` is set — the
operator view (counter completeness, bindings, breakers), every allowlisted
host's status probe (200 + 30 s cache header), the custom-lane matrix (https
accepted; http://, bad paths, reserved names refused), redirect refusal,
security headers, and an immediate `/paste` → `/t/:id` round-trip. Exit 0 =
deploy is healthy. Without `--strict`, an older deployed worker produces
warnings instead of failures.

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
