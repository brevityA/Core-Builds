# Core Stable templates

Core Stable is the conservative Core Builds baseline for first installs,
troubleshooting, and users who value predictable behaviour over a large stack
of tuning rules.

## Included

- `core-stable-torbox-1080p.json`
- `core-stable-torbox-4k.json`

## Contract

- no synced SEL URLs;
- no synced regex URLs or inline ranked regex dependency;
- no add-on groups or dynamic early fetch exit;
- one native result-limit policy;
- native device, resolution, audio, encode, and quality filters where possible;
- visible add-on/filter/timing diagnostics;
- no automatic poster-service dependency;
- valid season and multi-episode packs are not suppressed by default.

These templates intentionally keep a small distinct-source stream baseline:
Library, the selected service bridge, Meteor, Comet, and SeaDex where relevant,
plus the selected subtitle/catalog components. They contain no credentials.

For remote scoring, IQR filtering, aggressive fetch optimisation, or Labs
experiments, use an explicit Balanced, Advanced, or Labs output profile in the
Configurator instead of layering rules over a Stable template.
