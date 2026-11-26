# Core Account Tools

Manage the addons on a Stremio account from the browser. It is separate from the Configurator.

- **Sign in** with your Stremio email and password, or an auth key, and load the addon collection.
- **Inspect:** addon order and transport URLs.
- **Back up:** download the collection as a JSON file, or import one to inspect it locally.
- **Compare snapshots** to see what was added, removed or reordered.
- **Reorder** addons (▲ ▼) and **remove** one (×, after a confirmation).
- **Restore** a downloaded backup, after a confirmation that names how many addons will be replaced.
- **Undo** the last change. Before every change the previous list is kept in this page, up to the last 10 changes, and Undo writes it back.

## Safety

- Before each write the page reloads the account and refuses to continue if it changed since it was loaded, so it never overwrites changes made elsewhere.
- A failed write is reported and changes nothing locally.
- Undo history lives only in page memory and is lost when the page is closed or reloaded. Download a backup file before large changes.
- Credentials stay in page memory for the session and are sent only to the Stremio API.

Open `index.html` locally or host it as a static page. Tests: `npm test` (unit) and `npx playwright test` (browser flows in `e2e/mutations.spec.mjs`) in this folder.
