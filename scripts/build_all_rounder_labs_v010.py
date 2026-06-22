import copy, json
from pathlib import Path

# Base: Stream Labs (has all LABS ESEs already), plus anime config from Anime 4K
STREAM_LABS = Path('/home/user/Core-Builds/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json')
ANIME_BASE  = Path('/home/user/Core-Builds/Templates/Torbox/Anime/core-nexus-anime-4k.json')
OUT         = Path('/home/user/Core-Builds/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json')

with open(STREAM_LABS) as f:
    tmpl = json.load(f)
with open(ANIME_BASE) as f:
    anime = json.load(f)

m   = tmpl['metadata']
cfg = tmpl['config']
anime_cfg = anime['config']

# ── Metadata ──────────────────────────────────────────────────────────────────
m['name']        = 'Core Nexus All-Rounder Labs'
m['version']     = '0.1.0'
m['id']          = 'core-nexus-all-rounder-labs'
m['description'] = (
    'Nightly Labs build — single template for live-action TV, movies, and anime. '
    'Uses isAnime + hasSeaDex conditional PSEs to switch between anime and '
    'live-action quality tiers dynamically. Includes SeaDex, AnimeTosho, NekoBT, '
    'Meteor, Comet, MediaFusion, and all LABS features. Not a daily driver.'
)
m['sourceUrl'] = (
    'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main'
    '/Templates/Torbox/Nightly/Single/core-nexus-all-rounder-labs.json'
)
m['changelog'] = [
    'v0.1.0 — Initial Labs build: isAnime/hasSeaDex conditional PSEs, '
    'anime + live-action scrapers, full LABS feature set'
]

# ── Languages — add Japanese + Dual Audio ────────────────────────────────────
cfg['preferredLanguages'] = ['Dual Audio', 'Japanese', 'English', 'Original', 'Multi']
cfg['includedLanguages']  = ['English', 'Japanese', 'Dual Audio', 'Multi', 'Original', 'Unknown']

# ── Visual tags — add 10bit (key for anime BD encodes) ───────────────────────
cfg['preferredVisualTags'] = ['SDR', 'HLG', '10bit', 'HDR', 'HDR10', 'HDR10+', 'DV', 'HDR+DV', 'IMAX', 'AI']

# ── Audio channels — add 7.1 for anime BDs ───────────────────────────────────
cfg['preferredAudioChannels'] = ['7.1', '5.1', '2.0']

# ── Presets — merge anime scrapers into the Stream Labs preset list ───────────
anime_preset_types = {'seadex', 'animetosho', 'neko-bt'}
existing_types = {p.get('type') for p in cfg.get('presets', [])}

# Copy anime-specific presets from Anime template (SeaDex already in Stream Labs)
anime_presets_to_add = [
    p for p in anime_cfg.get('presets', [])
    if p.get('type') in anime_preset_types and p.get('type') not in existing_types
]

# Insert anime scrapers right after SeaDex (find its index)
presets = cfg['presets']
seadex_idx = next((i for i, p in enumerate(presets) if p.get('type') == 'seadex'), 1)
for i, ap in enumerate(anime_presets_to_add):
    presets.insert(seadex_idx + 1 + i, ap)

# ── ESEs — copy Non-Anime Query Guard removal + anime-specific ESEs ───────────
# The Stream Labs ESEs already have all LABS guards.
# We need to REMOVE the 1080p resolution hard exclusion if present (Stream excludes 4K,
# but for all-rounder we want both 4K anime and 1080p)
eses = cfg['excludedStreamExpressions']

# Remove hard 1080p-only resolution exclusion if it exists
eses_clean = []
for e in eses:
    if isinstance(e, dict):
        expr = e.get('expression', '')
        # Skip any ESE that hard-excludes 2160p (that's fine for Stream but not all-rounder)
        if '2160p' in expr and 'resolution(streams' in expr and 'excludedResolutions' not in expr:
            # Check if it's a "kill 2160p" style ESE
            if expr.strip().startswith('resolution(streams') or 'Hard Resolution' in expr:
                print(f'  Removing resolution exclusion ESE: {expr[:60]}')
                continue
        eses_clean.append(e)
    else:
        eses_clean.append(e)

