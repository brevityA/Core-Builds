# Quick install dashboard

The full custom builder is unchanged. Quick install keeps the four choices most
people make on its first screen, and keeps everything else under one collapsed
**Options & defaults** panel.

| Section | Controls | Existing integration |
| --- | --- | --- |
| 1 · Service | Provider cards, provider keys (paste + show/hide), AIOStreams host with live health chip, additional services | `renderCreds`, `probeExpressHost`, `resolveInstallHost` |
| 2 · What matters most | Fast / Balanced / Maximum | `applyQuickProfile` |
| 3 · Streams shown | Mixed / Cached only | `S.cacheMode` |
| 4 · Install to | Stremio, Nuvio, WuPlay, Chillio, Other app; Stremio sign-in when Stremio is picked | `runExpressInstall`, `simpleInstall` |
| Options & defaults | Device, resolution, connection speed, template profile, delivery (Direct / Manifest URL / Raw JSON), language, Full stack, Clean reinstall, TMDB, "Defaults we'll use" | `applyExpressChoices`, `OUTPUT_PROFILE_INFO`, `set-bandwidth`, `generate` |

Below the panel: the review summary, the usage-statistics consent and the install button.

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
