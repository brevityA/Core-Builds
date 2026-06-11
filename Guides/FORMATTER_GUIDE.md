# Formatter Guide — Core Builds by Brevity

Formatters control how stream cards look in Stremio and WuPlay. Each formatter is a separate JSON file — swap between them any time without touching your template settings.

---

## Which Formatter Should I Use?

```
Want the most information on screen?  → Apex v2 ⭐
Using a TV, projector, or 10-foot UI? → Core Nexus TV
On Apple TV or a small screen?        → Minimal
Want a clean editorial look?          → Sigma
Happy with the default?               → Elite (already loaded)
```

---

## Available Formatters

| Formatter | Style | Best For |
|---|---|---|
| **Core Nexus Apex v2** ⭐ | Score number · bitrate-first · subtitle flags | Most setups — recommended upgrade |
| **Core Nexus Elite** | Colour circles · INSTANT badge · release group | Default — bundled in all templates |
| **Core Nexus TV** | UPPER CASE · large readable text · section icons | Smart TVs, projectors, 10-foot UI |
| **Core Nexus Minimal** | 3-line compact · ⚡/⏳ · first audio only | Apple TV, small screens |
| **Core Nexus Sigma** | `「 」` brackets · title-first name line | Clean aesthetic |
| **Core Nexus Apex** | Audio codec in name · ELITE/QUALITY tier badge | Detailed audio monitoring |

All files: [`Formatters/`](https://github.com/brevityA/Core-Builds/tree/main/Formatters)

---

## Formatter Previews

#### ⭐ Core Nexus Apex v2 — *Recommended*

Score in the title line, bitrate leads line 2, subtitle language flags on line 3.

```
✦ 94 · 🟣 4K · REMUX · x265
58.4 Mbps · HDR10+ · DV · IMAX
📝 🇬🇧 🇫🇷 🇩🇪
⚡ TorBox · 42.7 GB · YTS
```

**Settings:** Turn **Show file name** and **Show bitrate OFF** in AIOStreams — Apex v2 handles both natively.

---

#### Core Nexus Elite — *Default*

Colour-coded resolution circles, INSTANT/UNCACHED badge, PREMIER release group detection. Loaded in all templates out of the box.

```
🟣 4K · Interstellar (2014) · PREMIER
REMUX · TrueHD Atmos · ⚡ INSTANT
HDR10+ · DV · 58.4 Mbps
TorBox · 42.7 GB · Comet
```

**Settings:** Turn **Show file name** and **Show bitrate OFF** — Elite handles both.

---

#### 📺 Core Nexus TV — *Large screen*

Everything in UPPER CASE. Section icons (🎬 video · 🔊 audio · 🔌 source) break up the info into readable blocks at TV distance.

```
🔴 4K · INTERSTELLAR (2014)
🎬 REMUX · x265  🔊 TRUEHD ATMOS  ⚡ INSTANT
🔌 TORBOX · 42.7 GB · COMET
```

**Settings:** No special adjustments needed. Works well on any screen size that struggles with small text.

---

#### Core Nexus Minimal — *Compact*

3-line layout — designed for interfaces that truncate long stream cards. Shows first audio tag only, omits subtitle flags.

```
⚡ 🟣 4K · REMUX · TrueHD Atmos
HDR10+ · DV · 58.4 Mbps · 42.7 GB
TorBox · Comet
```

**Settings:** Fine as-is. Ideal when you want less noise on screen.

---

#### Core Nexus Sigma — *Editorial*

Title-first layout with `「 」` typographic brackets. Quieter, more editorial feel.

```
「 4K 」 Interstellar (2014)
REMUX · TrueHD Atmos · HDR10+ · DV
⚡ TorBox · 58.4 Mbps · 42.7 GB
```

---

#### Core Nexus Apex — *Detailed*

Audio codec in the title line, two-tier score badge: **ELITE** (score ≥75) or **QUALITY** (score ≥50).

```
TrueHD Atmos · 🟣 4K · ELITE
REMUX · HDR10+ · DV · IMAX
⚡ TorBox · 58.4 Mbps · 42.7 GB · Comet
```

---

## How to Import

**Step 1 — Copy the raw URL** for your chosen formatter:

```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-apex-v2-formatter.json
```
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-elite-formatter.json
```
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-tv-formatter.json
```
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-minimal-formatter.json
```
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-sigma-formatter.json
```
```
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/core-nexus-apex-formatter.json
```

> ⚠️ **Use the raw URL, not the GitHub file view.** The rendered page adds hidden characters that cause a "Failed to parse JSON" error on import.

---

**Step 2 — Open the import menu**

1. Open your AIOStreams dashboard
2. Go to the **Formatter** section
3. Tap the **Import/Export icon** in the bottom right corner (box with inward arrow)

---

**Step 3 — Import**

1. Select **Import from URL** in the pop-up
2. Paste the raw URL
3. The name and description fields populate automatically
4. Click **Save**

Streams update immediately — no Stremio reinstall needed.

---

## Tips

**Back up your formatter:** Tap the **Export** icon next to the import button to save your current formatter as a JSON file.

**Switching formatters:** Just re-import. Each import overwrites the previous formatter — your template settings are untouched.

**Parse error on import:** You copied from the GitHub rendered file view. Always use the raw URL above.

---

*[Master Guide](README.md) · [Import Guide](IMPORT_GUIDE.md) · [Troubleshooting](TROUBLESHOOTING.md)*
