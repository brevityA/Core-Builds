# 🧭 Which Template Should I Use?

Not sure where to start? Answer these three questions.

---

## Step 1 — What plan do you have?

```
TorBox Pro    ──────────────► Go to Step 2A
TorBox Essential ──────────► Go to Step 2B
TorBox Essential + EasyNews ► Speed (EasyNews) tier
TorBox Pro + NZBGeek ──────► Hybrid
```

---

## Step 2A — TorBox Pro

**What hardware are you streaming to?**

| Hardware | Template | Why |
|---|---|---|
| Shield, Apple TV 4K, OLED/QLED | **Core Nexus 4K Pro** | Full 4K HDR stack — DV, TrueHD, REMUX up to 150 GB |
| Phone, tablet, budget TV | **Core Nexus Stream** | 1080p SDR — compatible with everything |
| Amazon Fire Stick | **Core Nexus Stream (Fire Stick)** | Optimised for low-RAM Fire Stick devices |
| TorBox Pro + NZBGeek subscription | **Core Nexus Hybrid** | Adds NZBGeek Usenet for maximum source diversity |

---

## Step 2B — TorBox Essential

**Do you prioritise speed or coverage?**

### I want instant single-click play (no loading spinner)

| Hardware | Template |
|---|---|
| Shield, Apple TV 4K, 4K display | **Core Nexus Flash 4K** |
| Phone, tablet, budget TV | **Core Nexus Flash** |

> Flash is cached-only — if a title isn't in TorBox's cache you'll see a "0Cached" passthrough. Test with a popular title first.

### I want fast results (2-3 second load, broader coverage)

| Hardware | Template |
|---|---|
| Shield, Apple TV 4K, 4K display | **Core Nexus Speed 4K** |
| Phone, tablet, budget TV | **Core Nexus Speed** |
| Essential + EasyNews subscription | **Core Nexus Speed 4K+** / **Core Nexus Speed+** |

### I want maximum source coverage (no speed compromise)

| Hardware | Template |
|---|---|
| Shield, Apple TV 4K, 4K display | **Core Nexus 4K Essential** |
| Phone, tablet, budget TV | **Core Nexus Essential** |

---

## Step 3 — Too few results?

Use the **Lite** variant of any template above. Lite halves the ESE count (24 → 12), removes result limiters, and shows more streams including ones the standard build would cut. Hard kills (CAM, YouTube, 3D) remain.

---

## Step 4 — Mixed household?

If you have a mix of devices (4K TV + phone), use **two separate Stremio accounts**:

- **Account A** → 4K template on your high-end device
- **Account B** → 1080p template on phones, tablets, Fire Sticks

Both accounts use the same TorBox credentials. See [Device Profiles](DEVICE_PROFILES.md).

---

## At a Glance

| Template | Plan | Resolution | Load Speed | Best For |
|---|---|---|---|---|
| Core Nexus 4K Pro | Pro | 4K HDR | ~4s | Home cinema |
| Core Nexus Stream | Pro | 1080p SDR | ~4s | Budget hardware |
| Core Nexus Stream (Fire Stick) | Pro | 1080p SDR | ~4s | Fire Stick / low-RAM |
| Core Nexus Hybrid | Pro + NZBGeek | 1080p SDR | ~4s | Maximum sources |
| Core Nexus 4K Essential | Essential | 4K HDR | ~4s | 4K without Pro |
| Core Nexus Essential | Essential | 1080p SDR | ~4s | 1080p without Pro |
| Core Nexus Flash 4K | Essential | 4K HDR | Instant | Single-click 4K |
| Core Nexus Flash | Essential | 1080p SDR | Instant | Single-click 1080p |
| Core Nexus Speed 4K | Essential | 4K HDR | ~2-3s | Speed priority |
| Core Nexus Speed | Essential | 1080p SDR | ~2-3s | Speed priority |
| Core Nexus Speed 4K+ | Essential + EasyNews | 4K HDR | ~2-3s | Speed + Usenet |
| Core Nexus Speed+ | Essential + EasyNews | 1080p SDR | ~2-3s | Speed + Usenet |
| Core Nexus Speed EasyNews | EasyNews only | 1080p SDR | ~2-3s | EasyNews-only setup |
| Core Nexus Anime 4K | Pro or Essential | 4K HDR | ~4s | Anime (4K) |
| Core Nexus Anime | Pro or Essential | 1080p SDR | ~4s | Anime (1080p) |
| Core Nexus Anime Dub | Pro or Essential | 1080p SDR | ~4s | Dubbed anime |

---

## TorBox Pro vs Essential — What Do You Actually Lose?

| Feature | Essential | Pro |
|---|---|---|
| Torrent caching | ✅ | ✅ |
| Shared torrent cache | ✅ | ✅ |
| Usenet downloads | ❌ | ✅ |
| `cacheAndPlay` (play while downloading) | ❌ | ✅ |
| `nzbFailover` (auto NZB retry) | ❌ | ✅ |
| Hybrid template | ❌ | ✅ |
| Speed tier | ✅ | ✅ |
| Flash tier | ✅ | ✅ |
| All other features | ✅ | ✅ |

For most users the Essential plan + a Speed or Essential template delivers an excellent experience. Pro is worth it if you specifically want Usenet coverage for niche or hard-to-find content.

---

*[Back to Master Guide](README.md) · [Import Guide](IMPORT_GUIDE.md)*
