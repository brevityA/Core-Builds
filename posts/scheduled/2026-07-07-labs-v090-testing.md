---
title: "Labs v0.9.0 — 5 new expressions in testing, graduating to all templates in a few weeks"
subreddit: CoreBuilds
scheduled: 2026-07-07
flair: Update
---

Five new expressions that have been running in internal testing are now available in the nightly labs templates for supporters to try before they graduate to the full suite.

## What's new in v0.9.0

**1. Score IQR Guard**

Filters out streams that score statistically far below their peers. Uses the same IQR (interquartile range) math already in the bitrate PSEs — if a stream's expression score sits below Q1 − 1.5×IQR of the field, it's excluded. Kicks in only when there are 8+ scored streams so it never fires on thin result sets. In practice this cuts the junk that scores technically above zero but nowhere near the rest of the pool.

**2. Bad Dual Audio Groups — releaseGroup() ESE**

Replaces the old -50 score penalty in ranked regex with a hard exclusion via releaseGroup(). EVO, FGT, NAHOM, YIFY dubbed, and similar dual-audio groups now get cut before the sort stage instead of just ranked low. The difference matters when result counts are low — a -50 ranked entry can still surface at position 2 or 3; an excluded entry doesn't.

**3. perGroup() deduplication**

The old deduplication used 20-clause merge/slice chains for cached HQ, 15-clause for cached LQ, and 35-clause for uncached. All three are replaced with single perGroup() calls. Same effect — one result per release group per tier — but the expression is readable and consistent. This also means the template is ~4 KB smaller.

**4. Indexer Diversity**

Caps results at 2 per scraper source before the final limit. Prevents any single indexer from eating 8 of your 10 results on popular titles where every scraper returns the same pack. No visible change on niche titles; noticeable on mainstream releases where Comet and MediaFusion both return the same 5 groups.

**5. Elite group pins**

Pins known-excellent groups to the top and known-LQ groups to the bottom using pin() rather than hoping they sort there via scoring:

- 4K Remux top: FraMeSToR, DON, FLUX, HIFI, playBD, BMF, QxR, EPSiLON, BLURANiUM, PmP
- 1080p Remux top: NTb, FLUX, KiNGS, NTG, BHDStudio, FraMeSToR, SiC, 126811
- LQ bottom: YIFY, RARBG, EVO, YTS, PSA, MeGusta, Tigole
- IMAX top: any stream with an IMAX visual tag

Pins are applied before the IQR PSEs so the bitrate window logic still runs, the pins just set a floor and ceiling on where groups land within that window.

## How to test

Two nightly templates have all five features enabled:

**Core Nexus 4K Apex Labs** (v0.9.0)
Import URL: https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-4k-apex-labs.json

**Core Nexus Stream Labs** (v0.6.7 — includes earlier perGroup() and Indexer Diversity; Score IQR Guard and elite pins landing in next labs update)
Import URL: https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Single/core-nexus-stream-labs.json

Labs templates are nightly builds — they receive changes faster and without the same audit gate as stable templates. Not recommended as a daily driver unless you want to catch issues early.

## Timeline

Testing window is roughly 2–3 weeks. If no regressions are reported, all five expressions graduate to the full stable suite across Apex, Stream, Essential, Hybrid, and AllDebrid templates simultaneously.

Most useful feedback: results that got better or worse on specific titles, anything in the top 3 that shouldn't be there, and any cases where the score guard cut something it shouldn't have.
