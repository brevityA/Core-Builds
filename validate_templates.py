#!/usr/bin/env python3
"""
Core Builds Template Validator
Validates all template JSON files against AIOStreams schema without importing.
Usage: python3 validate_templates.py [--dir /path/to/templates] [--file /path/to/file.json]
"""

import json, sys, argparse
from pathlib import Path

# ── Valid AIOStreams schema values ────────────────────────────
VALID = {
    'resolutions': {
        '2160p','1440p','1080p','720p','576p','480p','360p','240p','144p','Unknown'
    },
    'qualities': {
        'BluRay REMUX','BluRay','WEB-DL','WEBRip','HDRip','HC HD-Rip',
        'DVDRip','HDTV','CAM','TS','TC','SCR','Unknown'
    },
    'encodes': {
        'AV1','HEVC','AVC','VP9','VC-1','XviD','DivX','Unknown'
    },
    'visual_tags': {
        'HDR+DV','DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX','AI','3D',
        'H-OU','H-SBS','Unknown'
    },
    'audio_tags': {
        'Atmos','DD+','DD','DTS:X','DTS-HD MA','DTS-HD','DTS-ES','DTS',
        'TrueHD','OPUS','FLAC','AAC','AC-4','Unknown'
    },
    'audio_channels': {
        '7.1','6.1','5.1','2.0','Unknown'
    },
    'sort_keys': {
        'cached','streamExpressionMatched','resolution','language','visualTag',
        'audioChannel','audioTag','streamExpressionScore','bitrate','quality',
        'regexScore','seeders','size','library','type','service','indexer',
        'releaseGroup','age','duration','seasonPack','subtitle',
        'seadex','encode'
    },
    'stream_types': {
        'debrid','usenet','http','live','p2p','external','youtube','stremio-usenet'
    },
    'dedup_modes': {
        'single_result','per_service','per_addon','disabled'
    },
    'preset_types': {
        'stremthruStore','stremthruTorz','zilean','comet','meteor','seadex',
        'mediafusion','knaben','torrent-galaxy','eztv','animeTosho','nekobt',
        'library','opensubtitles-v3-plus','aiosubtitle','newznab','torbox-search',
        'debridio','jackett','prowlarr','torrentio','torznab','custom'
    }
}


def validate_list(values, valid_set):
    """Return a list of values that are not present in valid_set."""
    return [v for v in (values or []) if v not in valid_set]


