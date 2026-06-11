# Core Formatters

Custom stream display layouts for AIOStreams. Formatters control how every stream appears in Stremio and WuPlay — the title line, the metadata rows, cache status, audio tags, release group, and everything else you see when picking a stream.

---

## 📋 Active Formatters

### ⭐ Core Nexus Apex v2

Apex v2 is the recommended upgrade over Apex v1. Three targeted changes: score number in line 1 (💎 ELITE ✦ 94 instead of a label), bitrate before visual tags in line 2 so the most decision-relevant spec comes first, and per-language subtitle flags (📝 🇬🇧 🇫🇷) replacing the binary SUB badge.

![Core Nexus Apex v2 Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/apex-v2-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-apex-v2-formatter.json)

---

### Core Nexus Apex

Evolution of Elite. Adds audio codec to the name line, two-tier score badge (💎 ELITE ≥75 · ✦ QUALITY ≥50), season pack flag before size.

![Core Nexus Apex Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/apex-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-apex-formatter.json)

---

### Core Nexus Elite

High-contrast. Colour-coded resolution circles (🟣4K · 🔵1080P · 🟢720P · ⚫480P), HDR/DV in name, INSTANT/UNCACHED badge, PREMIER release group detection, 4-line description. **Bundled in all templates.**

![Core Nexus Elite Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/elite-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-elite-formatter.json)

---

### Core Nexus Sigma

Typographic `「 」` / `『 』` bracket system. Title-first name line, smallcaps throughout, premium editorial feel.

![Core Nexus Sigma Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/sigma-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-sigma-formatter.json)

---

### Core Nexus Minimal

3-line description, ⚡/⏳ cache indicator in name, first audio codec only. Built for TV, AppleTV, and small screens.

![Core Nexus Minimal Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/minimal-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-minimal-formatter.json)

---

### 📺 Core Nexus TV

Large-screen / 10-foot UI optimised. UPPER CASE throughout (no smallcaps — readable at distance), coloured resolution circles (🔴 4K · 🔵 1080P · 🟢 720P), 4-line description with clear section icons (🎬 video · 🔊 audio · 🔌 type/meta). Designed for projectors, smart TVs, and any setup where the screen is across the room.

![Core Nexus TV Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/tv-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-tv-formatter.json)

---

### Core Nexus Uniform

Legacy — replaced by Core Nexus Elite.

![Core Nexus Uniform Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/uniform-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-uniform-formatter.json)

---

## 🗂️ Community & Additional Formatters

### Core Syntax

Original Core Builds formatter. `✦`/`✧` cache indicator in name, `「 」` bracket system for metadata, ◈ ELITE score badge, full release group and edition tagging.

![Core Syntax Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/core-syntax-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-syntax-formatter.json)

---

### Core Syntax V3 (Core Cipher)

Personal build variant. JBL Spatial audio detection (`🔊 JBL Sᴘᴀᴛɪᴀʟ` when DD+/EAC3 present), ★ Premium release group badge, IMAX/Hybrid/edition flags, indexer in release line.

![Core Syntax V3 Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/core-syntax-v3-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-syntax-v3.json)

---

### Omni Diamond v2.2.0

Maximum metadata density. Two-line name (visual tags on second line), edition/network/remastered flags, JBL Spatial detection, full language + release group + indexer in description.

![Omni Diamond Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/omni-diamond-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/omni-diamond-v2.2.0.json)

---

### Core Zenith Diamond

`🔹`/`🔸` dot separator style. Info-dense name line with encode, audio, channels, and PREMIER flag. 4-line description with bitrate, seeders, video, language, release group.

![Core Zenith Diamond Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/zenith-diamond-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-zenith-diamond.json)

---

### Core Zenith Auburn Tiger

Auburn Tiger edition of Core Zenith Diamond. Orange `🟠` 4K badge, `🐅` release line prefix, amber card border for a distinct warm aesthetic.

![Core Zenith Auburn Tiger Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/auburn-tiger-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-zenith-auburn-tiger-edition.json)

