# Core Account Tools

Manage the addons on a Stremio account from the browser. It is separate from the Configurator.

- **Sign in** with your Stremio email and password, or an auth key, and load the addon collection.
- **Inspect:** addon order and transport URLs.
- **Back up:** download the collection as a JSON file, or import one to inspect it locally.
- **Compare snapshots** to see what was added, removed or reordered.
- **Reorder** addons (▲ ▼) and **remove** one (×, after a confirmation).
- **Restore** a downloaded backup, after a confirmation that names how many addons will be replaced.
- **Install** an addon from its manifest link (https or `stremio://`) on your Stremio account or a Nuvio profile.
- **Copy addons** from your Stremio account to a Nuvio profile, from a Nuvio profile to Stremio, or from another Stremio account into yours. Choose *add the ones that are missing* or *replace the whole list*. Replacing a Stremio list keeps its protected addons (Cinemeta, Local Files); links that are not https are never copied. The other Stremio account is only read.
- **Undo** the last change. Before every change the previous list is kept in this page, up to the last 10 changes, and Undo writes it back.

## Safety

- Before each write the page reloads the account and refuses to continue if it changed since it was loaded, so it never overwrites changes made elsewhere.
- A failed write is reported and changes nothing locally.
- Undo history lives only in page memory and is lost when the page is closed or reloaded. Download a backup file before large changes.
- Credentials stay in page memory for the session and are sent only to the Stremio API, or for Nuvio only to the Nuvio API (`api.nuvio.tv`, with the publishable client key from Nuvio's API docs). Passwords are cleared from the form after sign-in.
- Nuvio's `sync_push_addons` replaces a profile's whole list, so every Nuvio write first re-reads the profile, keeps that list for Undo, then writes. A profile that shares profile 1's addons (`uses_primary_addons`) writes to profile 1.

Open `index.html` locally or host it as a static page. Tests: `npm test` (unit) and `npx playwright test` (browser flows in `e2e/mutations.spec.mjs` and `e2e/transfer.spec.mjs`) in this folder.
