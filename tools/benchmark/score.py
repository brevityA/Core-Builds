#!/usr/bin/env python3
"""Score a benchmark run from its raw snapshots. Every number traces to a file.

Rubric (see reports/TEMPLATE-BENCHMARK.md for the written version):

  Coverage        cov_any_cached   % of corpus titles with >=1 cached result
                  cov_cached_4k    % with a cached 2160p option
                  cov_cached_1080p % with a cached 1080p option
                  mean_playable    mean count of non-error, non-junk results
  Rank correctness rank_tier_ok    #1 result matches the profile's stated tier
                  rank_cache_ok    no uncached result ranked above a cached one
                  rank_bitrate_ok  #1 result inside the template's bitrate band
  Junk rate       junk_pct         cam/TS/TC, mislabeled res, wrong lang,
                                   wrong S/E, non-matching title
  Dedup           dup_pct          duplicate infohash/filename rows in one list
  Speed           ttfl_ms          time-to-full-list (measured)
                  ttfr_ms          time-to-first-result (see README caveat)

Usage:
  python3 tools/benchmark/score.py --run reports/benchmark-snapshots/run-<id>
  python3 tools/benchmark/score.py --run <dir> --markdown > leaderboard.md
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]

CAM_PAT = re.compile(r"\b(cam(rip)?|hdcam|ts|telesync|tc|telecine|hdts|scr|screener|dvdscr|predvd)\b", re.I)
RES_PAT = re.compile(r"\b(2160p?|4k|uhd|1440p|1080p|720p|576p|480p|360p)\b", re.I)
SE_PAT = re.compile(r"\bs(\d{1,2})[ ._-]?e(\d{1,3})\b", re.I)
SEASON_ONLY_PAT = re.compile(r"\bs(\d{1,2})\b(?![ ._-]?e\d)", re.I)

RES_ORDER = {"2160p": 5, "1440p": 4, "1080p": 3, "720p": 2, "576p": 1, "480p": 1}

# Profile tier expectations. Keyed by contender id substring -> stated tier.
# Sourced from each template's own metadata/description; a contender not listed
# is scored with tier=None (rank_tier_ok reported as n/a, never guessed).
TIER_RULES = {
    "4k": {"top_resolution": "2160p", "no_lower_above": True},
    "apex": {"top_resolution": "2160p", "no_lower_above": True},
    "1080p": {"top_resolution": "1080p", "no_lower_above": True},
    "stream": {"top_resolution": "1080p", "no_lower_above": True},
}


def norm_title(s: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def titles_match(parsed: str, expected: str) -> bool:
    """Normalised title equality with a deliberately tight containment rule.

    Plain substring containment is too loose: it would accept "Dune" (2021) as a
    match for "Dune: Part Two". A containment match therefore only counts when
    the shorter string covers >=80% of the longer one, which tolerates trailing
    subtitle/punctuation drift but rejects a different film in the same series.
    Genuine aliases (localised or alternate release titles) belong in the
    corpus fixture's optional `title_aliases`, not in this heuristic.
    """
    if parsed == expected:
        return True
    short, long = sorted((parsed, expected), key=len)
    return short in long and len(short) / len(long) >= 0.8


def tier_for(contender_id: str) -> dict | None:
    cid = contender_id.lower()
    for key in ("4k", "apex", "1080p", "stream"):
        if key in cid:
            return TIER_RULES[key]
    return None


def filename_of(row: dict) -> str:
    return " ".join(str(x) for x in (row.get("filename"), row.get("folder_name"),
                                     row.get("name_line"), row.get("description")) if x)


def declared_resolution(row: dict) -> str | None:
    r = (row.get("resolution") or "").lower()
    return r if r in RES_ORDER else None


def filename_resolution(row: dict) -> str | None:
    m = RES_PAT.search(filename_of(row))
    if not m:
        return None
    tok = m.group(1).lower()
    if tok in ("4k", "uhd", "2160", "2160p"):
        return "2160p"
    return tok if tok.endswith("p") else tok + "p"


def is_junk(row: dict, fixture: dict) -> tuple[bool, str | None]:
    """Junk detection from filename/title parsing against the corpus fixture."""
    if row.get("is_error_row"):
        return True, "error/statistic row"
    text = filename_of(row)
    if CAM_PAT.search(text) or (row.get("quality") or "").upper() in ("CAM", "TS", "TC", "SCR"):
        return True, "cam/telecine/screener"

    declared, actual = declared_resolution(row), filename_resolution(row)
    if declared and actual and declared != actual:
        return True, f"mislabeled resolution (declared {declared}, filename {actual})"

    ptitle = norm_title(row.get("title"))
    expected = norm_title(fixture["expected_title"])
    if ptitle and expected and not titles_match(ptitle, expected):
        return True, f"non-matching title (parsed {row.get('title')!r})"

    pyear = row.get("year")
    if pyear and fixture.get("expected_year") and abs(int(pyear) - int(fixture["expected_year"])) > 1:
        return True, f"wrong year (parsed {pyear}, want {fixture['expected_year']})"

    if fixture["type"] == "series":
        want_s, want_e = fixture.get("season"), fixture.get("episode")
        got_s, got_e = row.get("season"), row.get("episode")
        m = SE_PAT.search(text)
        if got_s is None and m:
            got_s, got_e = int(m.group(1)), int(m.group(2))
        if got_s is not None and want_s is not None and int(got_s) != int(want_s):
            return True, f"wrong season (got S{got_s}, want S{want_s})"
        if got_e is not None and want_e is not None and int(got_e) != int(want_e):
            # season packs legitimately carry no episode; only flag a WRONG one
            return True, f"wrong episode (got E{got_e}, want E{want_e})"

    langs = [str(x).lower() for x in (row.get("languages") or [])]
    if langs and fixture.get("language") == "en":
        tolerant = {"english", "multi", "dual audio", "dubbed", "unknown", "original"}
        if not any(l in tolerant for l in langs):
            return True, f"wrong language ({','.join(langs)})"
    return False, None


def bitrate_bps(row: dict) -> float | None:
    size, dur = row.get("size_bytes"), row.get("duration_ms")
    if not size or not dur:
        return None
    return (float(size) * 8) / (float(dur) / 1000.0)


def score_snapshot(snap: dict, fixture: dict, tier: dict | None) -> dict:
    if snap["status"] != "ok":
        return {"status": snap["status"], "error": snap.get("error")}

    rows = [r for r in snap["results"] if not r.get("is_error_row")]
    junk_flags = [is_junk(r, fixture) for r in rows]
    junk = [f for f, _ in junk_flags]
    playable = [r for r, j in zip(rows, junk) if not j]

    cached = [r for r in rows if r.get("cached") is True]
    cached_res = {declared_resolution(r) for r in cached}

    # dedup: repeated infohash or filename within one result list
    seen_h, seen_f, dups = set(), set(), 0
    for r in rows:
        h, f = r.get("infohash"), (r.get("filename") or "").lower()
        if h and h in seen_h:
            dups += 1
        elif f and f in seen_f:
            dups += 1
        if h:
            seen_h.add(h)
        if f:
            seen_f.add(f)

    top = rows[0] if rows else None
    rank_tier_ok = rank_cache_ok = None
    if top and tier:
        want = tier["top_resolution"]
        got = declared_resolution(top)
        rank_tier_ok = got == want
        if rank_tier_ok is False and want == "2160p":
            # 4K-first violation only counts if a 2160p option actually existed
            rank_tier_ok = not any(declared_resolution(r) == "2160p" for r in rows)
    if rows:
        first_uncached = next((i for i, r in enumerate(rows) if r.get("cached") is False), None)
        last_cached = max((i for i, r in enumerate(rows) if r.get("cached") is True), default=None)
        rank_cache_ok = True if first_uncached is None or last_cached is None else first_uncached > last_cached

    return {
        "status": "ok",
        "result_count": len(rows),
        "playable_count": len(playable),
        "cached_count": len(cached),
        "has_cached": len(cached) > 0,
        "has_cached_4k": "2160p" in cached_res,
        "has_cached_1080p": "1080p" in cached_res,
        "junk_count": sum(junk),
        "junk_pct": round(100 * sum(junk) / len(rows), 2) if rows else None,
        "junk_reasons": [reason for ok, reason in junk_flags if ok][:10],
        "dup_count": dups,
        "dup_pct": round(100 * dups / len(rows), 2) if rows else None,
        "rank_tier_ok": rank_tier_ok,
        "rank_cache_ok": rank_cache_ok,
        "top_resolution": declared_resolution(top) if top else None,
        "top_cached": top.get("cached") if top else None,
        "top_bitrate_bps": bitrate_bps(top) if top else None,
        "top_addon": top.get("addon") if top else None,
        "ttfl_ms": snap.get("elapsed_ms_full_list"),
    }


def mean(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.mean(xs), 2) if xs else None


def spread(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.pstdev(xs), 2) if len(xs) > 1 else 0.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True, help="snapshot run directory")
    ap.add_argument("--corpus", default=str(HERE / "corpus" / "corpus-v1.json"))
    ap.add_argument("--markdown", action="store_true")
    args = ap.parse_args()

    run = Path(args.run)
    manifest = json.loads((run / "manifest.json").read_text())
    fixtures = {t["key"]: t for t in json.loads(Path(args.corpus).read_text())["titles"]}

    per_snapshot = []
    for rec in manifest["snapshots"]:
        if "file" not in rec:
            per_snapshot.append({"contender": rec["contender"], "repeat": rec["repeat"],
                                 "title_key": rec.get("title_key"), "status": rec["status"], "file": None})
            continue
        snap = json.loads((run / rec["file"]).read_text())
        s = score_snapshot(snap, fixtures[snap["title_key"]], tier_for(snap["contender"]))
        per_snapshot.append({**s, "contender": snap["contender"], "role": snap.get("role"),
                             "repeat": snap["repeat"], "title_key": snap["title_key"],
                             "bucket": snap.get("bucket"), "file": rec["file"]})

    # aggregate: per contender per repeat, then mean +- spread across repeats
    by_cr = defaultdict(list)
    for s in per_snapshot:
        by_cr[(s["contender"], s["repeat"])].append(s)

    per_repeat = {}
    for (cid, rep), rows in by_cr.items():
        ok = [r for r in rows if r.get("status") == "ok"]
        n = len(ok)
        per_repeat[(cid, rep)] = {
            "n_ok": n, "n_failed": len(rows) - n,
            "cov_any_cached": round(100 * sum(r["has_cached"] for r in ok) / n, 2) if n else None,
            "cov_cached_4k": round(100 * sum(r["has_cached_4k"] for r in ok) / n, 2) if n else None,
            "cov_cached_1080p": round(100 * sum(r["has_cached_1080p"] for r in ok) / n, 2) if n else None,
            "mean_playable": mean([r["playable_count"] for r in ok]),
            "junk_pct": mean([r["junk_pct"] for r in ok]),
            "dup_pct": mean([r["dup_pct"] for r in ok]),
            "rank_tier_ok_pct": (round(100 * sum(1 for r in ok if r["rank_tier_ok"]) /
                                       max(1, sum(1 for r in ok if r["rank_tier_ok"] is not None)), 2)
                                 if any(r["rank_tier_ok"] is not None for r in ok) else None),
            "rank_cache_ok_pct": (round(100 * sum(1 for r in ok if r["rank_cache_ok"]) /
                                        max(1, sum(1 for r in ok if r["rank_cache_ok"] is not None)), 2)
                                  if any(r["rank_cache_ok"] is not None for r in ok) else None),
            "ttfl_ms": mean([r["ttfl_ms"] for r in ok]),
        }

    metrics = ["cov_any_cached", "cov_cached_4k", "cov_cached_1080p", "mean_playable",
               "junk_pct", "dup_pct", "rank_tier_ok_pct", "rank_cache_ok_pct", "ttfl_ms"]
    contenders = sorted({cid for cid, _ in per_repeat})
    leaderboard = {}
    for cid in contenders:
        reps = [v for (c, _), v in per_repeat.items() if c == cid]
        leaderboard[cid] = {
            "repeats": len(reps),
            "titles_failed": sum(r["n_failed"] for r in reps),
            **{m: {"mean": mean([r[m] for r in reps]), "spread": spread([r[m] for r in reps])} for m in metrics},
        }

    out = {"run_id": manifest["run_id"], "lane": manifest["lane"],
           "instance_version": manifest.get("instance_version"),
           "corpus": f"{manifest['corpus_id']}@{manifest['corpus_version']}",
           "repeats": manifest["repeats"], "leaderboard": leaderboard,
           "per_snapshot": per_snapshot}
    (run / "scores.json").write_text(json.dumps(out, indent=2) + "\n")

    if args.markdown:
        print(f"### Leaderboard — lane `{manifest['lane']}`, instance `{manifest.get('instance_version')}`, "
              f"corpus `{manifest['corpus_id']}@{manifest['corpus_version']}`, {manifest['repeats']} repeats\n")
        print("| Contender | cached cov % | cached 4K % | cached 1080p % | mean playable | junk % | dup % | tier-ok % | cache-order ok % | TTFL ms | failures |")
        print("|---|---|---|---|---|---|---|---|---|---|---|")
        for cid, v in sorted(leaderboard.items()):
            def f(m):
                x = v[m]
                return "n/a" if x["mean"] is None else f"{x['mean']} ±{x['spread']}"
            print(f"| `{cid}` | {f('cov_any_cached')} | {f('cov_cached_4k')} | {f('cov_cached_1080p')} | "
                  f"{f('mean_playable')} | {f('junk_pct')} | {f('dup_pct')} | {f('rank_tier_ok_pct')} | "
                  f"{f('rank_cache_ok_pct')} | {f('ttfl_ms')} | {v['titles_failed']} |")
    else:
        print(json.dumps(out["leaderboard"], indent=2))
    print(f"\nwrote {run / 'scores.json'}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
