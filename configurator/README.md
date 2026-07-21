# Core Builds v2.75 UI update

## Changes
- Rebuilt the landing screen with the approved hybrid direction: Precision structure, editorial typography, Aurora depth, Bento presets, and Command-style microcopy.
- Preserved all existing configurator actions, saved-session resume flow, service selection, quick presets, comparison, changelog, and support modal behavior.
- Renamed visible Reddit community links to **Core Crew** (destinations remain unchanged).
- Removed the floating heart support control.
- Removed the Support links from the splash and final-review footers.
- Turned the centred Core logo into the support trigger; a pulsing gem, expanding signal ring, permanent “Support project →” label, and hover/focus feedback make the interaction explicit.
- Replaced the heart in the support dialog header with a miniature Core mark.
- Added `ui-design-preview.html` with four standalone UI directions. Direction A matches the implementation.

## Changelog
- **v2.75 — 21 July 2026:** Unified the hybrid design across all menus and workflows; added dedicated iPhone, Android, tablet, desktop, landscape, and standalone-PWA behavior; completed static debugging and build validation.
- **v2.74 — 21 July 2026:** Hybrid landing-page redesign, simplified pulsing Core support affordance, Core Crew naming, retained live usage counters, responsive layout, and preservation of existing configurator workflows.

## Files
- `index_src.html` — readable source.
- `index.html` — standalone build with the QR library inlined.
- `ui-design-preview.html` — interactive visual comparison.
- `build.js` and `qrcode.min.js` — retained build assets.
