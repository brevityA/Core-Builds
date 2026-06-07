# 📥 Import Guide — Core Builds by Brevity

Everything you need to import and configure your build. Follow the steps in order.

---

## 1️⃣ Pick Your Template

### 🎯 Which Plan Do You Have?

| I have... | Use this tier |
|---|---|
| TorBox Pro | Single (4K Pro / Stream) |
| TorBox Pro + NZBGeek | Hybrid |
| TorBox Essential | Essential or Flash or Speed |
| TorBox Essential + EasyNews | Speed (EasyNews) |

Not sure which template? → [Which Template Should I Use?](WHICH_TEMPLATE.md)

---

### 🔵 TorBox Pro — Single

Full addon stack. Best overall coverage.

| Template | Resolution | Best For |
|---|---|---|
| [Core Nexus 4K Pro](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro.json) | 4K HDR | Shield, Apple TV 4K, OLED/QLED |
| [Core Nexus Stream](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream.json) | 1080p SDR | Phones, tablets, budget TVs |
| [Core Nexus Stream (Fire Stick)](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick.json) | 1080p SDR | Amazon Fire Stick / low-RAM devices |

---

### 🔀 TorBox Pro — Hybrid

Adds NZBGeek Usenet for maximum source diversity. Requires a NZBGeek API key — see Step 4.

| Template | Resolution | Best For |
|---|---|---|
| [Core Nexus Hybrid](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json) | 1080p SDR | TorBox Pro + NZBGeek users |

---

### 🟡 TorBox Essential

No Usenet required. Torrent cache only.

| Template | Resolution | Best For |
|---|---|---|
| [Core Nexus 4K Essential](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential.json) | 4K HDR | Shield, Apple TV 4K |
| [Core Nexus Essential](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential.json) | 1080p SDR | Budget hardware, phones |

---

### ⚡⚡ Flash — Single-Click Instant Play

Pure cached-only builds. Only TorBox-cached streams appear — nothing to wait for.

| Template | Resolution |
|---|---|
| [Core Nexus Flash 4K](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash-4k.json) | 4K HDR |
| [Core Nexus Flash](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Flash/core-nexus-flash.json) | 1080p SDR |

> Zero results = content not cached in TorBox yet. A "0Cached" passthrough appears in place of a blank screen. Test with a popular title first.

---

### ⚡ Speed — Fast Cached Play (2-3 seconds)

Slim addon stack. Fast load, no compromise on filtering quality.

#### TorBox Essential + EasyNews

| Template | Resolution |
|---|---|
| [Core Nexus Speed 4K+](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus.json) | 4K HDR |
| [Core Nexus Speed+](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus.json) | 1080p SDR |
| [Core Nexus Speed EasyNews](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews.json) | 1080p SDR |

#### TorBox Essential Only

| Template | Resolution |
|---|---|
| [Core Nexus Speed 4K](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k.json) | 4K HDR |
| [Core Nexus Speed](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed.json) | 1080p SDR |

---

### 🪶 Lite Variants

All standard templates have a Lite version. Same template, fewer quality gates (24 ESEs → 12). Use when you get too few results or on low-overhead hosts.

| Lite Template | Import URL |
|---|---|
| [4K Pro Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-pro-lite.json) | ↑ |
| [Stream Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-lite.json) | ↑ |
| [Stream Fire Stick Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Single/core-nexus-stream-firestick-lite.json) | ↑ |
| [Hybrid Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-hybrid-lite.json) | ↑ |
| [4K Essential Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-lite.json) | ↑ |
| [Essential Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Essential/core-nexus-essential-lite.json) | ↑ |
| [Speed 4K Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k-lite.json) | ↑ |
| [Speed Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-lite.json) | ↑ |
| [Speed 4K+ Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k-plus-lite.json) | ↑ |
| [Speed+ Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-plus-lite.json) | ↑ |
| [Speed EasyNews Lite](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-easynews-lite.json) | ↑ |

---

## 2️⃣ Choose a Host

| Rank | Host | URL |
|------|------|-----|
| 🥇 | **ElfHosted** | [aiostreams.elfhosted.com](https://aiostreams.elfhosted.com/stremio/configure) |
| 🥈 | **Yeb's** | [aiostreams.fortheweak.cloud](https://aiostreams.fortheweak.cloud/stremio/configure) |
| 🥉 | **Midnight's** | [aiostreamsfortheweebsstable.midnightignite.me](https://aiostreamsfortheweebsstable.midnightignite.me/stremio/configure) |
| 4 | **Kuu's** | [aiostreams.stremio.ru](https://aiostreams.stremio.ru/stremio/configure) |
| 5 | **ATBP** | [aio.atbphosting.com](https://aio.atbphosting.com/stremio/configure) |
| 6 | **Omni's** | [aiostreams.12312023.xyz](https://aiostreams.12312023.xyz/stremio/configure) |

Full list: [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/public-instances/)

---

## 3️⃣ Import the Template

1. Open your AIOStreams host
2. Navigate to **Settings → About → Get Started → Load Template**
3. Paste the raw URL from the table above
4. Click **Load Template**

> 💡 **Re-importing resets service toggles.** Your API keys are preserved but service enabled states return to template defaults. Re-enable your services after each re-import.

---

## 4️⃣ Enable Your Services

**TorBox is pre-enabled.** Enter your API key in the Services section.

All other services are pre-loaded but toggled off — enable only what you subscribe to.

### Hybrid Template — NZBGeek Setup

NZBGeek is a Usenet indexer addon — its API key is entered in **Addons**, not Services.

1. Load the template and save
2. Scroll to **Addons → Newznab → ⚙️**
3. Paste your API key from [nzbgeek.info](https://nzbgeek.info) → Account → API Key
4. Save

NZBGeek returns no results until this is done. All other addons work immediately.

---

## 5️⃣ Save & Install

1. Click **Save** at the bottom of the configuration screen
2. AIOStreams generates a unique manifest URL

**Stremio:** Click **Install** — Stremio opens and prompts confirmation.

**WuPlay:** Copy the manifest URL → open WuPlay → **Add-ons** → paste the URL.

---

## 📱 Multi-Device Households

AIOStreams cannot detect which device is making a request. For households with a mix of devices, use **two separate Stremio accounts:**

**Low-End Account** — phones, tablets, budget TVs → 1080p SDR template

**High-End Account** — Shield, 4K OLED, Apple TV 4K → 4K template

Both accounts use the same debrid credentials. See [DEVICE_PROFILES.md](DEVICE_PROFILES.md) for full setup.

---

*[README](../README.md) · [CHANGELOG](../CHANGELOG.md) · [Troubleshooting](TROUBLESHOOTING.md)*
