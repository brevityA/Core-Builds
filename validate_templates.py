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
        'DVDRip','HDTV','CAM','TS','TC','SCR','Unknown',
        'DVD REMUX',
},
    'encodes': {
        'AV1','HEVC','AVC','VP9','VC-1','XviD','DivX','Unknown',
        'MPEG-4',
},
    'visual_tags': {
        'HDR+DV','DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX','AI','3D',
        'H-OU','H-SBS','Unknown',
        'DV Only',
        'HDR Only',
        'Upscaled',
},
    'audio_tags': {
        'Atmos','DD+','DD','DTS:X','DTS-HD MA','DTS-HD','DTS-ES','DTS',
        'TrueHD','OPUS','FLAC','AAC','AC-4','Unknown',
        'PCM',
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
        'debridio','jackett','prowlarr','torrentio','torznab','custom',
        # Full upstream preset registry from AIOStreams v2.34.0 (pin-synced 2026-09-05)
        'aiostreams','therarbg','the-pirate-bay','bitmagnet','anime-tosho-new','stremio-gdrive','jackettio','orion','streamfusion','baguettio','fkstream','torbox','easynewsPlus','nuvio-streams','webstreamr','flix-streams','astream','brazuca-torrents','yastream','streamasia','usa-tv','usa-tv-next','argentina-tv','debridio-tv','debridio-watchtower','debridio-tmdb','debridio-tvdb','debridio-ic4a','streaming-catalogs','anime-catalogs','torrent-catalogs','rpdb-catalogs','tmdb-collections','anime-kitsu','marvel-universe','star-wars-universe','dc-universe','doctor-who-universe','opensubtitles','subsource','subhero','ai-companion','ai-search','more-like-this','content-deep-dive',
        # Current AIOStreams/community preset identifiers used by the template suite.
        'hdhub','torrents-db','sootio','peerflix','subdl','neko-bt','animetosho','dmm-cast',
        'easynews','easynewsPlusPlus','easynews-search','davex','nzbhydra','usenet-streamer','streamnzb','tmdb-addon'
    },
    'autoplay_attributes': {
        'service','addon','proxied','resolution','quality','encode','audioTags',
        'visualTags','languages','releaseGroup','type','infoHash','size'
    },
    'cache_and_play_types': {'usenet','torrent'},
}

# Core Builds emits local stream expressions only. AIOStreams hosts can reject
# remote synced expression URLs, and remote score changes make output behaviour
# drift after import.
SYNCED_EXPRESSION_FIELDS = (
    'syncedExcludedStreamExpressionUrls',
    'syncedIncludedStreamExpressionUrls',
    'syncedPreferredStreamExpressionUrls',
    'syncedRankedStreamExpressionUrls',
)

# ── Upstream SEL function registry ────────────────────────────────
# Every callable Core may emit, verified against Viren070/AIOStreams@main
# packages/core/src/parser/streamExpression.ts (this.parser.functions.* +
# dispatch cases + the expr-eval math allowlist). Anything not in this set is
# an invalid expression on every AIOStreams host (e.g. `private(...)` was
# shipped in 8 Labs templates — see audit 2026-08-08).
SEL_FUNCTIONS = {
    'addon','age','audioChannel','audioChannels','audioTag','avg','bitrate',
    'cached','count','duration','encode','filename','folderName','folderSize',
    'idMatched','indexer','iqr','keyword','keywords','kurtosis','language',
    'library','max','mean','median','merge','message','min','mode',
    'multiEpisode','negate','passthrough','perGroup','percentile','pin','q1',
    'q2','q3','quality','range','regexMatched','regexMatchedInRange',
    'regexScore','releaseGroup','resolution','rseMatched','seMatched',
    'seMatchedInRange','seScore','seadex','seasonPack','seeders','service',
    'size','skewness','slice','stddev','streamExpressionScore','subtitle',
    'subtitles','sum','type','uncached','values','variance','visualTag',
    # added by AIOStreams v2.34.0 (health lane; folderSize landed with it and was already listed)
    'health',
    # expr-eval math allowlist (true entries in the parser's math config)
    'sqrt','ceil','floor','round','trunc','random','in',
}
# Core Builds own safety margins vs the upstream default limits
# (maxExpressionLength=3000, maxExpressions=200, maxExpressionCharacters=50000)
SEL_MAX_LENGTH = 3000
SEL_FAIL_LENGTH = 2800      # error above this (headroom below the hard 3000)
SEL_WARN_LENGTH = 2400      # warn above this

