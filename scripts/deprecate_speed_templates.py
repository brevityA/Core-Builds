#!/usr/bin/env python3
"""Deprecate 8 Speed templates — move to Deprecated/, update metadata."""

import json
import os
import shutil

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TORBOX_SPEED_SRC = os.path.join(BASE, "Templates/Torbox/Speed/TorBox")
EASYNEWS_SRC = os.path.join(BASE, "Templates/Torbox/Speed/EasyNews")
TORBOX_SPEED_DEST = os.path.join(BASE, "Templates/Torbox/Deprecated/Speed/TorBox")
EASYNEWS_DEST = os.path.join(BASE, "Templates/Torbox/Deprecated/Speed/EasyNews")

STREAM_URL = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json"
EASYNEWS_URL = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json"
EASYNEWS_4K_URL = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json"

TORBOX_TO_DEPRECATE = {
    "core-nexus-speed.json": {
        "replacement_url": STREAM_URL,
        "replacement_name": "Core Nexus Stream",
    },
    "core-nexus-speed-lite.json": {
        "replacement_url": STREAM_URL,
        "replacement_name": "Core Nexus Stream",
    },
    "core-nexus-speed-4k.json": {
        "replacement_url": STREAM_URL,
        "replacement_name": "Core Nexus Stream",
    },
    "core-nexus-speed-4k-lite.json": {
        "replacement_url": STREAM_URL,
        "replacement_name": "Core Nexus Stream",
    },
}

EASYNEWS_TO_DEPRECATE = {
    "core-nexus-speed-easynews-lite.json": {
        "replacement_url": EASYNEWS_URL,
        "replacement_name": "Core Nexus Speed EasyNews",
    },
    "core-nexus-speed-plus.json": {
        "replacement_url": EASYNEWS_URL,
        "replacement_name": "Core Nexus Speed EasyNews",
    },
    "core-nexus-speed-plus-lite.json": {
        "replacement_url": EASYNEWS_4K_URL,
        "replacement_name": "Core Nexus Speed 4K+",
    },
    "core-nexus-speed-4k-plus-lite.json": {
        "replacement_url": EASYNEWS_4K_URL,
        "replacement_name": "Core Nexus Speed 4K+",
    },
}

def deprecate(filename, src_dir, dest_dir, replacement_url, replacement_name):
    """Deprecate a template by updating metadata and moving to Deprecated directory."""
    src = os.path.join(src_dir, filename)
    dest = os.path.join(dest_dir, filename)

    with open(src) as f:
        data = json.load(f)

    m = data["metadata"]
    orig_name = m["name"]
    m["name"] = f"{orig_name} [DEPRECATED]"
    m["description"] = (
        f"DEPRECATED — superseded by {replacement_name}. "
        f"Use {replacement_name} instead: {replacement_url}"
    )
    m["sourceUrl"] = (
        f"https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/"
        f"Templates/Torbox/Deprecated/Speed/"
        f"{'TorBox' if src_dir.endswith('TorBox') else 'EasyNews'}/{filename}"
    )

    os.makedirs(dest_dir, exist_ok=True)
    with open(dest, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    os.remove(src)
    print(f"  [DEPRECATED] {orig_name} → Deprecated/.../{filename}")


print("Deprecating TorBox Speed templates...")
for fname, info in TORBOX_TO_DEPRECATE.items():
    deprecate(fname, TORBOX_SPEED_SRC, TORBOX_SPEED_DEST, info["replacement_url"], info["replacement_name"])

print("Deprecating EasyNews Speed templates...")
for fname, info in EASYNEWS_TO_DEPRECATE.items():
    deprecate(fname, EASYNEWS_SRC, EASYNEWS_DEST, info["replacement_url"], info["replacement_name"])

print("\nDone. Remaining active Speed templates:")
for f in sorted(os.listdir(TORBOX_SPEED_SRC)):
    print(f"  TorBox: {f}")
for f in sorted(os.listdir(EASYNEWS_SRC)):
    print(f"  EasyNews: {f}")
