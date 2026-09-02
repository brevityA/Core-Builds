# WuPlay Genie

A privacy-first guided setup companion for WuPlay, built as a static web app. It turns the choices introduced in WuPlay v0.9.0-beta into a simple four-step hand-off:

1. Profile and goal
2. Device, quality, subtitles, and layout
3. Frost UI, community sharing, filters, and recovery-email reminders
4. Review, copy the official link, or export setup notes

## What is included

- `index.html` — the main guided setup UI and client-side logic; no framework or package install required
- `catalogs.html` — custom home/catalog generator with guided mode, local official-export Import Data preparation, read-only diagnostics, receipt mode, optional consent-gated auto-apply, undo receipt, and same-origin bookmarklet support
- `manifest.webmanifest` — installable web-app metadata
- `sw.js` — offline app-shell cache
- `favicon.svg` — inline-friendly app icon
- `.github/workflows/deploy-pages.yml` — one-click GitHub Pages deployment workflow
- `server.mjs` — optional Node 18+ static server with an allowlisted, same-origin WuPlay API bridge
- `package.json` — `npm start` script; no third-party packages
- `.nojekyll` — keeps GitHub Pages from rewriting the static files
- `THIRD_PARTY_NOTICES.md` — attribution for the adapted Catalog Genie reference

## Run locally

Node 18+ is recommended because it includes the optional same-origin WuPlay API bridge:

```bash
npm start
```

Open <http://localhost:8000>.

In **Catalog Builder → Auto setup**, leave the proxy URL as `/api`, tick **Route requests through the optional CORS proxy**, and press **Test**. The included bridge only forwards an allowlisted set of WuPlay routes to `https://api.wuplay.app`; it forwards the native `Authorization` and `X-Wuplay-Profile-Key` headers, does not log request bodies, and is not an open proxy.

For the no-API import path, finish a plan, choose **Prepare WuPlay import file**, select a JSON export downloaded from WuPlay's official configurator, review the local matched/missing report, and download the prepared copy. Genie never uploads the file. Keep the original backup and upload the prepared file manually through WuPlay's Import Data screen; if that screen is unavailable or rejects the key-free file, use the untouched export or the guided flow.

If you only want the static UI, this also works:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

The service worker only registers on HTTP(S), so the offline/PWA features will not activate when opening the HTML directly as a `file://` URL. The app itself still works directly from the file.

## Deploy with GitHub Pages

Use this `wuplay-genie` directory as the root of a new GitHub repository:

```bash
cd wuplay-genie
git init
git add .
git commit -m "Add WuPlay Genie"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Then in GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Run the **Deploy WuPlay Genie to GitHub Pages** workflow, or push another commit.
4. Open the URL printed by the workflow.

The workflow is static; there is no build command, server, database, or secret to configure. The main wizard works as a static site. The optional auto-apply mode in `catalogs.html` calls WuPlay's API directly when the browser permits it; authenticated sync calls send both the native URL path form and `X-Wuplay-Profile-Key` header. If browser CORS blocks that request, the page exposes an explicit proxy field that must be set to a proxy you control or explicitly trust.

## Other hosting

Upload the contents of this directory to any static host such as Netlify, Cloudflare Pages, Vercel static hosting, or an ordinary web server. Set the publish directory to the directory containing `index.html`. No environment variables are required.

## Safe URL prefill support

You can open the helper with a display name and setup mode already filled in:

```text
https://YOUR-SITE.example/?profile=Living%20room&mode=improve
```

Never put a WuPlay profile key in a user-facing/generated URL, query string, QR code, analytics event, or bookmark. The native sync API necessarily receives it in a request path built for `fetch`; the helper does not accept keys from navigation URLs. Enter a key only in the password-style field during the active session.

## Privacy and security boundary

This is a front-end companion, not a replacement for WuPlay's hosted configurator. The main wizard is a guide; the optional Catalog Builder can run read-only diagnostics/handshake on request, while live compatibility writes require a separate explicit approval. It handles the profile key and temporary device token in tab memory, never stores them, and does not export them. The **Open WuPlay** action hands the user to the official configurator:

<https://config.wuplay.app/configure/>

The helper stores only non-sensitive preferences in this browser so a user can resume later. It never stores the recovery-email field, API keys, or profile keys. The JSON export explicitly excludes secrets. Use the reset button in the header to remove the saved preferences from the current browser.

## Customise the links

The official WuPlay link is defined near the top of the script in `index.html` as `officialBase`. The remaining links are ordinary `href` values in the header, sidebar, and release strip. Update those values before publishing if the project moves.

## Important implementation note

The public WuPlay releases repository is a release and issue-tracking repository, not the application source. The custom Catalog Builder includes a local official-export import preparation path plus the route pattern used by the linked Core Builds prototype for device registration, read-only profile snapshots, verified hub/screen layout writes, receipts, and undo. Its compatibility adapter follows the public Android client's temporary registration-token flow and sends the profile-key header on authenticated calls; tokens and keys remain tab-memory-only, and downloaded snapshots/import copies redact credential fields. The catalog-row part remains a same-origin bookmarklet/guided step because its configurator write route is not publicly documented. Live writes and imports are opt-in and should only be used with a profile you own; keep an original export backup and review the local import report first.
