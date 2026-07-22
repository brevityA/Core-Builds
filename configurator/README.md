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
  config/             Schema compatibility guards
  styles/             7 ordered CSS cascade layers
  vendor/             Third-party libraries (QR code)
scripts/
  build.mjs           esbuild bundler + standalone inliner
  validate.mjs        Static module validation
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

## Version

Current: **v2.78.0**
