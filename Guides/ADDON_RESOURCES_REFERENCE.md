# Addon Resources Reference

Source-verified resource definitions for every addon preset used in Core Builds templates.
Sourced directly from `packages/core/src/presets/*.ts` in the [AIOStreams repository](https://github.com/Viren070/AIOStreams).

---

## What the `resources` Field Does

From the AIOStreams docs:

> *"This option allows you to override the resources that AIOStreams would use from the addon. This is useful if you want to disable catalogues from the addon, but keep its streams. So you would only select `stream` here."*

Without an explicit `resources` override, AIOStreams uses the addon's default `SUPPORTED_RESOURCES` from its manifest. If those defaults include `catalog` or `meta`, Stremio will display the addon's catalog entries alongside streams — users see "scraper information" cards that open the scraper's website when tapped instead of playing content.

---

## Addon Resource Table

| Addon type | Preset file | Default resources | Exposes catalog/meta? | Rule for templates |
|---|---|---|---|---|
| `library` | `library.ts` | `[stream, catalog, meta]` | **YES** — intentional | Keep `['stream', 'catalog', 'meta']` — library catalog is the TorBox saved items list |
| `meteor` | `meteor.ts` | `[stream, catalog, meta]` | **YES** | Always set `resources: ['stream']` |
| `mediafusion` | `mediafusion.ts` | `[stream, catalog, meta]` | **YES** | Always set `resources: ['stream']` |
| `comet` | `comet.ts` | `[stream]` | No | `resources: ['stream']` optional; set for consistency |
| `zilean` | `zilean.ts` | `[stream]` | No | `resources: ['stream']` optional; set for consistency |
| `stremthruTorz` | `stremthruTorz.ts` | `[stream]` | No | No override needed |
| `torrent-galaxy` | `torrentGalaxy.ts` | `[stream]` | No | No override needed |
| `eztv` | `eztv.ts` | `[stream]` | No | No override needed |
| `knaben` | `knaben.ts` | `[stream]` | No | No override needed |
| `seadex` | `seadex.ts` | `[stream]` | No | No override needed |
| `animeTosho` | `animetosho.ts` | `[stream]` | No | No override needed |
| `nekobt` | `nekoBt.ts` | `[stream]` | No | No override needed |
| `torbox-search` | `torboxSearch.ts` | `[stream]` | No | **REMOVED in AIOStreams v2.32** (API shut down) — legacy lane only |
| `newznab` | `newznab.ts` | `[stream]` | No | No override needed |
| `opensubtitles-v3-plus` | — | `[subtitles]` | No | Keep `resources: ['subtitles']` |
| `aiosubtitle` | `aiosubtitle.ts` | `[subtitles]` | No | No override needed |

---

## Template Rules

### Must have `resources: ['stream']`

These addons expose catalog+meta by default and **will inject scraper catalog entries into Stremio** if not restricted:

```json
{ "type": "meteor",      "options": { "resources": ["stream"] } }
{ "type": "mediafusion", "options": { "resources": ["stream"] } }
```

### Keep full resources on library

The `library` preset intentionally exposes catalog+meta — this is the TorBox library catalog:

```json
{ "type": "library", "options": { "resources": ["stream", "catalog", "meta"] } }
```

### Stream-only by default — no override required

`comet`, `zilean`, `stremthruTorz`, `torrent-galaxy`, `eztv`, `knaben`, `seadex`, `animeTosho`, `nekobt`, `torbox-search`, `newznab` — these all default to stream-only. Setting `resources: ['stream']` explicitly is harmless but not required.

---

## Incident Log

| Version | Issue | Root cause | Fix |
|---|---|---|---|
| v2.4.5 | Scraper catalog entries visible in Stremio | `comet` and `mediafusion` missing `resources: ['stream']` | Added to comet + mediafusion |
| v2.7.3 | Scraper catalog entries visible in Stremio (regression) | `meteor` and `zilean` missing `resources: ['stream']` across all 33 templates | Added to meteor + zilean |

---

## Verification Script

Run this locally to check all active templates are correctly configured:

```bash
python3 << 'EOF'
import json, glob

files = glob.glob('Templates/**/*.json', recursive=True)
files = [f for f in files if 'Deprecated' not in f and 'Personal' not in f and 'Community' not in f]

issues = []
for path in sorted(files):
    try:
        data = json.load(open(path))
    except:
        continue
    for p in data.get('config', {}).get('presets', []):
        ptype = p.get('type', '')
        resources = p.get('options', {}).get('resources')
        # Addons that expose catalog/meta by default — must be restricted
        if ptype in ('meteor', 'mediafusion') and resources != ['stream']:
            issues.append(f'{path.split("Templates/")[-1]}: {ptype} resources={resources}')
        # Library must keep full resources
        if ptype == 'library' and resources != ['stream', 'catalog', 'meta']:
            issues.append(f'{path.split("Templates/")[-1]}: library resources={resources} (should be stream+catalog+meta)')

if issues:
    print('ISSUES FOUND:')
    for i in issues: print(f'  {i}')
else:
    print('All clear — no catalog bleed risk found.')
EOF
```

---

*Last updated: v2.7.3 · Sources: [AIOStreams presets](https://github.com/Viren070/AIOStreams/tree/main/packages/core/src/presets)*
