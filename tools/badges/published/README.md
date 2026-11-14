# Official Core badge packs

Paste-ready Nuvio Fusion packs generated from the Badge Builder catalog.
Do not hand-edit these JSON files — regenerate with:

```bash
node tools/badges/scripts/publish-official-packs.mjs
```

Artwork URLs point at `main/tools/badges/assets`. Those files are never
renamed or deleted once published (see [the artwork licence](../assets/LICENSE.md)),
so installed packs keep their images.

## Paste these

Nuvio → Settings → Streams → Fusion badge URLs → Import.

| Pack | When | URL |
| --- | --- | --- |
| **Core Neon · Universal** | Default. Any Nuvio source. | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/published/core-neon-universal.json` |
| **Core Neon · AIO Enhanced** | Core Builds / AIOStreams. Needs the companion formatter from the Badge Builder. | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/published/core-neon-enhanced.json` |
| **Core Neon · No DV** | Samsung / TCL / no-Dolby-Vision panels. | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/published/core-nodv-universal.json` |

Current Nuvio clients remember up to three imported packs and activate **one**
at a time. These three are alternatives, not layers.

Customize: [Core Badge Builder](https://brevitya.github.io/Core-Builds/tools/badges/).

## Reuse the artwork

The badge images are free to use in your own Nuvio formatter, pack or app under
[CC BY 4.0](../assets/LICENSE.md). Credit them as below, and say if you changed them:

> Badge artwork: Core Builds (brevityA/Core-Builds), CC BY 4.0

[`badges.json`](badges.json) lists every badge with its name, group, label and
PNG/SVG URLs:

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/published/badges.json
```

It is regenerated with the packs by `publish-official-packs.mjs`.
