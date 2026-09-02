# WuPlay Genie update package

This package contains the current WuPlay Genie source, the compatibility adapter, the local development proxy, deployment files, and the clean-room interoperability notes.

## What is in this package

- `index.html` — main guided/checklist wizard for WuPlay v0.9.0-beta features.
- `catalogs.html` — custom home/catalog generator, consent-gated Auto Setup, receipt mode, live compatibility writes, verification, Undo, and the guided/bookmarklet fallback.
- `server.mjs` — Node 18+ static server and strict same-origin WuPlay bridge.
- `docs/WUPLAY_API_INTEGRATION.md` — route, schema, authentication, security, and SDK guidance.
- `README.md` — user-facing setup, hosting, and privacy notes.
- `research/README.md` — clean-room audit reproduction notes and why the APK is not redistributed in the update archive.
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment.
- `manifest.webmanifest`, `sw.js`, `favicon.svg`, `_headers`, `.nojekyll` — PWA/static-host support.
- `THIRD_PARTY_NOTICES.md` — attribution for adapted Core Builds code.

The update archive intentionally excludes `research/wuplay-androidtv.apk`. It is an official-release binary used for analysis, not required to run the Genie, and should not be redistributed unless its licensing permits it.

## Run locally

Requirements: Node.js 18 or newer. There are no third-party npm dependencies.

```bash
cd wuplay-genie
npm start
```

Open `http://localhost:8000`.

For Auto Setup:

1. Open **Catalog Builder**.
2. Choose **Auto setup**.
3. Leave the proxy URL as `/api` and enable the optional proxy when direct browser CORS blocks WuPlay.
4. Run the read-only diagnostics or handshake if desired.
5. Enter the profile key from WuPlay's Edit Profile screen locally. Never paste it into chat, a URL, a share link, or a report.
6. Design the plan.
7. Choose receipt mode or separately approve the live apply.

The local server forwards only allowlisted WuPlay routes. It forwards `Authorization` and `X-Wuplay-Profile-Key`, preserves the supported `since` query, does not log request bodies, and is not an open proxy.

## Authentication lifecycle

The current public Android TV client does not use the six-character profile key as a bearer token.

1. Genie registers a temporary web-labelled device with `POST /devices/register`.
2. WuPlay returns a temporary `token`.
3. The token is sent as `Authorization: Bearer {deviceToken}`.
4. Authenticated sync calls use both the native profile-key path and header:

   ```http
   GET /sync/{profileKey}[?since={value}]
   Authorization: Bearer {deviceToken}
   X-Wuplay-Profile-Key: {profileKey}
   ```

5. The key and token remain in tab memory only. The key field is cleared after acceptance. Closing or restarting the tab ends the Genie session.

The native client skips automatic auth-header injection only for `/devices/register` and `/diagnostics/registration-failure`. The Genie registration request is intentionally unauthenticated.

## Currently supported live compatibility writes

These route shapes were extracted from the public `v0.9.0-beta` APK and are not an official public SDK contract:

```http
PATCH /sync/{profileKey}/hubs/{hubId}
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
Content-Type: application/json

{"detailViewType":"poster_rows"}
```

```http
PATCH /sync/{profileKey}/screens/{screenId}
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
Content-Type: application/json

{"viewType":"grid"}
```

```http
PATCH /sync/{profileKey}/profile
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
Content-Type: application/json

{"settings": {"...merged existing settings...": "..."}}
```

The adapter reads a snapshot before writes, records per-operation receipts, re-reads for verification, and keeps supported Undo data in tab memory. The exported receipt contains no profile key. Exported structural snapshots remove `profile.profileKey` and withhold library contents.

## Official Import Data mode

The Catalog Builder now includes **Prepare WuPlay import file**. This is a local file transformer, not a server upload:

1. Build a Genie plan.
2. In the completed plan, choose **Prepare WuPlay import file**.
3. Select a JSON export downloaded from the official WuPlay configurator.
4. Review the local report of matched, missing, and ambiguous catalogs/hubs/screens.
5. Download the prepared copy.
6. Keep the original export as a backup, open the official configurator, and upload the prepared file through its Import Data screen.

The transformer starts from the official export so it can preserve unknown fields and existing IDs. It changes only matching existing catalog visibility/order, matching existing hub layout values, matching existing layout rows, and the existing age-filter settings object when Kids mode was selected. It does not invent missing catalog, hub, screen, or ID records. Missing or ambiguous items remain guided. The generated copy removes profile-key and bearer-token fields and is never uploaded by Genie.

If WuPlay's current configurator does not show Import Data, or if its importer rejects a key-free prepared file, stop and use the untouched official export or the guided/bookmarklet flow. Do not guess a replacement schema.

