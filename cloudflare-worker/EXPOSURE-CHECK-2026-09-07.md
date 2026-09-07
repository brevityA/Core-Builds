# Exposure check — Cloudflare Workers (2026-09-07)

Scope: the deployed `core-builds-cors-proxy` worker (and any sibling workers on the
same `tlorenzato26` account subdomain), plus every worker reference in this repo
(`configurator/`, `tools/badges/`, `.github/workflows/deploy-worker.yml`).

Method: line-by-line review of `cloudflare-worker/worker.js` @ `50a2f88` (this
snapshot) and live probing of the deployed workers on 2026-09-07. The sandbox's
direct network egress is blocked, so live checks were done with the browser-grade
fetch path (same checks the infra audit previously ran with curl). CORS header
behaviour could not be re-verified over the wire from here — it is covered by
`worker.test.js` in CI and unchanged since the 2026-09-03 audit — every other
claim below was reproduced against production.

---

## What's deployed and what I verified live

| Check | Result (live, 2026-09-07) |
|---|---|
| `GET /healthz` @ `core-builds-cors-proxy.tlorenzato26.workers.dev` | `200` — `version: 2026-09-03` (hardened build), `PASTES` (DO), `STATS`, `TEMPLATES`, `RL_PROXY` bound, `ready: true` |
| SSRF gate: `?host=https://localhost`, `?host=https://192.168.1.1` | `403 {"error":"host not allowed"}` — closed |
| Redirect refusal: `?host=https://www.github.com` (301 upstream) | `502 {"error":"upstream redirect refused"}` — closed (was open before 09-03) |
| `core-builds-counter.tlorenzato26.workers.dev` | **STILL DEPLOYED** — see Finding 2 |
| `core-builds-cors-proxy-staging.tlorenzato26.workers.dev` | empty / not deployed — nothing exposed |

The production proxy worker itself is in good shape: the 2026-09-03 hardening is
live (redirect refusal, rate-limit bindings, DO paste store, auth-forward
allowlist, custom-lane collapse to `custom`). The exposures below are **not** in
the request-handling core — they are stale state and stale deployments around it.

---

## Findings

### 1. [Medium — privacy] `/api/stats` still publishes pre-2026-09-03 custom-lane hostnames

`GET /api/stats` (public, unauthenticated, cached 60 s per colo, and even linked
publicly from `docs/product-opportunity-2026-09-02.md`) returns `by_host` /
`by_host_errors` dictionaries that still contain **real users' private self-hosted
AIOStreams hostnames**, written before the 2026-09-03 fix (S8):

- `aio.deuspi.xyz`
- `aiostreams-2cf65e15b59f23442becc425.nodstack.com`
- `aiostream.contentlength.com`
- `aiostreams.gentlemenbehold.com`

plus scanner/audit residue: `10.0.0.1.nip.io`, `169.254.169.254.nip.io`,
`192.168.1.1.nip.io`, `router.local`, `does-not-exist-zz9.example`,
`example.com`, `httpbin.org`, `www.github.com` (SSRF-probe canaries — proof that
third parties actively probe this worker for an open relay).

Root cause: the 09-03 fix (`hostLabel(host, isCustom)` → `'custom'`) only affects
**new** KV writes. The legacy `proxy:<hostname>` / `proxy_err:<hostname>` keys
already in the `STATS` namespace are still enumerated by `listByPrefix()` and
published verbatim. `smoke.mjs` already detects this (WARN at line 86) — it has
been warning on every deploy since, but the leak persists. It also means the KV
key space still holds attacker-written junk that every `/api/stats` rebuild
reads.

Status: **FIXED in repo on 2026-09-08** (worker version tag `2026-09-08`, pending
deploy). `/api/stats` now filters `by_host`/`by_host_errors` through
`publishableHostBuckets()`: only allowlisted hostnames (derived from
`ALLOWED_HOSTS`) plus the `custom`/`unknown` buckets are published; legacy
custom-lane hostnames and canary keys are dropped at read time while their KV
counters are kept (operator dashboards reading KV directly are unaffected).
Regression test `S8b` added; 76/76 unit tests pass. The legacy keys can still be
purged from KV once (owner action) so every `/api/stats` rebuild stops paying the
read cost for dead keys — cleanup script available on request.

### 2. [High — stale surface] Orphaned second deployment `core-builds-counter` is live and unmanaged

`https://core-builds-counter.tlorenzato26.workers.dev` responds and serves a full
mirror of the analytics (`/api/stats`, same `by_host` leak, `daily`, etc.) from
the **same production `STATS` KV namespace** (id `e21df08f…c111` in
`configurator/worker/wrangler.toml`). Live behaviour shows it runs an **older,
unversioned build** of the consolidated worker:

