# Core Account Tools (read-only foundation)

This is intentionally separate from the Configurator. The first release is read-only:

- Sign in directly to the Stremio API from the browser.
- Load the current addon collection.
- Preview addon order and transport URLs.
- Download a local JSON backup.
- Import a backup locally for inspection.

It does **not** modify, reorder, delete, clone, or patch an account yet. Destructive features require a separate security review, diff preview, explicit confirmation, and rollback design.

Open `index.html` locally or host it as a static page. Credentials remain in page memory for the current session and are sent to the Stremio API only for the requested login/read operation.
