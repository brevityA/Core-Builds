# Core Builds Configurator

The configurator is a browser-based tool that generates optimised AIOStreams template JSON for any device and service combination.

## Architecture

Source code lives under `src/` as ES modules. The build pipeline produces two outputs:

- **Standalone** (`dist/index.html`) — everything inlined into one HTML file
- **Web** (`dist/web/`) — separate minified JS, CSS, and vendor assets for browser caching

See the modular source layout:

```
src/
  index.html          HTML shell
  js/app.js           Integration layer (rendering, state, install flows)
  data/               Pure data modules (devices, hosts, services, etc.)
  data/generated/     GENERATED from pinned AIOStreams — never hand-edit
  config/             Schema compatibility guards
  config/generated/   GENERATED from pinned AIOStreams — never hand-edit
  styles/             7 ordered CSS cascade layers
  vendor/             Third-party libraries (QR code)
scripts/
  build.mjs           esbuild bundler + standalone inliner
  validate.mjs        Static module validation
  sync-upstream.mjs   Regenerates the pinned AIOStreams contract
tests/
  *.test.mjs          Unit tests (schema, devices, hosts)
```

## Development

```bash
npm ci
npm run dev          # Local server on :8080 serving src/
npm test             # Unit tests
npm run validate     # Static validation
npm run build        # Full standalone + web build
npm run release      # test → validate → build
```

## Upstream sync

The configurator has to agree with a specific AIOStreams build about what a
valid config looks like: which keys exist, which addon presets can be resolved,
which sort criteria and enum values are legal. Rather than restating that by
hand, it is extracted from a pinned upstream commit.

`configurator/UPSTREAM.pin` names the commit:

```json
{ "repo": "Viren070/AIOStreams", "sha": "<40-char sha>", "version": "2.33.2" }
```

`scripts/sync-upstream.mjs` reads the pinned files
(`packages/core/src/utils/constants.ts`, `db/schemas.ts`,
`presets/presetManager.ts`, `streams/sorter.ts`, `package.json`) and emits:

| File | Contents |
| --- | --- |
| `src/data/generated/aiostreams-enums.js` | resolutions, qualities, visual/audio tags, channels, encodes, stream types, services, formatters, proxies, resources |
| `src/data/generated/aiostreams-presets.js` | every addon preset id `PresetManager` can resolve |
| `src/config/generated/aiostreams-config-schema.js` | every key `UserDataSchema` accepts (unknown keys are stripped upstream) |
| `src/config/generated/aiostreams-sort-schema.js` | sort scopes, criteria, directions, score keys, cached-split rule |
| `src/config/generated/upstream-snapshot.json` | the raw extraction the four modules are emitted from |

Every generated file opens with
`// DO NOT EDIT — generated from AIOStreams <sha>`. **Generated files are never
hand-edited.** Corrections and anything the extractor cannot know live in
hand-written override modules that are merged at load — today that is
`src/data/host-capabilities.js`, consumed by `src/core/host-capability-policy.js`.

### Bumping the pin

```bash
# 1. see what would change, without writing anything
node scripts/sync-upstream.mjs --sha <new-sha>

# 2. review the drift report it prints, then accept
node scripts/sync-upstream.mjs --sha <new-sha> --accept

# 3. re-run the suite; the contract tests will point at whatever broke
npm test
```

Step 1 prints a per-key drift report against the previous pin (`+`/`-` at member
level for arrays) and **exits non-zero when the schema changed but has not been
accepted**, so an unreviewed upstream change can never land silently. Commit the
regenerated files together with `UPSTREAM.pin` — they are reproducible, so a
reviewer can re-run the command and get a byte-identical tree.

| Command | Use |
| --- | --- |
| `npm run sync:upstream` | regenerate and accept at the current pin |
| `npm run sync:upstream:check` | CI guard — fails if the checked-in files do not match the pin |
| `node scripts/sync-upstream.mjs --from <aiostreams-checkout>` | read the pinned files from a local clone instead of the network |
| `node scripts/sync-upstream.mjs --offline` | regenerate from the existing snapshot only (no network) |

`sync-upstream.mjs` fetches over HTTPS and falls back to a shallow
`git fetch` of the pinned SHA when `fetch()` is unavailable. It never reads or
writes credentials, and no token is required for a public repo.

### Host capabilities

`src/data/host-capabilities.js` records what each known AIOStreams host refuses
(disabled addon presets, blocked stream types, regex access level, rate limits)
and the minimum upstream version per config key. A live `/api/v1/status` probe of
the selected host always wins over the file; when the probe is blocked by CORS or
the host is offline, the registry defaults apply and the UI asks the user to
confirm the host before installing. `src/core/host-capability-policy.js` applies
the result at the export/install boundary, so exported JSON and direct-install
payloads can never contain a key or addon the target host rejects.

## Version

Current: **v2.97.0**
