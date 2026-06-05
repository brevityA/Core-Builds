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
- **[Core Nexus TorBox Exclusive (RPDB)](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/main/Templates/Torbox/Single/core-nexus-torbox-exclusive_rpdb.json)** — TorBox only, RPDB poster integration
- **[Core Nexus Dual Core 1080p](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/main/Templates/Torbox/Dual/core-nexus-dual-core-1080p.json)** — TorBox + Real-Debrid for maximum availability

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
- Amazon Fire TV Stick (4K stick can still benefit from the 1080p build for reliability)
- Projectors without native 4K panels
- Older 1080p TVs

---

## 🟣 High-End Account
*Nvidia Shield · Apple TV 4K · 4K OLED/QLED TVs · High-end Android TV*

### Recommended Templates
- **[Core Nexus 4K Dual Core](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/main/Templates/Torbox/Dual/core-nexus-4k-dual-core.json)** — TorBox + Real-Debrid, maximum quality and coverage
- **[Core Nexus 4K HT TorBox](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/main/Templates/Torbox/Single/core-nexus-4k-ht-torbox.json)** — TorBox only, home theater focused

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
*Users who want cached + uncached streams on a single device*

### Recommended Template
- **[Core Nexus TB Hybrid 1080p](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/blob/main/Templates/Hybrid/core-nexus-tb-hybrid-1080p.json)** — TorBox + NZBGeek, cached and uncached

### What this build does
- ✅ Shows both cached (instant) and uncached streams
- ✅ Usenet integration via NZBGeek for wider source coverage
- ✅ 1080p SDR — safe for most hardware
- ⚠️ Requires a NZBGeek API key to activate the full Usenet tier
- ⚠️ Uncached streams require TorBox to download the file before playback begins

---

## ⚙️ How to Set It Up

### Step 1 — Create your second Stremio account
Go to [stremio.com](https://www.stremio.com) and create a second account using a different email address. A free account is all you need.

### Step 2 — Install the right template on each account
Sign into each account separately and follow the [Import Guide](./IMPORT_GUIDE.md) to install the appropriate template. Use the same debrid credentials on both accounts — your subscriptions are not account-locked.

### Step 3 — Sign each device into the right account
- Sign your **phones, tablets, and budget TVs** into the Low-End account
- Sign your **Shield, Apple TV 4K, and premium TVs** into the High-End account

Stremio syncs addon installations per-account, so each device automatically gets the correct stream list the moment it signs in.

---

## 💡 Tips

> **Same debrid credentials on both accounts.** TorBox and Real-Debrid API keys are not tied to Stremio accounts — you can enter the same keys on both AIOStreams installations without issue.

> **RPDB posters work per-account.** The TorBox Exclusive (RPDB) template includes a free-tier RPDB key. If you upgrade to a paid RPDB plan, enter your personal key on the low-end account's template for richer poster art.

> **WuPlay users.** WuPlay does not use Stremio accounts — it manages addons locally per device. Simply install the appropriate manifest URL on each device directly.

---

*Return to the [Main README](../README.md)*
