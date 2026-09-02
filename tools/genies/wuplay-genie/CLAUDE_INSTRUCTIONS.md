# Claude handoff instructions — WuPlay Genie

You are taking over development of **WuPlay Genie**.

## Project setup

1. Unzip `wuplay-genie-update-2026-08-29.zip` if available. If the ZIP download is unavailable, use `wuplay-genie-source-bundle.md`: recreate each file from its `BEGIN FILE` / `END FILE` sections.
2. Work inside the `wuplay-genie` directory.
3. Read these files before making changes:
   - `UPDATE_GUIDE.md`
   - `README.md`
   - `docs/WUPLAY_API_INTEGRATION.md`
   - `research/README.md`
4. This is a static HTML/JavaScript app with an optional Node.js server.
5. Node.js 18 or newer is required for the local server.
6. There are no third-party npm dependencies.

## Current objective

Continue improving the safe WuPlay **Import Data** workflow.

The current design is deliberately conservative:

1. The user builds a setup plan in Catalog Builder.
2. The user selects a JSON export downloaded from WuPlay's official configurator.
3. Genie parses and modifies a local clone in the browser.
4. Genie preserves unknown fields and existing IDs.
5. Genie changes only matching existing catalogs, layout rows, hubs, and supported settings.
6. Genie shows a matched, missing, and ambiguous change report.
7. Genie removes profile-key and bearer-token fields from the generated copy.
8. Genie downloads the prepared JSON locally.
9. The user manually uploads it through WuPlay's official Import Data screen.
10. Genie must never upload the file directly.

## Non-negotiable security rules

- Never ask the user to provide a WuPlay profile key.
- Never use, test, log, store, export, repeat, or reveal a profile key.
- Never accept credentials through command-line arguments, URLs, query strings, source code, environment files, analytics, receipts, or browser storage.
- Do not use a profile key pasted into chat for testing.
- If a profile key has been exposed, advise the user to rotate or replace it.
- Do not bypass authentication or PIN protection.
- Do not automate profiles the user does not own.
- Do not send an unredacted HAR file or browser export anywhere.
- Do not include credentials in fixtures, screenshots, test output, ZIP files, or documentation.

## Known WuPlay interoperability facts

These facts came from a clean-room audit of the public Android TV `v0.9.0-beta` APK. They are compatibility observations, not an official public SDK contract.

### Registration

```http
POST https://api.wuplay.app/devices/register
Content-Type: application/json
```

The response contains a temporary `token`. Registration is excluded from the native authentication interceptor.

### Authenticated sync

The native client uses both the profile-key path/header and a separate bearer token:

```http
GET https://api.wuplay.app/sync/{profileKey}[?since={value}]
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
```

The six-character profile key is not simply used as the bearer token.

### Verified compatibility writes

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

