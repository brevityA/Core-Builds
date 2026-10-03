# aio-save-test

Saves configurator output into a **real** AIOStreams and fails on any refusal.
Every bug in the 2026-10-02 accuracy audit passed the existing unit and browser
suites; each one was a config AIOStreams refuses on save. This harness asks
AIOStreams itself. CI: `.github/workflows/aio-save-test.yml`.

## How it works

1. `run.sh` starts a throwaway AIOStreams container at the release
   `configurator/UPSTREAM.pin` names (dummy `SECRET_KEY`, no volume,
   `DISABLE_RATE_LIMITS=true`).
2. `gen-env.mjs` reads every external addon URL from that image and points it at
   `stub-addons.mjs`, a local server that answers every manifest. AIOStreams
   fetches manifests during a save; the stub keeps the result free of third-party
   uptime and real accounts. Bitmagnet (disabled until a URL is set) is included.
3. `matrix.mjs` generates configs from the built configurator (`?cb-e2e=1` hook)
   with the golden spec's default state: every service x content x resolution x
   profile, plus each optional toggle on TorBox, P2P and EasyNews.
   `save-test.mjs` fills dummy credentials from `required.json` (upstream
   `SERVICE_DETAILS`) and POSTs `/api/v1/user`.

## Variants

| Variant | Host rules | Cases |
|---|---|---|
| `open` | `REGEX_FILTER_ACCESS=all`, `SEL_SYNC_ACCESS=all` | 462 |
| `restricted` | ElfHosted's allowlist from `allowlist.elfhosted.json` (level, synced URLs, literal patterns) | 388 (free lanes skipped: ElfHosted refuses them) |

The restricted run also saves one config carrying a regex no allowlist has and
fails unless AIOStreams refuses it, so a green run cannot mean the gate was off.

Refresh the allowlist snapshot from the public status endpoint (no credentials):

```bash
node scripts/aio-save-test/snapshot-allowlist.mjs elfhosted https://aiostreams.elfhosted.com
```

## Run locally

```bash
npm run build --prefix configurator
scripts/aio-save-test/run.sh open
scripts/aio-save-test/run.sh restricted
```

`AIO_IMAGE` overrides the image, `CHROMIUM_PATH` the browser, and
`AIO_DOCKER_ARGS` adds `docker run` flags (proxy env on a restricted network).

## History

- Spike (2026-10-03): before the fixes in #778, 100 of 462 configs were refused
  (SeaDex on EasyNews/Usenet/Seedr/Debridio builds, EasyNews Search auth on
  Usenet, several service-bound toggles). After: all save.
