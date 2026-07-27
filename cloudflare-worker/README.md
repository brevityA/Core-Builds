# CORS proxy + template paste for the configurator

The configurator's "Create & Install" flow tries to POST a config directly to
each public AIOStreams instance's `/api/v1/user` endpoint from the browser.
Most of those instances don't send `Access-Control-Allow-Origin`, so the
browser request is blocked before a response ever comes back.

`worker.js` is a Cloudflare Worker that does two things:

## 1. CORS proxy (`/proxy/*`)

Re-issues AIOStreams API requests server-to-server (CORS doesn't apply there)
and returns the result with permissive CORS headers. Only forwards to the
seven hardcoded public AIOStreams hosts in `ALLOWED_HOSTS`.

The configurator races a direct browser fetch against a proxied fetch via
`raceHostFetch()` — whichever responds first wins.

## 2. Template paste (`/paste`, `/t/:id`)

When the direct API call fails (CORS, host down, rate limit), the configurator
automatically uploads the template JSON to the Worker's KV store and gets back
a short URL. Users then tap an instance chip to auto-import the template into
AIOStreams via the `?template=URL` parameter.

**Fallback chain** (configurator tries each until one succeeds):
1. Cloudflare Worker `/paste` — your infrastructure, 30-day TTL
2. paste.rs — public paste service
3. dpaste.com — last resort

Templates are stored in Cloudflare KV with a 30-day TTL. Nothing is logged
or inspected. Max upload size is 512 KB.

## Deploy

Requires a free Cloudflare account and [wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
cd cloudflare-worker

# Create the KV namespace first
npx wrangler kv namespace create TEMPLATES
# Copy the printed id into wrangler.toml

npx wrangler login
npx wrangler deploy
```

The deploy output prints your Worker's URL:
`https://core-builds-cors-proxy.<your-subdomain>.workers.dev`

## Wire it into the configurator

1. Open `configurator/index.src.html` and set `CORS_PROXY` to the URL above.
2. Rebuild the obfuscated bundle: `node configurator/build.js`.
3. Commit both `index.src.html` and `index.html`.

Set `CORS_PROXY = ''` to disable the proxy and fall back to direct-fetch-only.

## CI auto-deploy (optional)

`.github/workflows/deploy-worker.yml` deploys automatically on push to
`cloudflare-worker/**` if these repo secrets are set:

- `CLOUDFLARE_API_TOKEN` — a token with Workers Scripts:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — found on the Cloudflare dashboard's right sidebar

## Hardening & security model (2026-07-27)

The worker is an **open relay by design** (it proxies/pastes on behalf of an
unauthenticated browser), so every abuse surface is bounded:

- **Proxy (`/proxy/*`)** — only forwards to the hardcoded `ALLOWED_HOSTS` (the real
  SSRF control; note the WHATWG URL parser collapses any `/..` before the handler runs,
  so a path-traversal attempt can never reach a non-allowlisted host). Request body capped
  at 2 MB (`413` on overflow), upstream fetch has a 15 s `AbortSignal.timeout`, upstream
  response capped at 8 MB, and per-IP rate-limited. Responses carry `Cache-Control: no-store`.
- **Paste (`/paste`, `/t/:id`)** — create is per-IP rate-limited and only accepts JSON
  *objects* (no generic dump); retrieval is rate-limited and returns `Cache-Control: no-store`
  because a stored paste can carry a user's config. IDs are unbiased (`crypto.getRandomValues`
  with rejection sampling) and validated against `^[a-z0-9]{6,20}$`.
- **Contact (`/contact`)** — origin allowlist (CSRF) + per-IP rate limit + field length/shape
  validation; input stripped of `<>`.
- **Analytics (`/api/*`)** — per-IP rate limits; `/api/stats` (six KV `list` calls) is also
  CDN-cached for 60 s via `Cache-Control: public, max-age=60`.
- **Counters** — `increment()` retries get→put on transient KV failures (KV has no atomic
  counter, so genuine concurrent collisions can't be fully eliminated; analytics tolerate it).

### Rate-limit storage
Rate limits are **edge-wide**, stored in the optional `RATELIMIT` KV namespace (the old
in-memory map was per-isolate and reset on every cold start, so it did nothing at the edge).
Bind it in `wrangler.toml` (see the commented `[[kv_namespaces]]` block). If it's **not**
bound, `rateAllow()` degrades to *allow* — the worker never 503s on a missing namespace.
Rate limiting keys off `cf-connecting-ip`; direct calls with no such header (e.g. unit tests)
skip the limit, since an unknown client can't be fairly bucketed (Cloudflare always sets the
header for real edge traffic).

### Legacy `configurator/worker/counter.js`
**Deprecated.** The configurator points only at this consolidated worker, and `counter.js`
writes a *different* KV key schema into the same `STATS` namespace (dead writes). Repoint any
stragglers here and delete it.
