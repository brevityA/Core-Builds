# Production configurator dashboard

PR #840 keeps the full custom builder and adds a four-section Quick Install dashboard.

| Section | Controls | Existing integration |
| --- | --- | --- |
| Delivery mode | Direct Install / Manifest URL / Raw JSON | `runExpressInstall`, `simpleInstall`, `generate` |
| Service & engine targets | Stremio / WuPlay, output profile, search preferences | `OUTPUT_PROFILE_INFO`, `activeOutputProfile`, `applyQuickProfile` |
| Hardware & providers | Device, resolution, provider credentials, optional settings, review summary, consent | Existing `data-express-*` controls and `applyExpressChoices` |
| Review & deploy | Primary action and inline result | Existing host selection, compatibility gate, relay save, Stremio verification, manifest modal |

## Invariants

- `saveState()` is unchanged. Provider credentials remain in localStorage; Stremio passwords remain in memory. The unit suite fingerprints the approved function; browser tests exercise both rules.
- Core Stable remains the clean-session default through the existing output-profile policy. Search preferences (Fast/Balanced/Maximum) are distinct from the template output profile.
- No template assembly, SEL, regex, share/hash serialization, Cloudflare relay endpoint, CSP or referrer-policy changes.
- Only Stremio and WuPlay are advertised as deployment ecosystems. Existing legacy engine code is retained. Its compatibility tests use an E2E-only hook, not visible production target tiles.
- Diagnostics observe actual compilation, host selection, regex compatibility, relay response and account verification. Unavailable regex checks are explicitly marked unverified. Errors never advance to success. Closing diagnostics does not cancel a pending request.
- No Track 1 selection-quality work is included.

## Verification

```sh
cd configurator
npm test
npm run validate
npm run build
npm run test:e2e
node --check dist/web/assets/app.js
```

The browser suite includes desktop (1280px) and mobile (390px) projects. The dedicated `production-dashboard.spec.mjs` covers section structure, verified targets, delivery modes, local export, credential persistence, and an intentionally held relay response to prove that progress cannot finish early. Existing contract/payload assertions and golden fixtures are retained.

The compact offline design sampler is generated from the production styles:

```sh
python3 configurator/scripts/build-ui-demo.py
```

`ui-revamp-offline.html` is a reduced design sampler, not the deployment engine. Its JSON output is explicitly non-installable demo data.
