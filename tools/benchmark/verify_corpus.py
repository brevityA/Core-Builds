#!/usr/bin/env python3
"""Verify every corpus IMDb ID resolves on Cinemeta and the title/year fixture matches.

Usage:
    python3 tools/benchmark/verify_corpus.py [--corpus tools/benchmark/corpus/corpus-v1.json]

Writes tools/benchmark/corpus/corpus-v1.verified.json with the Cinemeta-reported
name/year for each entry so junk-rate scoring has a live-verified fixture.
No credentials required — Cinemeta is public.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

CINEMETA = "https://v3-cinemeta.strem.io/meta/{type}/{imdb}.json"
UA = {"User-Agent": "CoreBuilds-BenchmarkHarness/1.0"}


def fetch_meta(mtype: str, imdb: str, timeout: int = 15) -> dict | None:
    req = urllib.request.Request(CINEMETA.format(type=mtype, imdb=imdb), headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode()).get("meta")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default="tools/benchmark/corpus/corpus-v1.json")
    ap.add_argument("--sleep", type=float, default=0.4, help="delay between requests (rate limit courtesy)")
    args = ap.parse_args()

    corpus_path = Path(args.corpus)
    corpus = json.loads(corpus_path.read_text())

    verified, failures = [], []
    for entry in corpus["titles"]:
        meta = fetch_meta(entry["type"], entry["imdb"])
        time.sleep(args.sleep)
        if not meta:
            failures.append((entry["key"], "cinemeta lookup FAILED"))
            verified.append({**entry, "verified": False})
            continue
        name = meta.get("name", "")
        year = str(meta.get("year", ""))[:4]
        ok_title = name.lower() == entry["expected_title"].lower()
        ok_year = year == str(entry["expected_year"])
        if not (ok_title and ok_year):
            failures.append(
                (entry["key"], f"fixture mismatch: cinemeta={name!r} ({year}) vs corpus={entry['expected_title']!r} ({entry['expected_year']})")
            )
        verified.append(
            {
                **entry,
                "verified": True,
                "cinemeta_name": name,
                "cinemeta_year": year,
                "cinemeta_aliases": sorted({name, *(meta.get("genres") and [] or [])}),
            }
        )
        print(f"  ok  {entry['key']:34s} {name} ({year})")

    out = corpus_path.with_suffix(".verified.json")
    out.write_text(json.dumps({**corpus, "verified_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "titles": verified}, indent=2) + "\n")
    print(f"\nwrote {out}")

    if failures:
        print("\nFAILURES / MISMATCHES:")
        for key, msg in failures:
            print(f"  ! {key}: {msg}")
        return 1
    print("all corpus entries verified against Cinemeta")
    return 0


if __name__ == "__main__":
    sys.exit(main())
