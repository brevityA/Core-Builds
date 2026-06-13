#!/usr/bin/env python3
"""Add multiEpisode() ESE to all active templates, positioned before season-pack ESEs."""

import json
import glob
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MULTI_EPISODE_ESE = {
    "expression": "/* CB | Kill Multi-Episode When Singles Exist */ (queryType == 'series' or queryType == 'anime.series') ? (count(negate(streams, multiEpisode(streams))) >= 3 ? negate(multiEpisode(streams), seasonPack(streams)) : []) : []",
    "enabled": True
}

ANCHOR = "CB | Kill Season Packs When Episodes Exist"

def bump_patch(version):
    parts = version.split(".")
    if len(parts) == 3:
        parts[2] = str(int(parts[2]) + 1)
        return ".".join(parts)
    return version

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

    # Skip if already present
    if any(isinstance(e, dict) and "multiEpisode" in e.get("expression", "") for e in eses):
        continue

    # Find insertion point: before CB | Kill Season Packs When Episodes Exist
    anchor_idx = next(
        (i for i, e in enumerate(eses)
         if isinstance(e, dict) and ANCHOR in e.get("expression", "")),
        None
    )

    if anchor_idx is None:
        # No anchor found — append at end
        eses.append(MULTI_EPISODE_ESE)
    else:
        eses.insert(anchor_idx, MULTI_EPISODE_ESE)

    # Patch version
    meta = data.get("metadata", {})
    old_ver = meta.get("version", "")
    if old_ver:
        meta["version"] = bump_patch(old_ver)

    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    rel = os.path.relpath(path, BASE)
    new_ver = meta.get("version", "")
    print(f"  {rel}  {old_ver} → {new_ver}")
    files_changed += 1

print(f"\nDone: multiEpisode ESE added to {files_changed} templates.")
