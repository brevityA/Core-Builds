#!/usr/bin/env python3
"""Offline self-test for the benchmark harness. No network, no credentials.

Proves the mechanics work before you spend hours of instance time:
  * every local contender template loads and the lane injection is correct
  * every variant mutation applies and changes EXACTLY one thing vs its control
  * the sanitizer removes credentials from a config-shaped object
  * the junk / dedup / rank scorers behave on hand-built rows

The synthetic rows below are TEST FIXTURES for the scorer's logic. They are not
benchmark evidence and are never written into reports/.

Usage: python3 tools/benchmark/selftest.py
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
sys.path.insert(0, str(HERE))

from runner import Sanitizer, apply_lane, apply_mutation, load_local_template  # noqa: E402
from score import is_junk, score_snapshot, tier_for  # noqa: E402

FAKE_KEY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {name}{(' — ' + detail) if detail and not cond else ''}")
    if not cond:
        fails.append(name)


def diff_paths(a, b, path="") -> list[str]:
    if type(a) is not type(b):
        return [path or "/"]
    if isinstance(a, dict):
        out = []
        for k in set(a) | set(b):
            if k not in a or k not in b:
                out.append(f"{path}/{k}")
            else:
                out += diff_paths(a[k], b[k], f"{path}/{k}")
        return out
    if isinstance(a, list):
        if len(a) != len(b):
            return [path or "/"]
        out = []
        for i, (x, y) in enumerate(zip(a, b)):
            out += diff_paths(x, y, f"{path}/{i}")
        return out
    return [] if a == b else [path or "/"]


print("1. contender registry + template loading")
registry = json.loads((HERE / "contenders.json").read_text())
for c in registry["contenders"]:
    if c["source"] != "local":
        continue
    p = REPO / c["path"]
    check(f"{c['id']}: template exists", p.exists(), str(p))
    if p.exists():
        cfg = load_local_template(c["path"])
        check(f"{c['id']}: config is a dict with keys", isinstance(cfg, dict) and len(cfg) > 3)
for c in registry["contenders"]:
    if c["role"] == "challenger" and c.get("subtype") == "community":
        check(f"{c['id']}: has citation", bool(c.get("citation")))
    if c["role"] == "variant":
        check(f"{c['id']}: declares variant_of + single_variable + one mutation",
              bool(c.get("variant_of")) and bool(c.get("single_variable")) and isinstance(c.get("mutation"), dict))

print("\n2. lane injection")
cfg = apply_lane(load_local_template("Templates/Torbox/Single/core-nexus-4k-apex-torbox.json"), "torbox", FAKE_KEY)
enabled = [s["id"] for s in cfg["services"] if s.get("enabled")]
check("only the benchmark lane is enabled", enabled == ["torbox"], str(enabled))
check("lane key injected", cfg["services"][[s["id"] for s in cfg["services"]].index("torbox")]["credentials"]["apiKey"] == FAKE_KEY)
check("other services carry no credentials",
      all(not s.get("credentials") for s in cfg["services"] if s["id"] != "torbox"))

print("\n3. variant mutations are single-variable")
for c in registry["contenders"]:
    if c["role"] != "variant":
        continue
    base = load_local_template(c["path"])
    mutated, note = apply_mutation(copy.deepcopy(base), c["mutation"])
    d = diff_paths(base, mutated)
    op = c["mutation"]["op"]
    if op in ("add_preset", "remove_preset"):
        ok = all(p.startswith("/presets") for p in d) and len(d) >= 1
    elif op == "demote_sort_key":
        ok = all(p.startswith("/sortCriteria/global") for p in d)
    else:
        ok = len(d) == 1
    check(f"{c['id']}: {note}", ok, f"changed paths: {d[:6]}")

print("\n4. sanitizer")
san = Sanitizer([FAKE_KEY, "hunter2hunter2"])
dirty = {
    "services": [{"id": "torbox", "credentials": {"apiKey": FAKE_KEY}}],
    "url": f"https://x.example/stremio/{FAKE_KEY}/enc/stream.mkv?token=hunter2hunter2",
    "note": f"key is {FAKE_KEY} and pw hunter2hunter2",
    "tmdbAccessToken": "eyJhbGciOiJSUzI1NiJ9.abcdefghijk.zzzzz",
}
clean = json.dumps(san.obj(dirty))
check("api key gone", FAKE_KEY not in clean, clean)
check("password gone", "hunter2hunter2" not in clean, clean)
check("jwt gone", "eyJhbGciOiJSUzI1NiJ9" not in clean, clean)

print("\n5. scorer logic on fixture rows")
fixture_movie = {"key": "t", "type": "movie", "expected_title": "Dune: Part Two", "expected_year": 2024, "language": "en"}
fixture_ep = {"key": "t", "type": "series", "season": 2, "episode": 1, "expected_title": "Severance", "expected_year": 2022, "language": "en"}


def row(**kw):
    base = {"rank": 1, "cached": True, "resolution": "2160p", "quality": "WEB-DL", "title": "Dune: Part Two",
            "filename": "Dune.Part.Two.2024.2160p.WEB-DL.mkv", "languages": ["English"], "is_error_row": False}
    base.update(kw)
    return base


check("clean row is not junk", not is_junk(row(), fixture_movie)[0])
check("cam is junk", is_junk(row(quality="CAM", filename="Dune.Part.Two.2024.HDCAM.mp4"), fixture_movie)[0])
check("mislabeled resolution is junk",
      is_junk(row(resolution="2160p", filename="Dune.Part.Two.2024.1080p.WEB-DL.mkv"), fixture_movie)[0])
check("wrong title is junk", is_junk(row(title="Dune", filename="Dune.2021.2160p.mkv"), fixture_movie)[0])
check("wrong language is junk", is_junk(row(languages=["Russian"]), fixture_movie)[0])
check("wrong episode is junk",
      is_junk({"rank": 1, "cached": True, "resolution": "1080p", "title": "Severance", "season": 2, "episode": 4,
               "filename": "Severance.S02E04.1080p.mkv", "languages": ["English"], "is_error_row": False}, fixture_ep)[0])
check("right episode is clean",
      not is_junk({"rank": 1, "cached": True, "resolution": "1080p", "title": "Severance", "season": 2, "episode": 1,
                   "filename": "Severance.S02E01.1080p.mkv", "languages": ["English"], "is_error_row": False}, fixture_ep)[0])

snap = {"status": "ok", "elapsed_ms_full_list": 4200, "results": [
    row(rank=1, infohash="h1"),
    row(rank=2, cached=True, resolution="1080p", infohash="h2", filename="Dune.Part.Two.2024.1080p.WEB-DL.mkv"),
    row(rank=3, cached=True, infohash="h1"),                      # duplicate infohash
    row(rank=4, cached=False, infohash="h3", filename="Dune.Part.Two.2024.2160p.BluRay.mkv"),
    row(rank=5, cached=True, infohash="h4", quality="CAM", filename="Dune.Part.Two.2024.HDCAM.mp4"),
]}
s = score_snapshot(snap, fixture_movie, tier_for("control-4k-apex-torbox"))
check("cached 4K detected", s["has_cached_4k"] is True)
check("cached 1080p detected", s["has_cached_1080p"] is True)
check("one duplicate counted", s["dup_count"] == 1, str(s["dup_count"]))
check("one junk counted", s["junk_count"] == 1, str(s["junk_count"]))
check("4K-first tier satisfied", s["rank_tier_ok"] is True)
check("cache-first ordering violated is detected",
      score_snapshot({"status": "ok", "elapsed_ms_full_list": 1, "results": [
          row(rank=1, cached=False, infohash="a"), row(rank=2, cached=True, infohash="b")]},
          fixture_movie, tier_for("control-4k-apex-torbox"))["rank_cache_ok"] is False)
check("failed snapshot is not scored as zero",
      score_snapshot({"status": "error", "error": "timeout"}, fixture_movie, None).get("result_count") is None)

print("\n6. corpus")
corpus = json.loads((HERE / "corpus" / "corpus-v1.json").read_text())
buckets = {t["bucket"] for t in corpus["titles"]}
check("corpus has 20-30 titles", 20 <= len(corpus["titles"]) <= 30, str(len(corpus["titles"])))
for need in ("recent-blockbuster", "catalog-older", "current-season", "completed-series", "anime", "non-english", "regional", "obscure"):
    check(f"bucket present: {need}", need in buckets)
check("every series entry pins an episode",
      all(t.get("season") and t.get("episode") for t in corpus["titles"] if t["type"] == "series"))
check("no duplicate keys", len({t["key"] for t in corpus["titles"]}) == len(corpus["titles"]))

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILURES: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
