# 📺 Stremio vs WuPlay

Both players work with AIOStreams and Core Builds templates. They behave differently in a few important ways — knowing the differences helps you choose the right setup and debug issues faster.

---

## Quick Comparison

| Feature | Stremio | WuPlay |
|---|---|---|
| Platform | Android, iOS, Windows, macOS, Linux, Smart TV | Android only |
| YouTube/trailer stream handling | Can slip through ESE filtering | Handled correctly — not displayed |
| RD copyright filter errors | Shows error cards (hidden by `hideErrors`) | Handles more gracefully |
| External link streams | Can appear as clickable entries | Blocked at player level |
| Stream type detection | Broader, some types bypass ESEs | More granular |
| Subtitles | Native + addon | Addon only |
| UI | Polished, catalogue-first | Stream-focused |
| RPDB poster art | ✅ | ✅ |

---

## The YouTube / Trailer Link Issue

**Stremio** — Some streaming scrapers return YouTube-typed streams (trailers, promos). AIOStreams ESEs filter most of these, but certain stream types can bypass the filter depending on how the scraper labels them. The `Hard YouTube Kill` ESE in Core Builds targets type, external, source, keyword, and quality fields to catch as many variants as possible. A small number may still slip through on Stremio.

**WuPlay** — Handles YouTube and external-typed streams at the player level. These simply don't appear in the stream list regardless of what AIOStreams returns.

**Verdict:** If YouTube fake links are a persistent problem for you on Stremio, switching to WuPlay eliminates the issue entirely.

---

## Real-Debrid & Copyright Filter Errors

In May 2026, Real-Debrid introduced server-side keyword filtering that blocks certain cached files (WEB-DL, streaming service tags). When AIOStreams tries to generate a stream URL for a blocked file, RD returns an error.

**Stremio** — Error cards appear in the stream list. Core Builds uses `hideErrors: true` to suppress these, but some error types still surface depending on the AIOStreams version.

**WuPlay** — Processes error responses differently. Blocked RD files either silently fail or show minimal UI feedback, keeping the stream list cleaner.

**Verdict:** If you use Real-Debrid and find your stream list cluttered with RD errors, WuPlay handles this more cleanly. The Advanced (Dual Core) templates are documented as working better on WuPlay for exactly this reason.

---

## Stream Type Detection

AIOStreams classifies streams into types (`debrid`, `usenet`, `http`, `youtube`, `external`, `p2p`). ESEs filter based on these types.

**Stremio** — Stream type detection is sometimes inconsistent. A stream labelled as `youtube` by one scraper might be `http` in another context, causing some ESEs to miss it.

**WuPlay** — Stream type handling is more consistent with how AIOStreams expects it. Filters behave more predictably.

---

## Which Should I Use?

**Use Stremio if:**
- You want the polished catalogue and UI
- You're on iOS, Windows, macOS, or Linux (WuPlay is Android-only)
- You're on a Smart TV
- You use subtitles heavily

**Use WuPlay if:**
- You're on Android and want cleaner stream lists
- You use Real-Debrid and find the error handling frustrating on Stremio
- YouTube/trailer links are appearing and you want them eliminated at the player level
- You're testing Advanced (Dual Core) templates

**You can use both** — install both players, point them at the same AIOStreams manifest. Use Stremio for browsing and WuPlay for the actual stream when needed.

---

## Installing Your Manifest in WuPlay

1. Save your AIOStreams configuration and copy the manifest URL
2. Open WuPlay → tap the **+** icon
3. Paste the manifest URL
4. Tap **Add** — your streams are available immediately

---

*[Back to Master Guide](README.md) · [Import Guide](README.md#1--importing-a-template)*
