# Exposure check — Configurator (2026-09-08)

Scope: `configurator/src` (+ regenerated `configurator/index.html`), every place
user credentials (debrid/TMDB/instance/Stremio) or generated configs can leave
the page, and every place remote content can reach the DOM. Same method as the
worker audit: follow each trust boundary in code, verify against the deployed
surface.

## What is solid (verified, no action)

- **No hardcoded credentials anywhere** in `src/` or the built artifact
  (webhook/API-key/token patterns — none real).
- **Import URLs never carry credentials.** `sanitizeTemplateForRemoteImport`
  (src/core/import-template.js) recursively strips any key matching
  `api.?key|access.?token|authorization|auth.?key|password|secret|token`,
  blanks whole `credentials` objects and StreamNZB manifest URLs, keeps only
  the public RPDB free id, and disables presets that would be left invalid.
  Applied to worker `/paste` **and** the paste.rs/dpaste fallbacks
  (uploadTemplateForImport → uploadJsonForImport, app.js:7574). Unit tests
  9/9 (import-template/import-sanitizer/input-sanitize) pass.
- **Share links (#cfg=) carry wizard selections only** — explicit
  `SHARE_KEYS` allowlist, validated on import by `sanitizeSharedConfig`
  (app.js:402–534). No keys/tokens/UUIDs/passwords.
- **Stremio creds** go only to `api.strem.io` (login/collection endpoints);
  debrid/instance creds go only to the chosen AIOStreams host (direct or via
  the worker proxy, which never logs bodies).
- **Error logger** (`src/js/error-logger.js`): localStorage ring buffer only —
  no upload endpoint. Fetch URLs scrubbed (`/stremio/{uuid}/{pwd}/`,
  `password=`/`apiKey=`/`token=` → `***`), context masked via a
  single-source-of-truth denylist derived from `PROVIDER_CREDENTIALS`, all
  rendering escaped, export = local file download.
- **Beacons** (`/api/visit`, `/api/generate`, `/contact`) carry no credential
  data (labels/versions only). Worker `/api/stats` public payload is now just
  `{visits, generates}` and is only ever numbers into `fmt()`.
- **Instance chips / custom-host UI** — labels are static registry values;
  URLs pass through `encodeURIComponent`; attribute values escaped.
- **No iframes, objects or workers** in the app.

## Fixed this pass (committed, 484/484 unit tests)

1. **CSP tightened** (src/index.html + rebuilt index.html): added
   `frame-src 'none'`, `object-src 'none'`, `worker-src 'none'`,
   `frame-ancestors 'none'` — the page can no longer be framed by another
   origin, and plugin/worker vectors are closed. `base-uri`/`form-action
   'self'` already present.
2. **`Referrer-Policy: no-referrer` meta** — manifest URLs carry
   `<uuid>/<password>` path segments; no outbound navigation may leak them
   via the Referer header.
3. **Update-banner XSS hardening**: `remoteUpdateBannerHtml` now escapes
   changelog versions/bodies and `p.from`/`p.to` — only `p.name` was escaped.
   The changelog text is fetched from `metadata.changelogUrl`, which for
   URL-imported templates is an **arbitrary host-controlled URL**
   (app.js:4961+), i.e. a narrow but real injection path into a page that
   holds every debrid API key in localStorage.

## Residual risks (accepted by design — flagging for awareness)

- **Credentials live in localStorage in plaintext** (`coreBuild`,
  `coreBuildBackups`), because the wizard must survive reloads and restores.
  The page already carries the strongest CSP compatible with the inlined
  single-file bundle (`script-src 'unsafe-inline'` is required by inline
  handlers/scripts). The remaining XSS surface is DOM sinks fed by user/remote
  text; those are escaped at the sites reviewed, and e2e guards exist
  (security-sinks C2 hostile `/api/stats`, radio-allowlist-xss,
  input-sanitize). Long-term hardening if ever desired: split the bundle into
  external scripts and move CSP to `script-src 'self'` + nonces/hashes, and
  offer an optional "don't persist keys" mode.
- **paste.rs / dpaste.com fallbacks** are unmonitored third parties (audit F7);
  they only ever receive the sanitized template (no creds). Worker `/paste`
  has the same sanitized input; its `/t/<id>` is public by design.
- **Import of a URL-imported template's own update feed** is now escaped
  (fix 3) but still fetches third-party URLs the template declares
  (`sourceUrl`, `changelogUrl`) — confined to version-compare + escaped
  display.

## Owner actions (unchanged from the worker audit)

- Deploy the regenerated `configurator/index.html` (GitHub Pages/CI on merge).
- Rotate the Discord webhook if not done since 2026-09-03.
- Delete the live `core-builds-counter` worker in the Cloudflare dashboard.
- Optional: badge-builder `/upload` → `/paste` (tools/badges/index.html:1029).