import re as _re
_SEL_FN_RE = _re.compile(r'([A-Za-z][A-Za-z0-9]*)\s*\(')
_SEL_COMMENT_RE = _re.compile(r'/\*[\s\S]*?\*/')
_SEL_STR_RE = _re.compile(r"'(?:\\.|[^'\\])*'")
_SEL_DSTR_RE = _re.compile(r'"(?:\\.|[^"\\])*"')

def _sel_unknown_functions(expression):
    """Return callables in `expression` that are not valid upstream SEL."""
    if not isinstance(expression, str):
        return []
    clean = _SEL_COMMENT_RE.sub(' ', expression)
    clean = _SEL_STR_RE.sub("''", clean)
    clean = _SEL_DSTR_RE.sub('""', clean)
    out = []
    for m in _SEL_FN_RE.finditer(clean):
        fn = m.group(1)
        if fn in SEL_FUNCTIONS or fn in ('if', 'and', 'or', 'not', 'true', 'false'):
            continue
        if fn not in out:
            out.append(fn)
    return out

def _validate_sel_functions(expression_lists, name, err, warn):
    """Check every expression for unknown functions and length headroom."""
    for entry in expression_lists:
        expr = entry.get('expression', '') if isinstance(entry, dict) else str(entry)
        if not expr or not expr.strip():
            continue
        unknown = _sel_unknown_functions(expr)
        if unknown:
            err(name, f"SEL unknown function(s) {unknown} — invalid on AIOStreams hosts: {expr[:70]}\u2026")
        length = len(expr)
        if length > SEL_FAIL_LENGTH:
            err(name, f"SEL length {length} > {SEL_FAIL_LENGTH} (hard limit {SEL_MAX_LENGTH}) \u2014 refactor: {expr[:60]}\u2026")
        elif length > SEL_WARN_LENGTH:
            warn(name, f"SEL length {length} > {SEL_WARN_LENGTH} \u2014 near the {SEL_MAX_LENGTH} host limit: {expr[:60]}\u2026")

# v2.32 marks the legacy `torbox-search` preset ID removed. Upstream also
# exposes a separate Newznab option labelled TorBox Search, so this is not a
# settings-compatible automatic rename. Core templates may retain the legacy ID
# only when explicitly marked as a v2.31 compatibility artifact.
LEGACY_TORBOX_SEARCH_COMPATIBILITY = {
    'legacyTorboxSearch': True,
    'maximumAIOStreamsVersion': '2.31.1',
}

# Intentional language policies reviewed by maintainers. New combinations still warn.
REVIEWED_REQUIRED_LANGUAGES = {
    ('English', 'Original', 'Dual Audio', 'Multi', 'Dubbed', 'Unknown'),
}
REVIEWED_NO_ZERO_CACHED = {
    'core-nexus-base-torbox',  # Parent/base config, not a standalone child.
    'core-nexus-4k-dual-core',
    'core-nexus-4k-essential-dual-core',
    'core-nexus-dual-core-1080p',
}  # Deprecated dual-core configs are retained only for archive compatibility.

# These early ESEs were intended to de-clutter episode results, but can remove
# the only playable multi-episode/season-pack stream before later quality and
# cache filters remove the supposedly better singles. Use the late fallback
# pair instead, after all other ESEs.
LEGACY_DESTRUCTIVE_PACK_ESE_MARKERS = (
    'ongoingSeasonPack',
    'Hard Season Pack Kill',
    'Kill Ambiguous Packs',
    'Kill Multi-Episode',
    'Clutter-Free Single Episode Booster',
    'Weekly Ongoing Series Pack Filter',
    'Kill Season Packs When Episodes Exist',
    'Season Pack Kill — latestSeason-aware',
)


def validate_list(values, valid_set):
    """Return a list of values that are not present in valid_set."""
    return [v for v in (values or []) if v not in valid_set]


