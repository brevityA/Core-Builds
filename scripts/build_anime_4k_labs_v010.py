import copy
import json
from pathlib import Path

BASE = Path('/home/user/Core-Builds/Templates/Torbox/Anime/core-nexus-anime-4k.json')
OUT  = Path('/home/user/Core-Builds/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json')

with open(BASE) as f:
    tmpl = json.load(f)

m   = tmpl['metadata']
cfg = tmpl['config']

# ── Metadata ──────────────────────────────────────────────────────────────────
m['name']        = 'Core Nexus Anime 4K Labs'
m['version']     = '0.1.0'
m['id']          = 'core-nexus-anime-4k-labs'
m['description'] = (
    'Nightly Labs build of Anime 4K. Tests SeaDex-aware conditional PSEs, '
    'perGroup() dedup, Score IQR Guard, Indexer Diversity, and anime elite '
    'group pins. Not a daily driver — report regressions before these '
    'features graduate to stable.'
)
m['sourceUrl'] = (
    'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main'
    '/Templates/Torbox/Nightly/Anime/core-nexus-anime-4k-labs.json'
)
m['changelog'] = [
    'v0.1.0 — Initial Labs build: SeaDex-aware PSEs, perGroup() dedup, '
    'Score IQR Guard, Indexer Diversity, anime elite group pins'
]

eses = cfg['excludedStreamExpressions']
pses = cfg['preferredStreamExpressions']

# ── ESE [16]: Low SEL Score → Score IQR Guard ─────────────────────────────────
eses[16] = {
    'expression': (
        "/* LABS v0.1.0 | Score IQR Guard — adaptive low-score filter using IQR fence on seScore */"
        " count(negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http')))) >= 8"
        " ? streamExpressionScore(negate(merge(library(streams), seadex(streams)), streams), -1000000,"
        " q1(values(negate(merge(library(streams), seadex(streams)), streams), 'seScore'))"
        " - 1.5 * iqr(values(negate(merge(library(streams), seadex(streams)), streams), 'seScore')))"
        " : []"
    ),
    'enabled': True
}

# ── ESE [17]: Extra Cached HQ merge/slice → perGroup() ───────────────────────
eses[17] = {
    'expression': (
        "/* LABS v0.1.0 | Extra Cached HQ — perGroup() replaces 20-clause merge/slice */"
        " negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')), 'resolution', 3),"
        " negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')))"
    ),
    'enabled': True
}

# ── ESE [18]: Extra Cached LQ merge/slice → perGroup() ───────────────────────
eses[18] = {
    'expression': (
        "/* LABS v0.1.0 | Extra Cached LQ — perGroup() replaces 15-clause merge/slice */"
        " negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')), 'resolution', 3),"
        " negate(merge(library(streams), uncached(streams)), quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')))"
    ),
    'enabled': True
}

# ── ESE [19]: Extra Uncached merge/slice → perGroup() ────────────────────────
eses[19] = {
    'expression': (
        "/* LABS v0.1.0 | Extra Uncached — perGroup() replaces 35-clause merge/slice */"
        " negate(perGroup(uncached(streams), 'resolution', 3), uncached(streams))"
    ),
    'enabled': True
}

# ── ESE insert [20]: Indexer Diversity (before Final Limit at [20]) ───────────
# Threshold 15 (vs 20 in Apex) — anime result pools are smaller
indexer_diversity = {
    'expression': (
        "/* LABS v0.1.0 | Indexer Diversity — caps 2 per scraper, prevents SeaDex/AnimeTosho flooding */"
        " count(negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http')))) > 15"
        " ? negate(perGroup(negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http'))), 'indexer', 2),"
        " negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http'))))"
        " : []"
    ),
    'enabled': True
}
eses.insert(20, indexer_diversity)

# ── PSEs: prepend LABS pins + hasSeaDex tiers ─────────────────────────────────
labs_pses = [
    {
        'expression': (
            "/* LABS v0.1.0 | SeaDex Best pin — float SeaDex Best streams to the very top */"
            " count(seadex(streams, 'best')) > 0 ? pin(seadex(streams, 'best'), 'top') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | Anime BD/sub-group elite pin — known reliable encode and sub groups */"
            " pin(releaseGroup(streams, 'SubsPlease', 'Erai-raws', 'VARYG', 'Yameii', 'BlurayDesuYo', 'LYS1TH3A', 'Beatrice-Raws', 'VCB-Studio'), 'top')"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | hasSeaDex S-Tier — SeaDex Best 2160p (only fires when title has a SeaDex entry) */"
            " hasSeaDex and count(seadex(resolution(streams, '2160p'), 'best')) > 0"
            " ? seadex(resolution(streams, '2160p'), 'best') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | hasSeaDex A-Tier — SeaDex Best 1080p */"
            " hasSeaDex and count(seadex(resolution(streams, '1080p'), 'best')) > 0"
            " ? seadex(resolution(streams, '1080p'), 'best') : []"
        ),
        'enabled': True
    },
    {
        'expression': (
            "/* LABS v0.1.0 | hasSeaDex B-Tier — SeaDex (non-best) 1080p WEB-DL fallback */"
            " hasSeaDex and count(seadex(streams)) > 0"
            " ? seadex(resolution(quality(streams, 'WEB-DL'), '1080p')) : []"
        ),
        'enabled': True
    },
]

cfg['preferredStreamExpressions'] = labs_pses + pses

# ── Write ─────────────────────────────────────────────────────────────────────
OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(tmpl, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f'Written: {OUT}')
print(f'ESEs: {len(cfg["excludedStreamExpressions"])}  (+1 Indexer Diversity)')
print(f'PSEs: {len(cfg["preferredStreamExpressions"])}  (+5 LABS pins & hasSeaDex tiers)')
print(f'ISEs: {len(cfg["includedStreamExpressions"])}')
