# Quick install dashboard

The full custom builder is unchanged. Quick install is three labelled steps (install to, service, preferences) with
everything else under one collapsed **Options & defaults** panel.

| Step | Controls | Existing integration |
| --- | --- | --- |
| 1 · Install to | Delivery switch (Direct Install / Manifest URL / Raw JSON); Stremio, Nuvio, WuPlay, Chillio, Other app as logo rows; Stremio sign-in when Stremio + Direct | `runExpressInstall`, `simpleInstall`, `generate` |
| 2 · Service | Provider rows with logos, keys (paste + show/hide), AIOStreams host with live health chip, additional services | `renderCreds`, `probeExpressHost`, `resolveInstallHost` |
| 3 · Preferences | What matters most (Fast / Balanced / Maximum) and Streams shown (Mixed / Cached only) as segmented switches with a one-line hint | `applyQuickProfile`, `S.cacheMode` |
| Options & defaults | Device, resolution, connection speed, template profile, language, Full stack, Clean reinstall, TMDB, "Defaults we'll use" | `applyExpressChoices`, `OUTPUT_PROFILE_INFO`, `set-bandwidth` |

Below the panel: the build summary as chips, the usage-statistics consent and the install button.

## Invariants

- `saveState()` is unchanged. Provider keys stay in localStorage; the Stremio password stays in memory. The unit suite fingerprints the function and browser tests exercise both rules.
- Core Stable stays the clean-session default. Template profile (Stable/Balanced/Advanced/Labs) is separate from "What matters most".
- No template assembly, SEL, regex, share-link, relay, CSP or referrer-policy changes.
- Every install target that existed before stays available, including Nuvio and Chillio and the Genie hand-off into them.
- The deployment dialog ticks a step only after the real operation returns. An unavailable regex check is marked "not independently verified". The last step reads "Install & verify Stremio addons" for Stremio and "Prepare your install link" for every other target. Closing the dialog does not cancel the request.

## Verification

```sh
cd configurator
npm test
npm run validate
npm run build
npx playwright test --trace off
```

`e2e/production-dashboard.spec.mjs` covers the section layout, all five targets, the delivery modes, local JSON export, key persistence, a held relay response (progress cannot finish early), keyboard selection in the pill groups, tap-target sizes and bandwidth clamping, on the desktop (1280px) and mobile (390px) projects.
