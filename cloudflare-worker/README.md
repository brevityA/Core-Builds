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
