# Direct WuPlay integration plan

## Current status

The public WuPlay configurator asks for a six-character profile key and then exposes the profile configuration menus. The linked Core Builds WuPlay Catalog Genie prototype provides useful route evidence for a consent-gated implementation: it registers a labelled web device, reads a profile snapshot, applies a limited set of verified layout changes, and keeps a receipt/undo path.

The public WuPlay releases repository still does not contain the configurator source or an official API contract. Targeted clean-room decompilation of the public Android TV `v0.9.0-beta` APK confirms the native registration, sync, and layout/profile mutation shapes below, but these remain **compatibility routes**, not a guaranteed public SDK. It defaults to read-only diagnostics and requires explicit consent for writes. Verify them against the current WuPlay release before production use.

## Recommended flow

```text
User
  │ enters profile key in a password field
  ▼
Genie UI ── HTTPS ──► WuPlay backend
  │                       │
  │                       └─ registers a temporary device (no profile key)
  ▼
Genie uses device token + profile key path/header
  │
  ▼
Build generation plan
  │
  ├─ preview: return a diff, no write
  └─ apply: write only after explicit confirmation
```

### Rules for the profile key

- Treat the six-character profile key like a password.
- Never place it in a user-facing/generated URL, query string, fragment, QR code, analytics event, export, or log. The native sync API requires the key in its request path; Genie constructs that path only for `fetch`, never for navigation or sharing.
- Never save it in `localStorage`, `sessionStorage`, IndexedDB, cookies readable by JavaScript, or a generated JSON file.
- Clear the password-field value immediately after accepting it; keep the key only in tab memory for the active API session and clear it on restart/tab close.
- The current compatibility flow uses a temporary device token for `Authorization: Bearer ...` and also sends the profile key in the native sync path/header. Do not reuse the profile key as a bearer token.
- If an official refresh mechanism is required later, use an `HttpOnly`, `Secure`, `SameSite` cookie issued by WuPlay rather than exposing a refresh token to JavaScript.

## Observed compatibility routes

The linked prototype reports the following route shapes. They are used only by the auto-apply page and should be considered compatibility code until WuPlay publishes an official contract.

### Register a labelled web device

```http
POST https://api.wuplay.app/devices/register
Content-Type: application/json

{
  "platform": "web-genie",
  "deviceModel": "WuPlay Genie (browser)",
  "deviceManufacturer": "WuPlay Genie"
}
```

The public Android client serializes these registration fields: `platform`, `appVersion`, optional `androidId`, `deviceModel`, `deviceManufacturer`, `deviceBrand`, `androidVersion`, `sdkVersion`, `securityPatch`, `socManufacturer`, and `socModel`. Its response model requires a string `token`. Genie uses non-device-identifying web values and keeps that temporary token in tab memory only; it does not display token fragments or persist the token.

The native interceptor skips the profile-key and bearer headers only for `/devices/register` and `/diagnostics/registration-failure`. For other requests to `api.wuplay.app`, it adds `X-Wuplay-Profile-Key` if absent and adds `Authorization: Bearer ...` if the request does not already provide Authorization.

### Read a profile snapshot

```http
GET https://api.wuplay.app/sync/{profileKey}[?since={epoch/value}]
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
```

The decompiled Android client adds the `X-Wuplay-Profile-Key` header for backend requests and adds the device token as `Authorization: Bearer ...`. The URL also contains the profile key for sync routes. The snapshot decodes as `SyncResponse` and includes profile, library, watchlists, saved collections, deletion lists, server time, integration state, catalogs and revision, screens and revision, layouts, and hubs. The snapshot is used for a pre-change receipt and to identify existing hubs/screens. Genie redacts `profile.profileKey` before any downloaded snapshot.

### Verified compatibility writes

```http
PATCH https://api.wuplay.app/sync/{profileKey}/hubs/{hubId}
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
Content-Type: application/json

{"detailViewType":"poster_rows"}
```

```http
PATCH https://api.wuplay.app/sync/{profileKey}/screens/{screenId}
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
Content-Type: application/json

{"viewType":"grid"}
```

```http
PATCH https://api.wuplay.app/sync/{profileKey}/profile
Authorization: Bearer {deviceToken}
X-Wuplay-Profile-Key: {profileKey}
Content-Type: application/json

{"settings":{ "...existing settings merged with requested changes..." }}
```

The native request models confirm the body shapes: hub uses exactly `detailViewType`; screen uses exactly `viewType`; profile accepts nullable `id`, `name`, `avatarKey`, `avatarColor`, `addons`, and `settings`, with the Android client sending the merged settings object. A successful profile patch decodes as `SyncProfile`; layout patches use the no-body success path. Every write must be preceded by a read snapshot, shown as a receipt, and followed by a re-read verification. Apply only changes the user explicitly approved. Avoid sending a partial settings object when the endpoint expects a full merged settings object.

