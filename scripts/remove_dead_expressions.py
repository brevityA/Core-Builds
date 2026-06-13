#!/usr/bin/env python3
"""Remove dead expressions: disabled SeaDex ISE + always-empty Sootio ESE."""

import json
import glob
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def is_dead_seadex_ise(e):
    if not isinstance(e, dict): return False
    return not e.get("enabled", True) and "SeaDex" in e.get("expression", "")

def is_sootio_ese(e):
    if not isinstance(e, dict): return False
    return "Sootio" in e.get("expression", "")

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
    removed = []

    ises = cfg.get("includedStreamExpressions", [])
    new_ises = [e for e in ises if not is_dead_seadex_ise(e)]
    if len(new_ises) < len(ises):
        removed.append(f"-{len(ises)-len(new_ises)} SeaDex ISE")
        cfg["includedStreamExpressions"] = new_ises

    eses = cfg.get("excludedStreamExpressions", [])
    new_eses = [e for e in eses if not is_sootio_ese(e)]
    if len(new_eses) < len(eses):
        removed.append(f"-{len(eses)-len(new_eses)} Sootio ESE")
        cfg["excludedStreamExpressions"] = new_eses

    if removed:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        rel = os.path.relpath(path, BASE)
        print(f"  {rel}: {', '.join(removed)}")
        total_removed += sum(int(r.split()[0].lstrip("-")) for r in removed)
        files_changed += 1

print(f"\nDone: {total_removed} dead expressions removed from {files_changed} files.")
