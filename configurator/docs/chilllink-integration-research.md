# Adding Chillio / ChillLink (link.chillio.app) to the Configurator — research

Date: 2026-10-26. Status: **Phase 1 shipped in configurator v3.24** —
`src/core/chilllink-policy.js` (pure URL derivation + P2P gate), a Chillio tab in
the manifest modal, Chillio buttons in both Review deploy rows, an Express-lane
Chillio target, the `ICO.chillio` glyph, unit tests in
`tests/chilllink-policy.test.mjs`, e2e coverage in
`e2e/express-install.spec.mjs`, and the link.chillio.app helper links in the
modal help. Phases 2 (Tools-hub directory card — see the stremio-addons.net
research doc) and 3 (live `/manifest` verify button) remain optional follow-ups.

## 1. What the pieces are

- **Chillio** (`chillio.app`) — a media player for iOS / tvOS / Android TV. It plays
  IPTV (Xtream/M3U), debrid, WebDAV and, since v5.0.0 (Jan 2026), addons over the
  **ChillLink** protocol. It does **not** understand Stremio's `stremio://` deep links.
- **ChillLink Protocol (CLP)** — an open JSON/HTTPS protocol documented at
  <https://link.chillio.app/documentation>. A provider exposes a base URL with up to
  three endpoints:
  - `GET /manifest` (required) — `{ id, version, name, description, supported_endpoints: { feeds, streams } }`
  - `GET /feeds` (optional) — curated TMDB/Trakt content lists
  - `GET /streams?tmdbID=&imdbID=&type=movie|series&season=&episode=` (optional) — `{ sources: [{ id, title, url, metadata[] }] }`
  Users paste the base URL into Chillio → Settings → Manage Account → Add Account →
  ChillLink Protocol.
- **link.chillio.app** — Chillio's official tooling site, four tools:
  - `/editor` — no-code feed builder (TMDB query / Trakt list / MDB list), emits a manifest URL
  - `/manifest-merger` — combines a **feeds** endpoint from one source with a **streams**
    endpoint from another into one ChillLink URL (accepts a manifest URL and auto-converts it)
  - `/validator` — validates a CLP server (manifest/feeds/streams)
  - `/documentation` — the protocol spec
- **ChilliBridge** (`chillibridge.elfhosted.com`) — a third-party Stremio→ChillLink
  adapter. It detects AIOStreams/Comet/Meteor and returns their **native ChillLink URL**
  instead of wrapping. Exists only because people did not know AIOStreams already speaks
  ChillLink natively.

## 2. Key finding: AIOStreams already implements ChillLink natively

