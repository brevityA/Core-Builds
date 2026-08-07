#!/usr/bin/env python3
"""Generate the Apple TV 4K template from the Samsung TV 4K base."""

import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCE = os.path.join(BASE, "Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json")
DEST_DIR = os.path.join(BASE, "Templates/Torbox/Nightly/AppleTV")
DEST = os.path.join(DEST_DIR, "core-nexus-apple-tv-4k.json")

with open(SOURCE) as f:
    data = json.load(f)

# Metadata
data["metadata"]["id"] = "brevity.core-nexus-apple-tv-4k"
data["metadata"]["name"] = "Core Nexus Apple TV 4K"
data["metadata"]["description"] = (
    "4K template tuned for Apple TV 4K (3rd gen) and Infuse. Dolby Vision Profile 5/8 is natively supported — "
    "DV streams are prioritised. HDR10+ (3rd gen exclusive), HDR10, HLG, and SDR are also shown. "
    "AV1 hard-excluded (no hardware decoder on the A15 chip — severe performance hit). "
    "DD+ Atmos is the native top audio format. "
    "2160p primary with 1080p fallback. Based on Core Nexus 4K Pro (TorBox · Library, TorBox Search, Comet, Zilean)."
)
data["metadata"]["version"] = "0.1.0"
data["metadata"]["sourceUrl"] = (
    "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/"
    "Templates/Torbox/Nightly/AppleTV/core-nexus-apple-tv-4k.json"
)

cfg = data["config"]

cfg["addonName"] = "Core Nexus Apple TV 4K"
cfg["addonDescription"] = (
    "4K HDR focused. Dolby Vision priority · HDR10+ / HDR10 · DD+ Atmos · HEVC only (AV1 excluded)."
)

# Visual tags: HDR10+ first, then DV (native on Apple TV), then HDR+DV, then HDR10 etc.
cfg["preferredVisualTags"] = [
    "HDR10+",
    "DV",
    "HDR+DV",
    "HDR10",
    "HDR",
    "HLG",
    "10bit",
    "SDR",
    "IMAX",
    "AI"
]

# Audio tags: remove DTS:X (not natively supported on tvOS/Apple TV)
cfg["preferredAudioTags"] = [
    "Atmos",
    "TrueHD",
    "DTS-HD MA",
    "FLAC",
    "DTS-HD",
    "DTS-ES",
    "DD+",
    "DTS",
    "DD",
    "OPUS",
    "AAC"
]

# ESEs: remove DV-Only Kill — Apple TV natively supports Dolby Vision
eses = cfg.get("excludedStreamExpressions", [])
before = len(eses)
cfg["excludedStreamExpressions"] = [
    e for e in eses
    if not (isinstance(e, dict) and "DV-Only Kill" in e.get("expression", ""))
]
after = len(cfg["excludedStreamExpressions"])

os.makedirs(DEST_DIR, exist_ok=True)

with open(DEST, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

rel = os.path.relpath(DEST, BASE)
print(f"Created:  {rel}")
print(f"Version:  {data['metadata']['version']}")
print(f"ESEs:     {after} (removed {before - after} DV-Only Kill)")
