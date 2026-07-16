# 📱 Device Profiles: Multi-Device Setup

AIOStreams cannot detect what device is making a request — every device looks identical to the server. A Shield Pro, a budget Android TV, and a phone all arrive at the same manifest URL with no identifying information. This means a single AIOStreams installation will serve the same streams to every device, regardless of whether they can play them.

The solution is **two separate Stremio accounts** — one for low-end devices, one for high-end devices — each with its own AIOStreams addon installed.

---

## Why Two Accounts?

| | Single Account | Two Accounts |
|---|---|---|
| Phone gets a 4K REMUX | ❌ Buffering or no playback | ✅ Gets 1080p WEB-DL instead |
| Shield gets a 1080p WEB-DL | ❌ Underperforming | ✅ Gets 4K REMUX instead |
| Setup complexity | Simple | Slightly more steps, once |
| Debrid credentials | One set | Same credentials on both |

---

## 🔵 Low-End Account
*Phones · Tablets · Budget Android TV boxes · Projectors · Older TVs*

### Recommended Templates
- **[Core Nexus Stream](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/Single/core-nexus-stream.json)** — TorBox Pro · 1080p SDR · full addon stack
- **[Core Nexus Stream (Fire Stick)](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/Single/core-nexus-stream-firestick.json)** — optimised for Fire Stick / low-RAM Android devices
- **[Core Nexus Essential](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/Essential/core-nexus-essential.json)** — TorBox Essential · 1080p SDR

### What these builds do
- ✅ Targets WEB-DL and WEBRip sources
- ✅ Caps bitrate and file size — no multi-gigabyte downloads on a mobile connection
- ✅ Strips HDR, Dolby Vision, and Atmos — these require hardware decode support
- ✅ Blocks BluRay and Remux — too large and often unplayable on budget hardware
- ✅ Enforces AVC/HEVC — widely supported across all Android devices
- ❌ No 4K content served at all

### Devices to sign this account into
- Android phones and tablets
- Budget Android TV boxes (X96, H96, MXQ, Ugoos AM6B at 1080p mode)
- Amazon Fire TV Stick (use the Fire Stick variant for best performance)
- Projectors without native 4K panels
- Older 1080p TVs

---

## 🟣 High-End Account
*Nvidia Shield · Apple TV 4K · 4K OLED/QLED TVs · High-end Android TV*

### Recommended Templates
- **[Core Nexus 4K Apex](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/Single/core-nexus-4k-apex.json)** — TorBox Pro · 4K HDR · home theater quality
- **[Core Nexus 4K Essential](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/Essential/core-nexus-4k-essential.json)** — TorBox Essential · 4K HDR

### What these builds do
- ✅ Targets 4K UHD sources
- ✅ Allows BluRay REMUX up to 150GB
- ✅ Passes Dolby Vision, HDR10+, and HDR10
- ✅ Passes TrueHD Atmos, DTS:X, and DTS-HD MA
- ✅ Prioritises AV1 and HEVC for efficiency at high resolutions
- ✅ Enforces minimum 5GB floor — filters out fake or mislabelled 4K
- ❌ Will not serve 1080p as a fallback for content with no 4K release *(configurable)*

### Devices to sign this account into
- Nvidia Shield Pro / Shield TV
- Apple TV 4K (all generations)
- 4K OLED / QLED TVs with native Stremio or WuPlay apps
- High-end Android TV boxes (Ugoos AM6B, MECOOL KM7)
- Google TV Streamer

---

## 🔀 Optional: Hybrid Account
*TorBox Pro + NZBGeek — cached and uncached streams, maximum source diversity*

### Recommended Template
- **[Core Nexus Hybrid](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/Hybrid/core-nexus-hybrid.json)** — TorBox Pro + NZBGeek · 1080p SDR

### What this build does
- ✅ Shows both cached (instant) and uncached streams
- ✅ Usenet integration via NZBGeek for wider source coverage
- ✅ 1080p SDR — safe for most hardware
- ⚠️ Requires a NZBGeek API key — enter it in Addons → Newznab after loading
- ⚠️ Uncached streams require TorBox to download the file before playback begins

---

## ⚙️ How to Set It Up

### Step 1 — Create your second Stremio account
Go to [stremio.com](https://www.stremio.com) and create a second account using a different email address. A free account is all you need.

### Step 2 — Install the right template on each account
Sign into each account separately and follow [Section 2 — Importing a Template](README.md#2--importing-a-template) to install the appropriate template. Use the same debrid credentials on both accounts — your subscriptions are not account-locked.

### Step 3 — Sign each device into the right account
- Sign your **phones, tablets, and budget TVs** into the Low-End account
- Sign your **Shield, Apple TV 4K, and premium TVs** into the High-End account

Stremio syncs addon installations per-account, so each device automatically gets the correct stream list the moment it signs in.

---

## 💡 Tips

> **Same debrid credentials on both accounts.** TorBox API keys are not tied to Stremio accounts — you can enter the same key on both AIOStreams installations without issue.

> **WuPlay users.** WuPlay does not use Stremio accounts — it manages addons locally per device. Simply install the appropriate manifest URL on each device directly.

---

*[Master Guide](README.md) · [GitHub](https://github.com/brevityA/Core-Builds) · [r/CoreBuilds](https://www.reddit.com/r/CoreBuilds/)*
