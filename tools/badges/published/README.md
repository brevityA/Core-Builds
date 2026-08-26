# Official Core badge packs

Paste-ready Nuvio Fusion packs generated from the Badge Builder catalog.
Do not hand-edit these JSON files — regenerate with:

```bash
node tools/badges/scripts/publish-official-packs.mjs
```

Artwork URLs point at `main/tools/badges/assets`. Packs stay valid after a
rebuild as long as those PNGs stay on `main`.

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