{"settings":{"...merged existing settings..."}}
```

### Boundaries

- There is no documented official WuPlay SDK/API contract.
- Catalog-row creation, deletion, and toggling through the native API are unconfirmed.
- Catalog-row operations must remain guided/bookmarklet-based unless a current official contract is captured and verified.
- Missing hubs, screens, or catalogs must not be fabricated by guessing IDs.
- PIN-locked profiles must fall back to guided instructions.

## Files and responsibilities

### `catalogs.html`

Main Catalog Builder and compatibility adapter.

Important areas:

- Guided questions and checklist flow
- `buildPlan()` — generated setup plan
- `planToOps()` — operations derived from a plan
- `dispatchWrite()` — verified live compatibility writes
- `showAutoReceipt()` — receipts, verification, and Undo UI
- `BOOKMARKLET_SRC` — user-owned configurator-tab fallback
- Official Import Data helper — local file parsing, matching, transformation, reporting, and download

### `server.mjs`

Node 18+ static server and strict same-origin WuPlay proxy.

Rules:

- Keep the proxy route allowlist strict.
- Forward only necessary headers.
- Preserve supported `since` query parameters.
- Never log request bodies, keys, tokens, cookies, or full authenticated URLs.
- Do not add an import upload endpoint without confirmed official documentation.

### `index.html`

Main guided wizard. Preserve the existing WuPlay v0.9.0-beta feature coverage, privacy language, consent wording, and secret-free exports.

### Documentation

Update these when behavior changes:

- `UPDATE_GUIDE.md`
- `README.md`
- `docs/WUPLAY_API_INTEGRATION.md`
- `research/README.md` if audit findings change

## Import workflow requirements

The Import Data helper must:

- Work entirely in the browser/tab.
- Never upload the selected file.
- Never mutate the original selected file object.
- Start from an official WuPlay export so existing IDs and unknown fields are preserved.
- Reject a Genie planning file as if it were an official export.
- Support reasonable wrappers such as `data`, `sync`, `snapshot`, or `profileData` when present.
- Match records conservatively by exact normalized names or confirmed aliases.
- Report missing and ambiguous matches instead of guessing.
- Modify only existing records.
- Preserve unplanned visible catalogs unless the user explicitly opts into hiding them.
- Reorder matching existing catalog rows without deleting unrelated rows.
- Reorder matching existing layout rows without inventing rows.
- Update matching existing hub layout values only when the field already exists or the shape is confirmed.
- Update an existing age-filter settings object only when Kids mode was selected.
- Preserve all unrelated data categories.
- Remove obvious credential fields from the generated copy, including profile keys and bearer-token fields.
- Show prominent warnings because WuPlay import may replace existing data categories.
- Clearly label the generated file as a compatibility candidate if the official import schema is not documented.

If the official importer requires a credential that the helper removed, do not re-add it automatically. Tell the user to use the untouched official export directly in WuPlay instead.

## Do not make these changes

- Do not add a guessed `/import`, `/catalogs`, or bulk-write API route.
- Do not send the selected export to a server.
- Do not add a profile-key field to receipts, exports, URLs, hashes, local storage, or logs.
- Do not silently hide or delete unplanned catalogs.
- Do not claim official compatibility without testing against a current official export/import flow.
- Do not use a real WuPlay account or profile key as a test fixture.
- Do not bypass the official configurator's authentication or PIN prompts.

## Required validation

Before changing code:

```bash
node --check server.mjs
```

Extract the inline script from `catalogs.html` and check it:

```bash
python3 - <<'PY'
from pathlib import Path
import re
import subprocess

html = Path('catalogs.html').read_text()
for i, script in enumerate(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', html, re.S | re.I)):
    path = Path(f'/tmp/wuplay-genie-catalog-{i}.js')
    path.write_text(script)
    subprocess.run(['node', '--check', str(path)], check=True)
print('syntax checks passed')
PY
```

Add or run fake-data tests for:

- Official export detection
- Genie-plan rejection
- Wrapped export detection
- Catalog matching
- Ambiguous matches
- Missing catalog handling
- Existing layout-row reordering
- Hub matching
- Kids age-filter update
- Credential-field removal
- Unknown-field preservation
- Original-input immutability

Use fake values only.

Then run:

```bash
npm start
```

Verify manually or with read-only HTTP checks that:

- The main page loads.
- Catalog Builder loads.
- `Prepare WuPlay import file` appears after a plan is generated.
- The importer stays local and never calls a server upload endpoint.
- A Genie plan file is rejected.
- A fake official-style export is transformed correctly.
- Generated output contains no profile-key or bearer-token fields.
- Unknown fields remain.
- Unallowlisted proxy routes still return `405`.

Do not perform any authenticated WuPlay request.

## Expected response after completing work

Report:

1. Files changed.
2. Features added or corrected.
3. Import schema assumptions that remain uncertain.
4. Tests run and their results.
5. Confirmation that no profile key or authenticated account was used.
6. Whether the ZIP package was rebuilt.

If the official import schema cannot be confirmed, keep the workflow manual and clearly label the generated file as a compatibility candidate. Do not guess.
