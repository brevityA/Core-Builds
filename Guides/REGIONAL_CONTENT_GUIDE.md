# 🌍 Regional Content in Discover — Setup Guide

How to get regional and non-English content appearing in Stremio's **Discover** section alongside your Core Builds stream setup.

---

## How Discover Works

The **Discover** tab in Stremio is populated by addon **catalogs**, not stream sources. Core Builds templates control how streams are filtered and sorted — they don't add catalog content to Discover. Regional titles show up in Discover only when an addon that provides regional catalogs is installed.

AIOStreams and stream addons (Comet, Zilean, TorBox Search) are **stream-only** — they have no catalog/Discover output. You need a separate catalog addon.

---

## Option 1 — MediaFusion (Recommended)

MediaFusion has the broadest regional catalog support: Indian (Bollywood, Tamil, Telugu, Malayalam), Middle Eastern, Turkish, Korean, Japanese, Spanish, and more.

**Setup inside AIOStreams:**

1. Go to your AIOStreams config → **Addons** → find **MediaFusion**
2. Enable it and open its settings
3. Turn on **"Enable Watchlist Catalogs"**
4. Set your **Certification / Language filters** to include your target region
5. Save and reinstall your AIOStreams URL in Stremio

**Or install MediaFusion standalone** (outside AIOStreams) if you want its catalogs without adding it to your stream stack:

> `https://mediafusion.elfhosted.com` → configure → copy manifest URL → install in Stremio

Regional catalog categories MediaFusion provides:
| Region | Content |
|---|---|
| India | Bollywood, Tamil, Telugu, Malayalam, Kannada |
| Middle East | Arabic films and series |
| Turkey | Turkish dramas and films |
| Korea | K-Drama, Korean cinema |
| Japan | J-Drama, Japanese cinema |
| Spain / Latin America | Spanish-language film and TV |
| Europe | French, German, Italian selections |

---

## Option 2 — TMDB Addon

The TMDB addon gives you Discover catalogs filtered by language and region, pulled directly from The Movie Database.

**Install:**
1. Go to `https://94c8cb9f702d-tmdb-addon.baby-beamup.club/configure`
2. Set your **language** (e.g. `fr` for French, `de` for German, `ja` for Japanese)
3. Set your **region** (e.g. `FR`, `DE`, `JP`, `IN`, `BR`)
4. Copy the generated manifest URL
5. Install in Stremio → **Addons** → **Install from URL**

TMDB addon creates Discover rows like "Popular in France", "Top Rated in Japan", "Now Playing in Brazil" — browsable by language/region.

---

## Option 3 — Cinemeta (Already Installed)

Stremio ships with **Cinemeta** pre-installed. It provides global catalogs (Top, Popular, New) but with no regional filtering. You can't configure it for a specific language or country.

Useful as a baseline — not useful for targeted regional discovery.

---

## Organising Your Discover Catalogs

Once you have regional addons installed, Stremio stacks all catalogs from all addons in Discover. It can get noisy. You can clean it up two ways:

**In Stremio:**
- Long-press (mobile) or right-click (desktop) any Discover row → **Hide** to remove rows you don't want

**In AIOStreams (`catalogModifications`):**
AIOStreams can rename, reorder, or hide catalogs from addons installed through it. In your template's config, the `catalogModifications` array controls this. Example — rename and reorder your Library catalog:

```json
"catalogModifications": [
  {
    "id": "lib-1791b.aiostreams::library.torbox",
    "type": "library",
    "name": "My Library",
    "shuffle": false,
    "enabled": true,
    "usePosterService": true,
    "hideable": true,
    "searchable": true,
    "addonName": "Library"
  }
]
```

> `catalogModifications` only affects addons configured through AIOStreams — not standalone addons installed separately in Stremio.

---

## Quick Reference by Region

| I want content from... | Best addon |
|---|---|
| India (Bollywood / South Indian) | MediaFusion |
| Middle East / Arabic | MediaFusion |
| Turkey | MediaFusion |
| Korea | MediaFusion or TMDB (`ko` / `KR`) |
| Japan | MediaFusion or TMDB (`ja` / `JP`) |
| France | TMDB (`fr` / `FR`) |
| Germany | TMDB (`de` / `DE`) |
| Brazil / Portuguese | TMDB (`pt` / `BR`) |
| Spain / Latin America | TMDB (`es` / `ES` or `MX`) |
| Italy | TMDB (`it` / `IT`) |
| Anywhere + streams | MediaFusion (catalog + stream source) |

---

## Does This Affect My Streams?

No. Discover catalogs and stream sources are completely independent in Stremio.

- **Catalogs** (Discover) → controlled by catalog addons (MediaFusion, TMDB)
- **Streams** (what plays when you click a title) → controlled by Core Builds + your debrid service

Adding MediaFusion or TMDB for regional Discover content has **zero impact** on how your streams are filtered, sorted, or served.

---

## Still Not Seeing Regional Content?

- Make sure the addon is actually **installed in Stremio** (not just configured in AIOStreams)
- Restart Stremio after installing a new addon
- In MediaFusion, check that your language/certification filter isn't accidentally excluding content
- TMDB requires a valid region code — use the two-letter ISO country code (e.g. `IN`, `JP`, `BR`)

For further help, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions).
