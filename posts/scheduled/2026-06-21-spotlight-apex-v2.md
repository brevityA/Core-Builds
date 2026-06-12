---
title: "Formatter spotlight — Core Nexus Apex v2 (the recommended one)"
subreddit: CoreBuilds
scheduled: 2026-06-21
flair: Formatter
---

Apex v2 is the current recommended formatter and the one most likely to replace Elite as the default in templates. Here's what it does differently and why.

What you see

Name line: Resolution badge — cache status — service — title — season/episode — top audio codec

Description line 1: Cache status — score tier and score number — SeaDex flag — regex match — release group — PREMIER flag

Description line 2: Quality source — encode — bitrate — visual tags — edition flags

Description line 3: Audio codecs — channels — language flags — subtitle language flags

Description line 4: File size — season pack flag — seeders — age — indexer — stream type

Three changes from Apex v1

1. Score number instead of label. Instead of seeing "ELITE" you see "ELITE 94". You know exactly where in the tier something scored and can compare results at a glance.

2. Bitrate before visual tags on line 2. Bitrate is the most decision-relevant spec when choosing between two otherwise similar files. It was buried before. Now it's the first thing you see on that line.

3. Per-language subtitle flags. Instead of a binary SUB badge (present or not present), you get individual flags showing exactly which languages have subtitles — useful if you watch with subs in a specific language.

Download: https://github.com/brevityA/Core-Builds/blob/main/Formatters/README.md

How to apply it: AIOStreams dashboard — Formatter — Import/Export icon — Import from File.