---

### Midnight Slate

Dark minimal. `◼`/`⬤`/`▶`/`◆` ASCII symbols instead of emoji. Clean typographic lines — best for clients that render emoji poorly or for a no-clutter look.

![Midnight Slate Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/midnight-slate-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/midnight-slate.json)

---

### Nexus Prime

Early Core Builds formatter. Similar layout to Uniform with additional SEADEX/BEST detection, `📅` age format, subtitle emoji track listing, and folder size support.

![Nexus Prime Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/nexus-prime-preview.svg)

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/nexus-prime-formatter.json)

---

## ⚙️ How to Apply

### Using a Core Builds template
Core Nexus Elite is already bundled in all templates — nothing to do on a fresh import. To switch formatter after importing:

1. Click the **↓ Download JSON** link for your chosen formatter above — the file downloads automatically
2. Open your AIOStreams dashboard → **Formatter** section → tap the **Import/Export icon** (bottom right corner)
3. Select **Import from File** → choose the downloaded `.json` file
4. Click **Save** — streams update immediately, no Stremio reinstall needed

> **Note:** If you updated from an older template and the formatter fields are blank, do a fresh import rather than an update. AIOStreams preserves the formatter as a user setting during updates.

### Building your own template
All Core Builds formatters use the `tamtaro` formatter type. The override key must match the `id`:

```json
"formatter": {
  "id": "tamtaro",
  "definitions": {
    "overrides": {
      "tamtaro": {
        "name": "...",
        "description": "..."
      }
    }
  }
}
```

---

## 🔍 What the Stream Display Shows

### Core Nexus Elite / Apex — Name line
```
🟣 4K  ⚡ TB  👁️ DV ✨ HDR¹⁰⁺  🔮 ATMOS  MOVIE TITLE S01
```

| Token | Meaning |
|---|---|
| 🟣 / 🔵 / 🟢 / ⚫ | Resolution (4K · 1080P · 720P · 480P) |
| `⚡ TB` | Service short name |
| 👁️ DV · 🌟 HDR · 🌤️ HLG | Visual tag (only when present) |
| 🔮 ATMOS · 💎 TRUEHD · 🔷 DTS-HD | Top audio codec — Apex/Minimal only |
| Title · Season/Episode | Parsed from filename |

### Description rows (Elite / Apex v2)
```
🚀 INSTANT  💎 ELITE  ✦ 94  ⭐ BEST  🎯 Regex  🏷️ Group  👑 PREMIER
🎬 💎 REMUX  hevc  45.2 Mbps  👁️ DV ✨ HDR¹⁰⁺
🎛️ 🔮 ATMOS  💎 TRUEHD  🔊 7.1  🌍 🇬🇧  📝 🇬🇧 🇫🇷
12.4 GB  📦 PACK  🌱 234  ⏱️ 2y  🔍 indexer  🔌 debrid
```

| Line | Content |
|---|---|
| Line 1 | Cache status · Score tier + number · SeaDex · Regex/SE match · Release group · PREMIER · IMAX |
| Line 2 | Quality source · Encode · **Bitrate** · Visual tags · Network · Edition flags |
| Line 3 | Audio codecs · Channels · Language emojis · Dub · **Subtitle language flags** |
| Line 4 | File size · Season pack · Seeders · Age · Indexer · Stream type |

---

## 📝 Notes

- Formatters are display-only — they don't affect which streams appear, filtering, or sorting
- All formatters use `id: "tamtaro"` with `definitions.overrides.tamtaro` — this is the correct structure for AIOStreams
- `{tools.newLine}` must be used for line breaks in the description — literal newlines will cause the formatter to be silently discarded on import
- ELITE / QUALITY score badges only appear when a stream has a ranked regex or stream expression score
- Compatible with AIOStreams v2.4.6+

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · Filtering powered by [Tamtaro SEL Setup](https://git.tamtaro.de)*
