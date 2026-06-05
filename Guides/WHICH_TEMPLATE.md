# 🧭 Which Template Should I Use?

Not sure where to start? Answer these three questions.

---

## Step 1 — What plan do you have?

```
TorBox Pro    ──────────────► Go to Step 2A
TorBox Essential ──────────► Go to Step 2B
TorBox Essential + EasyNews ► Speed (EasyNews) tier
TorBox + Real-Debrid ───────► Advanced (Dual Core) tier
```

---

## Step 2A — TorBox Pro

**What hardware are you streaming to?**

| Hardware | Template | Why |
|---|---|---|
| Shield, Apple TV 4K, OLED/QLED | **4K HT TorBox** | Full 4K HDR stack — DV, TrueHD, REMUX up to 150 GB |
| Phone, tablet, Fire Stick, budget TV | **TorBox Exclusive RPDB** | 1080p SDR — compatible with everything, RPDB poster art |
| TorBox Pro + NZBGeek subscription | **TB Hybrid 1080p** | Adds NZBGeek Usenet indexer for maximum source diversity |

---

## Step 2B — TorBox Essential

**Do you prioritise speed or coverage?**

### I want instant results (2-3 second load)

| Hardware | Template |
|---|---|
| Shield, Apple TV 4K, 4K display | **Speed 4K (TorBox)** |
| Phone, tablet, budget TV | **Speed 1080p (TorBox)** |
| Essential + EasyNews subscription | **Speed 4K/1080p (EasyNews)** |

### I want maximum source coverage

| Hardware | Template |
|---|---|
| Shield, Apple TV 4K, 4K display | **4K Essential** |
| Phone, tablet, budget TV | **1080p Essential** |

---

## Step 3 — Mixed household?

If you have a mix of devices (4K TV + phone, for example), use **two separate Stremio accounts**:

- **Account A** → 4K template on your high-end device
- **Account B** → 1080p template on phones, tablets, Fire Sticks

Both accounts use the same TorBox credentials. See [Device Profiles](README.md#3--device-profiles).

---

## At a Glance

| Template | Plan | Resolution | Addons | Load Speed | Best For |
|---|---|---|---|---|---|
| 4K HT TorBox | Pro | 4K HDR | 8 | ~4.5s | Home cinema |
| TorBox Exclusive RPDB | Pro | 1080p SDR | 8 | ~4.5s | Budget hardware |
| TB Hybrid 1080p | Pro + NZBGeek | 1080p SDR | 9 | ~4.5s | Maximum sources |
| 4K Essential | Essential | 4K HDR | 8 | ~4.5s | 4K without Pro |
| 1080p Essential | Essential | 1080p SDR | 8 | ~4.5s | 1080p without Pro |
| Speed 4K (TorBox) | Essential | 4K HDR | 4 | ~2-3s | Speed priority |
| Speed 1080p (TorBox) | Essential | 1080p SDR | 4 | ~2-3s | Speed priority |
| Speed 4K (EasyNews) | Essential + EasyNews | 4K HDR | 4 | ~2-3s | Speed + Usenet |
| Speed 1080p (EasyNews) | Essential + EasyNews | 1080p SDR | 4 | ~2-3s | Speed + Usenet |
| Advanced 4K Dual Core | Pro + RD | 4K HDR | 8 | ~4.5s | TorBox + RD (WuPlay) |

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
| All other features | ✅ | ✅ |

For most users the Essential plan + a Speed or Essential template delivers an excellent experience. Pro is worth it if you specifically want Usenet coverage for niche or hard-to-find content.

---

*[Back to Master Guide](README.md) · [Import Guide](README.md#1--importing-a-template)*