- `/healthz` → `404` (the 2026-09-03 build has it)
- `/api/stats` → no `version`, no `by_rate_limit` fields
- proxy custom lane: `?host=https://www.github.com` → `403 host not allowed`
  (the current build routes public-FQDN custom hosts and then refuses the
  upstream redirect with a clean 502)

Nothing in the repo points at it (`COUNTER_URL`/`CORS_PROXY`/CSP all use
`core-builds-cors-proxy`), it is not covered by CI, `smoke.mjs`, or the deploy
workflow, and its exact security posture is unknowable from here (an intermediate
revision may predate individual hardening items). Any visitor can hit its
`/api/visit`, `/api/generate`, `/paste`, `/proxy/*` routes and write to the
production KV — skewing analytics and burning KV quota on a worker nobody
watches.

Fix (owner, 1 min): Cloudflare dashboard → **Workers & Pages →
`core-builds-counter` → Delete** (nothing references it — verified by grep).
Then delete the stale `configurator/worker/` directory from the repo (the
08-21 audit's plan item 5) so it can't be re-deployed by accident.

### 3. [Action pending — secrets] Discord webhook rotation (owner action, from INFRA-AUDIT S1)

No webhook URL exists anywhere in the current tree (swept: no
`discord.com/api/webhooks`, no tokens/keys — only placeholder text in credential
forms and secrets referenced by name in GitHub workflows). However: a **live**
webhook URL was committed in the deleted `worker-contact-endpoint.js` and
remains in that file's git history. The 09-03 audit marked the fix
"✅ file deleted / ⏳ **owner rotates**", and `healthz` confirms a
`DISCORD_WEBHOOK_URL` secret **is configured in production right now**. If the
webhook was not rotated in Discord after 2026-09-03, anyone who can see the
public git history can still spam the channel — or **delete the webhook with an
unauthenticated `DELETE`**. Do this if you have not already: Discord → Server
Settings → Integrations → Webhooks → delete + recreate, then
`wrangler secret put DISCORD_WEBHOOK_URL`.

### 4. [Low] `/healthz` is public, unauthenticated, and un-rate-limited

By design (it is the CI/smoke liveness probe, no I/O). It discloses the version
tag and which bindings exist, including that a Discord webhook secret is
configured (boolean only — never the URL). Acceptable; noted for completeness.

### 5. [Low] Dead `/upload` route still wired in the badge builder

`tools/badges/index.html:1029` posts badge packs to
`https://core-builds-cors-proxy…/upload` (`type: 'worker'`), which has never
existed on the consolidated worker (404 → the client falls back to `paste.rs`).
This is INFRA-AUDIT finding R7 / plan item 13, still open. Fix: point it at
`/paste` (the worker's real, shape-checked paste endpoint) — one line.

### 6. [Low] Residual, documented exposures (unchanged, re-confirmed)

- `/t/<id>` is public-read with `ACAO: *` by design (AIOStreams hosts import
  templates) — bodies are only safe if writers use the configurator's
  credential-stripping export; a hand-pasted raw config `{config:{…}}` with API
  keys would be stored 30 days (S10, accepted + documented). `/paste` is
  rate-limited (10/min/IP) and id space is ~3.6×10¹⁵.
- Custom-lane probes of private-range hostnames (`*.nip.io`, `router.local`) are
  refused at the network layer by Cloudflare's egress (verified in the 09-03
  audit); on the current build they cannot grow KV keys or `/api/stats` output
  (everything custom is labelled `custom`).

---

## Recommended action list

| # | Action | Owner | Effort |
|---|---|---|---|
| 1 | Whitelist `by_host`/`by_host_errors` in `/api/stats` (drop non-allowlisted, non-`custom` keys at publication) | repo | S — ✅ done (2026-09-08, version tag `2026-09-08`; **deploy to take effect**) |
| 2 | Delete the live `core-builds-counter` worker in the dashboard | owner | S |
| 3 | Rotate `DISCORD_WEBHOOK_URL` if not done since 2026-09-03 | owner | S |
| 4 | Purge legacy `proxy:*` / `proxy_err:*` KV keys for non-allowlisted hosts + canary junk | owner (script provided on request) | S |
| 5 | Delete `configurator/worker/` (stale counter worker sources) | repo | S |
| 6 | Point badge builder at `/paste` instead of `/upload` (`tools/badges/index.html:1029`) | repo | S |
| 7 | Tighten `smoke.mjs` line 86 WARN into a post-deploy gate once #1 ships | repo | S — obsolete once #1 deploys (WARN can never fire again); kept as a tripwire for future regressions |

Verified non-issues (no action): rate limits enforced (bindings live), upstream
redirects refused, `Authorization` forwarded only to `api.wuplay.app`, CORS
strict-echo on mutating routes, no credentials in logs/cache/error bodies, no
secrets in the repo tree, staging empty.
