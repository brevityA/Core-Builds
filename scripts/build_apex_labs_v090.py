#!/usr/bin/env python3
"""Build Core Nexus 4K Apex Labs v0.9.0 template.

Reads stable Apex v0.4.16 as the base and Labs v0.8.6 for reference,
then constructs v0.9.0 with the LABS feature set fully enabled.
"""

import json
import sys
from pathlib import Path

LABS_PATH = Path("/home/user/Core-Builds/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json")
APEX_PATH = Path("/home/user/Core-Builds/Templates/Torbox/Single/core-nexus-4k-apex.json")
OUT_PATH = LABS_PATH  # overwrite in place

# ---------------------------------------------------------------------------
# Load sources
# ---------------------------------------------------------------------------
with open(APEX_PATH) as f:
    apex = json.load(f)

with open(LABS_PATH) as f:
    labs_old = json.load(f)

apex_cfg = apex["config"]
apex_ese = apex_cfg["excludedStreamExpressions"]
apex_pse = apex_cfg["preferredStreamExpressions"]
apex_ise = apex_cfg["includedStreamExpressions"]

# ---------------------------------------------------------------------------
# Helper: find an ESE entry from stable Apex by label substring
# ---------------------------------------------------------------------------
def apex_ese_by_label(label: str) -> dict:
    for e in apex_ese:
        if label in e["expression"]:
            return e
    raise KeyError(f"ESE label not found in stable Apex: {label!r}")

def apex_pse_by_label(label: str) -> dict:
    for e in apex_pse:
        if label in e["expression"]:
            return e
    raise KeyError(f"PSE label not found in stable Apex: {label!r}")

# ---------------------------------------------------------------------------
# Build metadata
# ---------------------------------------------------------------------------
metadata = {
    "id": "core-nexus-4k-apex-labs",
    "name": "Core Nexus 4K Apex Labs",
    "version": "0.9.0",
    "description": (
        "Nightly Labs v0.9.0 — all LABS features enabled: "
        "Score IQR Guard (replaces fixed -50 gate), "
        "perGroup() Extra Cached/Uncached ESEs, "
        "Bad Dual Audio Groups, Indexer Diversity, "
        "elite group pins (4K Remux / 1080p Remux / LQ bottom). "
        "Based on 4K Apex v0.4.16."
    ),
    "sourceUrl": (
        "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main"
        "/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json"
    ),
    # No inputs, no appliedTemplates
    "source": apex["metadata"]["source"],
    "author": apex["metadata"]["author"],
    "category": apex["metadata"]["category"],
    "serviceRequired": apex["metadata"]["serviceRequired"],
    "setToSaveInstallMenu": apex["metadata"]["setToSaveInstallMenu"],
    "changelogUrl": apex["metadata"]["changelogUrl"],
}

# ---------------------------------------------------------------------------
# Build excludedStreamExpressions — 28 entries in exact prescribed order
# ---------------------------------------------------------------------------

# 1  Per-Addon Flood Guard (stable Apex)
ese_01 = apex_ese_by_label("/*Per-Addon Flood Guard*/")

# 2  Usenet Propagation Guard (stable Apex)
ese_02 = apex_ese_by_label("/*Usenet Propagation Guard*/")

# 3  AI Upscale Exclusion (stable Apex)
ese_03 = apex_ese_by_label("/*AI Upscale Exclusion*/")

# 4a Core Builds SEL Setup marker (stable Apex)
ese_04a = apex_ese_by_label("/*Core Builds SEL Setup*/")

# 4b Standard ESE (stable Apex)
ese_04b = apex_ese_by_label("/*Standard ESE v1.2.8")

# 5  No Sootio Library (from Labs v0.8.6)
ese_05 = {"expression": "/*No Sootio Library*/ addon(library(streams), 'Sootio')", "enabled": True}

# 6  G's Low Bitrate (stable Apex)
ese_06 = apex_ese_by_label("/*G's Low Bitrate*/")

# 7  ongoingSeasonPack (stable Apex)
ese_07 = apex_ese_by_label("/*ongoingSeasonPack*/")

# 8  Low Seeders (stable Apex)
ese_08 = apex_ese_by_label("/*Low Seeders*/")

