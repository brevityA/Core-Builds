# CORS proxy for the configurator

The configurator's "Create & Install" flow tries to POST a config directly to
each public AIOStreams instance's `/api/v1/user` endpoint from the browser.
Most of those instances don't send `Access-Control-Allow-Origin`, so the
browser request is blocked before a response ever comes back — today the
configurator silently falls back to a manual paste-back flow when that happens.

`worker.js` is a small Cloudflare Worker that re-issues the same request
server-to-server (CORS doesn't apply there) and returns the result with
permissive CORS headers, so the browser can use it. It only forwards to the
seven hardcoded public AIOStreams hosts in `ALLOWED_HOSTS` — nothing else, and
nothing is logged or stored.

The configurator races a direct browser fetch against a proxied fetch via
`raceHostFetch()` (`configurator/index.src.html`) — whichever responds first
wins, so this is a pure improvement: if an instance ever adds CORS headers
itself, the direct attempt keeps winning as before.

## Deploy

Requires a free Cloudflare account and [wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

The deploy output prints your Worker's URL:
`https://core-builds-cors-proxy.<your-subdomain>.workers.dev`

## Wire it into the configurator

1. Open `configurator/index.src.html` and set `CORS_PROXY` to the URL above.
2. Rebuild the obfuscated bundle: `node configurator/build.js`.
3. Commit both `index.src.html` and `index.html`.

Set `CORS_PROXY = ''` to disable the proxy and fall back to direct-fetch-only
(today's behavior).

## CI auto-deploy (optional)

`.github/workflows/deploy-worker.yml` deploys automatically on push to
`cloudflare-worker/**` if these repo secrets are set:

- `CLOUDFLARE_API_TOKEN` — a token with Workers Scripts:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — found on the Cloudflare dashboard's right sidebar