def validate_template(fpath):
    """Validate a single template file. Returns (errors, warnings, passes)."""
    errors, warnings, passes = [], [], []
    name = Path(fpath).stem

    def err(template, msg):  errors.append(f"  ✗ [{template}] {msg}")
    def warn(template, msg): warnings.append(f"  ⚠ [{template}] {msg}")
    def ok(template, msg):   passes.append(f"  ✓ [{template}] {msg}")

    try:
        with open(fpath) as f:
            t = json.load(f)
    except json.JSONDecodeError as e:
        err(name, f"INVALID JSON — {e}")
        return errors, warnings, passes

    c = t.get('config', t)
    meta = t.get('metadata', {})

    # ── Metadata ─────────────────────────────────────────────
    if not meta.get('version'):
        warn(name, "metadata.version missing")
    for required_field in ('name', 'description', 'author', 'category'):
        if not meta.get(required_field):
            warn(name, f"metadata.{required_field} missing — required by AIOStreams")

    # ── Sort criteria ─────────────────────────────────────────
    for scope, sort_list in c.get('sortCriteria', {}).items():
        bad_keys = [s['key'] for s in sort_list if s.get('key') not in VALID['sort_keys']]
        if bad_keys:
            err(name, f"sortCriteria.{scope}: invalid keys {bad_keys}")
        else:
            ok(name, f"sortCriteria.{scope}: {len(sort_list)} keys valid")

    # ── Preference/exclusion lists ────────────────────────────
    checks = [
        ('excludedResolutions',   'resolutions'),
        ('includedResolutions',   'resolutions'),
        ('preferredResolutions',  'resolutions'),
        ('excludedQualities',     'qualities'),
        ('preferredQualities',    'qualities'),
        ('excludedEncodes',       'encodes'),
        ('includedEncodes',       'encodes'),
        ('preferredEncodes',      'encodes'),
        ('excludedVisualTags',    'visual_tags'),
        ('includedVisualTags',    'visual_tags'),
        ('preferredVisualTags',   'visual_tags'),
        ('excludedAudioTags',     'audio_tags'),
        ('includedAudioTags',     'audio_tags'),
        ('preferredAudioTags',    'audio_tags'),
        ('excludedAudioChannels', 'audio_channels'),
        ('preferredAudioChannels','audio_channels'),
    ]
    for field, valid_key in checks:
        values = c.get(field, [])
        if values:
            bad = validate_list(values, VALID[valid_key])
            if bad:
                err(name, f"{field}: invalid values {bad}")
                err(name, f"  Valid: {sorted(VALID[valid_key])}")

    # ── Presets ───────────────────────────────────────────────
    preset_map = {}
    for p in c.get('presets', []):
        ptype = p.get('type', '')
        pid   = p.get('instanceId', '')
        preset_map[pid] = ptype

        if ptype not in VALID['preset_types']:
            warn(name, f"preset '{ptype}' — unknown type (may still be valid)")

        opts = p.get('options', {})
        if ptype in ('stremthruStore','stremthruTorz','zilean','comet','meteor',
                     'knaben','torrent-galaxy','eztv','aiosubtitle','newznab'):
            if not opts.get('timeout'):
                err(name, f"preset '{ptype}': timeout is required, got None")
            if not opts.get('name'):
                err(name, f"preset '{ptype}': name is required, got None")
        if ptype == 'aiosubtitle' and not opts.get('languages'):
            err(name, f"preset 'aiosubtitle': languages is required, got None")

    ok(name, f"presets: {len(c.get('presets', []))} total, "
             f"{sum(1 for p in c.get('presets', []) if p.get('enabled'))} enabled")

    # ── Groups ────────────────────────────────────────────────
    groups = c.get('groups', {})
    if groups.get('enabled'):
        for g in groups.get('groups', []):
            ids = g.get('addonInstanceIds', [])
            stale = [i for i in ids if i not in preset_map]
            if stale:
                err(name, f"group '{g['name']}': {len(stale)} stale instanceId(s) — "
                          f"preset deleted but still in group")
            disabled = [preset_map[i] for i in ids
                        if i in preset_map and
                        not next((p for p in c['presets'] if p['instanceId'] == i), {}).get('enabled')]
            if disabled:
                warn(name, f"group '{g['name']}': disabled presets still listed: {disabled}")

            cond = g.get('condition') or ''
            if cond and 'totalTimeTaken' not in cond and 'previousGroupTimeTaken' not in cond:
                warn(name, f"group '{g['name']}': no time safety net in condition")

        ok(name, f"groups: {len(groups.get('groups', []))} groups configured")

    # ── Deduplicator ─────────────────────────────────────────
    dedup = c.get('deduplicator', {})
    for key in ('cached', 'uncached', 'p2p'):
        val = dedup.get(key)
        if val and val not in VALID['dedup_modes']:
            err(name, f"deduplicator.{key}: invalid value '{val}'")

    # ── Matching ──────────────────────────────────────────────
    tm = c.get('titleMatching', {})
    if tm.get('mode') == 'exact':
        warn(name, "titleMatching.mode is 'exact' — causes zero results on title variations")
    if tm.get('similarityThreshold', 0) > 0.85:
        warn(name, f"titleMatching.similarityThreshold {tm['similarityThreshold']} — very strict")

    ym = c.get('yearMatching', {})
    if ym.get('strict'):
        warn(name, "yearMatching.strict=True — blocks valid releases with TMDB date discrepancies")

    sem = c.get('seasonEpisodeMatching', {})
    if sem.get('strict'):
        warn(name, "seasonEpisodeMatching.strict=True — drops BluRay/REMUX without S/E metadata")

    if c.get('requiredLanguages'):
        warn(name, f"requiredLanguages is set {c['requiredLanguages'][:3]} — hard-blocks untagged streams")

    # ── Size limits ───────────────────────────────────────────
    # (size.global and size.resolution are both valid AIOStreams schema keys)

    # ── Formatter ─────────────────────────────────────────────
    fmt = c.get('formatter', {})
    if fmt.get('id') == 'tamtaro':
        override = fmt.get('definitions', {}).get('overrides', {})
        if 'tamtaro' not in override:
            err(name, "formatter: id='tamtaro' but overrides key is not 'tamtaro' — formatter won't apply")
        else:
            ok(name, "formatter: Nexus Prime override correctly keyed")
    elif fmt.get('id'):
        ok(name, f"formatter: using built-in '{fmt['id']}'")

    # ── ISEs / ESEs ───────────────────────────────────────────
    ise_count = len(c.get('includedStreamExpressions', []))
    ese_count = len(c.get('excludedStreamExpressions', []))
    pse_count = len(c.get('preferredStreamExpressions', []))
    ok(name, f"expressions: {ise_count} ISEs, {ese_count} ESEs, {pse_count} PSEs")

    has_zero_cached = any('0Cached' in e.get('expression', '')
                          for e in c.get('includedStreamExpressions', []))
    if not has_zero_cached:
        warn(name, "0Cached ISE missing — no fallback when nothing is cached")

    # ── Double-load check ─────────────────────────────────────
    # Ignore comment-only placeholder entries (expression is bare [] with no logic)
    synced_ise = c.get('syncedIncludedStreamExpressionUrls', [])
    inline_ises = [e for e in c.get('includedStreamExpressions', [])
                   if ('Tamtaro' in e.get('expression', '') or 'ISE v' in e.get('expression', ''))
                   and e.get('expression', '').strip().rstrip('*/').strip().endswith('[]') is False]
    if synced_ise and inline_ises:
        warn(name, "Tamtaro ISEs inline AND synced URL set — potential duplicates")

    return errors, warnings, passes