# 9  Extra SeaDex (stable Apex — it's also in stable Apex)
ese_09 = apex_ese_by_label("/*Extra SeaDex*/")

# 10 Bad 4k Anime (stable Apex)
ese_10 = apex_ese_by_label("/*Bad 4k Anime*/")

# 11 Upscaled 4k (stable Apex)
ese_11 = apex_ese_by_label("/*Upscaled 4k*/")

# 12 Bad 4k Bluray (stable Apex)
ese_12 = apex_ese_by_label("/*Bad 4k Bluray*/")

# 13 Bad 1080P Bluray (stable Apex)
ese_13 = apex_ese_by_label("/*Bad 1080P Bluray*/")

# 14 Bad NZBs (stable Apex)
ese_14 = apex_ese_by_label("/*Bad NZBs*/")

# 15 RD Copyright (stable Apex, enabled true)
ese_15 = apex_ese_by_label("/*RD Copyright (per DMM)*/")

# 16 Score IQR Guard (LABS v0.9.0 — REPLACES Low SEL Score, enabled: true)
ese_16 = {
    "expression": (
        "/* LABS v0.9.0 | Score IQR Guard — adaptive low-score filter using values(seScore) IQR fence */"
        " count(negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http')))) >= 8"
        " ? streamExpressionScore(negate(merge(library(streams), seadex(streams)), streams), -1000000,"
        " q1(values(negate(merge(library(streams), seadex(streams)), streams), 'seScore'))"
        " - 1.5 * iqr(values(negate(merge(library(streams), seadex(streams)), streams), 'seScore'))) : []"
    ),
    "enabled": True,
}

# 17 Bad Dual Audio Groups (LABS v0.9.0, enabled: true — was false in v0.8.6)
ese_17 = {
    "expression": (
        "/* LABS v0.9.0 | Bad Dual Audio Groups — releaseGroup() ESE replaces -50 regex scoring */"
        " releaseGroup(streams, 'alfaHD', 'BAT', 'BiOMA', 'BlackBit', 'BNd', 'Cory', 'EXTREME', 'FF', 'FOXX',"
        " 'G4RiS', 'GUEIRA', 'LCD', 'N3G4N', 'PD', 'PTHome', 'RiPER', 'RK', 'SiGLA', 'Tars', 'TM',"
        " 'tokar86a', 'TURG', 'vnlls', 'WTV', 'Yatogam1', 'YusukeFLA', 'ZigZag', 'ZNM')"
    ),
    "enabled": True,
}

# 18 Extra Cached HQ perGroup() (LABS v0.9.0, enabled: true)
ese_18 = {
    "expression": (
        "/* LABS v0.9.0 | Extra Cached HQ — perGroup() replaces 20-clause merge/slice */"
        " negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')), 'resolution', 3),"
        " negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')))"
    ),
    "enabled": True,
}

# 19 Extra Cached LQ perGroup() (LABS v0.9.0, enabled: true)
ese_19 = {
    "expression": (
        "/* LABS v0.9.0 | Extra Cached LQ — perGroup() replaces 15-clause merge/slice */"
        " negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')), 'resolution', 3),"
        " negate(merge(library(streams), uncached(streams)), quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')))"
    ),
    "enabled": True,
}

# 20 Extra Uncached perGroup() (LABS v0.9.0, enabled: true)
ese_20 = {
    "expression": (
        "/* LABS v0.9.0 | Extra Uncached — perGroup() replaces 35-clause merge/slice */"
        " negate(perGroup(uncached(streams), 'resolution', 3), uncached(streams))"
    ),
    "enabled": True,
}

# 21 Indexer Diversity (LABS v0.9.0, enabled: true — was false in v0.8.6)
ese_21 = {
    "expression": (
        "/* LABS v0.9.0 | Indexer Diversity — perGroup() caps 2 per scraper, prevents any one addon flooding results */"
        " count(negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http')))) > 20"
        " ? negate(perGroup(negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http'))), 'indexer', 2),"
        " negate(merge(library(streams), seadex(streams)), merge(cached(streams), type(streams, 'p2p', 'http')))) : []"
    ),
    "enabled": True,
}

# 22 Final Limit (stable Apex)
ese_22 = apex_ese_by_label("/*Final Limit (All)*/")

