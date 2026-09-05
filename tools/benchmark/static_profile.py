#!/usr/bin/env python3
"""Static configuration profile of every contender. Offline, no credentials.

This is NOT a benchmark result. It measures what each config *declares* — addon
set, sort order, filters, caps, dedup policy — so that when the live run
produces a score difference you can attribute it to a concrete config delta
instead of guessing. Run it before the live run and cite it in the diagnosis
section of the report.

Usage:
  python3 tools/benchmark/static_profile.py                 # table
  python3 tools/benchmark/static_profile.py --json          # machine readable
  python3 tools/benchmark/static_profile.py --diff control-4k-apex-torbox
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
sys.path.insert(0, str(HERE))
from runner import apply_mutation, load_local_template  # noqa: E402
from template_processor import as_config_array  # noqa: E402


def profile(cfg: dict) -> dict:
    # `presets` is NOT reliably a list of dicts across real-world configs:
    #   * absent entirely (regex/SEL-only templates, e.g. Vidhin05)
    #   * a directive dict {"__if":..., "__value":[...]} (unresolved wizard template)
    # as_config_array() normalises all of these; non-dict members are skipped.
    presets = [p for p in as_config_array(cfg.get("presets")) if isinstance(p, dict)]
    sort_criteria = cfg.get("sortCriteria")
    sort_criteria = sort_criteria if isinstance(sort_criteria, dict) else {}
    sort_global = [
        c.get("key") for c in as_config_array(sort_criteria.get("global")) if isinstance(c, dict)
    ]
    dedup = cfg.get("deduplicator") or {}
    bitrate = cfg.get("bitrate") or {}
    res2160 = ((bitrate.get("resolution") or {}).get("2160p") or {}).get("movies")
    res1080 = ((bitrate.get("resolution") or {}).get("1080p") or {}).get("movies")
    return {
        "addon_count": len([p for p in presets if p.get("enabled", True)]),
        "addons": sorted({p.get("type") for p in presets if p.get("enabled", True)}),
        "sort_global": sort_global,
        "cached_first": bool(sort_global) and sort_global[0] == "cached",
        "resolution_rank": sort_global.index("resolution") if "resolution" in sort_global else None,
        "required_resolutions": as_config_array(cfg.get("requiredResolutions")),
        "excluded_resolutions": as_config_array(cfg.get("excludedResolutions")),
        "excluded_qualities": as_config_array(cfg.get("excludedQualities")),
        "required_languages": as_config_array(cfg.get("requiredLanguages")),
        "bitrate_global_movies": (bitrate.get("global") or {}).get("movies"),
        "bitrate_global_series": (bitrate.get("global") or {}).get("series"),
        "bitrate_2160p_movies": res2160,
        "bitrate_1080p_movies": res1080,
        "dedup_enabled": dedup.get("enabled"),
        "dedup_keys": dedup.get("keys"),
        "dedup_multi_group": dedup.get("multiGroupBehaviour"),
        "excluded_regex_count": len(as_config_array(cfg.get("excludedRegexPatterns"))),
        "ranked_regex_count": len(as_config_array(cfg.get("rankedRegexPatterns"))),
        "excluded_sel_count": len(as_config_array(cfg.get("excludedStreamExpressions"))),
        "ranked_sel_count": len(as_config_array(cfg.get("rankedStreamExpressions"))),
        "synced_sel_urls": len(as_config_array(cfg.get("syncedRankedStreamExpressionUrls"))),
        "max_results": cfg.get("maxResults"),
        "max_per_resolution": cfg.get("maxResultsPerResolution"),
        "exclude_uncached": cfg.get("excludeUncached"),
        "title_matching": (cfg.get("titleMatching") or {}).get("enabled"),
        "season_episode_matching": (cfg.get("seasonEpisodeMatching") or {}).get("enabled"),
        "year_matching": (cfg.get("yearMatching") or {}).get("enabled"),
        # Fields competitors use that Core Builds does not. Profiled so the
        # single-variable differ can actually PROVE a variant changed one thing;
        # without these the differ reports "identical" and the variant is
        # unattributable.
        "synced_regex_urls": len(as_config_array(cfg.get("syncedRankedRegexUrls"))),
        "failover_enabled": (cfg.get("failover") or {}).get("enabled"),
        "failover_max_attempts": (cfg.get("failover") or {}).get("maxAttempts"),
        "excluded_keywords_count": len(as_config_array(cfg.get("excludedKeywords"))),
        "episode_title_matching": (cfg.get("episodeTitleMatching") or {}).get("enabled"),
        "language_inference": (cfg.get("languageInference") or {}).get("enabled"),
        "required_seeder_range": cfg.get("requiredSeederRange"),
        "exclude_seeder_range": cfg.get("excludeSeederRange"),
        "always_precache": cfg.get("alwaysPrecache"),
        "result_limit_global": (cfg.get("resultLimits") or {}).get("global"),
        "result_limit_resolution": (cfg.get("resultLimits") or {}).get("resolution"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--diff", help="print field-by-field delta of every contender vs this contender id")
    args = ap.parse_args()

    registry = json.loads((HERE / "contenders.json").read_text())
    profiles, skipped = {}, {}
    for c in registry["contenders"]:
        if c["source"] != "local":
            skipped[c["id"]] = f"source={c['source']} — profile requires a live fetch; run with network"
            continue
        cfg = load_local_template(c["path"])
        if c.get("mutation"):
            cfg, _ = apply_mutation(cfg, c["mutation"])
        profiles[c["id"]] = profile(cfg)

    if args.diff:
        base = profiles[args.diff]
        for cid, p in profiles.items():
            if cid == args.diff:
                continue
            deltas = {k: (base[k], p[k]) for k in base if base[k] != p[k]}
            print(f"\n## {cid}  (vs {args.diff})")
            if not deltas:
                print("  identical declared configuration")
            for k, (a, b) in deltas.items():
                print(f"  {k}: {a!r}  ->  {b!r}")
        return 0

    if args.json:
        print(json.dumps({"profiles": profiles, "skipped": skipped}, indent=2))
        return 0

    cols = ["addon_count", "cached_first", "required_resolutions", "bitrate_global_movies",
            "dedup_multi_group", "excluded_sel_count", "max_results"]
    print(f"{'contender':38s} " + " ".join(f"{c[:18]:>18s}" for c in cols))
    for cid, p in profiles.items():
        print(f"{cid:38s} " + " ".join(f"{str(p[c])[:18]:>18s}" for c in cols))
    for cid, why in skipped.items():
        print(f"{cid:38s}  [skipped] {why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