### Catalog row limitations

The linked implementation reports that catalog-row create/toggle is a configurator-side route rather than a stable TV API route. `catalogs.html` therefore keeps catalog rows as a guided step or an optional bookmarklet that runs in the user's own WuPlay configurator tab. It does not guess an undocumented catalog-write endpoint.

### Official Import Data compatibility path

The public configurator currently renders an Import Data flow. Genie supports this without receiving a profile key: the user first downloads an official WuPlay JSON export, then selects it locally in Catalog Builder. Genie edits a clone, preserves unknown fields and existing IDs, changes only matching existing catalog/hub/layout/settings records, shows a change report, removes obvious profile-key and bearer-token fields, and downloads a prepared copy. The user uploads that copy manually in the official configurator; Genie never uploads it.

Because WuPlay has changed this feature across beta releases, and import may replace existing categories, treat the prepared file as a reviewed compatibility candidate rather than a guaranteed contract. Keep the original export and stop if the current importer rejects the key-free file. Missing or ambiguous records stay guided; no IDs or catalog rows are fabricated.

### Recommended official API shape

If WuPlay publishes a supported SDK later, add a preview/apply contract around the observed routes:

```http
POST /v1/generations/preview
Authorization: Bearer short-lived-token
Content-Type: application/json
```

```http
POST /v1/generations/apply
Authorization: Bearer short-lived-token
Idempotency-Key: random-client-generated-value
Content-Type: application/json
```

The API should reject expired previews, replayed idempotency keys, and writes that differ from the approved preview.

## Community sharing safeguards

Public sharing is a high-impact action. The preview should show:

- target: screen, hub, or both
- name
- visibility: private, unlisted, or public
- exactly which catalogs/folders are exposed
- whether the shared item follows future author edits

Require a separate confirmation before applying a public share. Do not include the profile key in a screen or hub share payload.

## Front-end adapter shape

Once the official contract exists, wire the current static UI to a small adapter rather than putting fetch calls throughout the wizard:

```js
export class WuPlayApi {
  constructor({ baseUrl = '/api/wuplay' } = {}) {
    this.baseUrl = baseUrl;
    this.accessToken = null;
  }

  async signIn(profileKey) {
    const response = await fetch(`${this.baseUrl}/v1/auth/profile-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profileKey })
    });
    if (!response.ok) throw new Error('WuPlay sign-in failed');
    const session = await response.json();
    this.accessToken = session.accessToken || null;
    return session.profile;
  }

  async preview(plan) {
    return this.request('/v1/generations/preview', {
      method: 'POST',
      body: JSON.stringify(plan)
    });
  }

  async apply(previewId) {
    return this.request('/v1/generations/apply', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ previewId })
    });
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`WuPlay request failed: ${response.status}`);
    return response.json();
  }

  signOut() {
    this.accessToken = null;
  }
}
```

Do not add the key to the adapter's persistent state. If the official API does not support CORS, expose a same-origin server route such as `/api/wuplay/*`; the server must use a strict allowlist, redact request bodies before logging, and never persist the key.

## Minimum information needed before enabling Apply

Obtain these from the WuPlay developer/project owner:

1. Official API base URL and API documentation
2. Authentication semantics for the profile key
3. CORS or same-origin deployment requirements
4. Read/write endpoints and schemas for catalogs, hubs, screens, add-ons, integrations, and settings
5. Whether the profile key is revocable or rotatable
6. Rate limits, error codes, and session expiry behavior
7. Rollback or backup API support
8. Confirmation that automated clients are permitted

## Included local bridge

This package includes `server.mjs`. When run with `npm start`, it serves the static files and exposes `/api/proxy/*` as a same-origin bridge. It only forwards the observed WuPlay routes to `https://api.wuplay.app`, rejects other hosts and methods, limits request bodies, times out after 20 seconds, and does not log request bodies. In Catalog Builder, enable the proxy checkbox and leave the proxy value as `/api`.

The bridge is intended for local use or a privately controlled deployment. Do not publish it behind a shared public URL without adding authentication, per-user rate limits, and an origin allowlist. A server-side bridge can see the profile key while forwarding the request, so it must be operated by someone the profile owner trusts.

Until WuPlay publishes a supported API contract, keep live writes opt-in and run the read-only handshake first. Browser-driving the public configurator is possible only as a local, user-authorized fallback, but it is brittle, cross-origin, difficult to secure, and should not be the primary implementation.
