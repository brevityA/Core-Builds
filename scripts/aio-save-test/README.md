# aio-save-test (spike, 2026-10-03)

Saves configurator output into a **real** AIOStreams and fails on any refusal.
Every bug in the 2026-10-02 accuracy audit passed the existing unit and browser
suites; each one was a config AIOStreams refuses on save. This harness asks
AIOStreams itself.

## How it works

1. `stub-addons.mjs`: a local HTTP server that answers every external addon
   manifest. AIOStreams fetches manifests with the user's credentials during a
   save; pointing every `*_URL` preset env var at the stub keeps the test
   deterministic and free of real accounts.
2. A throwaway AIOStreams container, pinned (`ghcr.io/viren070/aiostreams:v2.35.7`),
   dummy `SECRET_KEY`, `DISABLE_RATE_LIMITS=true`, no persistent volume.
3. `matrix.mjs` generates configs from the built configurator (`?cb-e2e=1` hook):
   every service x content x resolution x profile, plus each optional toggle on
   TorBox, P2P and EasyNews. `save-test.mjs` fills dummy credentials from
   `required.json` (upstream `SERVICE_DETAILS`) and POSTs `/api/v1/user`.

## Run locally

```bash
npm run build --prefix configurator
node scripts/aio-save-test/stub-addons.mjs &
ENVS=$(grep -o "envBase: '[A-Z_]*'" <aiostreams-src>/packages/core/src/config/schema/presets.ts | ...)  # see spike notes
docker run -d --network host -e PORT=3999 -e BASE_URL=http://127.0.0.1:3999 \
  -e INTERNAL_URL=http://127.0.0.1:3999 -e SECRET_KEY=$(openssl rand -hex 32) \
  -e REGEX_FILTER_ACCESS=all -e SEL_SYNC_ACCESS=all -e DISABLE_RATE_LIMITS=true \
  $ENVS ghcr.io/viren070/aiostreams:v2.35.7
AIO_URL=http://127.0.0.1:3999 node scripts/aio-save-test/matrix.mjs
```

## Spike result

- Container ready in ~4 s; each save ~150 ms; 462 configs in ~80 s.
- Before the fixes in #778: 100 of 462 refused (SeaDex on EasyNews/Usenet/Seedr/
  Debridio builds, EasyNews Search auth on Usenet, several service-bound toggles).
- After: 458 of 462 save. The remaining 4 are setup artifacts: Bitmagnet is not
  configured on the test container, and the stub does not answer the URL
  USA TV Next requests.

## Still to do before this gates PRs

- Commit the `*_URL` env list (generated from the pinned contract, not grepped).
- Stub Bitmagnet (`BITMAGNET_URL`) and fix the USA TV Next stub path.
- A host-restricted variant (`REGEX_FILTER_ACCESS=trusted` + ElfHosted's
  allowlist) so regex allowlist failures are caught too.
- GitHub Actions job: service container + stub + matrix, on PRs touching
  `configurator/` or `packages/core/`.
