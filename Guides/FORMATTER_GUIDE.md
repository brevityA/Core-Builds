# 🎨 Formatter Guide — Core Builds by Brevity

Custom visual layouts that control how streams appear in your list. Swap between styles instantly without touching any template settings.

---

## Available Formatters

| Formatter | Style | Best For |
|---|---|---|
| **Core Nexus Elite** | Colour-coded circles, INSTANT/UNCACHED badge, 4-line description | Default — bundled in all templates |
| **Core Nexus Apex v2** ⭐ | Score number in name, bitrate-first line 2, subtitle language flags | Recommended upgrade |
| **Core Nexus Apex** | Audio codec in name, two-tier score badge (ELITE ≥75 · QUALITY ≥50) | Detailed monitoring |
| **Core Nexus TV** | UPPER CASE throughout, large-screen readable | TV, projector, 10-foot UI |
| **Core Nexus Sigma** | Typographic `「 」` brackets, editorial feel | Clean aesthetic |
| **Core Nexus Minimal** | 3-line description, ⚡/⏳ indicator, first audio only | Apple TV, small screens |

All formatters: [`Formatters/`](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/tree/main/Formatters)

### ⭐ Core Nexus Apex v2 *(Recommended)*

Score number in line 1 (`✦ 94` instead of a label), bitrate before visual tags in line 2, per-language subtitle flags (`📝 🇬🇧 🇫🇷`). Recommended upgrade from Elite for most setups.

### Core Nexus Elite *(Default)*

Bundled in all templates. Colour-coded resolution circles (🟣 4K · 🔵 1080P · 🟢 720P), INSTANT/UNCACHED badge, PREMIER release group detection, 4-line description.

### 📺 Core Nexus TV *(Large screen)*

UPPER CASE throughout — readable at TV distance. Coloured circles (🔴 4K · 🔵 1080P · 🟢 720P), ⚡/⏳ cache indicator, 🎬/🔊/🔌 section icons. Designed for projectors and smart TVs.

---

## Step 1 — Get the Formatter JSON

Copy the raw URL for your chosen formatter:

```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Formatters/Core%20Nexus%20Apex%20v2%20Formatter.json
```
```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Formatters/Core%20Nexus%20Elite%20Formatter.json
```
```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/refs/heads/main/Formatters/Core%20Nexus%20TV%20Formatter.json
```

> ⚠️ **Use the raw URL, not the GitHub file view.** The rendered page adds hidden characters that cause a "Failed to parse JSON" error on import.

---

## Step 2 — Open the Formatter Import Menu

1. Open your **AIOStreams dashboard**
2. Navigate to the **Formatter** section
3. Tap the **Import/Export icon** in the bottom right corner (box with inward arrow)

---

## Step 3 — Import the File

1. Select **Import from File** in the pop-up
2. Choose the `.json` formatter file you downloaded
3. The Name and Description fields populate automatically

---

## Step 4 — Save and Refresh

1. Click **Save** at the bottom of the dashboard
2. Refresh Stremio or WuPlay — the new layout applies instantly

---

## Tips

> **Core Nexus Elite / Apex v2:** Turn **Show file name** and **Show bitrate OFF** in AIOStreams main settings. These formatters handle bitrate natively — leaving the settings on duplicates the data in the stream card.

> **Export your own:** Tap the **Export** icon next to the import button to save your current formatter as a JSON file you can back up or share.

> **Parse error on import:** Always use the raw GitHub URL above. Do not copy the text from the GitHub file view — the rendered page adds characters that break the JSON parser.

---

*[README](../README.md) · [Import Guide](IMPORT_GUIDE.md) · [Troubleshooting](TROUBLESHOOTING.md)*
