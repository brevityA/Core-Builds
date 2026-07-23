---
title: "Expression layer update — 7 custom SEL expressions planned, Pro deprecated, all templates audited"
subreddit: CoreBuilds
scheduled: 2026-06-14
flair: Update
---

A few things landed this week worth knowing about.

## Core Nexus 4K Pro is deprecated

Pro is gone from the active template list. Core Nexus 4K Apex is the direct replacement — identical ESE stack, identical sort criteria, identical dedup config, plus the adaptive IQR bitrate PSEs that Pro never had. If you're on Pro, import Apex. There's nothing in Pro that Apex doesn't do better.

Pro files are kept in Deprecated/ for reference but won't receive further updates.

**Apex import link:** https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json

## The expression layer is expanding

We've been running 4 custom SEL expressions in trial on Stream v2.7.10 for a few weeks. The full planned suite is now mapped out — 7 expressions total.

**In trial (Stream only for now)**

1. **REPACK/PROPER Passthrough ISE** — Pins REPACK and PROPER releases ahead of the excluded and limit stages. Patched releases always surface even if downstream caps would cut them.
2. **Per-Addon Flood Guard ESE** — Caps results per scraper: Meteor ≤5, Comet ≤5, MediaFusion ≤4, Torrent Galaxy / EZTV / Knaben / HdHub ≤3. No single addon can flood the top of the list.
3. **Usenet Propagation Guard ESE** — Holds back NZBs younger than 2 hours when propagated alternatives exist. Eliminates corrupt early-propagation grabs on new releases.
4. **Codec Efficiency Booster PSE** — Surfaces HEVC and AV1 encodes ahead of AVC at 1080p and 720p. Same quality tier, lower bandwidth. Most useful on Stream, Essential, and Anime.

**Planned (post-trial)**

5. **Audio Pinnacle PSE** — Promotes lossless and object-based audio within the ranked pool: Atmos / TrueHD → DTS-HD MA / DTS-X → EAC3 / DD+. No existing audio preference expressions covered this gap. Critical for Apex and 4K Hybrid users with home theatre setups.
6. **HDR / DV Priority PSE** — Surfaces DV and HDR variants ahead of SDR within 4K results. Standard cache tiers treat all visual tags equally. Safe no-op on 1080p-only templates.
7. **AI Upscale Exclusion ESE** — Excludes streams with AI upscaling keywords (topaz, ai-upscale, upscaled, neural, enhancedai) using the keyword() function added in AIOStreams v2.29.6. Critical for 4K and Anime where Topaz releases are common.

All 7 are inline — no synced URLs, works on every AIOStreams instance.

Full reference doc (expression strings + per-template use cases): https://github.com/brevityA/Core-Builds/blob/main/Expressions/core-builds-expression-layer.pdf

## What the expression audit found

The standard SEL layer covers tiering, bitrate floors, seeder intelligence, SeaDex passthrough, result limiting, and file type exclusion well. What it doesn't touch: audio quality ordering, HDR/DV separation within 4K, codec preference, AI upscale detection. Those are the four gaps the new expressions target.

## Template audit

All 31 active templates checked. Every template now has consistent dedup keys, tiebreakers, per-addon timeouts, Zilean + Meteor resources fix, HdHub preset, and hasChapters formatter. Apex-TorBox and 4K Hybrid were version-bumped to 2.7.5 to align with the suite.

Feedback welcome — especially on expressions 5, 6, and 7 before they roll out. If you're on the trial branch with Stream v2.7.10 and have results from the first four, drop them below.
