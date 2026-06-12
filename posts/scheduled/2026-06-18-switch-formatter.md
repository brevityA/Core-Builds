---
title: "How to switch your stream formatter without re-importing your template"
subreddit: CoreBuilds
scheduled: 2026-06-18
flair: Guide
---

Formatters control how every stream result looks — the layout, the badges, what metadata shows and where. You can swap them any time without touching your template config.

How to do it

1. Go to the Formatters directory: https://github.com/brevityA/Core-Builds/blob/main/Formatters/README.md

2. Find the formatter you want. Each one has a preview image so you can see exactly what it looks like before downloading.

3. Click the Download JSON link — the file saves automatically.

4. Open your AIOStreams dashboard and go to the Formatter section.

5. Tap the Import/Export icon in the bottom right corner.

6. Select Import from File, choose the file you just downloaded, and hit Save.

That's it. Streams update immediately. No Stremio reinstall, no re-importing your template.

If the formatter fields are blank after updating a template, do a fresh import of the template rather than an update — AIOStreams keeps the formatter as a user setting and sometimes the update path skips it.

Which formatter should I use?

Core Nexus Apex v2 is the current recommendation. It shows the score number directly (so you can see why something ranked where it did), puts bitrate before visual tags so the most useful spec is always visible, and uses per-language subtitle flags instead of a generic SUB badge.

Core Nexus Elite is bundled in all templates by default. Solid choice if you don't want to change anything.

There are 16 formatters total covering everything from dense metadata displays to minimal no-emoji layouts for clients that render emoji poorly. Full list with previews at the link above.