Feature request: [Viren070/AIOStreams#585](https://github.com/Viren070/AIOStreams/issues/585),
implemented in PR [#586](https://github.com/Viren070/AIOStreams/pull/586), merged
2026-01-02, released in **AIOStreams v2.20.0** (changelog: "chilllink: initial protocol
support (#586)"). Follow-up fix in v2.30.1 ("chilllink: pass streams parameter to
toFormatterContext", #974). Verified present in the pinned v2.36.0 tree and on current
`main`.

### Server surface (packages/server)

```ts
// app.ts — authenticated router only; there is NO keyless /chilllink/u/ route
app.use('/chilllink/:uuid/:encryptedPassword', chillLinkRouter);
// router mounts: /manifest and /streams  (no /feeds — manifest reports feeds: null)
```

- `routes/chilllink/manifest.ts` returns the CLP manifest; `supported_endpoints.feeds`
  is always `null`, `streams` is `/streams` when the config has the stream resource.
- `routes/chilllink/streams.ts` maps the CLP query (`tmdbID`, `imdbID`, `type`,
  `season`, `episode`) onto AIOStreams' normal stream pipeline.
- The router uses the standard CORS middleware, so browser probes are possible.
- Current `main` adds rate limiters and an optional config-variant suffix
  (`${variantPath}${variantQuery}`). Core Builds emits single configs (no `variants`
  key), so both suffixes are empty for us at the v2.36.0 pin.

### Transformer restriction (packages/core/transformers/chilllink.ts)

```ts
private readonly supportedTypes: StreamType[] = ['http', 'usenet', 'debrid', 'live'];
```

A source with no direct `url`, or any other stream type (notably **`p2p` / torrents**,
plus `archive`, `external`, `youtube`, `stremio-usenet`), is dropped. Chillio cannot run
a torrent engine, so ChillLink only ever carries direct playback URLs. **Consequence: a
P2P Core Build exported through ChillLink yields zero sources.** HTTP, debrid, usenet
and live builds work.

### URL shape (packages/frontend save-install.tsx)

```
Stremio:   ${baseUrl}/stremio/${uuid}/${encryptedPassword}/manifest.json
ChillLink: ${baseUrl}/chilllink/${uuid}/${encryptedPassword}
```

Same `baseUrl`, `uuid` and `encryptedPassword` the configurator already receives from
`POST /api/v1/user`. The ChillLink URL is a pure string derivation — no new network
dependency, and no call to link.chillio.app is required to produce it.

### Version coverage in the configurator's host registry

ChillLink landed in v2.20.0. `MIN_AIOSTREAMS_VERSION` is 2.32.0 and the oldest host in
`src/data/hosts.js` runs 2.35.9 (Omni; all others 2.36.0, re-audited 2026-10-22).
**Every host the configurator can route to serves ChillLink today**, so no host version
gating is needed for launch. A defensive `chilllink: '2.20.0'` note can be recorded in
`src/data/host-capabilities.js` for honesty if desired, but nothing in the current
registry would trip it.

## 3. What "adding link.chillio.app" should mean — two layers

### Layer 1 — native ChillLink install target (the actual user value)

Mirror what AIOStreams' own configure page does (its Install modal has a
Stremio/ChillLink protocol select). The configurator already performs every prerequisite
step; it only lacks the URL variant and a place to show it. No runtime dependency on
link.chillio.app.

### Layer 2 — companion links to link.chillio.app

Because AIOStreams serves **streams but no feeds**, users who want curated TMDB/Trakt
home rows combine the configurator's ChillLink URL with a feed at the Manifest Merger.
Surface the three relevant tools next to the ChillLink result:

- `https://link.chillio.app/manifest-merger` — paste the ChillLink URL as the Streams URL
- `https://link.chillio.app/editor` — build custom feeds
- `https://link.chillio.app/validator` — validate the endpoint
- `https://link.chillio.app/documentation` — protocol docs

The merger is a client-side SPA whose "Save" produces a shareable URL; whether it
accepts prefill query parameters for deep-linking is unverified (its JS bundle is not
fetchable from this sandbox). Ship plain outbound links first; revisit prefill after
checking in a browser. Outbound anchors need no CSP change — `connect-src` only governs
fetches, and all AIOStreams hosts the configurator fetches are already allowlisted.

## 4. Recommended implementation (phased)

### Phase 1 — ChillLink target in the install flow

1. **Pure helper module** — new `src/core/chilllink-policy.js` (matches the
   `src/core/*-policy.js` pure, node-testable convention; no DOM):
   - `buildChillLinkUrl({ host, uuid, encryptedPassword })` →
     `${host}/chilllink/${uuid}/${encryptedPassword}`, with input validation
     (https URL, UUID shape, non-empty password — the server route requires the
     password segment).
   - `chillLinkFromStremioManifest(stremioUrl)` — regex/URL parse of the existing
     `/stremio/uuid/epwd/manifest.json` shape into the ChillLink shape, so
     `showManifestModal()` can derive it from the one URL it already receives.
   - `chillLinkGate({ service })` → blocked when `service === 'p2p'`, with a message
     explaining Chillio cannot play torrents and suggesting a debrid/HTTP build or the
     Stremio target. Pattern after `hostRoutingDecision()` in
     `src/core/host-routing.js` (returns `{ status, reasons }`).
2. **Manifest modal** — `showManifestModal()` in `src/js/app.js` (~line 6026): add a
   formatter tab to the `FMTS` array, e.g.
   `{ key:'chillio', label:'Chillio (ChillLink)', getUrl: u => chillLinkFromStremioManifest(u), action:'copy' }`.
   This reuses auto-copy, QR code, tab switching and the password field for free. Add
   Chillio-specific help text (the in-app Add Account steps) and the three
   link.chillio.app companion links. The modal's "Test streams" button already probes
   the same host origin; an optional later addition is a `/chilllink/.../manifest` probe
   (same origin → already CSP-allowed).
3. **Review & Install deploy row** — two render sites (desktop ~line 2263, mobile
   ~line 6621), the row currently holding WuPlay/Nuvio
   (`data-action="simple-install" data-target="..."`). Add a Chillio button; add an
   `ICO.chillio` glyph in `src/data/icons.js` alongside `wuplay`/`nuvio`.
4. **Express lane** — target grid at ~line 7506:
   `[['app','Stremio',…],['nuvio',…],['wuplay',…],['manifest',…]]` → add
   `['chillio','Chillio','ChillLink URL']`. `runExpressInstall()` (~line 7714) already
   funnels every non-`app` target through manifest mode and the same `/api/v1/user`
   POST, then `showManifestModal(..., target)` opens the matching tab by key — so the
   new tab key and target id must match. Run `chillLinkGate()` before POSTing when the
   target is Chillio (P2P service).
5. **Other manifest call sites** — lines 7948, 8467, 8510, 8542 each build a Stremio
   manifest URL then open the modal; deriving inside the modal (step 2) covers all of
   them without touching each call site. The manual self-hosted path (8510) has a
   keyless Stremio form — ChillLink has no keyless route, so hide/disable the Chillio
   tab when the URL has no password segment.
6. **State/share links** — if the chosen target should persist across reloads, add the
   target to `S` and `SHARE_KEYS` (~line 682); decide whether `#cfg=` share links carry
   it (likely yes, matching installMode).

### Phase 2 — tooling links and discoverability

- Companion links inside the Chillio tab (above) and/or a "ChillLink tools" card in
  `tools/index.html` (that hub already carries external cards, e.g. the npm CLI card).
- A short section in `configurator/docs/best-addons.md` or a new user-facing guide;
  mention the Manifest Merger feed flow and the Apple App Store caveat (see risks).
- The `link-integrity` e2e only checks same-site relative links, so external https
  links are safe; the lychee link checker scans `*.md` only and is non-blocking.

### Phase 3 — optional validation

- "Verify ChillLink" button: `GET ${chillLinkUrl}/manifest` from the modal (same host
  origin, CORS-open, already inside `connect-src`), asserting the JSON returns
  `supported_endpoints.streams === '/streams'`. Mirrors the existing Test-streams probe
  at `app.js:6284`.

## 5. Project conventions this must follow (from CLAUDE.md)

- **Tests first-class.** Add `tests/chilllink-policy.test.mjs` for the pure module
  (URL derivation, password requirement, P2P gate). Update/extend
  `tests/quick-install-manifest.test.mjs` (it asserts the exact FMTS entry strings),
  `e2e/express-install.spec.mjs` (new target tile + modal assertion) and, if the host
  registry is untouched, no host e2e changes are needed.
- **Release bookkeeping.** Any `CONFIGURATOR_VERSION` bump (`src/js/app.js:49`) also
  touches `configurator/package.json`, `cli/package.json` + lockfile,
  `packages/core/package.json`, `versions.json`, and `src/data/changelog.js`.
- **Changelog rule.** This feature changes no generated template JSON, so the changelog
  entry needs the mandated `Generated output unchanged — ` item (enforced by
  `scripts/check_output_note.py` in the changelog-format CI job). The generated template
  payloads stay byte-identical; only the golden files' `metadata.coreBuildsVersion`
  stamp moves (3.23 → 3.24 for this release), which is the version-stamp-only diff
  `check_output_note.py` expects.
- **Build order.** Content edits first, `npm run build --prefix configurator` last;
  the Playwright global setup refuses stale `dist/`. Run `npm test` in configurator,
  cli and packages/core before pushing.
- **Security conventions.** URLs from the host are already escaped before
  `innerHTML` (`escHtml`/`esc`); keep that for the new strings. No credentials are sent
  anywhere new — the ChillLink URL contains the same encrypted password segment as the
  Stremio manifest URL, which the configurator already displays and copies.

## 6. Risks and caveats

- **P2P builds silently return no sources** under ChillLink — the gate in step 1.4 is
  the most important correctness control; without it users get an install that "works"
  but plays nothing.
- **Platform availability:** Apple removed Chillio (Lumos Labs) from the App Store in
  Aug 2026 amid pressure on Stremio-addon apps; Android TV and sideloaded iOS builds
  continue. Worth one honest line in docs; not a blocker — ChillLink remains an open
  protocol with multiple clients possible.
- **No `/feeds` from AIOStreams** — curated home rows require the Manifest Merger flow;
  set that expectation in the UI copy.
- **Password always required** in the ChillLink path (no `/chilllink/u/:uuid` route).
- **Protocol youth** — CLP is a Jan 2026 spec; AIOStreams' implementation has already
  needed one transformer fix (#974). Pin any version assumption to the upstream pin and
  let the existing upstream-sync drift report catch route changes.