# 23 Hard CAM Kill (stable Apex)
ese_23 = apex_ese_by_label("/* CB | Hard CAM Kill */")

# 24 Hard External Kill (stable Apex)
ese_24 = apex_ese_by_label("/* CB | Hard External Kill */")

# 25 Kill Multi-Episode (stable Apex)
ese_25 = apex_ese_by_label("/* CB | Kill Multi-Episode When Singles Exist */")

# 26 Kill Season Packs (stable Apex)
ese_26 = apex_ese_by_label("/* CB | Kill Season Packs When Episodes Exist */")

# 27 Kill Ambiguous Packs (stable Apex)
ese_27 = apex_ese_by_label("/* CB | Kill Ambiguous Packs When Non-Pack Exist */")

# 28 DV-Only Kill (disabled)
ese_28 = {
    "enabled": False,
    "expression": (
        "/* DV-Only Kill — enable for devices without Dolby Vision support (e.g. Samsung TV) */"
        " negate(visualTag(streams, 'DV'), merge(visualTag(streams, 'HDR10+'), visualTag(streams, 'HDR10'),"
        " visualTag(streams, 'HDR'), visualTag(streams, 'HLG'), visualTag(streams, 'SDR')))"
    ),
}

excluded_stream_expressions = [
    ese_01, ese_02, ese_03,
    ese_04a, ese_04b,
    ese_05,
    ese_06, ese_07, ese_08, ese_09,
    ese_10, ese_11, ese_12, ese_13, ese_14, ese_15,
    ese_16, ese_17, ese_18, ese_19, ese_20, ese_21,
    ese_22, ese_23, ese_24, ese_25, ese_26, ese_27,
    ese_28,
]

# ---------------------------------------------------------------------------
# Build preferredStreamExpressions — pins first, then all APEX tiers, then boosters
# ---------------------------------------------------------------------------

# 1  4K Remux elite pin (LABS v0.9.0)
pse_01 = {
    "expression": (
        "/* LABS v0.9.0 | 4K Remux elite pin — releaseGroup() */"
        " pin(releaseGroup(quality(resolution(streams, 'BluRay REMUX'), '2160p'),"
        " 'FraMeSToR', 'DON', 'FLUX', 'HIFI', 'playBD', 'BMF', 'QxR', 'EPSiLON', 'BLURANiUM', 'PmP'), 'top')"
    ),
    "enabled": True,
}

# 2  1080p Remux elite pin (LABS v0.9.0)
pse_02 = {
    "expression": (
        "/* LABS v0.9.0 | 1080p Remux elite pin — releaseGroup() */"
        " pin(releaseGroup(quality(resolution(streams, 'BluRay REMUX'), '1080p'),"
        " 'NTb', 'FLUX', 'KiNGS', 'NTG', 'BHDStudio', 'FraMeSToR', 'SiC', '126811'), 'top')"
    ),
    "enabled": True,
}

# 3  LQ pin bottom (LABS v0.9.0)
pse_03 = {
    "expression": (
        "/* LABS v0.9.0 | LQ pin bottom — releaseGroup() */"
        " pin(releaseGroup(streams, 'YIFY', 'RARBG', 'EVO', 'YTS', 'PSA', 'MeGusta', 'Tigole'), 'bottom')"
    ),
    "enabled": True,
}

# 4  IMAX pin (LABS v0.9.0)
pse_04 = {
    "expression": (
        "/* LABS v0.9.0 | IMAX pin */"
        " count(visualTag(streams, 'IMAX')) > 0 ? pin(visualTag(streams, 'IMAX'), 'top') : []"
    ),
    "enabled": True,
}

# 5–16  All 12 APEX tiers from stable Apex (unchanged)
apex_pse_tiers = [
    apex_pse_by_label("/*APEX S-Tier 4K Remux"),
    apex_pse_by_label("/*APEX A-Tier 4K WEB-DL HDR"),
    apex_pse_by_label("/*APEX B-Tier 4K WEB-DL SDR"),
    apex_pse_by_label("/*APEX C-Tier 4K WEBRip HDR"),
    apex_pse_by_label("/*APEX D-Tier 4K WEBRip SDR"),
    apex_pse_by_label("/* APEX E-Tier 4K"),
    apex_pse_by_label("/*APEX S-Tier 1080p Remux"),
    apex_pse_by_label("/*APEX A-Tier 1080p WEB-DL"),
    apex_pse_by_label("/* APEX B-Tier 1080p"),
    apex_pse_by_label("/* APEX C-Tier 1080p"),
    apex_pse_by_label("/* APEX 720p | WEB-DL"),
    apex_pse_by_label("/* APEX 720p | Any"),
]

