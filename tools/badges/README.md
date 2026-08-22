# Core Badge Builder

A no-code builder for Nuvio Fusion stream badges. The tool lives at `tools/badges/` and is published with the existing Configurator web build.

## Product contract

- Users choose catalog badges, themes, category colors, and ordering; regex is never an input.
- **Universal** output uses portable title/metadata matching and works with any Nuvio stream source.
- **AIO Enhanced** output uses exact invisible markers and requires the generated companion AIOStreams formatter.
- Badge JSON is always generated locally. A network request is made only when the user asks for a temporary import URL.
- Temporary URL fallback: Core Builds Worker (30 days) → paste.rs → dpaste (up to 365 days). A local JSON backup is downloaded before upload starts.
- The full-template option is a versioned, consume-once `sessionStorage` handoff to the existing Configurator; template-generation logic is not duplicated here.

## Structure

- `catalog.mjs` — original Core badge catalog, portable patterns, marker fields, themes, and preview fixtures.
- `marker-terms.mjs` — canonical parser-safe AIOStreams values used by Enhanced marker conditions.
- `core.mjs` — pure state normalization, pack generation, marker/formatter generation, validation, and handoff parsing.
- `app.mjs` — browser rendering, local drafts, downloads, upload fallback, and Configurator handoff.
- `assets/` — generated original Core SVG sources plus font-independent PNG runtime artwork.
- `scripts/generate-assets.mjs` — deterministic asset generator.
- `tests/core.test.mjs` — generator and compatibility regression tests.

## Development

Serve the repository root over HTTP, then open `/tools/badges/`.

```bash
node tools/badges/scripts/generate-assets.mjs
node --test tools/badges/tests/*.test.mjs
python -m pytest tests/test_badge_builder.py
```

The generated badge image URLs intentionally point to the `main` branch so published packs remain stable after the feature merges.

## Upstream contract check

On 2026-08-22, the complete 111-badge Enhanced formatter was parsed and rendered against the current `Viren070/AIOStreams` formatter engine. Both fields produced zero parser diagnostics, all representative structured fields emitted their expected markers, and the generated fields remained below the 4,900-character safety budget.
