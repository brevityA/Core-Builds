<p align="center">
  <img src="https://github.com/brevityA/Core-Builds/raw/refs/heads/main/Assets/master_guide_banner.svg" alt="Core Builds Guide Banner" width="100%"/>
</p>

# 📖 Core Builds by Brevity — Complete Guide

Everything you need to set up, customise, and maintain your build.

---

## What Is This?

**New here? Start here.**

#### What is AIOStreams?

AIOStreams is a self-hosted addon that sits between Stremio (or WuPlay) and your debrid service. When you open a movie or show, Stremio asks AIOStreams for streams. AIOStreams queries multiple torrent and Usenet sources, filters and ranks everything, then hands back a clean sorted list — only the best results, ready to play.

Without AIOStreams you'd be adding dozens of separate addons (Comet, Jackett, MediaFusion, etc.) and getting a chaotic unfiltered mess. AIOStreams replaces all of that with one addon and one configuration.

#### What is a debrid service?

A debrid service (TorBox, Real-Debrid, AllDebrid, etc.) downloads torrents to their servers and caches them. When you press play, it streams directly from their fast server to you — no seeding, no waiting, instant playback on cached content.

#### What is a template?

A template is a pre-built AIOStreams configuration. It controls:
- Which sources are queried (Comet, Zilean, Library, etc.)
- Which streams are filtered out (CAM, low bitrate, bad releases)
- How streams are ranked (4K before 1080p, cached before uncached, etc.)
- What the stream cards look like (formatter)

**Without a template:** you install AIOStreams from scratch and spend hours configuring every filter, sort rule, addon, and expression manually — and still might get poor results.

**With a Core Builds template:** paste one URL, enter your API key, done. Every setting is already tuned and tested.

#### What does "importing" a template mean?

It's not installing new software. It loads a pre-configured settings file into your existing AIOStreams instance. Your AIOStreams host stays the same — the template just fills in all the settings for you. You can re-import a different template any time to switch builds.

---

## Summary

**The full setup in 3 steps:**

