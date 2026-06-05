# 📥 Import Guide — Core Builds by Brevity

Everything you need to import and configure your build. Follow the steps in order.

---

## 1️⃣ Pick Your Template

### 🎯 Which Plan Do You Have?

| I have... | Use this tier |
|---|---|
| TorBox Pro | Single or Hybrid |
| TorBox Essential | Essential or Speed |
| TorBox Essential + EasyNews | Speed (EasyNews) |
| TorBox Pro + NZBGeek | Hybrid |

---

### 📦 Single — TorBox Pro

Full addon stack. Usenet included. Best overall coverage.

| Template | Resolution | Best For |
|---|---|---|
| [4K Home Theater](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Single/core-nexus-4k-ht-torbox.json) | 4K HDR | Shield, Apple TV 4K, OLED/QLED |
| [TorBox Exclusive RPDB](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Single/core-nexus-torbox-exclusive_rpdb.json) | 1080p SDR | Budget hardware, phones, RPDB art |

---

### 📦 Essential — TorBox Essential

No Usenet required. Torrent cache only.

| Template | Resolution | Best For |
|---|---|---|
| [4K Essential](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Essential/core-nexus-4k-essential-torbox.json) | 4K HDR | Shield, Apple TV 4K |
| [1080p Essential](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Essential/core-nexus-1080p-essential-torbox.json) | 1080p SDR | Budget hardware, phones |

---

### 🔀 Hybrid — TorBox Pro + NZBGeek

Adds NZBGeek Usenet indexer for maximum source diversity. Requires a NZBGeek API key — see Step 4.

| Template | Resolution | Best For |
|---|---|---|
| [TB Hybrid 1080p](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Hybrid/core-nexus-tb-hybrid-1080p.json) | 1080p SDR | TorBox Pro + NZBGeek users |

---

### ⚡ Speed — Instant Autoplay (2-3 seconds)

Stripped to 4 addons only. Maximum load speed, no compromise on filtering quality.

#### TorBox Essential + EasyNews

| Template | Resolution |
|---|---|
| [Speed 4K (EasyNews)](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-4k.json) | 4K HDR |
| [Speed 1080p (EasyNews)](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Speed/EasyNews/core-nexus-speed-1080p.json) | 1080p SDR |

#### TorBox Essential Only

| Template | Resolution |
|---|---|
| [Speed 4K](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-4k-torbox.json) | 4K HDR |
| [Speed 1080p](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Speed/TorBox/core-nexus-speed-1080p-torbox.json) | 1080p SDR |

---

### ⚗️ Advanced — TorBox + Real-Debrid

Community-reported as working on WuPlay. Stremio users may see reduced RD results due to RD's May 2026 server-side filter. MediaFlow Proxy recommended — configure in Proxy section after import.

| Template | Resolution |
|---|---|
| [4K Dual Core](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Deprecated/Dual/core-nexus-4k-dual-core.json) | 4K HDR |
| [Dual Core 1080p](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Deprecated/Dual/core-nexus-dual-core-1080p.json) | 1080p SDR |
| [4K Essential + RD](https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Templates/Torbox/Deprecated/Dual/core-nexus-4k-essential-dual-core.json) | 4K HDR |

---

## 2️⃣ Choose a Host

| Rank | Host | URL |
|------|------|-----|
| 🥇 | **ElfHosted** | [aiostreams.elfhosted.com](https://aiostreams.elfhosted.com/stremio/configure) |
| 🥈 | **Yeb's** | [aiostreams.fortheweak.cloud](https://aiostreams.fortheweak.cloud/stremio/configure) |
| 🥉 | **Midnight's** | [aiostreamsfortheweebsstable.midnightignite.me](https://aiostreamsfortheweebsstable.midnightignite.me/stremio/configure) |
| 4 | **Viren's** | [aiostreams.viren070.me](https://aiostreams.viren070.me/stremio/configure) |
| 5 | **Kuu's** | [aiostreams.stremio.ru](https://aiostreams.stremio.ru/stremio/configure) |
| 6 | **ATBP** | [aio.atbphosting.com](https://aio.atbphosting.com/stremio/configure) |
| 7 | **Omni's** | [aiostreams.12312023.xyz](https://aiostreams.12312023.xyz/stremio/configure) |

Full list: [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/public-instances/)

---

## 3️⃣ Import the Template

1. Open your chosen AIOStreams host
2. Navigate to **Templates** → **Import**
3. Paste the raw URL from the table above (the template names link directly to the raw URL)
4. Click **Load Template**

> 💡 **Re-importing resets service toggles.** Your API keys are preserved but service enabled states return to template defaults. Re-enable your services after each re-import.

---

## 4️⃣ Enable Your Services

**TorBox is pre-enabled.** Enter your API key in the Services section.

All other services are pre-loaded in the 12-service roster but toggled off — enable only what you subscribe to:

`TorBox` · `Real-Debrid` · `AllDebrid` · `Premiumize` · `DebridLink` · `Offcloud` · `Put.io` · `EasyNews` · `EasyDebrid` · `PikPak` · `Seedr` · `Debrider`

### Hybrid Template — NZBGeek Setup

NZBGeek is a Usenet indexer addon, not a debrid service — its API key is entered separately in the **Addons** section, not the Services modal.

1. Load the template and save
2. Scroll to **Addons → NZBGeek → ⚙️**
3. Paste your API key from [nzbgeek.info](https://nzbgeek.info) → Account → API Key
4. Save

NZBGeek returns no results until this is done. All other addons work immediately.

---

## 5️⃣ Save & Install

1. Click **Save** at the bottom of the configuration screen
2. AIOStreams generates a unique manifest URL

**Stremio:** Click **Install** — Stremio opens and prompts confirmation.

**WuPlay:** Copy the manifest URL, open WuPlay configurer → **Add-ons** → paste the URL.

---

## 📱 Multi-Device Households

AIOStreams cannot detect which device is making a request. For households with a mix of devices, use **two separate Stremio accounts:**

**Low-End Account** — phones, tablets, budget TVs
→ 1080p SDR template — compatible with any hardware

**High-End Account** — Shield, 4K OLED, Apple TV 4K
→ 4K template — Remux, DV, HDR10+, TrueHD, Atmos

Both accounts use the same debrid credentials. Addons sync per-account.

See [DEVICE_PROFILES.md](DEVICE_PROFILES.md) for full setup.

---

*[README](../README.md) · [CHANGELOG](../CHANGELOG.md) · [Troubleshooting](TROUBLESHOOTING.md)*
