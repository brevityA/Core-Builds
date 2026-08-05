# Reliable Configurator V3 candidate

This is a parallel, local-first replacement candidate for the legacy Configurator.
It is deliberately not wired to the public Configurator route yet.

## V1 contract

- no synced stream-expression URLs;
- no remote expression update path;
- no Direct Install, paste upload, or generated import URL;
- no persisted credential state;
- one local Stable profile only;
- native filters, native sort, native result limits;
- Groups and Dynamic fetching disabled;
- redacted preview and diagnostics;
- manual JSON import is the initial delivery route.

## Why it is parallel

The legacy Configurator has a large feature surface. Replacing it publicly before
fixture, version, host, and import-path testing would repeat the reliability
problem V3 is meant to solve.

The V3 candidate must pass its dedicated test matrix and a controlled canary
before it replaces the legacy public route.

## Version status — 5 August 2026

- **2.31.1** remains the verified V1 target.
- **2.32.0** is deliberately shown as a compatibility-review, download-only lane until selector-runtime and import tests pass.
- V3 does not emit the legacy `torbox-search` preset or Newznab/Torznab presets, so it is insulated from v2.32's preset retirement and new `options.api` endpoint shape.