def main():
    parser = argparse.ArgumentParser(description='Validate Core Builds templates')
    parser.add_argument('--dir', action='append', default=[],
                        help='Directory to search for templates (repeatable)')
    parser.add_argument('--file', help='Validate a single file')
    args = parser.parse_args()

    if args.file:
        files = [args.file]
    else:
        dirs = args.dir if args.dir else ['.']
        files = []
        for d in dirs:
            p = Path(d)
            found = sorted(p.rglob('core-nexus*.json')) + sorted(p.rglob('core-cipher*.json'))
            files += [f for f in found
                      if 'fixed' not in str(f)
                      and 'dual' not in str(f)
                      and 'Nightly' not in str(f)
                      and 'Community-Templates' not in str(f)]

    print(f"\n{'='*60}")
    print(f"  CORE BUILDS TEMPLATE VALIDATOR")
    print(f"  Checking {len(files)} template(s)")
    print(f"{'='*60}\n")

    all_errors, all_warnings, all_passes = [], [], []
    for fpath in files:
        e, w, p = validate_template(str(fpath))
        all_errors.extend(e)
        all_warnings.extend(w)
        all_passes.extend(p)

    print("ERRORS:")
    if all_errors:
        for e in all_errors: print(e)
    else:
        print("  none ✓")

    print(f"\nWARNINGS:")
    if all_warnings:
        for w in all_warnings: print(w)
    else:
        print("  none ✓")

    print(f"\nPASSED CHECKS:")
    for p in all_passes[:10]: print(p)
    if len(all_passes) > 10: print(f"  ... +{len(all_passes)-10} more")

    print(f"\n{'='*60}")
    print(f"  {len(all_errors)} errors  |  {len(all_warnings)} warnings  |  {len(all_passes)} checks passed")
    print(f"{'='*60}\n")

    sys.exit(1 if all_errors else 0)


if __name__ == '__main__':
    main()
