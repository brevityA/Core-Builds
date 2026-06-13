---
title: "Expression layer update — 7 custom SEL expressions planned, Pro deprecated, all templates audited"
subreddit: CoreBuilds
scheduled: 2026-06-14
flair: Update
---

A few things landed this week worth knowing about.

---

**Core Nexus 4K Pro is deprecated**

Pro is gone from the active template list. Core Nexus 4K Apex is the direct replacement — it has an identical ESE stack, identical sort criteria, identical dedup config, and adds the adaptive IQR bitrate PSEs that Pro never had. If you're on Pro, import Apex. There's nothing in Pro that Apex doesn't do better.

Pro files are kept in Deprecated/ for reference but won't receive further updates.

Import link for Apex: https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-apex.json

---

**The Core Builds expression layer is expanding**

We've been running 4 custom SEL expressions in trial on Stream v2.7.10 for a few weeks. We've now mapped out the full planned suite — 7 expressions total. Here's the complete list:

**In trial (Stream only for now)**

1. REPACK/PROPER Passthrough ISE — Pins REPACK and PROPER releases ahead of the excluded and limit stages. If a patched release exists it will always surface, even if the flood guard or result caps would otherwise cut it.

2. Per-Addon Flood Guard ESE — Caps results per scraper: Meteor ≤5, Comet ≤5, MediaFusion ≤4, Torrent Galaxy / EZTV / Knaben / HdHub ≤3. Stops one addon from occupying the entire top of the list.

3. Usenet Propagation Guard ESE — Holds back NZBs younger than 2 hours when fully propagated alternatives exist. Eliminates the corrupt-on-first-grab problem on new releases.

4. Codec Efficiency Booster PSE — Surfaces HEVC and AV1 encodes ahead of AVC at 1080p and 720p. Same quality tier, lower bandwidth. Most useful on Stream, Essential, and Anime.

**Planned (post-trial)**

5. Audio Pinnacle PSE — Promotes lossless and object-based audio within the ranked pool: Atmos / TrueHD first, then DTS-HD MA / DTS-X, then EAC3 / DD+. Tam-Taro has no audio preference expressions at all — this fills that gap entirely. Critical for Apex and 4K Hybrid users with home theatre setups.

6. HDR / DV Priority PSE — Surfaces Dolby Vision and HDR variants ahead of SDR within 4K results. Tam-Taro's cache tiers treat all visual tags equally. On 1080p-only templates this evaluates to an empty pool and does nothing — safe to deploy everywhere.

7. AI Upscale Exclusion ESE — Excludes streams containing AI upscaling keywords (topaz, ai-upscale, aiupscale, upscaled, neural, enhancedai). Uses the keyword() function added in AIOStreams v2.29.6. Particularly important for 4K templates and all Anime variants where Topaz-processed releases are common.

All 7 are inline — they don't use synced URLs so they work regardless of how the AIOStreams instance is configured.

Full reference doc with expression strings and per-template use cases: https://github.com/brevityA/Core-Builds/blob/main/Expressions/core-builds-expression-layer.pdf

---

**What we found about Tam-Taro coverage**

While planning the expression layer we did a full audit of what Tam-Taro's synced expressions actually cover. The short version: it handles tiering (cached vs uncached), bitrate floors, seeder intelligence, SeaDex passthrough, result limiting, and file type exclusion very well. What it doesn't touch at all: audio quality ordering, HDR/DV separation within 4K, codec preference, and AI upscale detection. Those are the gaps the new three expressions target.

We're not replacing Tam-Taro — the Core Builds layer sits on top of it.

---

**Template audit**

All 31 active templates were checked this week. Every template now has consistent dedup keys, tiebreakers, per-addon timeouts, Zilean and Meteor resources fix, HdHub preset, and hasChapters formatter. Three templates (Apex, Apex-TorBox, 4K Hybrid) were version-bumped to align with the rest of the suite at 2.7.5.

---

Feedback welcome — especially on expressions 5, 6, and 7 before they're rolled out. If you're running Stream v2.7.10 on the trial branch and have results to share from the first four, drop them here.