# Add anime-specific ESEs from anime template that aren't in stream:
# Non-Anime Query Guard (ESE[05] from anime — but this is an EXCLUDE for non-anime, we don't want it)
# Bad 4K Anime (ESE[10]) — copy this, it protects against 4K anime with only 1080p available

# Find where to insert anime ESEs — after RD Copyright, before LABS guards
# In Stream Labs, find RD Copyright position
rd_idx = next((i for i, e in enumerate(eses_clean)
               if isinstance(e, dict) and 'RD Copyright' in e.get('expression','')), None)

anime_eses_to_port = []
for e in anime_cfg['excludedStreamExpressions']:
    if not isinstance(e, dict):
        continue
    expr = e.get('expression', '')
    # Port: Bad 4k Anime, Extra SeaDex guard
    if '/*Bad 4k Anime*/' in expr or '/*Extra SeaDex*/' in expr:
        # Check if already present
        already = any(
            isinstance(ex, dict) and (
                '/*Bad 4k Anime*/' in ex.get('expression','') or
                '/*Extra SeaDex*/' in ex.get('expression','')
            )
            for ex in eses_clean
        )
        if not already:
            anime_eses_to_port.append(e)

if rd_idx is not None:
    for i, ae in enumerate(anime_eses_to_port):
        eses_clean.insert(rd_idx + 1 + i, ae)
        print(f'  Added anime ESE after RD Copyright: {ae.get("expression","")[:60]}')

cfg['excludedStreamExpressions'] = eses_clean

# ── PSEs — build isAnime-conditional stack ────────────────────────────────────
# Keep the LABS pins from Stream Labs (elite groups, IMAX)
# Then add isAnime conditional tiers BEFORE the standard tiers
stream_pins = [p for p in cfg['preferredStreamExpressions']
               if isinstance(p, dict) and ('pin(' in p.get('expression','') or 'LABS' in p.get('expression','')
               and 'hasSeaDex' not in p.get('expression',''))]
stream_standard_pses = [p for p in cfg['preferredStreamExpressions']
                        if p not in stream_pins]

# New isAnime conditional PSE tiers
isanime_pses = [
    {
        'expression': (
            "/* LABS v0.1.0 | Anime — SeaDex Best pin (all resolutions) */"
            " isAnime and count(seadex(streams, 'best')) > 0 ? pin(seadex(streams, 'best'), 'top') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime — group pin (SubsPlease, Erai-raws, BlurayDesuYo, VCB-Studio) */"
            " isAnime ? pin(releaseGroup(streams, 'SubsPlease', 'Erai-raws', 'VARYG', 'Yameii', 'BlurayDesuYo', 'VCB-Studio'), 'top') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime S-Tier — hasSeaDex Best 1080p */"
            " isAnime and hasSeaDex and count(seadex(resolution(streams, '1080p'), 'best')) > 0"
            " ? seadex(resolution(streams, '1080p'), 'best') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime A-Tier — SeaDex 1080p WEB-DL FLAC */"
            " isAnime and hasSeaDex"
            " ? seadex(resolution(audioTag(quality(streams, 'WEB-DL'), 'FLAC'), '1080p')) : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime B-Tier — 1080p WEB-DL AAC (SeaDex or non-SeaDex) */"
            " isAnime ? resolution(audioTag(quality(streams, 'WEB-DL'), 'AAC', 'EAC3'), '1080p') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime C-Tier — 1080p WEBRip fallback */"
            " isAnime ? resolution(quality(streams, 'WEBRip'), '1080p') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime D-Tier — any 1080p */"
            " isAnime ? resolution(streams, '1080p') : []"
        ),
        'enabled': True
    },
]

# Rebuild PSE list: pins first, then isAnime tiers, then standard live-action tiers
cfg['preferredStreamExpressions'] = stream_pins + isanime_pses + stream_standard_pses

# ── seadexBestOnly: false (don't drop non-SeaDex streams for non-anime) ────────
cfg['seadexBestOnly'] = False

# ── Write ─────────────────────────────────────────────────────────────────────
OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(tmpl, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f'\nWritten: {OUT}')
print(f'ESEs: {len(cfg["excludedStreamExpressions"])}')
print(f'PSEs: {len(cfg["preferredStreamExpressions"])}')
print(f'ISEs: {len(cfg["includedStreamExpressions"])}')
print(f'Presets: {len(cfg["presets"])}')
