---
title: "Cached vs uncached streams — what's actually happening"
subreddit: CoreBuilds
scheduled: 2026-06-16
flair: Guide
---

This comes up constantly so here's a plain explanation.

What a debrid service actually does

When you press play, your debrid service (TorBox, Real-Debrid, etc.) doesn't download the torrent to your device. It downloads the torrent to its own servers and streams it to you from there. Fast servers, no seeding, instant for popular content.

The key word is "cached." If someone else has already downloaded that torrent through the same debrid service, the file is already sitting on their servers. When you request it, it starts playing almost immediately. That's a cached stream.

If nobody has cached it yet, the debrid service has to download it fresh. That takes time — anywhere from a few seconds to several minutes depending on file size and seeders. That's uncached.

What Core Builds does with this

Every template sorts cached streams to the top. The lightning bolt badge means cached and ready. The hourglass means uncached.

Flash and Speed templates go further — they only show cached streams at all. If a title isn't cached, it won't appear in the list. This is why Flash loads instantly but sometimes returns nothing for obscure content.

Essential, Stream, and 4K templates show both. You always get results, but cached ones are ranked higher so you're naturally pushed toward the fast option.

Why this matters for template choice

Flash — best for: new releases, popular shows, anything likely to be cached. Worst for: deep catalogue, less popular titles, anime.

Speed — cached first, uncached as fallback. Good balance for most users.

Essential/Stream — full coverage. Best for: anything, anywhere. Slightly slower to load because it's checking more sources.

The practical upshot: if you're mostly watching current stuff on a capable host, Flash or Speed is great. If you watch a lot of older or niche content, use Essential or Stream.
