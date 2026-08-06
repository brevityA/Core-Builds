# Reliable Configurator — Runtime Gates

This directory contains deterministic, credential-free reliability gates for the
parallel Reliable Configurator V3 candidate.

## What is tested here

### 1. Selector contract against real upstream parsers

`fixtures/selector-contract.v1.json` is executed through the compiled
AIOStreams `StreamSelector` parser from pinned upstream versions:

```text
v2.31.1
v2.32.0
```

It proves the selector semantics used to reason about Core output, including:

- external/YouTube stream selection;
- multi-episode detection;
- season-pack detection;
- unknown-language handling;
- release-group absence; and
- the v2.32-only `idMatched()` feature gate.

It is intentionally **not** a live provider test. It has no credentials, no
network fetches, no user configurations, and no playback requests.

### 2. Timing contract

`fixtures/fetch-timing-contract.v1.json` is a deterministic product-level mock.
It makes the speed/coverage trade-off visible:

- Default waits for every source that completes inside the timeout.
- Dynamic can return early and omit later results.
- Sequential Groups can skip a fallback group.
- Metadata delay and unassigned sources are reported instead of silently hidden.

V3 Stable uses neither Dynamic nor Groups.

## Prepare upstream parser runtimes

Use isolated upstream checkouts; do not place them inside this repository.
The exact command depends on your Node/pnpm installation. A working outline:

```bash
# for each pinned tag
 git clone --depth 1 --branch v2.31.1 https://github.com/Viren070/AIOStreams.git /work/aio-v231
 git clone --depth 1 --branch v2.32.0 https://github.com/Viren070/AIOStreams.git /work/aio-v232

# in each checkout, with the Node version required by that AIOStreams tag
 pnpm --filter @aiostreams/core install --frozen-lockfile
 node scripts/generateMetadata.cjs
 pnpm --filter @aiostreams/core run build
```

The upstream runtime needs its normal generated `resources/metadata.json` and
compiled core package. The Core Builds runner will fail closed if either is
missing or the supplied checkout reports the wrong version.

## Run the cross-version selector gate

```bash
cd configurator
AIOSTREAMS_V231_ROOT=/work/aio-v231 \
AIOSTREAMS_V232_ROOT=/work/aio-v232 \
AIOSTREAMS_NODE=/path/to/the-upstream-compatible-node \
npm run test:upstream-selector
```

Expected result:

```text
Upstream selector contract: 12 checks passed across 2 pinned versions.
```

## Run the v2.32 Newznab migration gate

This validates AIOStreams' actual `applyMigrations()` path using a synthetic
endpoint with no API key:

```bash
cd configurator
AIOSTREAMS_V232_ROOT=/work/aio-v232 \
AIOSTREAMS_NODE=/path/to/the-upstream-compatible-node \
npm run test:upstream-v232-nab
```

Expected result:

```text
Upstream v2.32 Newznab migration contract: passed.
```

## Manual import matrix

`import-matrix.v1.json` is a deliberately empty, sanitized execution checklist.
It enforces the delivery order:

```text
local JSON → import URL → Direct Install
```

for both 2.31.1 and 2.32.0. It records only version, host class, route, client,
profile, status, and sanitized outcome. It must never contain a host URL,
credential, UUID, password, token, or manifest link.

```bash
cd configurator
npm run validate:import-matrix
```

## Boundaries

Passing this gate does **not** prove:

- public-host preset availability;
- provider response timing;
- local JSON import;
- import URL or Direct Install;
- playback on a specific client/device; or
- canary reliability.

Those are the next gates. Do not call v2.32 verified until this selector gate,
then the sanitized import matrix, pass.
