#!/usr/bin/env python3
"""Core Builds Template Builder — generate templates from composable layers.

Usage:
    python3 scripts/template_builder.py                    # build all defined templates
    python3 scripts/template_builder.py --dry-run          # show what would change
    python3 scripts/template_builder.py --only stream      # build templates matching name
    python3 scripts/template_builder.py --diff             # show JSON diffs vs existing files

Architecture:
    base_config()       → shared config across ALL non-Anime templates
    resolution_layer()  → 4K or 1080p overrides (sort order, regex counts, visual tags)
    service_layer()     → TorBox, AllDebrid, or Hybrid preset/service differences
    device_layer()      → Samsung, Apple TV, etc. codec/audio restrictions
    tier_layer()        → Full vs Lite ESE/preset reduction
    pse_layer()         → IQR Tukey, CB-static, Flash, or Hybrid PSE stacks

Each template is defined as a composition of layers in TEMPLATES[].
"""

import json
import sys
from copy import deepcopy
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "Templates" / "Torbox"
FILTERING_DIR = BASE_DIR / "Filtering"

RAW_BASE = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main"
ICON_URL = f"{RAW_BASE}/Assets/core_icon.svg"

# ---------------------------------------------------------------------------
# Shared data
# ---------------------------------------------------------------------------

SYNCED_EXCLUDED_REGEX = []
SYNCED_RANKED_REGEX = [
    "https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json"
]
SYNCED_ESE = [
    f"{RAW_BASE}/Filtering/core-builds-eses.json"
]
SYNCED_ISE = [
    f"{RAW_BASE}/Filtering/core-builds-ises.json"
]
SYNCED_PSE = [
    f"{RAW_BASE}/Filtering/core-builds-pses.json"
]

SORT_4K_GLOBAL = [
    {"key": "cached", "direction": "desc"},
    {"key": "streamExpressionMatched", "direction": "desc"},
    {"key": "streamExpressionScore", "direction": "desc"},
    {"key": "seadex", "direction": "desc"},
    {"key": "resolution", "direction": "desc"},
    {"key": "quality", "direction": "desc"},
    {"key": "regexScore", "direction": "desc"},
    {"key": "visualTag", "direction": "desc"},
    {"key": "audioTag", "direction": "desc"},
    {"key": "audioChannel", "direction": "desc"},
    {"key": "language", "direction": "desc"},
    {"key": "encode", "direction": "desc"},
    {"key": "library", "direction": "desc"},
    {"key": "seeders", "direction": "desc"},
    {"key": "bitrate", "direction": "desc"},
    {"key": "size", "direction": "desc"},
]

SORT_1080P_GLOBAL = [
    {"key": "cached", "direction": "desc"},
    {"key": "streamExpressionMatched", "direction": "desc"},
    {"key": "streamExpressionScore", "direction": "desc"},
    {"key": "seadex", "direction": "desc"},
    {"key": "resolution", "direction": "desc"},
    {"key": "quality", "direction": "desc"},
    {"key": "regexScore", "direction": "desc"},
    {"key": "audioTag", "direction": "desc"},
    {"key": "audioChannel", "direction": "desc"},
    {"key": "language", "direction": "desc"},
    {"key": "visualTag", "direction": "desc"},
    {"key": "encode", "direction": "desc"},
    {"key": "library", "direction": "desc"},
    {"key": "seeders", "direction": "desc"},
    {"key": "bitrate", "direction": "desc"},
    {"key": "size", "direction": "desc"},
]

SORT_MOVIES = [
    {"key": "cached", "direction": "desc"},
    {"key": "streamExpressionMatched", "direction": "desc"},
    {"key": "streamExpressionScore", "direction": "desc"},
    {"key": "seadex", "direction": "desc"},
    {"key": "library", "direction": "desc"},
    {"key": "resolution", "direction": "desc"},
    {"key": "quality", "direction": "desc"},
    {"key": "regexScore", "direction": "desc"},
    {"key": "visualTag", "direction": "desc"},
    {"key": "encode", "direction": "desc"},
    {"key": "audioTag", "direction": "desc"},
    {"key": "audioChannel", "direction": "desc"},
    {"key": "language", "direction": "desc"},
    {"key": "seeders", "direction": "desc"},
    {"key": "bitrate", "direction": "desc"},
    {"key": "size", "direction": "desc"},
]

SORT_UNCACHED = [
    {"key": "cached", "direction": "desc"},
    {"key": "streamExpressionMatched", "direction": "desc"},
    {"key": "streamExpressionScore", "direction": "desc"},
    {"key": "seadex", "direction": "desc"},
    {"key": "library", "direction": "desc"},
    {"key": "resolution", "direction": "desc"},
    {"key": "quality", "direction": "desc"},
    {"key": "regexScore", "direction": "desc"},
    {"key": "visualTag", "direction": "desc"},
    {"key": "encode", "direction": "desc"},
    {"key": "seeders", "direction": "desc"},
    {"key": "audioTag", "direction": "desc"},
    {"key": "audioChannel", "direction": "desc"},
    {"key": "language", "direction": "desc"},
    {"key": "bitrate", "direction": "desc"},
    {"key": "size", "direction": "desc"},
]

SORT_ANIME = [
    {"key": "cached", "direction": "desc"},
    {"key": "seadex", "direction": "desc"},
    {"key": "streamExpressionMatched", "direction": "desc"},
    {"key": "streamExpressionScore", "direction": "desc"},
    {"key": "resolution", "direction": "desc"},
    {"key": "quality", "direction": "desc"},
    {"key": "regexScore", "direction": "desc"},
    {"key": "visualTag", "direction": "desc"},
    {"key": "encode", "direction": "desc"},
    {"key": "audioTag", "direction": "desc"},
    {"key": "audioChannel", "direction": "desc"},
    {"key": "language", "direction": "desc"},
    {"key": "seeders", "direction": "desc"},
    {"key": "bitrate", "direction": "desc"},
    {"key": "size", "direction": "desc"},
]