## Known boundaries

- Catalog-row creation, deletion, and toggling are not implemented as guessed API calls. They remain guided or use a bookmarklet that runs in the user's own official configurator tab.
- PIN-locked profiles are never bypassed. The adapter pauses live writes and falls back to guided steps.
- Missing hubs/screens and unsupported operations fall back to guided mode.
- The public WuPlay project does not currently provide a documented official SDK/API contract. Treat the extracted route shapes as compatibility behavior and re-check them after app updates.
- No supplied or user-owned profile should be used for testing without explicit approval. The default tests in this package are static, read-only, unauthenticated, or allowlist checks.

## Files to edit when updating behavior

### Add or change wizard questions and generated setups

Edit `catalogs.html`:

- `state` and question helpers define the guided flow.
- `buildPlan()` and `planToOps()` define generated setup plans.
- `dispatchWrite()` defines live operations.
- `showAutoReceipt()` defines receipt/Undo UI.
- `BOOKMARKLET_SRC` defines the user-tab guided catalog fallback.

Keep the flow consent-gated. New operations should either have a confirmed contract or throw the existing `{ guided: true, message }` fallback object.

### Change WuPlay compatibility behavior

Edit `catalogs.html` and `server.mjs` together:

- Keep the profile key in the native path form for routes that require it.
- Keep `X-Wuplay-Profile-Key` on authenticated calls.
- Keep `Authorization: Bearer {deviceToken}` separate from the profile key.
- Add a server allowlist entry before adding a new proxied route.
- Do not log request bodies, keys, tokens, or full authenticated URLs.

Update `docs/WUPLAY_API_INTEGRATION.md` with evidence and limitations whenever a route changes.

### Update the main wizard or release coverage

Edit `index.html`. Preserve the existing v0.9.0-beta feature coverage, guided flow, consent language, and export redaction. If the static assets change, bump `CACHE_NAME` in `sw.js` so deployed PWAs do not keep stale HTML.

## Re-running the clean-room audit

The latest APK used for this package was downloaded from the official releases URL:

```text
https://github.com/wuplayapp/wuplay-releases/releases/latest/download/wuplay-androidtv.apk
```

Recorded SHA-256 for the analyzed file:

```text
afa5b3599dad10620a532ff7000f40ec01643fd54fdec8bf19902b17b1f42def
```

Use targeted JADX extraction rather than a full decompilation if memory is limited. The relevant class names are:

```text
app.wuplay.androidtv.network.BackendAuthInterceptor
app.wuplay.androidtv.network.BackendHttpClient$registerDevice$2
app.wuplay.androidtv.network.BackendHttpClient$getSync$$inlined$safeApiCall$default$1
app.wuplay.androidtv.network.BackendHttpClient$patchHubLayout$2
app.wuplay.androidtv.network.BackendHttpClient$patchProfile$$inlined$safeApiCall$1
app.wuplay.androidtv.network.DeviceRegisterRequest
app.wuplay.androidtv.network.DeviceRegisterResponse
app.wuplay.androidtv.network.SyncResponse
app.wuplay.androidtv.network.ProfileUpdateRequest
app.wuplay.androidtv.network.HubLayoutUpdateRequest
app.wuplay.androidtv.network.ScreenLayoutUpdateRequest
```

Example targeted extraction:

```bash
jadx --single-class \
  'app.wuplay.androidtv.network.BackendHttpClient$patchHubLayout$2' \
  -d /tmp/wuplay-jadx-single \
  research/wuplay-androidtv.apk
```

Do not use a supplied profile key during audit work. Do not bypass PIN protection, defeat authentication, extract secrets, or automate an account that the operator does not own.

## Validation before publishing

```bash
node --check server.mjs
python3 - <<'PY'
from pathlib import Path
import re, subprocess
html = Path('catalogs.html').read_text()
for i, script in enumerate(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', html, re.S | re.I)):
    path = Path(f'/tmp/wuplay-genie-catalog-{i}.js')
    path.write_text(script)
    subprocess.run(['node', '--check', str(path)], check=True)
print('syntax checks passed')
PY
```

Then test the local server's static page and proxy allowlist without credentials. Never include a real profile key in automated tests or commits.

## Deploying the static site

GitHub Pages can host the guided wizard and the non-proxy UI using the included workflow. Static hosting cannot provide the bundled Node bridge. For live Auto Setup from a static host, use direct WuPlay requests only if the browser's CORS policy permits them, or run `server.mjs` on infrastructure you control and protect it with authentication, rate limits, and an origin allowlist.