# 17-20  Boosters from stable Apex (unchanged)
pse_codec    = apex_pse_by_label("/*Codec Efficiency Booster*/")
pse_audio    = apex_pse_by_label("/*Audio Pinnacle*/")
pse_hdr      = apex_pse_by_label("/*HDR/DV Priority*/")
pse_usenet   = apex_pse_by_label("/*Boost Cached Usenet*/")

preferred_stream_expressions = (
    [pse_01, pse_02, pse_03, pse_04]
    + apex_pse_tiers
    + [pse_codec, pse_audio, pse_hdr, pse_usenet]
)

# ---------------------------------------------------------------------------
# includedStreamExpressions — stable Apex (all 5 entries) unchanged
# ---------------------------------------------------------------------------
included_stream_expressions = apex_ise  # already a list, copy as-is

# ---------------------------------------------------------------------------
# Assemble config: start from stable Apex config, overlay Labs-specific fields
# ---------------------------------------------------------------------------
config = dict(apex_cfg)  # shallow copy — we'll override specific keys

# Metadata-level overrides in config
config["addonName"] = "Core Nexus 4K Apex Labs 🧪"
config["addonDescription"] = (
    "Nightly Labs v0.9.0 — LABS stack fully enabled. "
    "Score IQR Guard · perGroup() ESEs · Bad Dual Audio Groups · "
    "Indexer Diversity · Elite Group pins. Based on 4K Apex v0.4.16."
)

# Remove appliedTemplates
config.pop("appliedTemplates", None)

# preferredVisualTags: add "AI" after "IMAX"
pvt = list(apex_cfg["preferredVisualTags"])
if "AI" not in pvt:
    imax_idx = pvt.index("IMAX") if "IMAX" in pvt else len(pvt) - 1
    pvt.insert(imax_idx + 1, "AI")
config["preferredVisualTags"] = pvt

# Synced URLs
config["syncedPreferredStreamExpressionUrls"] = []
config["syncedExcludedStreamExpressionUrls"] = []
config["syncedIncludedStreamExpressionUrls"] = []

# Stream expressions
config["excludedStreamExpressions"] = excluded_stream_expressions
config["preferredStreamExpressions"] = preferred_stream_expressions
config["includedStreamExpressions"] = included_stream_expressions

# dynamicAddonFetching: stable Apex value
config["dynamicAddonFetching"] = {
    "enabled": True,
    "condition": "count(cached(resolution(totalStreams,'2160p'))) >= 5 or totalTimeTaken > 5000",
}
# Keep Dynamic as the one explicit Labs early-exit behaviour. Do not inherit a
# Groups scheduler from the Apex source template as well.
config["groups"] = {"enabled": False, "groupings": []}

# ---------------------------------------------------------------------------
# Assemble final template
# ---------------------------------------------------------------------------
template = {
    "metadata": metadata,
    "config": config,
}

# ---------------------------------------------------------------------------
# Write output
# ---------------------------------------------------------------------------
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "w") as f:
    json.dump(template, f, indent=2, ensure_ascii=False)
    f.write("\n")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
ese_count = len(config["excludedStreamExpressions"])
pse_count = len(config["preferredStreamExpressions"])
ise_count = len(config["includedStreamExpressions"])

print(f"Written: {OUT_PATH}")
print(f"  version : {metadata['version']}")
print(f"  ESEs    : {ese_count}")
print(f"  PSEs    : {pse_count}")
print(f"  ISEs    : {ise_count}")
print(f"  dynamicAddonFetching: {config['dynamicAddonFetching']['condition']}")
print(f"  syncedPreferredStreamExpressionUrls: {config['syncedPreferredStreamExpressionUrls']}")

# Quick JSON-validity check (re-parse the file)
with open(OUT_PATH) as f:
    check = json.load(f)
print(f"\nJSON validity: OK — {len(json.dumps(check))} chars")
