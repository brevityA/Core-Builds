# Parts 6–9: Generator Extraction — Strict Implementation Contract

## Objective

Extract filtering, addon assembly, and final template generation from the browser-bound Configurator without changing generated output, UI behaviour, or golden fixtures.

This work must be delivered as one reviewable feature branch with four commits and one final patch artifact.

## Non-negotiable invariants

1. Existing golden JSON files must remain byte-identical except approved volatile metadata.
2. No new network, DOM, `window`, `localStorage`, or `navigator` access may be introduced into `src/core/`.
3. Core modules must not import `app.js`.
4. Credentials must never be included in generated diagnostics or test fixtures.
5. The UI must continue to use the extracted generator; no duplicate generation path is permitted.
6. `npm test`, `npm run validate`, `npm run build`, `npm run test:e2e`, and root `pytest -q` must pass.
7. Any intentional golden change requires a separate explanation and explicit `UPDATE_GOLDEN=1` run.
8. No generated `configurator/index.html` changes may be accepted without a successful source build.

## Commit 1 — Part 6: filtering policy

Create:

- `configurator/src/core/filter-policy.js`
- `configurator/src/core/size-policy.js`
- `configurator/src/core/bitrate-policy.js`
- `configurator/tests/filter-policy.test.mjs`

Extract pure logic for:

- Resolution exclusions and preferences
- Size bounds
- Bitrate bounds and bandwidth cap
- TMDB-dependent filtering
- Title/year/digital-release matching
- Age-rating filtering
- Language preferences
- Audio/video exclusions
- Regex tiers
- Cached and uncached behaviour

Required API:

```js
filterPolicy(input, dependencies)
sizePolicy(input)
bitratePolicy(input)
```

Dependencies must be explicit arguments. Do not import browser state.

## Commit 2 — Part 7: addon and preset assembly

Create:

- `configurator/src/core/addon-policy.js`
- `configurator/tests/addon-policy.test.mjs`

Extract:

- Enabled preset selection
- Dynamic addon groups
- Primary/secondary group construction
- `instanceId` generation
- Timeout assignment
- Optional scraper selection
- Cached-aware conditions
- Empty-group prevention
- Soft-fail metadata

Required API:

```js
addonPolicy(input, dependencies)
```

Every generated preset must satisfy:

- Non-empty `instanceId`
- Valid `type`
- Valid `options`
- Explicit timeout where applicable
- No disabled credential-bearing preset
- No empty group

## Commit 3 — Part 8: generator facade

Create:

- `configurator/src/core/generate-template.js`
- `configurator/src/core/generator-schema.js`
- `configurator/tests/generate-template.test.mjs`

Required API:

```js
export function generateTemplate(rawInput, dependencies = defaults) {
  const input = templateInput(rawInput);
  const devices = devicePolicy(input, dependencies);
  const filters = filterPolicy(input, dependencies);
  const sort = sortPolicy(input);
  const addons = addonPolicy(input, dependencies);
  return validateAndNormalize({ input, devices, filters, sort, addons });
}
```

The facade must be deterministic. The same input must produce the same output apart from explicitly removed volatile metadata.

It must not:

- Read global `S`
- Access the DOM
- Call `fetch`
- Write storage
- Generate random IDs
- Include timestamps unless passed in explicitly

Move random/template metadata generation to a UI adapter or inject it as a dependency.

## Commit 4 — Part 9: e2e and UI integration

Replace the current e2e-only browser-bound generation hook with:

```js
window.__coreBuilds.generate = input => generateTemplate(input, testDependencies);
```

The UI path must call the same facade:

```js
const config = generateTemplate(S, runtimeDependencies);
```

The adapter may add:

- UI state conversion
- Credentials
- Runtime metadata
- Host/deployment information

It must not duplicate policy logic.

Update:

- `configurator/e2e/golden-configs.spec.mjs`
- `configurator/e2e/stability.spec.mjs`
- `configurator/tests/*.test.mjs`

Add checks that:

1. UI generation and direct generation produce equivalent configs.
2. Golden output is unchanged.
3. No core module references DOM/browser globals.
4. Credentials are absent from snapshots.
5. TMDB/no-TMDB configurations differ only in intended feature flags.
6. Mixed/Apex Mixed output retains the current PSE and sort contracts.

## Required review commands

```bash
cd configurator
npm ci
npm test
npm run validate
npm run build
npm run test:e2e
cd ..
pytest -q
```

## Required static checks

```bash
grep -RInE "document|window|localStorage|sessionStorage|navigator|fetch\\(" configurator/src/core
```

The command must return no results except test-only comments or explicitly injected adapter code.

## Final patch generation

After all four commits pass:

```bash
git diff origin/main...HEAD --binary > generator-parts-6-9.patch
```

Do not publish or merge the patch if any required command fails.
