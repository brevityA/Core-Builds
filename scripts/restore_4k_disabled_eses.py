#!/usr/bin/env python3
"""Restore disabled ESEs to 4K templates that were over-broadly removed."""

import json
import glob
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UNKNOWN_RESOLUTION = {
    "expression": "/*Unknown Resolution*/ count(resolution(merge(type(streams, 'p2p', 'http', 'usenet', 'stremio-usenet'), cached(type(streams, 'debrid'))), '2160p', '1440p', '1080p','720p','576p','480p')) > 5 ? negate(merge(library(streams), seadex(streams)), resolution(type(streams, 'p2p', 'http', 'usenet', 'stremio-usenet', 'debrid'), 'Unknown')): []",
    "enabled": False
}

UNKNOWN_QUALITY = {
    "expression": "/*Unknown Quality*/ count(quality(merge(type(streams, 'p2p', 'http', 'usenet', 'stremio-usenet'), cached(type(streams, 'debrid'))), 'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV')) > 5 ? negate(merge(library(streams), seadex(streams)), quality(type(streams, 'p2p', 'http', 'usenet', 'stremio-usenet', 'debrid'), 'Unknown')): []",
    "enabled": False
}

DV_ONLY_KILL = {
    "enabled": False,
    "expression": "/* DV-Only Kill — enable for devices without Dolby Vision support (e.g. Samsung TV) */ negate(visualTag(streams, 'DV'), merge(visualTag(streams, 'HDR10+'), visualTag(streams, 'HDR10'), visualTag(streams, 'HDR'), visualTag(streams, 'HLG'), visualTag(streams, 'SDR')))"
}

def has_ese(eses, label):
    """Check if any ESE contains the given label."""
    return any(label in e.get("expression", "") for e in eses if isinstance(e, dict))

def insert_before_cam_kill(eses, *entries):
    """Insert ESE entries before the Hard CAM Kill expression."""
    cam_idx = next(
        (i for i, e in enumerate(eses)
         if isinstance(e, dict) and "CB | Hard CAM Kill" in e.get("expression", "")),
        len(eses)
    )
    for entry in reversed(entries):
        eses.insert(cam_idx, entry)

files_changed = 0

for path in sorted(glob.glob(os.path.join(BASE, "Templates/**/*.json"), recursive=True)):
    if "Deprecated" in path:
        continue
    name = os.path.basename(path).lower()
    if "4k" not in name:
        continue

    with open(path) as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            continue

    cfg = data.get("config", {})
    eses = cfg.get("excludedStreamExpressions", [])
    is_samsung = "samsung" in name
    changed = False

    # Insert Unknown Resolution + Unknown Quality before CB | Hard CAM Kill
    if not has_ese(eses, "Unknown Resolution"):
        insert_before_cam_kill(eses, UNKNOWN_RESOLUTION, UNKNOWN_QUALITY)
        changed = True
    elif not has_ese(eses, "Unknown Quality"):
        insert_before_cam_kill(eses, UNKNOWN_QUALITY)
        changed = True

    # Append DV-Only Kill at end (non-Samsung 4K only)
    if not is_samsung and not has_ese(eses, "DV-Only Kill"):
        eses.append(DV_ONLY_KILL)
        changed = True

    if changed:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        rel = os.path.relpath(path, BASE)
        tag = "(Samsung — no DV-Only Kill)" if is_samsung else ""
        print(f"  {rel} {tag}")
        files_changed += 1

print(f"\nDone: {files_changed} 4K templates restored.")
