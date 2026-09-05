#!/usr/bin/env python3
"""Playback-headroom spot check: is the #1 result actually cached and playable?

Method (recorded verbatim in the report so the number is reproducible):
  1. Pick the top-ranked result for N (default 10) snapshots spread across
     contenders and buckets.
  2. Issue a single HTTP Range request for the first 256 KiB of the stream URL.
     A cached debrid link answers 200/206 with data almost immediately; an
     uncached or dead link answers 3xx-to-nothing, 4xx, 5xx, or times out.
  3. Record status, latency, bytes received, and the measured bitrate of the
     file (size*8/duration) against the template's bitrate band.

This is a liveness+headroom probe, NOT a full playback test: it does not decode
video. It is deliberately low-volume (one small ranged GET per stream) to stay
inside debrid rate limits. Streams are never downloaded in full.

Usage:
  python3 tools/benchmark/spotcheck.py --run reports/benchmark-snapshots/run-<id> --n 10
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from runner import Sanitizer  # noqa: E402

CHUNK = 256 * 1024


def probe(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers={
        "User-Agent": "AIOStreams/benchmark-harness-1.0",
        "Range": f"bytes=0-{CHUNK - 1}",
    })
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read(CHUNK)
            return {"reachable": True, "http_status": resp.status,
                    "bytes": len(data), "latency_ms": round((time.perf_counter() - t0) * 1000),
                    "content_type": resp.headers.get("Content-Type")}
    except urllib.error.HTTPError as e:
        return {"reachable": False, "http_status": e.code, "bytes": 0,
                "latency_ms": round((time.perf_counter() - t0) * 1000), "error": f"HTTP {e.code}"}
    except Exception as e:  # noqa: BLE001
        return {"reachable": False, "http_status": None, "bytes": 0,
                "latency_ms": round((time.perf_counter() - t0) * 1000),
                "error": f"{type(e).__name__}: {e}"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--n", type=int, default=10, help="minimum 10 per the rubric")
    ap.add_argument("--seed", type=int, default=20260905, help="fixed seed = reproducible subset")
    ap.add_argument("--delay", type=float, default=3.0)
    args = ap.parse_args()

    run = Path(args.run)
    manifest = json.loads((run / "manifest.json").read_text())
    files = [r["file"] for r in manifest["snapshots"] if r.get("file") and r.get("result_count")]
    if not files:
        print("no snapshots with results; nothing to spot check", file=sys.stderr)
        return 1

    rng = random.Random(args.seed)
    run_id = manifest.get("run_id")
    # stratify: at most one pick per contender per bucket, then sample
    pool = []
    stale = []
    for f in files:
        local = run / f.replace(".json", ".local.json")  # unsanitized sidecar, gitignored
        use_local = local.exists()
        if use_local and run_id is not None:
            # A reused output directory can leave sidecars from an EARLIER run.
            # Their debrid CDN URLs are expired, so probing them reports dead
            # links and silently understates this run's playability.
            sid = json.loads(local.read_text()).get("run_id")
            if sid is not None and sid != run_id:
                stale.append(f)
                use_local = False
        snap = json.loads((local if use_local else run / f).read_text())
        rows = [r for r in snap["results"] if not r.get("is_error_row")]
        if rows:
            pool.append((f, snap, rows[0]))
    rng.shuffle(pool)
    picked, seen = [], set()
    for f, snap, top in pool:
        key = (snap["contender"], snap["bucket"])
        if key in seen and len(picked) < args.n:
            continue
        seen.add(key)
        picked.append((f, snap, top))
        if len(picked) >= args.n:
            break

    if stale:
        print(
            f"ERROR: {len(stale)} sidecar(s) in {run} belong to a different run than "
            f"manifest run_id={run_id!r} (e.g. {stale[0]}). Their playback URLs are "
            "expired; probing them would report dead links and understate playability. "
            "Use a fresh output directory, or delete the stale *.local.json files.",
            file=sys.stderr,
        )
        return 1

    san = Sanitizer([])
    results = []
    for f, snap, top in picked:
        url = top.get("url") or top.get("_url")
        if not url or url.startswith("<REDACTED"):
            results.append({"snapshot": f, "contender": snap["contender"], "title_key": snap["title_key"],
                            "status": "no_url_in_sanitized_snapshot",
                            "note": "run spotcheck against a live run before sanitisation, or re-query the endpoint"})
            continue
        p = probe(url)
        results.append({
            "snapshot": f, "contender": snap["contender"], "title_key": snap["title_key"],
            "rank": top["rank"], "claimed_cached": top.get("cached"),
            "resolution": top.get("resolution"), "size_bytes": top.get("size_bytes"),
            "measured_bitrate_bps": (top["size_bytes"] * 8 / (top["duration_ms"] / 1000))
            if top.get("size_bytes") and top.get("duration_ms") else None,
            **p,
        })
        time.sleep(args.delay)

    out = run / "spotcheck.json"
    out.write_text(json.dumps(san.obj({"method": "256KiB ranged GET on the #1 result; see spotcheck.py docstring",
                                       "seed": args.seed, "n_requested": args.n,
                                       "results": results}), indent=2) + "\n")
    print(json.dumps(results, indent=2))
    print(f"\nwrote {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