1. **[Pick a template](#1--which-template-should-i-use)** — use the decision tree to find the right build for your debrid service and resolution
2. **[Import it](#2--importing-a-template)** — paste the raw template URL into AIOStreams → import → save
3. **Enter your API key** — grab it from your debrid dashboard and paste it when prompted

That's it. You're watching in under 5 minutes.

---

**Quick reference — what each section covers:**

| Section | What it does |
|---|---|
| [1 — Which Template?](#1--which-template-should-i-use) | Decision tree to find your build |
| [2 — Importing](#2--importing-a-template) | Step-by-step import walkthrough |
| [3 — Other Debrid Services](#3--using-a-different-debrid-service) | Switch from TorBox to RD, AD, Premiumize, etc. |
| [4 — Formatters](#4--formatters) | Change how stream cards look |
| [5 — Device Profiles](#5--device-profiles) | Optimise for Samsung, LG, Firestick, Apple TV, etc. |
| [6 — Stremio vs WuPlay](#6--stremio-vs-wuplay) | Which player to use and why |
| [7 — Advanced Editing](#7--advanced-editing) | Manually tweak filters and sort rules |
| [8 — Resetting](#8--resetting-your-instance) | Start fresh without breaking anything |
| [9 — Troubleshooting](#9--troubleshooting) | Fix buffering, no streams, slow results |
| [10 — FAQ](#10--faq) | Common questions answered quickly |
| [11 — Search Criteria](#11--adjusting-search-criteria) | Widen or narrow what sources are queried |
| [Regional Guide](REGIONAL_CONTENT_GUIDE.md) | Discover content by country / language |

---

## Contents

1. [Which Template Should I Use?](#1--which-template-should-i-use)
2. [Importing a Template](#2--importing-a-template)
3. [Using a Different Debrid Service](#3--using-a-different-debrid-service)
4. [Formatters](#4--formatters)
5. [Device Profiles](#5--device-profiles)
6. [Stremio vs WuPlay](#6--stremio-vs-wuplay)
7. [Advanced Editing](#7--advanced-editing)
8. [Resetting Your Instance](#8--resetting-your-instance)
9. [Troubleshooting](#9--troubleshooting)
10. [FAQ](#10--faq)
11. [Adjusting Search Criteria](#11--adjusting-search-criteria)
12. [Regional Content in Discover](REGIONAL_CONTENT_GUIDE.md)


---


## 1 — Which Template Should I Use?

Not sure where to start? Answer the questions below to find your build.

---

#### Step 1 — What TorBox plan do you have?

```
TorBox Pro?
├── Got NZBGeek/Usenet indexer? → Hybrid
├── Want 4K? → 4K Pro
└── 1080p only? → Stream

TorBox Essential?
├── Cached-only, single-click play? → Flash tier
│   ├── 4K? → Flash 4K
│   └── 1080p? → Flash
├── Fast play (2-3s)? → Speed tier
│   ├── + EasyNews, 4K → Speed 4K+
│   ├── + EasyNews, 1080p → Speed+
│   ├── No EasyNews, 4K → Speed 4K
│   └── No EasyNews, 1080p → Speed
├── Want 4K? → 4K Essential
└── 1080p standard? → Essential

EasyNews only (no TorBox)? → Speed EasyNews

Anime?
├── Want 4K HDR? → Anime 4K
└── Standard 1080p? → Anime

Getting too few results / low-overhead host? → Lite variant of any template above
```

---

#### Step 2 — Pick your resolution

#### I have TorBox Pro

| I want... | Use this |
|---|---|
| 4K with Dolby Vision, Atmos, full BluRay REMUX | **[Core Nexus 4K Pro](../Templates/Torbox/Single/core-nexus-4k-pro.json)** |
| 1080p that works on any device, RPDB poster art | **[Core Nexus Stream](../Templates/Torbox/Single/core-nexus-stream.json)** |
| 1080p + NZBGeek for maximum Usenet coverage | **[Core Nexus Hybrid](../Templates/Torbox/Hybrid/core-nexus-hybrid.json)** |

#### I have TorBox Essential (no Usenet)

| I want... | Use this |
|---|---|
| 4K with full addon stack | **[Core Nexus 4K Essential](../Templates/Torbox/Essential/core-nexus-4k-essential.json)** |
| 1080p that works on any device | **[Core Nexus Essential](../Templates/Torbox/Essential/core-nexus-essential.json)** |
| Cached-only 4K, single-click play | **[Core Nexus Flash 4K](../Templates/Torbox/Flash/core-nexus-flash-4k.json)** |
| Cached-only 1080p, single-click play | **[Core Nexus Flash](../Templates/Torbox/Flash/core-nexus-flash.json)** |
| Core Nexus Speed 4K+ | **[Core Nexus Speed 4K+](../Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json)** |
| Core Nexus Speed+ | **[Core Nexus Speed+](../Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus.json)** |
| Core Nexus Speed 4K | **[Core Nexus Speed 4K](../Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json)** |
| Core Nexus Speed | **[Core Nexus Speed](../Templates/Torbox/Speed/TorBox/core-nexus-speed.json)** |

#### I have TorBox + Real-Debrid

The dual-core builds are **advanced** — they work best on WuPlay and require optional MediaFlow Proxy configuration for full RD protection. See [Advanced — Dual Core](../Templates/Torbox/Deprecated/Dual/).

---

#### Standard vs Speed — what's the difference?

| | Standard | Speed |
|---|---|---|
| **Active addons** | 8 | 4 |
| **Stream load time** | 3-6 seconds | 2-3 seconds |
| **Source coverage** | Maximum | Core only (Library, Search NZB, Comet, Zilean) |
| **Best for** | Most users | Fast hardware, low latency priority |
| **Trade-off** | Slightly slower | May miss some niche sources |

> Speed templates use the same filtering, ESEs, and regex ranking as Standard — just fewer scrapers. Quality of results is identical when streams are found.

---

#### Pro vs Essential — what's the difference?

| | TorBox Pro | TorBox Essential |
|---|---|---|
| **Usenet access** | ✅ Yes | ❌ No |
| **Torrent caching** | ✅ Yes | ✅ Yes |
| **NZBGeek support** | ✅ Hybrid template | ❌ |
| **cacheAndPlay** | ✅ Active | ❌ Disabled |
| **nzbFailover** | ✅ Active | ❌ Disabled |
| **Template options** | Single + Hybrid | Essential + Speed |

> All other features — ESE filtering, regex scoring, episode matching, formatter support — are identical between Pro and Essential builds.

---

#### Multi-Device Households

AIOStreams cannot detect which device is requesting a stream. If you have a mix of phones and a 4K TV:

- **Phone/tablet account** → install a 1080p template
- **TV/Shield account** → install a 4K template

Both accounts use the same TorBox credentials. See [Device Profiles](README.md#3--device-profiles) for full setup.

---

#### Still not sure?

Start with **Core Nexus 4K Essential** (if you have TorBox Essential) or **Core Nexus 4K Pro** (if you have TorBox Pro). Both are the most complete builds for their respective plans and work well out of the box on any 4K-capable device.

---

---

## 2 — Importing a Template
Everything you need to import and configure your build. Follow the steps in order.

---

#### 1️⃣ Pick Your Template

#### 🎯 Which Plan Do You Have?

| I have... | Use this tier |
|---|---|
| TorBox Pro | Single or Hybrid |
| TorBox Essential | Essential or Speed |
| TorBox Essential + EasyNews | Speed (EasyNews) |
| TorBox Pro + NZBGeek | Hybrid |

---

#### 📦 Single — TorBox Pro

Full addon stack. Usenet included. Best overall coverage.

| Template | Resolution | Best For |
|---|---|---|
| [Core Nexus 4K Pro](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json) | 4K HDR | Shield, Apple TV 4K, OLED/QLED |
| [Core Nexus Stream](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json) | 1080p SDR | Budget hardware, phones, RPDB art |

---

#### 📦 Essential — TorBox Essential

No Usenet required. Torrent cache only.

| Template | Resolution | Best For |
|---|---|---|
| [Core Nexus 4K Essential](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json) | 4K HDR | Shield, Apple TV 4K |
| [Core Nexus Essential](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json) | 1080p SDR | Budget hardware, phones |

---

#### 🔀 Hybrid — TorBox Pro + NZBGeek

Adds NZBGeek Usenet indexer for maximum source diversity. Requires a NZBGeek API key — see Step 4.

| Template | Resolution | Best For |
|---|---|---|
| [Core Nexus Hybrid](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json) | 1080p SDR | TorBox Pro + NZBGeek users |

---

#### ⚡ Speed — Instant Autoplay (2-3 seconds)

Stripped to 4 addons only. Maximum load speed, no compromise on filtering quality.

#### TorBox Essential + EasyNews

| Template | Resolution |
|---|---|
| [Core Nexus Speed 4K+](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json) | 4K HDR |
| [Core Nexus Speed+](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus.json) | 1080p SDR |

#### TorBox Essential Only

| Template | Resolution |
|---|---|
| [Speed 4K](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json) | 4K HDR |
| [Speed 1080p](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json) | 1080p SDR |

#### EasyNews Only (no TorBox)

| Template | Resolution |
|---|---|
| [Core Nexus Speed EasyNews](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json) | 1080p SDR |

---

#### 🎌 Anime

SeaDex best-release enforcement. Requires TorBox Essential.

| Template | Resolution | Priority |
|---|---|---|
| [Core Nexus Anime](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime.json) | 1080p · 720p fallback | SDR-first, FLAC/AAC |
| [Core Nexus Anime 4K](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Anime/core-nexus-anime-4k.json) | 4K · 1080p fallback | DV → HDR, Atmos/TrueHD |

---

#### 🪶 Lite Variants

Every standard template above has a `-lite` variant. Lite removes 12 quality-gate ESEs (Low Bitrate, Low Seeders, Upscaled 4K, Bad Bluray, Extra Cached/Uncached limits) while keeping all hard kills (CAM, YouTube, 3D). Use Lite if you're seeing fewer than 5–6 results on mainstream content or running on a low-overhead host.

All Lite import URLs: [Template Directory → Lite Variants](../Templates/Torbox/README.md#-lite-variants)

---

#### ⚗️ Advanced — TorBox + Real-Debrid

Community-reported as working on WuPlay. Stremio users may see reduced RD results due to RD's May 2026 server-side filter. MediaFlow Proxy recommended — configure in Proxy section after import.

| Template | Resolution |
|---|---|
| [4K Dual Core](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Deprecated/Dual/core-nexus-4k-dual-core.json) | 4K HDR |
| [Dual Core 1080p](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Deprecated/Dual/core-nexus-dual-core-1080p.json) | 1080p SDR |
| [Core Nexus 4K Essential + RD](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Deprecated/Dual/core-nexus-4k-essential-dual-core.json) | 4K HDR |

---

#### 2️⃣ Choose a Host

| Rank | Host | URL |
|------|------|-----|
| 🥇 | **ElfHosted** | [aiostreams.elfhosted.com](https://aiostreams.elfhosted.com/stremio/configure) |
| 🥈 | **Yeb's** | [aiostreams.fortheweak.cloud](https://aiostreams.fortheweak.cloud/stremio/configure) |
| 🥉 | **Midnight's** ⚠️ | [aiostreamsfortheweebsstable.midnightignite.me](https://aiostreamsfortheweebsstable.midnightignite.me/stremio/configure) — Meteor V2 Beta, some features incomplete |
| 4 | **Viren's** | [aiostreams.viren070.me](https://aiostreams.viren070.me/stremio/configure) |
| 5 | **Kuu's** | [aiostreams.stremio.ru](https://aiostreams.stremio.ru/stremio/configure) |
| 6 | **ATBP** | [aio.atbphosting.com](https://aio.atbphosting.com/stremio/configure) |
| 7 | **Omni's** | [aiostreams.12312023.xyz](https://aiostreams.12312023.xyz/stremio/configure) |

Full list: [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/public-instances/)

---

#### 3️⃣ Import the Template

1. Open your chosen AIOStreams host
2. Navigate to **Templates** → **Import**
3. Paste the raw URL from the table above (the template names link directly to the raw URL)
4. Click **Load Template**

> 💡 **Re-importing resets service toggles.** Your API keys are preserved but service enabled states return to template defaults. Re-enable your services after each re-import.

---

#### 4️⃣ Enable Your Services

**TorBox is pre-enabled.** Enter your API key in the Services section.

All other services are pre-loaded in the 12-service roster but toggled off — enable only what you subscribe to:

`TorBox` · `Real-Debrid` · `AllDebrid` · `Premiumize` · `DebridLink` · `Offcloud` · `Put.io` · `EasyNews` · `EasyDebrid` · `PikPak` · `Seedr` · `Debrider`

#### Hybrid Template — NZBGeek Setup

NZBGeek is a Usenet indexer addon, not a debrid service — its API key is entered separately in the **Addons** section, not the Services modal.

1. Load the template and save
2. Scroll to **Addons → NZBGeek → ⚙️**
3. Paste your API key from [nzbgeek.info](https://nzbgeek.info) → Account → API Key
4. Save

NZBGeek returns no results until this is done. All other addons work immediately.

---

#### 5️⃣ Save & Install

1. Click **Save** at the bottom of the configuration screen
2. AIOStreams generates a unique manifest URL

**Stremio:** Click **Install** — Stremio opens and prompts confirmation.

**WuPlay:** Copy the manifest URL, open WuPlay configurer → **Add-ons** → paste the URL.

---

#### 📱 Multi-Device Households

AIOStreams cannot detect which device is making a request. For households with a mix of devices, use **two separate Stremio accounts:**

**Low-End Account** — phones, tablets, budget TVs
→ 1080p SDR template — compatible with any hardware

**High-End Account** — Shield, 4K OLED, Apple TV 4K
→ 4K template — Remux, DV, HDR10+, TrueHD, Atmos

Both accounts use the same debrid credentials. Addons sync per-account.

See [DEVICE_PROFILES.md](DEVICE_PROFILES.md) for full setup.

---

---

## 3 — Using a Different Debrid Service

Core Builds templates are optimised for TorBox but work with any debrid service that AIOStreams supports. Switching is done entirely through the Services panel — no template changes required.

---

#### Supported Services

| Service | Type | Notes |
|---|---|---|
| **TorBox** | Debrid + Usenet | Default in all templates. Pro plan unlocks Usenet. |
| **Real-Debrid** | Debrid | Large cache. May 2026 server-side filter affects some WEB-DL files. |
| **AllDebrid** | Debrid | Good cache coverage. API key from alldebrid.com. |
| **Premiumize** | Debrid | Strong NZB/Usenet support. Good for Hybrid template users. |
| **DebridLink** | Debrid | EU-based. Solid cache. |
| **EasyDebrid** | Debrid | Lightweight option. |
| **PikPak** | Debrid | Mobile-first. Works with AIOStreams. |
| **Seedr** | Debrid | Torrent-only. No Usenet. |
| **Offcloud** | Debrid | Multi-source. |
| **Put.io** | Cloud storage + debrid | Useful for personal libraries. |
| **EasyNews** | Usenet | Usenet-only. Used in Speed EasyNews template. |
| **Debrider** | Debrid | Community debrid option. |

---

#### How to Switch Services

1. Open your **AIOStreams dashboard**
2. Go to the **Services** section
3. **Toggle off TorBox** (or leave it on if you want both)
4. **Toggle on your preferred service**
5. Enter your **API key** for the new service
6. Click **Save**

That's it. No re-import needed — the template filters and sort rules work the same regardless of which debrid service is active.

---

#### Where to Find Your API Key

| Service | API Key Location |
|---|---|
| TorBox | [torbox.app/settings](https://torbox.app/settings) → API |
| Real-Debrid | [real-debrid.com/apitoken](https://real-debrid.com/apitoken) |
| AllDebrid | [alldebrid.com/apikeys](https://alldebrid.com/apikeys) |
| Premiumize | [premiumize.me/account](https://www.premiumize.me/account) → API |
| DebridLink | [debrid-link.com/webapp/apikey](https://debrid-link.com/webapp/apikey) |
| EasyNews | Your EasyNews username and password |
| EasyDebrid | [easydebrid.com](https://easydebrid.com) → Account |
| PikPak | App → Profile → Developer Settings |

---

#### Running Multiple Services at Once

You can enable more than one service simultaneously. AIOStreams will query all enabled services and merge the results. Useful if you want TorBox as your primary with Real-Debrid as a fallback, for example.

> Each service's cached streams are labelled separately in the stream card so you can see which service is serving each result.

---

#### Notes on Service Compatibility

**Real-Debrid** — Works well with all templates. Since May 2026, RD applies a server-side filter to certain WEB-DL files which may reduce results for some content. `hideErrors: true` in all Core Builds templates suppresses the resulting error cards.

**EasyNews** — Usenet-only. Best paired with a torrent debrid service. The Speed EasyNews template is specifically built around EasyNews as the sole source.

**TorBox Pro vs Essential** — The template tier (Pro/Essential) refers to your TorBox plan's features (Usenet access, cacheAndPlay). If you switch to a different debrid service entirely, any template works — the Pro/Essential label is only relevant when using TorBox.

**Flash templates** — Flash is cached-only (`excludeUncached: true`). This works with any debrid service, but your results depend entirely on what that service has already cached. Flash with a service that has a smaller cache will return fewer results than Flash with TorBox or RD.

---

#### Troubleshooting — No Streams After Switching

1. Confirm the new service is **toggled on** in Services (not just API key entered)
2. Confirm TorBox is **not the only enabled service** if you've switched away from it
3. Try a popular mainstream title first — niche content may not be cached on every service
4. Check your API key is correct and not expired
5. Click **Save** again — some hosts require a second save to register service changes

---

---

## 4 — Formatters

Formatters control how stream cards look in Stremio and WuPlay. Swap between them any time — no template changes needed.

---

#### Which Formatter?

| Formatter | Style | Best For |
|---|---|---|
| **Core Nexus Apex v2** ⭐ | Score · bitrate-first · subtitle flags | Most setups — recommended upgrade |
| **Core Nexus Elite** | Colour circles · INSTANT badge · release group | Default — bundled in all templates |
| **Core Nexus TV** | UPPER CASE · section icons | Smart TVs, projectors, 10-foot UI |
| **Core Nexus Minimal** | 3-line compact · first audio only | Apple TV, small screens |
| **Core Nexus Sigma** | `「 」` brackets · title-first | Clean aesthetic |
| **Core Nexus Apex** | Audio codec in name · ELITE/QUALITY badge | Detailed audio monitoring |

Full previews and all raw URLs → [Formatter Guide](FORMATTER_GUIDE.md)

Additional community formatters (Midnight Slate, Omni Diamond, Core Zenith, Core Syntax, Nexus Prime) are available in the [`Formatters/`](https://github.com/brevityA/Core-Builds/tree/main/Formatters) directory with preview images.

---

#### How to Import

1. Open the raw URL for your chosen formatter from the [Formatter Guide](FORMATTER_GUIDE.md) in your browser — the `.json` file downloads automatically
2. AIOStreams dashboard → **Formatter** section → tap the **Import/Export icon** (bottom right)
3. Select **Import from File** → choose the downloaded file → Save

> ⚠️ Open the raw GitHub URL in your browser. Do not copy-paste from the GitHub rendered file view — it adds hidden characters that break the JSON parser.

**Settings note:** For Elite and Apex v2 — turn **Show file name** and **Show bitrate OFF** in AIOStreams main settings. These formatters handle both natively.

---

---

## 5 — Device Profiles
AIOStreams cannot detect what device is making a request — every device looks identical to the server. A Shield Pro, a budget Android TV, and a phone all arrive at the same manifest URL with no identifying information. This means a single AIOStreams installation will serve the same streams to every device, regardless of whether they can play them.

The solution is **two separate Stremio accounts** — one for low-end devices, one for high-end devices — each with its own AIOStreams addon installed.

---

#### Why Two Accounts?

| | Single Account | Two Accounts |
|---|---|---|
| Phone gets a 4K REMUX | ❌ Buffering or no playback | ✅ Gets 1080p WEB-DL instead |
| Shield gets a 1080p WEB-DL | ❌ Underperforming | ✅ Gets 4K REMUX instead |
| Setup complexity | Simple | Slightly more steps, once |
| Debrid credentials | One set | Same credentials on both |

---

#### 🔵 Low-End Account
*Phones · Tablets · Budget Android TV boxes · Projectors · Older TVs*

#### Recommended Templates
- **[Core Nexus Stream](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json)** — TorBox Pro · 1080p SDR · full addon stack
- **[Core Nexus Stream (Fire Stick)](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json)** — optimised for Fire Stick and low-RAM Android devices
- **[Core Nexus Essential](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json)** — TorBox Essential · 1080p SDR

#### What these builds do
- ✅ Targets WEB-DL and WEBRip sources
- ✅ Caps bitrate and file size — no multi-gigabyte downloads on a mobile connection
- ✅ Strips HDR, Dolby Vision, and Atmos — these require hardware decode support
- ✅ Blocks BluRay and Remux — too large and often unplayable on budget hardware
- ✅ Enforces AVC/HEVC — widely supported across all Android devices
- ❌ No 4K content served at all

#### Devices to sign this account into
- Android phones and tablets
- Budget Android TV boxes (X96, H96, MXQ, Ugoos AM6B at 1080p mode)
- Amazon Fire TV Stick (use the Fire Stick variant for best performance)
- Projectors without native 4K panels
- Older 1080p TVs

---

#### 🟣 High-End Account
*Nvidia Shield · Apple TV 4K · 4K OLED/QLED TVs · High-end Android TV*

#### Recommended Templates
- **[Core Nexus 4K Pro](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json)** — TorBox Pro · 4K HDR · home theater quality
- **[Core Nexus 4K Essential](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json)** — TorBox Essential · 4K HDR

#### What these builds do
- ✅ Targets 4K UHD sources
- ✅ Allows BluRay REMUX up to 150GB
- ✅ Passes Dolby Vision, HDR10+, and HDR10
- ✅ Passes TrueHD Atmos, DTS:X, and DTS-HD MA
- ✅ Prioritises AV1 and HEVC for efficiency at high resolutions
- ✅ Enforces minimum 5GB floor — filters out fake or mislabelled 4K
- ❌ Will not serve 1080p as a fallback for content with no 4K release *(configurable)*

#### Devices to sign this account into
- Nvidia Shield Pro / Shield TV
- Apple TV 4K (all generations)
- 4K OLED / QLED TVs with native Stremio or WuPlay apps
- High-end Android TV boxes (Ugoos AM6B, MECOOL KM7)
- Google TV Streamer

---

#### 🔀 Optional: Hybrid Account
*Users who want cached + uncached streams on a single device*

#### Recommended Template
- **[Core Nexus Hybrid](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json)** — TorBox + NZBGeek, cached and uncached

#### What this build does
- ✅ Shows both cached (instant) and uncached streams
- ✅ Usenet integration via NZBGeek for wider source coverage
- ✅ 1080p SDR — safe for most hardware
- ⚠️ Requires a NZBGeek API key to activate the full Usenet tier
- ⚠️ Uncached streams require TorBox to download the file before playback begins

---

#### ⚙️ How to Set It Up

#### Step 1 — Create your second Stremio account
Go to [stremio.com](https://www.stremio.com) and create a second account using a different email address. A free account is all you need.

#### Step 2 — Install the right template on each account
Sign into each account separately and follow [Section 2 — Importing a Template](#2--importing-a-template) to install the appropriate template. Use the same debrid credentials on both accounts — your subscriptions are not account-locked.

#### Step 3 — Sign each device into the right account
- Sign your **phones, tablets, and budget TVs** into the Low-End account
- Sign your **Shield, Apple TV 4K, and premium TVs** into the High-End account

Stremio syncs addon installations per-account, so each device automatically gets the correct stream list the moment it signs in.

---

#### 💡 Tips

> **Same debrid credentials on both accounts.** TorBox and Real-Debrid API keys are not tied to Stremio accounts — you can enter the same keys on both AIOStreams installations without issue.

> **RPDB posters work per-account.** The Core Nexus Stream template includes a free-tier RPDB key. If you upgrade to a paid RPDB plan, enter your personal key on the low-end account's template for richer poster art.

> **WuPlay users.** WuPlay does not use Stremio accounts — it manages addons locally per device. Simply install the appropriate manifest URL on each device directly.

---

*Return to the [Main README](../README.md)*

---


## 6 — Stremio vs WuPlay

Both players work with Core Builds templates, but they behave differently in ways that matter. Here's what you need to know.

---

#### At a Glance

| Feature | Stremio | WuPlay |
|---|---|---|
| **Platform** | Windows, Mac, Linux, Android, iOS, Smart TV | Android, Fire TV, Android TV |
| **Stream type handling** | Some YouTube/external streams slip through | Suppresses these more reliably |
| **UI maturity** | Polished, well-established | Newer, actively developed |
| **Metadata** | Excellent (Cinemeta) | Good |
| **Deep links** | Standard | Extended |
| **Offline support** | Limited | Better |
| **Cost** | Free (Stremio+/Web is paid) | Free |

---

#### Stream Type Differences

The biggest practical difference between the two players is how they handle **YouTube and external-type streams**.

When Stremio's native catalog (Cinemeta) finds no streams for a title, it sometimes injects YouTube trailer links or external info cards alongside the AIOStreams results. These appear as clickable "streams" in your list but open a web browser instead of playing video.

**AIOStreams mitigation (v2.4.6+):**
- `Hard YouTube Kill` ESE blocks `type(streams, 'youtube')`, `type(streams, 'external')`, and keyword matches
- `excludedStreamSources` blocks YouTube source variants
- `hideErrors: true` suppresses AIOStreams' own error cards

WuPlay does not inject these Cinemeta trailer entries alongside addon results, so the problem simply does not occur. If you encounter YouTube links in WuPlay, the ESE fix will still catch them.

---

#### Real-Debrid Behaviour

**Stremio** interacts with RD through its standard addon API. RD's May 2026 server-side filter causes error cards to appear in the stream list when cached files are flagged — `hideErrors: true` suppresses these, but the underlying RD streams are gone.

**WuPlay** processes RD stream responses slightly differently, and community testing shows reduced impact from the RD filter. The Advanced dual-core builds are consistently reported as working better on WuPlay than on Stremio.

---

#### Which Should I Use?

**Use Stremio if:**
- You are on a platform where WuPlay is not available (Windows, Mac, Linux, iOS, Smart TV)
- You want the most stable, polished experience
- You primarily use TorBox-only templates (no RD dependency)

**Use WuPlay if:**
- You are on Android, Fire TV, or Android TV
- You use the Advanced dual-core (TorBox + RD) builds
- YouTube/external stream leakage has been a problem for you in Stremio
- You want better handling of niche stream types

---

#### Using Both

There is no conflict. You can install the same AIOStreams manifest in both players simultaneously. Many users run Stremio on desktop and WuPlay on a Fire TV Stick — the same template works across both.

---

#### Formatter Compatibility

Both players fully support AIOStreams formatters. The `name` and `description` fields render correctly in both. WuPlay may display slightly different line heights or wrapping on very long description lines, but all Core Builds formatters are tested on both platforms.

---

---

## 7 — Advanced Editing
The **Core Builds** are designed to be plug-and-play. However, if you want to adjust caching rules, tweak filtering, or edit the raw template JSON, this guide covers how to do it safely.

---

#### Step 1: Access Your AIOStreams Host

Open your preferred AIOStreams instance and navigate to your existing configuration. You can reach it via the **Configure** button in Stremio next to the AIOStreams addon, or by visiting your host directly and entering your password.

| Rank | Host | URL |
|------|------|-----|
| 🥇 | **ElfHosted** | `https://aiostreams.elfhosted.com` |
| 🥈 | **Yeb's** | `https://aiostreams.fortheweak.cloud` |
| 🥉 | **Midnight's** | `https://aiostreamsfortheweebsstable.midnightignite.me` |
| 4 | **Viren's** | `https://aiostreams.viren070.me` |
| 5 | **Kuu's** | `https://aiostreams.stremio.ru` |
| 6 | **ATBP Hosting** | `https://aio.atbphosting.com` |
| 7 | **Omni's** | `https://aiostreams.12312023.xyz` |

---

#### Step 2: Enable Advanced Mode

1. Look near the top of the configuration page — usually top-right or just below the main header
2. Find the toggle labelled **"Advanced Mode"** or **"Show Advanced Settings"**
3. Toggle it **ON**

Once enabled, the UI expands to show deeper developer settings.

---

#### Step 3: What Advanced Mode Unlocks

- **Raw JSON Editor** — directly edit `excludedStreamExpressions`, resolution limits, scraper timeouts, and any other config field
- **Granular Scraper Controls** — fine-tune how each addon (Comet, Meteor, MediaFusion, etc.) behaves within the build
- **Proxy Configuration** — direct access to MediaFlow proxy URLs and credentials
- **Synced URL Management** — view and edit the external regex and expression URLs your template pulls from

---

#### ⚠️ Editing Rules — Read Before Touching Anything

#### JSON Syntax is Strict
A single missing comma `,` or mismatched bracket `}` will break the entire template and prevent it from loading. Common mistakes:

```json
// ❌ WRONG — trailing comma before closing bracket
"excludedQualities": ["CAM", "SCR",]

// ✅ CORRECT
"excludedQualities": ["CAM", "SCR"]
```

#### Quality Values Must Match Exactly
AIOStreams only accepts specific enum strings for quality fields. Use these exact values — case counts:

| Correct ✅ | Wrong ❌ |
|---|---|
| `BluRay REMUX` | `Bluray REMUX` |
| `BluRay` | `Bluray` |
| `WEB-DL` | `WEBDL` |
| `WEBRip` | `Webrip` |
| `HC HD-Rip` | `HC HD-RIP` |

#### Stream Expression Functions Must Exist
AIOStreams SEL (Stream Expression Language) only recognises specific built-in functions. Common mistakes that break expressions silently:

| Correct ✅ | Wrong ❌ |
|---|---|
| `type(streams, 'youtube')` | `streamType(streams, 'youtube')` |
| `keyword(streams, 'WEB-DL')` | `filename(streams, 'WEB-DL')` |
| `quality(streams, 'BluRay')` | `quality(streams, 'Bluray')` |

#### Sort Keys Must Be Valid
The `sortCriteria` field only accepts recognised sort keys. These are **not** valid and will throw an import error:

- ❌ `season`
- ❌ `episode`

Valid keys include: `quality`, `resolution`, `cached`, `seeders`, `size`, `age`, `bitrate`, `releaseGroup`, `streamExpressionMatched`, `seadex`, and others listed in the AIOStreams schema.

#### Formatter Expressions — Use `||` Not `|`
In the formatter's name and description fields, condition separators must be double-pipe `||`. A single pipe `|` will cause the expression to fail and render raw template text.

```
// ❌ WRONG
{stream.quality::exists["BluRay"|"Unknown"]}

// ✅ CORRECT
{stream.quality::exists["BluRay"||"Unknown"]}
```

#### Formatter Language Conditionals — Both Branches Must Be Correct
When using `::>1`, `::==1`, and `::exists` together for language handling, the false branch of `::>1` must be an empty string `""` — not a duplicate of the true branch. Getting this wrong shows the wrong value for single-language streams:

```
// ❌ WRONG — false branch also says "MULTI", breaks single-language streams
{stream.languages::>1["MULTI"||"MULTI"]}

// ✅ CORRECT — false branch is empty, letting the ==1 block handle it
{stream.languages::>1["MULTI"||""]}
{stream.languages::==1["{stream.languages::join('')}"||""]}
{stream.languages::exists[""||"Unknown"]}
```

#### `stream.age` Already Includes Its Unit
In current versions of AIOStreams, `stream.age` returns the age value with a `d` suffix already appended (e.g. `10d`). Do not add another `d` in your formatter template or it will display `10dd`:

```
// ❌ WRONG — produces "10dd"
{stream.age::>0["• {stream.age}d"||"• New"]}

// ✅ CORRECT
{stream.age::>0["• {stream.age}"||"• New"]}
```

#### Services — All Opt-In, None Required
All templates ship with the full 12-service roster set to `enabled: false`. Do not set any service to `enabled: true` in the raw JSON — this forces the template to require that service and will break it for anyone who doesn't have it. Enable services through the UI only.

---

#### ✅ Before You Save — Validate Your JSON

If you make any manual edits, **always validate before saving**. Copy your edited JSON and paste it into:

- **[JSONLint](https://jsonlint.com/)** — catches syntax errors instantly
- **[JSON Formatter](https://jsonformatter.curiousconcept.com/)** — formats and validates

---

#### 💾 Backup First

Before changing anything in a working build, export or copy your current configuration JSON and save it somewhere safe. If something breaks, you can re-import the backup without losing your setup.

---

#### 🔗 Useful References

- [AIOStreams Documentation](https://docs.aiostreams.viren070.me) — full schema reference
- [SEL Function Reference](https://docs.aiostreams.viren070.me/configuration/sel) — all valid stream expression functions
- [JSONLint Validator](https://jsonlint.com/) — validate your JSON before importing

---

*Return to the [Main README](../README.md)*

---

## 8 — Resetting Your Instance
Sometimes a template import goes wrong, credentials get stuck in a broken state, or you simply want to start completely fresh. This guide covers every reset scenario from a soft config wipe to a full account deletion.

---

#### Before You Reset -- Back Up First

If your instance is still accessible, export your current configuration before doing anything else. You can always re-import a backup if the reset causes more problems than it solves.

1. Open your AIOStreams dashboard
2. Go to the **Template** section
3. Tap the **Export** icon (box with outward arrow)
4. Save the JSON file somewhere safe

---

#### Choosing the Right Reset

| Situation | What to do |
|---|---|
| Template imported wrong settings | Soft reset -- re-import over existing config |
| Config is broken but you can still log in | Soft reset or hard reset |
| Forgotten password | Hard reset -- Delete User |
| Stremio showing errors after config change | Re-install manifest only |
| Want to switch templates entirely | Soft reset -- re-import new template |
| Something is fundamentally broken | Hard reset -- Delete User |

---

#### Option 1 -- Soft Reset (Re-Import a Template)

Re-importing a template replaces your entire configuration without deleting your account or credentials. This is the quickest fix for most problems.

1. Open your AIOStreams dashboard
2. Go to the **Template** section
3. Tap the **Import** icon
4. Paste the raw GitHub URL for your chosen template or select a local file
5. Enter your credentials when prompted
6. Tap **Load Template**
7. Review that services and addons look correct
8. Tap **Save**
9. Copy the new manifest URL and reinstall in Stremio or WuPlay

> The re-import replaces all filter settings, addons, sort criteria, and formatter settings. Your password is not affected.

---

#### Option 2 -- Hard Reset (Delete User)

Deletes your entire account and configuration. Use this when a soft reset is not enough or when you have forgotten your password.

#### Step 1 -- Note your manifest URL (if possible)

If Stremio still has the addon installed, you will need to uninstall it after the reset. Having the old URL makes this easier, but it is not required.

#### Step 2 -- Delete your user account

1. Open your AIOStreams host in a browser
2. Scroll to the very bottom of the configuration page
3. Tap **Delete User**
4. Confirm the deletion

> This permanently removes your account, password, and all saved configuration. It cannot be undone.

#### Step 3 -- Create a new account

1. Refresh the page -- you will be returned to the initial setup screen
2. Enter a new password (or the same one)
3. Tap **Create User** or **Register**

#### Step 4 -- Re-import your template

Follow the steps in [Section 2 — Importing a Template](#2--importing-a-template) to load a fresh template and enter your API keys.

#### Step 5 -- Uninstall the old addon from Stremio

1. Open Stremio
2. Go to **Addons**
3. Find the old AIOStreams entry and tap **Uninstall**
4. Tap **Install** on the new manifest URL from your fresh setup

---

#### Option 3 -- Password Reset

If you have forgotten your password and cannot log in, a full Delete User is the only option on most hosted instances -- there is no password recovery email flow. Follow Option 2 above.

> On self-hosted Docker instances, you can reset the password by clearing the relevant environment variable or database entry and restarting the container. Check your host's documentation for the exact procedure.

---

#### Reinstalling in Stremio After Any Reset

Any time you reset or change your AIOStreams configuration, your manifest URL changes. The old URL in Stremio will stop returning results. You must reinstall.

**Stremio:**
1. Go to Addons
2. Find the old AIOStreams entry -- tap Uninstall
3. Open your AIOStreams dashboard and copy the new manifest URL
4. Paste it into Stremio's addon search bar or tap Install from the dashboard

**WuPlay:**
1. Open WuPlay configurer
2. Navigate to Add-ons
3. Remove the old AIOStreams manifest URL
4. Paste the new URL and confirm

---

#### Reinstalling in Stremio After a Soft Reset

If you did a soft reset (re-imported a template) and your manifest URL did not change, you do not need to reinstall. Stremio will pick up the updated configuration automatically on the next stream request. A full app restart speeds this up.

---

#### Common Problems After a Reset

**Import fails with HTTP 404**
The template URL is wrong or the file does not exist at that path on GitHub. Check the URL carefully -- folder names and filenames are case-sensitive.

**Import fails with "Invalid template"**
The JSON file is malformed. Validate it at [jsonlint.com](https://jsonlint.com) before importing.

**Stremio still showing the old stream list**
The old manifest is still installed. Uninstall it from the Stremio addon manager and reinstall with the new URL.

**Credentials modal does not appear after re-import**
Some hosts cache the credential state. Try logging out and back in, or clearing your browser cache, then re-importing.

**NZBGeek still not working after reset (Hybrid template)**
The NZBGeek API key is not entered in the credentials modal -- it must be configured in the Addons section after loading. See [Section 2 — Importing a Template](#2--importing-a-template) for the full NZBGeek setup step.

---

#### Host-Specific Notes

| Host | Delete User location | Password reset |
|---|---|---|
| ElfHosted | Bottom of config page | Delete User and re-register |
| Yeb's (ForTheWeak) | Bottom of config page | Delete User and re-register |
| Midnight's | Bottom of config page | Delete User and re-register |
| Viren's | Bottom of config page | Delete User and re-register |
| Kuu's | Bottom of config page | Delete User and re-register |
| Self-hosted Docker | Delete User in UI or wipe volume | Edit environment variables |

---

*Return to the [Main README](../README.md) · [Importing a Template](#2--importing-a-template) · [Advanced Editing](#7--advanced-editing) · [Troubleshooting](#9--troubleshooting)*

---

## 9 — Troubleshooting

Find your symptom below. Most issues are one of three things: an import error, no streams, or streams that don't play.

---

### Import Errors

#### "Failed to import template: HTTP error! status: 404"

The URL doesn't point to a real file.

- Confirm the URL uses `brevityA/Core-Builds` (not `Branding-Brevity`)
- Folder names are case-sensitive: `Torbox` (lowercase b), `Single`, `Essential`, `Flash`, `Speed`, `Hybrid`, `Anime`
- Nightly templates are on a separate branch — confirm the URL matches

Raw URL format:
```
https://raw.githubusercontent.com/brevityA/Core-Builds/main/Templates/Torbox/Single/core-nexus-stream.json
```

---

#### "Failed to import template: Invalid template"

The JSON file has a syntax error — missing comma, bracket, or quote.

1. Download the template file
2. Paste into [jsonlint.com](https://jsonlint.com)
3. Fix the highlighted error and re-import

---

#### "Every group must have at least one addon"

You're importing an outdated template version. Re-import using the current raw URL from the [template list](#1--which-template-should-i-use).

---

#### "Template has 1 regex pattern that is not trusted"

Safe to ignore — click **Import Anyway**. The pattern still applies; it just hasn't been whitelisted by the instance admin. No functionality is lost.

---

#### "Failed to parse JSON" when importing a formatter

You copied from the GitHub rendered file view, which adds hidden characters that break JSON parsing. Always import from the **raw URL** — links are in [Section 4 — Formatters](#4--formatters). Do not copy-paste from the GitHub page.

---

### No Streams

#### Zero results after importing

Work through these in order:

1. **Services enabled?** Dashboard → Services tab — at least one debrid service must be toggled on with a valid API key entered. TorBox is pre-toggled on but still needs your API key.
2. **Manifest installed in Stremio?** Go to Addons and confirm AIOStreams appears in the installed list. If not, copy the manifest URL from your dashboard and install it.
3. **AIOStreams host online?** Check [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/public-instances/) for instance status.
4. **ESEs filtering everything?** Dashboard → Statistics → check the filter breakdown to see how many streams are being excluded at each stage. An aggressive ESE can silently block all results.
5. **Test with a popular title first** — try a major recent film before assuming the template is broken. Obscure or older content may genuinely have no cached streams.

---

#### Zero results after re-importing

Re-importing resets service toggles to template defaults. Your API keys are preserved but services are switched off. Re-enable your services in the Services tab after every import.

---

#### Very few results for older TV or niche content

Normal. Classic TV episodes under 512 MB and older encodes often have unrecognised audio or encode tags that trip filters. For niche or foreign content with low seeders, consider a template with EasyNews or Usenet coverage — the [Speed+](#1--which-template-should-i-use) and [Hybrid](#1--which-template-should-i-use) tiers add Usenet indexing on top of torrent sources.

---

#### NZBGeek returns nothing (Hybrid template only)

The NZBGeek API key placeholder hasn't been replaced.

1. Dashboard → Addons → find **NZBGeek** → tap the settings icon
2. Replace the placeholder with your API key from [nzbgeek.info](https://nzbgeek.info) → Account → API Key
3. Save

---

### Streams Appear But Don't Play

#### Clicking a stream opens the AIOStreams GitHub page

AIOStreams returned an informational entry instead of a real stream. Stremio requires all entries to be clickable, so it links to the GitHub page. The info card is not a stream — it means no real streams were found. See [Zero results after importing](#zero-results-after-importing) above.

---

#### Old streams still showing after saving a new config

Stremio cached the old manifest URL.

1. Stremio → Addons → find AIOStreams → **Uninstall**
2. Copy the manifest URL from your AIOStreams dashboard
3. Paste it into Stremio's search bar or click **Install** from the dashboard
4. Restart Stremio

---

#### Streams buffering or stuttering

- **Uncached streams buffer** — look for `[cached]` in the stream card. Uncached content downloads in real-time.
- **REMUX files are large** — 50–80 GB files need a fast connection to your debrid server. Try a HEVC or WEB-DL stream instead.
- **Check debrid server status** — TorBox and other services have occasional slowdowns that affect all users.

---

### Specific Errors

#### "Failed to fetch manifest for MediaFusion RD: 400 - Bad Request"

A transient connection issue between AIOStreams and the MediaFusion server — not a credential problem.

**Fix:** Click **Save** again. This resolves it in almost all cases. If it repeats, wait 60 seconds and try once more.

---

#### Wall of red errors in Stremio after saving

Most commonly the Real-Debrid infringing file issue — RD has blocked certain WEB-DL and streaming platform rips. Core Builds templates include a scrub that filters these before they reach Stremio. If you still see red errors, confirm you're on the latest template version and that your MediaFusion and RD presets are correctly configured.

---

#### AnimeTosho or TorrentGalaxy errors

Both are disabled by default:

- **AnimeTosho** — anime-only source. Returns 0 results for regular TV and movies. Enable only for anime content.
- **TorrentGalaxy** — periodically Cloudflare-blocked, which produces `Partial Success` or `Unexpected token '<'` errors. Enable only when it's not being blocked.

---

#### "invalid attribute 'WEB-DL'" expression error

You're on an old template using a deprecated `keyword()` syntax. Re-import the latest version of your template.

---

### Still Stuck?

- [Section 8 — Resetting Your Instance](#8--resetting-your-instance) — start fresh without losing your API keys
- [Section 7 — Advanced Editing](#7--advanced-editing) — JSON editing and expression validation
- [GitHub Issues](https://github.com/brevityA/Core-Builds/issues) — open an issue with a description of the error
- [GitHub Discussions](https://github.com/brevityA/Core-Builds/discussions) — ask the community

---

## 10 — FAQ

Quick answers to the most common questions. If yours isn't here, open a [Discussion](https://github.com/brevityA/Core-Builds/discussions).

---

#### Import Errors

#### "Every group must have at least one addon"

You are importing an older template version. This was a known bug fixed in **v2.4.6** where a removed addon (`tam-mf`) was still referenced in the groups config. Re-import using the latest raw URL from the [Import Guide](README.md#1--importing-a-template).

#### "Template has 1 regex pattern that is not trusted"

You can proceed — click **Import Anyway**. This warning appears when a regex pattern in the template is not in the instance's whitelist. It does not affect functionality. The pattern is still applied; the instance admin just hasn't whitelisted its source URL.

#### "Failed to parse JSON" when importing a formatter

You copied the formatter text from the GitHub file view. GitHub adds hidden characters to rendered files that break the JSON parser. Always download from the **raw URL** — links are in the [Formatter Guide](README.md#2--formatters). Do not copy-paste.

#### Services reset to off after re-importing

Expected behaviour. Re-importing a template resets service toggles to the template defaults. Your API keys are preserved — just re-enable your services in the Services tab after each import.

#### The BUILD badge shows "Repo or workflow not found"

The GitHub Actions validation workflow hasn't run yet. It triggers automatically on the next commit that changes a JSON file — push any template update and the badge resolves itself.

---

#### No Streams

#### I get zero results after importing

Most likely cause: services not enabled. TorBox is pre-toggled on in all templates, but you still need to enter your API key in the **Services** tab. If TorBox is enabled and you still get nothing, check that `onlyShowCachedStreams` is working correctly — try a popular recent movie before assuming the template is broken.

#### I had streams before but now get zero after re-importing

Your services were reset when you re-imported. Re-enable TorBox (and any other services) in the Services tab and enter your API key again.

#### I only get a handful of streams for older TV shows

Normal for older content. Many classic TV episodes are under 512 MB and older encodes often have unrecognised audio or encode tags. Templates since v2.4.6 lower the size minimums and add `Unknown` fallbacks for audio and encode filters to address this.

---

#### Fake Links / Wrong Behaviour

#### Clicking a stream opens the AIOStreams GitHub page

Fixed in **v2.4.6**. The `Hard YouTube Kill` ESE now also blocks `type(streams, 'external')` streams — these are informational cards AIOStreams injects when errors occur. Re-import the latest template.

#### YouTube trailers are appearing in my stream list

Fixed in **v2.4.6**. Three layers now block YouTube content: the ESE catches type, external, source, and quality field variants; `excludedStreamSources` covers all case variants; `excludedStreamTypes` includes youtube. Re-import the latest template.

#### Wrong episode is playing

Fixed in **v2.4.6**. Two ESEs were added: `Kill Ambiguous Season Packs` blocks streams with only season info and no episode reference; `Kill Season Packs When Episode Streams Exist` blocks full packs when individual episode streams are available. Re-import the latest template.

---

#### Real-Debrid

#### RD streams show "File removed due to copyright infringement"

This is Real-Debrid's server-side enforcement — not a template issue. RD began filtering certain cached files in May 2026 based on filename keywords. `hideErrors: true` in all templates suppresses the error cards so they do not appear in your stream list. Nothing we can do about the underlying RD filter.

#### The Dual Core template shows fewer RD streams than before

Expected after May 2026. RD's server-side filter blocks many WEB-DL files. TorBox covers the gap for most content. The Advanced dual-core builds work best on **WuPlay** where the RD filter impact is less visible.

---

#### Formatters

#### The formatter isn't showing after import

After importing a new formatter, click **Save** and then **fully refresh** Stremio or WuPlay. Some clients cache the stream card layout and will not show the new formatter until the addon is reinstalled or the manifest refreshed.

#### My stream cards look identical before and after switching formatter

The formatter controls the **name** and **description** fields of each stream card. If AIOStreams is returning streams but the formatter is not rendering, check that the formatter JSON was imported correctly (no parse error on import) and that you saved after importing.

---

#### Platform Differences

#### Features work in WuPlay but not in Stremio

WuPlay and Stremio handle stream types differently. YouTube/external streams are suppressed more reliably in WuPlay. The `Hard YouTube Kill` ESE catches these in both, but some edge cases still slip through in Stremio. See the [WuPlay vs Stremio guide](README.md) for full details.

#### Statistics / scrape summary cards are showing

`statistics.enabled` was set to `true` in older template versions. Fixed in **v2.4.6** — re-import the latest template to disable the scrape summary display.

---



---

## 11 — Adjusting Search Criteria

This guide explains how to tune the matching settings in any Core Builds template to fix zero-result issues, handle edge cases, and get the best stream coverage for your content.

---

### What Is Search Criteria?

When you open a movie or show in Stremio, AIOStreams sends a request to your addons with the title, year, and episode information. Search criteria controls how strictly the returned streams must match that request before they're shown to you.

Too strict → zero results on valid content  
Too loose → wrong content appearing (a movie showing episodes from a show with the same name)

All three matching settings live under the same section of the config:

```json
"titleMatching": {
  "enabled": true,
  "mode": "contains",
  "similarityThreshold": 0.75
},
"yearMatching": {
  "enabled": true,
  "strict": false,
  "tolerance": 2
},
"seasonEpisodeMatching": {
  "enabled": true,
  "strict": false
}
```

---

### Title Matching

Controls whether the stream's filename must contain the title of the content you're watching.

#### Settings

| Setting | Values | Default (Core Builds) |
|---|---|---|
| `enabled` | `true` / `false` | `true` |
| `mode` | `"contains"` / `"exact"` | `"contains"` |
| `similarityThreshold` | `0.0` – `1.0` | `0.75` |

#### Mode

**`contains` (recommended)** — the stream filename just needs to include the title somewhere. "Gladiator.II.2024.2160p..." would match a search for "Gladiator 2".

**`exact`** — the stream filename must match the title almost perfectly. This was the original bug in many configs — `exact` mode causes zero results on sequels, films with alternate titles, and anything with punctuation differences. **Never use `exact` for public templates.**

#### Similarity Threshold

How closely the title in the stream filename must resemble the requested title. Only applies in `contains` mode.

| Threshold | Effect |
|---|---|
| `1.0` | Perfect match required — same as `exact` mode effectively |
| `0.75` | Recommended — handles minor variations, punctuation, romanisation |
| `0.60` | Loose — may allow unrelated streams with partial title matches |
| `0.50` | Very loose — not recommended |

**When to lower from 0.75:**
- Content with very short titles (one or two characters)
- Content with special characters in the title that don't encode well
- Anime titles with romanisation inconsistencies

**When to raise above 0.75:**
- You're getting wrong-show streams alongside correct ones
- A short common word in a title matches too many unrelated releases

---

### Year Matching

Filters streams based on the release year. Prevents you from seeing a 1990 film when you open a 2023 remake with the same name.

#### Settings

| Setting | Values | Default (Core Builds) |
|---|---|---|
| `enabled` | `true` / `false` | `true` |
| `strict` | `true` / `false` | `false` |
| `tolerance` | Integer (years) | `2` |

#### Strict Mode

**`strict: false` (recommended)** — a stream is allowed if its year is within the tolerance range. A ±2 tolerance means a 2023 film will match streams tagged 2021–2025.

**`strict: true`** — streams must match the year exactly. This was a common misconfiguration causing zero results because:
- TMDB and release groups sometimes disagree on release year by 1–2 years
- Films released at year-end (December) get tagged as the following year
- International releases sometimes use the local premiere year

#### Tolerance

How many years either side of the TMDB year are accepted. Only applies when `strict: false`.

| Tolerance | Effect |
|---|---|
| `0` | Same as `strict: true` |
| `1` | One year either side — can still miss some edge cases |
| `2` | Recommended — covers all common year discrepancy scenarios |
| `3+` | Too loose for most content — remakes may collide with originals |

**When to increase tolerance:**
- Documentary or archive content where release year is ambiguous
- Content from non-English markets where release dates vary significantly by region

---

### Season / Episode Matching

For series content, controls whether streams must have explicit season and episode metadata matching the episode you're watching.

#### Settings

| Setting | Values | Default (Core Builds) |
|---|---|---|
| `enabled` | `true` / `false` | `true` |
| `strict` | `true` / `false` | `false` |

#### Strict Mode

**`strict: false` (recommended)** — streams are allowed through even if they don't have explicit S/E metadata in the filename. This matters because:
- BluRay and REMUX releases frequently omit S/E numbering in filenames
- Older releases used different naming conventions
- Season packs often don't have per-episode tags

**`strict: true`** — every stream must have a season and episode number that exactly matches the requested episode. This will drop all BluRay REMUXes, most older content, and any stream that uses non-standard episode naming. Not recommended unless you're specifically trying to prevent season packs from appearing.

#### The Movie Problem

With `strict: false`, movies and series with identical titles in the same year can bleed into each other — you open a movie and see TV episodes alongside it.

This is solved in Core Builds with a dedicated ESE rather than strict matching:

```
/* CB | Kill Episode Streams on Movie Queries */
queryType == "movie" ?
keyword(streams, "filename", "S01E", "S02E", "S03E", ...) : []
```

This ESE removes episode-tagged streams when `queryType == "movie"`, without affecting series queries at all. It's the correct fix — `strict: true` is too blunt and breaks too much legitimate content.

---

### Language Settings

Controls which audio languages are allowed or prioritised.

#### The Two Fields

| Field | Effect |
|---|---|
| `requiredLanguages` | **Hard-requires** every stream to match. Streams without any of these languages are dropped completely. |
| `preferredLanguages` | **Soft preference** used for sorting. Streams with these languages rank higher. Nothing is blocked. |

**Core Builds sets `requiredLanguages: []` (empty) on all templates.** This is intentional. Hard-requiring languages blocks streams that don't have language metadata embedded (common in older releases, scene content, and some Usenet uploads) even when the content is perfectly valid English content. The Tamtaro ISEs handle language contextually — `preferredLanguages` handles ranking.

#### When to use `requiredLanguages`

Only if you have a very specific reason to hard-block non-English results entirely. For personal builds on non-English markets, adding your language to `requiredLanguages` alongside `English` and `Unknown` can reduce noise:

```json
"requiredLanguages": ["English", "French", "Unknown", "Multi", "Dubbed"]
```

> ⚠️ Always include `"Unknown"` — a large proportion of valid streams have no language tag and would be dropped without it.

---

### Common Scenarios

#### Getting zero results on a specific title

Work through in order:

1. **Lower `similarityThreshold`** from `0.75` to `0.65` — the most common fix
2. **Check `yearMatching.tolerance`** — make sure it's `2` (not `0` or `1`)
3. **Confirm `strict: false`** on both `yearMatching` and `seasonEpisodeMatching`
4. **Clear `requiredLanguages`** — empty array removes all hard language requirements

#### Getting wrong show/movie results alongside correct ones

1. Confirm the `CB | Kill Episode Streams on Movie Queries` ESE is enabled (removes TV episodes from movie pages)
2. **Increase `similarityThreshold`** slightly — from `0.75` to `0.80`
3. Check `yearMatching.tolerance` isn't set too high — `2` is correct

#### Older content (pre-2000) returning few results

- Lower `similarityThreshold` to `0.65`
- Increase `yearMatching.tolerance` to `3`
- Ensure `seasonEpisodeMatching.strict` is `false` — older releases rarely have S/E tags

#### Anime returning wrong dubs or wrong shows

- Lower `similarityThreshold` to `0.65` — anime title romanisation varies widely
- Ensure `SeaDex` ISE is enabled (Anime template only)
- Ensure `preferredLanguages` includes `"Dubbed"` if dubs are wanted

#### Series returning season packs instead of individual episodes

This is handled by the `ongoingSeasonPack` ESE (Tamtaro standard set) — it removes ambiguous season packs when you're watching a currently airing show week-to-week. If season packs are still appearing:

1. Confirm the ESE is enabled in your config
2. Check that your TMDB API key is correctly set — `ongoingSeasonPack` uses TMDB data to determine whether a show is currently airing

---

### Full Reference Config

The safest, most permissive matching configuration for maximum stream coverage:

```json
"titleMatching": {
  "enabled": true,
  "mode": "contains",
  "similarityThreshold": 0.75
},
"yearMatching": {
  "enabled": true,
  "strict": false,
  "tolerance": 2
},
"seasonEpisodeMatching": {
  "enabled": true,
  "strict": false
},
"requiredLanguages": [],
"preferredLanguages": ["English", "Original", "Dual Audio", "Multi", "Dubbed", "Unknown"]
```

---

### Why Strict Settings Break Things

The most common support issue across all AIOStreams setups is one of these three combinations:

```
titleMatching.mode: "exact"          ← kills sequels, alt titles, romanised anime
yearMatching.strict: true            ← kills year-boundary releases
seasonEpisodeMatching.strict: true   ← kills BluRay REMUX and older content
```

All three default to their strict forms in a fresh AIOStreams install. All three Core Builds templates correct this. If you're building your own config from scratch or editing someone else's, these are the first three settings to check when streams aren't appearing.

---

---

*[Return to README](../README.md) · [CHANGELOG](../CHANGELOG.md)*