def validate_template(fpath):
    """Validate a single template file. Returns (errors, warnings, passes)."""
    errors, warnings, passes = [], [], []
    path = Path(fpath)
    name = path.stem
    is_deprecated = 'Deprecated' in path.parts

    def err(template, msg):
        """Append an error message for the given template."""
        errors.append(f"  ✗ [{template}] {msg}")

    def warn(template, msg):
        """Append a warning message for the given template."""
        warnings.append(f"  ⚠ [{template}] {msg}")

    def ok(template, msg):
        """Append a success message for the given template."""
        passes.append(f"  ✓ [{template}] {msg}")

    try:
        with open(fpath) as f:
            t = json.load(f)
    except json.JSONDecodeError as e:
        err(name, f"INVALID JSON — {e}")
        return errors, warnings, passes

    if isinstance(t, list):
        # Array-only JSON (e.g. Filtering expression lists) — validate entries have 'expression'
        for i, entry in enumerate(t):
            if isinstance(entry, dict) and 'expression' not in entry:
                warn(name, f"entry [{i}] missing 'expression' key")
        return errors, warnings, passes

    # Known pitfall (CLAUDE.md): repo-root scans also walk non-template JSON.
    # A bare AIOStreams config is accepted (validated as config), but objects with
    # no template or config markers at all (badge packs, generated artifacts)
    # are skipped rather than half-validated.
    if 'metadata' not in t and 'config' not in t and not any(
            k in t for k in ('presets', 'services', 'sortCriteria', 'resultLimits')):
        return errors, warnings, passes

    c = t.get('config', t)
    meta = t.get('metadata', {})
    is_core_stable = meta.get('coreBuildsProfile') == 'stable'

    # ── Removed preset gate (AIOStreams v2.32) ────────────────
    # The legacy built-in torbox-search preset was removed in AIOStreams v2.32
    # (TorBox Search API shut down); saving a config that still includes it
    # fails. Only the explicit Templates/Legacy/v2.31.1 lane may keep it.
    is_core = 'Templates' in path.parts
    is_legacy = 'Legacy' in path.parts
    presets_list = c.get('presets', []) if isinstance(c, dict) else []
    has_torbox = any(
        isinstance(p, dict) and p.get('type') == 'torbox-search'
        for p in presets_list
    )
    if has_torbox:
        if is_core and not is_legacy:
            err(name, "contains removed preset 'torbox-search' — removed in AIOStreams v2.32 (configs fail to save); use Templates/Legacy/v2.31.1/ for the legacy lane")
        elif is_core:
            ok(name, "legacy 'torbox-search' preset confined to the explicit Legacy lane")
        else:
            warn(name, "contains legacy 'torbox-search' preset (community template — not Core-owned)")

    # ── regexOverrides entry shape (strict-schema hosts — issue #671) ─────────
    # Every override entry requires string `pattern` + `name` and numeric `score`.
    # A score-only stub (pattern removed during a whitelist sync) fails host-side
    # save with 'regexOverrides.N.pattern: Invalid input: expected string, received undefined'.
    overrides = c.get('regexOverrides', []) if isinstance(c, dict) else []
    if isinstance(overrides, list):
        for i, o in enumerate(overrides):
            if (not isinstance(o, dict)
                    or not isinstance(o.get('pattern'), str)
                    or not isinstance(o.get('name'), str)
                    or not isinstance(o.get('score'), (int, float))):
                err(name, f"regexOverrides[{i}] malformed — needs string pattern + name and numeric score (yeb's-class hosts reject score-only stubs; #671)")

    # ── Credential placeholders in ENABLED presets (Brisk field report, 2026-08-11) ──
    # AIOStreams validates required preset options at save/import: an enabled preset
    # whose credential option is '<template_placeholder>' (or blank) is rejected with
    # "Option X is required, got undefined". House rule: presets that need a user key
    # ship DISABLED; the key gate lives in the UI/validator, not a blank string.
    _CRED_KEY_RE = _re.compile(r'api.?key|access.?token|authorization|auth.?key|password|secret|token', _re.I)
    def _flat_opts(d, prefix=''):
        for kk, vv in d.items():
            path = f'{prefix}{kk}'
            yield path, vv
            if isinstance(vv, dict):
                yield from _flat_opts(vv, path + '.')
    for p in presets_list:
        if not isinstance(p, dict) or p.get('enabled') is not True:
            continue
        o = p.get('options') or {}
        if not isinstance(o, dict):
            continue
        for opt_path, vv in _flat_opts(o):
            leaf = opt_path.split('.')[-1]
            if isinstance(vv, str) and _CRED_KEY_RE.search(leaf) and (vv.strip() == '' or vv == '<template_placeholder>'):
                err(name, f"enabled preset '{o.get('name') or p.get('type')}' carries unresolved credential option '{opt_path}' — ship keyed presets disabled (debridioApiKey class rejection, 2026-08-11)")

    # ── Required-option floor (AIOStreams v2.33 tightened validation 2026-08-11) ──
    # The instance rejects configs missing these options outright. Matrix grows as the
    # live validator teaches us (each entry is a real rejection message observed).
    _REQUIRED_OPTS_BY_TYPE = {
        'torrentio': ['useMultipleInstances'],
        'peerflix': ['showTorrentLinks'],
        # Classmates from the 2026-08-11 live oracle sweep (each line reproduced there):
        'torrents-db': ['useMultipleInstances'],
        'jackett': ['jackettUrl'],
        'prowlarr': ['prowlarrUrl'],
        'newznab': ['api'],
        'nzbhydra': ['api'],
        'aiosubtitle': ['languages'],
    }
    for p in presets_list:
        if not isinstance(p, dict) or p.get('enabled') is not True:
            continue
        if is_legacy:
            break   # Legacy/ snapshots document older AIOStreams eras by design — floor rules measure today's fleet
        req = _REQUIRED_OPTS_BY_TYPE.get(p.get('type'))
        if not req:
            continue
        o = p.get('options') or {}
        for field in req:
            if field not in o:
                err(name, f"enabled preset '{o.get('name') or p.get('type')}' ({p.get('type')}) missing required option '{field}' (v2.33+ validation floor)")
            elif isinstance(o[field], str) and o[field].strip() == '':
                warn(name, f"enabled preset '{o.get('name') or p.get('type')}' ({p.get('type')}) has required option '{field}' present but blank — present-but-empty still rejects on the strict validator (CodeRabbit point, PR #686)")

    # ── SeaDex/Sootio service dependency (v2.33) ──
    # These presets require a torrent-capable paid service or HTTP provider; enabled in a
    # pure p2p/free config → host rejects create ("requires at least one usable service").
    _NEEDS_SERVICE = {'seadex', 'sootio'}
    enabled_types = {p.get('type') for p in presets_list if isinstance(p, dict) and p.get('enabled')}
    svc_list = c.get('services', []) if isinstance(c, dict) else []
    enabled_svcs = {sv.get('id') for sv in svc_list if isinstance(sv, dict) and sv.get('enabled')}
    debridish = enabled_svcs & {'torbox','realdebrid','alldebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr','easynews'}
    for p in presets_list:
        if isinstance(p, dict) and p.get('enabled') is True and p.get('type') in _NEEDS_SERVICE and not debridish:
            err(name, f"enabled preset '{(p.get('options') or {}).get('name') or p.get('type')}' requires a torrent-capable service, none enabled (v2.33 rejection class)")

    # ── Newznab/Torznab option shape (AIOStreams v2.32) ──────────
    # v2.32 folded newznabUrl + apiPath + apiKey into a single `api` object
    # holding the full endpoint URL (usually ending in /api).
    nab_types = {'newznab', 'torznab', 'nzbhydra'}
    for p in presets_list:
        if not isinstance(p, dict) or p.get('type') not in nab_types:
            continue
        o = p.get('options') or {}
        if any(k in o for k in ('newznabUrl', 'torznabUrl', 'nzbhydraUrl', 'apiPath', 'checkOwned', 'seasonPackStrategy')):
            if is_core and not is_legacy:
                warn(name, f"preset '{p.get('type')}': legacy NAB options (newznabUrl/apiPath/checkOwned/seasonPackStrategy) — v2.32 uses api.url + seasonEpisodeStrategy")
            else:
                warn(name, f"preset '{p.get('type')}': legacy NAB option keys present")
        api_url = ''
        if isinstance(o.get('api'), dict):
            api_url = str(o.get('api', {}).get('url') or '')
        elif isinstance(o.get('url'), str):
            api_url = o.get('url')
        if 'torbox.app' in api_url and 'newznab' in api_url:
            warn(name, f"preset '{p.get('type')}' points at the shut-down TorBox Search API ({api_url}) — no availability claim until an authorised endpoint/import test")

    # ── Size budget (AIOStreams hardcoded 102,400-byte save limit) ──
    # The limit applies to the compact serialized config POSTed to
    # /api/v1/user, not the pretty-printed file on disk.
    if is_core and not is_legacy and isinstance(c, dict):
        compact = len(json.dumps(c, separators=(',', ':')))
        if compact > 100_000:
            err(name, f"config payload {compact:,} B > 100,000 B — AIOStreams save limit is 102,400 B; trim to keep margin")
        elif compact > 90_000:
            warn(name, f"config payload {compact:,} B > 90,000 B — close to the 102,400 B AIOStreams save limit")
        else:
            ok(name, f"config payload {compact:,} B within size budget")

    # ── Metadata ─────────────────────────────────────────────
    if not meta.get('version'):
        warn(name, "metadata.version missing")
    for required_field in ('name', 'description', 'author', 'category'):
        if not meta.get(required_field):
            warn(name, f"metadata.{required_field} missing — required by AIOStreams")

    is_core_builds_template = (
        ('Templates' in path.parts and 'Community-Templates' not in path.parts)
        or meta.get('author') == 'Branding-Brevity'
    )
    if is_core_builds_template:
        synced = [field for field in SYNCED_EXPRESSION_FIELDS if c.get(field)]
        if synced:
            err(name, f"synced stream-expression URLs are prohibited by Core Builds local-expression policy: {synced}")

        ranked = c.get('rankedStreamExpressions', []) or []
        has_local_ranked = any(
            isinstance(entry, dict)
            and entry.get('enabled', True) is not False
            and str(entry.get('expression', '')).strip() not in ('', '[]')
            for entry in ranked
        )
        all_expression_lists = (
            c.get('excludedStreamExpressions', []) or []
        ) + (
            c.get('includedStreamExpressions', []) or []
        ) + (
            c.get('requiredStreamExpressions', []) or []
        ) + (
            c.get('preferredStreamExpressions', []) or []
        )
        score_dependent = [
            entry for entry in all_expression_lists
            if 'streamExpressionScore(' in (entry.get('expression', '') if isinstance(entry, dict) else str(entry))
            or 'rseMatched(' in (entry.get('expression', '') if isinstance(entry, dict) else str(entry))
        ]
        if score_dependent and not has_local_ranked:
            err(name, "score-dependent SEL requires local ranked expressions; synced expressions are prohibited")

        # ── SEL function existence + length headroom (audit 2026-08-08) ──
        _validate_sel_functions(all_expression_lists, name, err, warn)

    # ── Sort criteria ─────────────────────────────────────────
    _sort = c.get('sortCriteria', {})
    for scope, sort_list in (_sort.items() if isinstance(_sort, dict) else []):
        bad_keys = [s['key'] for s in sort_list if s.get('key') not in VALID['sort_keys']]
        if bad_keys:
            err(name, f"sortCriteria.{scope}: invalid keys {bad_keys}")
        else:
            ok(name, f"sortCriteria.{scope}: {len(sort_list)} keys valid")

    if is_core_builds_template and not has_local_ranked:
        has_score_sort = any(
            entry.get('key') == 'streamExpressionScore'
            for sort_list in c.get('sortCriteria', {}).values()
            if isinstance(sort_list, list)
            for entry in sort_list
            if isinstance(entry, dict)
        )
        if has_score_sort:
            err(name, "streamExpressionScore sort requires local ranked expressions; synced expressions are prohibited")

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
    seen_preset_ids = set()
    for p in c.get('presets', []):
        ptype = p.get('type', '')
        pid   = p.get('instanceId', '')
        if is_core_builds_template and ptype == 'torbox-search':
            compatibility = meta.get('coreBuildsCompatibility', {}) if isinstance(meta, dict) else {}
            if all(compatibility.get(key) == value for key, value in LEGACY_TORBOX_SEARCH_COMPATIBILITY.items()):
                ok(name, "legacy torbox-search is explicitly limited to the v2.31.1 compatibility lane")
            else:
                err(name, "legacy torbox-search requires coreBuildsCompatibility legacyTorboxSearch=true and maximumAIOStreamsVersion='2.31.1'; v2.32 must use an explicit Newznab migration")
        if not pid:
            err(name, f"preset '{ptype}': instanceId is required even when disabled")
        elif pid in seen_preset_ids:
            err(name, f"preset '{ptype}': duplicate instanceId '{pid}'")
        else:
            seen_preset_ids.add(pid)
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
        # AIOStreams rejects Peerflix without this explicit boolean. `false` is
        # valid and must not be checked with truthiness.
        if ptype == 'peerflix' and not isinstance(opts.get('useMultipleInstances'), bool):
            err(name, f"preset 'peerflix': useMultipleInstances must be a boolean, got {opts.get('useMultipleInstances')!r}")
        if ptype == 'subdl':
            language = opts.get('language')
            if not isinstance(language, list) or not language or not all(isinstance(code, str) and code for code in language):
                err(name, f"preset 'subdl': language must be a non-empty array, got {language!r}")
            elif len(language) > 5:
                err(name, f"preset 'subdl': language supports at most 5 values, got {len(language)}")
            if opts.get('hearingImpairment') not in ('hiInclude', 'hiExclude', 'hiOnly'):
                err(name, f"preset 'subdl': hearingImpairment must be hiInclude, hiExclude, or hiOnly")

    ok(name, f"presets: {len(c.get('presets', []))} total, "
             f"{sum(1 for p in c.get('presets', []) if p.get('enabled'))} enabled")

    # ── Groups ────────────────────────────────────────────────
    groups = c.get('groups', {})
    dynamic_fetching = c.get('dynamicAddonFetching', {})
    if (is_core_builds_template and groups.get('enabled')
            and dynamic_fetching.get('enabled')):
        err(name, "Groups and Dynamic fetching cannot both be enabled in a Core Builds template")
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

    # ── Playback enum contracts ───────────────────────────────
    autoplay = c.get('autoPlay', {})
    bad_autoplay = validate_list(autoplay.get('attributes', []), VALID['autoplay_attributes'])
    if bad_autoplay:
        err(name, f"autoPlay.attributes: invalid values {bad_autoplay}")
    elif autoplay.get('attributes'):
        ok(name, f"autoPlay.attributes: {len(autoplay['attributes'])} values valid")

    cache_and_play = c.get('cacheAndPlay', {})
    bad_cache_types = validate_list(cache_and_play.get('streamTypes', []), VALID['cache_and_play_types'])
    if bad_cache_types:
        err(name, f"cacheAndPlay.streamTypes: invalid values {bad_cache_types}")
    elif cache_and_play.get('streamTypes'):
        ok(name, f"cacheAndPlay.streamTypes: {len(cache_and_play['streamTypes'])} values valid")

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

    required_languages = tuple(c.get('requiredLanguages', []))
    if required_languages and required_languages not in REVIEWED_REQUIRED_LANGUAGES:
        warn(name, f"requiredLanguages is set {list(required_languages)[:3]} — hard-blocks untagged streams")
    elif required_languages:
        ok(name, "requiredLanguages policy reviewed")

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
    excluded_eses = c.get('excludedStreamExpressions', [])
    ese_count = len(excluded_eses)
    pse_count = len(c.get('preferredStreamExpressions', []))
    ok(name, f"expressions: {ise_count} ISEs, {ese_count} ESEs, {pse_count} PSEs")

    for entry in excluded_eses:
        if isinstance(entry, str):
            expression = entry
        elif isinstance(entry, dict):
            expression = entry.get('expression', '')
        else:
            continue
        legacy_marker = next((marker for marker in LEGACY_DESTRUCTIVE_PACK_ESE_MARKERS
                              if marker in expression), None)
        if legacy_marker and not is_deprecated:
            err(name, f"excludedStreamExpressions contains legacy destructive pack ESE '{legacy_marker}' — use the late pack fallback policy")

    has_zero_cached = any('0Cached' in e.get('expression', '')
                          for e in c.get('includedStreamExpressions', []))
    if not has_zero_cached and is_core_stable:
        ok(name, "Core Stable intentionally uses native availability policy instead of a 0Cached ISE")
    elif not has_zero_cached and name not in REVIEWED_NO_ZERO_CACHED:
        warn(name, "0Cached ISE missing — no fallback when nothing is cached")
    elif not has_zero_cached:
        ok(name, "0Cached ISE exception reviewed for parent/base config")

    # ── Double-load check ─────────────────────────────────────
    # Ignore comment-only placeholder entries (expression is bare [] with no logic)
    synced_ise = c.get('syncedIncludedStreamExpressionUrls', [])
    inline_ises = [e for e in c.get('includedStreamExpressions', [])
                   if ('Core Builds' in e.get('expression', '') or 'ISE v' in e.get('expression', ''))
                   and e.get('expression', '').strip().rstrip('*/').strip().endswith('[]') is False]
    if synced_ise and inline_ises:
        warn(name, "ISEs inline AND synced URL set — potential duplicates")

    return errors, warnings, passes


def main():
    """Main entry point for template validation. Parses arguments and validates templates."""
    parser = argparse.ArgumentParser(description='Validate Core Builds templates')
    parser.add_argument('--dir', action='append', default=[],
                        help='Directory to search for templates (repeatable; default: Templates + Community-Templates, matching the CI scope)')
    parser.add_argument('--file', help='Validate a single file')
    args = parser.parse_args()

    if args.file:
        files = [args.file]
    else:
        dirs = args.dir if args.dir else ['Templates', 'Community-Templates']
        files = []
        for d in dirs:
            p = Path(d)
            files.extend(sorted(p.rglob('*.json')))
        # A path can be reached through overlapping --dir arguments; validate once.
        files = list(dict.fromkeys(files))

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