def load_json(path):
    """Load and parse a JSON file from the given path."""
    with open(path) as f:
        return json.load(f)


def load_expressions(filename):
    """Load expression definitions from the Filtering/expressions directory."""
    return load_json(FILTERING_DIR / "expressions" / filename)


# ---------------------------------------------------------------------------
# Layer: base config (shared across ALL non-Anime templates)
# ---------------------------------------------------------------------------

def base_config():
    """Fields shared by every non-Anime template."""
    return {
        "trusted": False,
        "showChanges": True,
        "addonLogo": ICON_URL,
        "excludedResolutions": ["144p", "240p", "360p"],
        "excludedQualities": [],
        "excludedVisualTags": ["3D", "H-OU", "H-SBS"],
        "excludedEncodes": [],
        "excludedAudioTags": [],
        "preferredQualities": ["BluRay REMUX", "BluRay", "WEB-DL", "WEBRip", "HDRip", "BDRip", "BRRip", "SCR", "HDTV", "PDTV", "CAM", "TeleCine", "TeleSync", "WorkPrint"],
        "preferredEncodes": ["AV1", "HEVC", "AVC"],
        "preferredVisualTags": ["DV", "HDR+DV", "HDR10+", "HDR10", "HDR", "HLG", "10bit", "SDR", "IMAX"],
        "preferredAudioTags": ["Atmos", "TrueHD", "DTS-HD MA", "DTS:X", "FLAC", "DTS-HD", "DTS-ES", "DD+", "DTS", "DD", "OPUS", "AAC"],
        "preferredAudioChannels": ["7.1", "5.1", "2.0"],
        "preferredResolutions": ["2160p", "1080p", "720p", "480p"],
        "requiredLanguages": ["English", "Multi"],
        "addonCategoryColors": {"Mix": "indigo", "Debrid": "emerald", "Usenet": "lime", "HTTP": "cyan", "P2P": "orange", "Subs": "purple"},
        "mergedCatalogs": [],
        "rpdbApiKey": "t0-free-rpdb",
        "posterService": "rpdb",
        "enhanceResults": True,
        "usePosterRedirectApi": True,
        "usePosterServiceForMeta": True,
        "syncedExcludedRegexUrls": SYNCED_EXCLUDED_REGEX,
        "syncedRankedRegexUrls": SYNCED_RANKED_REGEX,
        "syncedExcludedStreamExpressionUrls": SYNCED_ESE,
        "syncedIncludedStreamExpressionUrls": SYNCED_ISE,
        "syncedPreferredStreamExpressionUrls": SYNCED_PSE,
        "proxy": {"id": "mediaflow", "proxiedAddons": [], "proxiedServices": []},
        "checkOwned": False,
        "externalDownloads": False,
        "autoRemoveDownloads": False,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def deep_merge(base, overlay):
    """Recursively merge overlay into base. Lists are replaced, not appended."""
    result = deepcopy(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def build_template(template_def):
    """Build a complete template JSON from a definition dict."""
    cfg = base_config()

    for layer_fn in template_def.get("layers", []):
        overlay = layer_fn(template_def)
        cfg = deep_merge(cfg, overlay)

    rel_path = template_def["path"]
    source_url = f"{RAW_BASE}/{rel_path}"

    metadata = {
        "id": template_def["id"],
        "name": template_def["name"],
        "description": template_def.get("description", ""),
        "source": "external",
        "author": "Branding-Brevity",
        "version": template_def["version"],
        "category": "Debrid",
        "serviceRequired": False,
        "setToSaveInstallMenu": True,
        "sourceUrl": source_url,
        "changelogUrl": f"{RAW_BASE}/CHANGELOG.md",
    }

    cfg["addonName"] = template_def["name"]
    cfg["addonDescription"] = template_def.get("addon_description", template_def["name"])

    return {"metadata": metadata, "config": cfg}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    """Main entry point for the template builder CLI."""
    dry_run = "--dry-run" in sys.argv
    show_diff = "--diff" in sys.argv
    only = None
    if "--only" in sys.argv:
        idx = sys.argv.index("--only")
        if idx + 1 < len(sys.argv):
            only = sys.argv[idx + 1].lower()

    print(f"Core Builds Template Builder")
    print(f"{'=' * 40}")
    print(f"Mode: {'dry-run' if dry_run else 'diff' if show_diff else 'build'}")
    print()

    # For now, just validate the base config structure
    cfg = base_config()
    print(f"Base config: {len(cfg)} fields")
    print(f"  Sort criteria sections: global, movies, series, anime, cachedMovies, uncachedMovies, uncachedSeries")
    print(f"  Synced URLs: {sum(len(v) for k, v in cfg.items() if k.startswith('synced'))} total")
    print()
    print("Template builder scaffolding ready.")
    print("Next: add template definitions with layer compositions.")
    print()
    print("Variant axes discovered:")
    print("  1. Resolution: 4K (visualTag high in sort) vs 1080p (visualTag low)")
    print("  2. Service: TorBox (stremthruTorz) vs AllDebrid (stremthruStore) vs Hybrid")
    print("  3. Device: Generic vs Samsung (AV1/VC-1/lossless excluded) vs Apple TV")
    print("  4. Tier: Full (all ESEs) vs Lite (reduced ESEs + presets)")
    print("  5. PSE stack: IQR Tukey vs CB-static vs Flash vs Hybrid twins")
    print("  6. Result limits: 20/8 (standard), 25/10 (stream), 10/5 (flash)")


if __name__ == "__main__":
    main()
