#!/usr/bin/env python3
"""Promote Samsung TV templates from Nightly to stable (Device/Samsung/)."""

import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEMPLATES = [
    {
        "src": "Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv.json",
        "dst": "Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json",
        "sourceUrl": (
            "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/"
            "Templates/Torbox/Device/Samsung/core-nexus-samsung-tv.json"
        ),
    },
    {
        "src": "Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json",
        "dst": "Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json",
        "sourceUrl": (
            "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/"
            "Templates/Torbox/Device/Samsung/core-nexus-samsung-tv-4k.json"
        ),
    },
]

os.makedirs(os.path.join(BASE, "Templates/Torbox/Device/Samsung"), exist_ok=True)

for t in TEMPLATES:
    src_path = os.path.join(BASE, t["src"])
    dst_path = os.path.join(BASE, t["dst"])

    with open(src_path) as f:
        data = json.load(f)

    old_ver = data["metadata"].get("version", "0.1.1")
    parts = old_ver.split(".")
    # 0.1.1 → 0.2.0  (minor bump signals stable promotion)
    new_ver = f"{parts[0]}.{int(parts[1]) + 1}.0"
    data["metadata"]["version"] = new_ver
    data["metadata"]["sourceUrl"] = t["sourceUrl"]

    with open(dst_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"  {t['dst']}  {old_ver} → {new_ver}")

print("\nDone. Remember to:")
print("  git add Templates/Torbox/Device/Samsung/")
print("  git rm Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv*.json")
