# Operator API — stats admin token

There is no Cloudflare "stats admin API key" to copy. You generate one secret,
store it twice (Worker + GitHub), then call **this** Worker's own routes with
it.

## 1. Create the token (once)

```bash
openssl rand -hex 24
```

Must be ≥16 characters. Never commit it.

## 2. Store it

**GitHub (source of truth for CI)**

Repo: `brevityA/Core-Builds` → Settings → Secrets and variables → Actions

| Secret | Value |
|---|---|
| `STATS_ADMIN_TOKEN` | the hex string from step 1 |

`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` stay as they are (deploy only).
They do **not** unlock `/api/stats`.

**Cloudflare Worker (`ADMIN_TOKEN`)**

Either:

- After this branch is on `main`, run **Actions → Sync Worker ADMIN_TOKEN → Run workflow**, or
- Let the next `Deploy CORS Proxy Worker` run sync it automatically, or
- Locally:

```bash
cd cloudflare-worker
printf '%s' "$STATS_ADMIN_TOKEN" | npx wrangler secret put ADMIN_TOKEN
```

Until `ADMIN_TOKEN` is set on the Worker (or it is shorter than 16 chars), the
operator view is disabled and a Bearer header does nothing extra.

## 3. Call the API

Base: `https://core-builds-cors-proxy.tlorenzato26.workers.dev`

Header: `Authorization: Bearer <token>`

| Route | Public | With valid token |
|---|---|---|
| `GET /healthz` | `{ok, version}` | + `bindings`, `ready`, `breakers_open` |
| `GET /api/stats` | `{visits, generates}` | full counters (`by_host`, `daily`, errors, …), `no-store` |

```bash
# helper (reads STATS_ADMIN_TOKEN or ADMIN_TOKEN from the environment)
./cloudflare-worker/operator-stats.sh

# or raw:
curl -sS https://core-builds-cors-proxy.tlorenzato26.workers.dev/healthz \
  -H "Authorization: Bearer $STATS_ADMIN_TOKEN"
curl -sS https://core-builds-cors-proxy.tlorenzato26.workers.dev/api/stats \
  -H "Authorization: Bearer $STATS_ADMIN_TOKEN"
```

Wrong or missing token → same public payload as no header. There is no `/admin` path.

## Staging

```bash
printf '%s' "$STATS_ADMIN_TOKEN" | npx wrangler secret put ADMIN_TOKEN --env staging
```

Or run **Sync Worker ADMIN_TOKEN** with `environment=staging`.
