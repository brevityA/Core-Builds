#!/usr/bin/env python3
"""Remove disabled ESEs (DV-Only Kill, Unknown Resolution, Unknown Quality) from all active templates."""

import json
import glob
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEAD_LABELS = ["DV-Only Kill", "Unknown Resolution", "Unknown Quality"]

def is_dead(ese):
    if not isinstance(ese, dict):
        return False
    if ese.get("enabled", True):
        return False
    expr = ese.get("expression", "")
    return any(label in expr for label in DEAD_LABELS)

total_removed = 0
files_changed = 0

for path in sorted(glob.glob(os.path.join(BASE, "Templates/**/*.json"), recursive=True)):
    if "Deprecated" in path:
        continue

    with open(path) as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            continue

    cfg = data.get("config", {})
    eses = cfg.get("excludedStreamExpressions", [])
    before = len(eses)
    cfg["excludedStreamExpressions"] = [e for e in eses if not is_dead(e)]
    removed = before - len(cfg["excludedStreamExpressions"])

    if removed:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        rel = os.path.relpath(path, BASE)
        print(f"  {rel}: -{removed} ESEs")
        total_removed += removed
        files_changed += 1

print(f"\nDone: {total_removed} disabled ESEs removed from {files_changed} files.")
