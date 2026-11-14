# Core formatter collection: contributor notes

The Compact, Detailed and Badges styles live in
`configurator/src/data/core-formatters.js`. They are built from segments, not
written by hand, and are appended to `FORMATTERS` in `formatters.js`, so the
existing picker, share links and import all handle them.

## How a style is built

- `joined(segments, sep)` prints each segment only when its condition holds, and a
  separator only between two present segments.
- AIOStreams evaluates `::or::` / `::and::` chains left to right with no grouping.
  The separator guard relies on that, so **every segment condition must test one
  field** (`stream.size::>0`, not `a::and::b`). `joined()` throws if one does not.
- Branch text uses double quotes (`["text"||""]`). Single-quoted branches are
  invalid and render `{invalid_expression(...)}`.
- AIOStreams removes lines that render empty, so an optional line needs no guard.

## Testing against the real engine

`configurator/tests/helpers/aiostreams-formatter-engine.mjs` fetches AIOStreams'
formatter engine at the commit in `configurator/UPSTREAM.pin` into a temp
folder, bundles it with esbuild and renders templates with it. The engine is
AGPL, so it is never committed. Offline runs skip; CI requires it.

Fixtures must start from `parseValue()`, which sets every registered field the
way AIOStreams does (null, or false for flags). A fixture that leaves a field
undefined renders `{unknown_propertyName(...)}`, which the real thing never does.

## Adding a style

1. Add a builder to `core-formatters.js` and an entry to `CORE_FORMATTER_STYLES`.
2. Add its line limits to `LINE_LIMITS` in `tests/core-formatters.test.mjs`
   and any style-specific assertions.
3. Regenerate the previews: `node scripts/render-core-formatter-previews.mjs`.
4. `npm test`, `npm run build`, then the e2e spec `e2e/core-formatters.spec.mjs`.

Previews in `src/data/core-formatter-previews.js` are generated, never edited;
a test fails when they no longer match the engine's output.
