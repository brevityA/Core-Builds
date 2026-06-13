<p align="center">
  <img src="https://raw.githubusercontent.com/brevityA/Core-Builds/main/Assets/auburn_tiger_banner.svg" alt="Auburn Tiger Banner">
</p>

# 🐅 Auburn Tiger Edition (by RB3)

**Author:** RB3  
**Category:** Community Sandbox  
**File:** `auburn-tiger-rb3.json`  
**Addon Name:** WarEagleStreams- TB+RD  

## 🎯 Overview
The **Auburn Tiger Edition** is a heavily modified, performance-focused community build. It is engineered specifically for power users running **Torbox Pro** with boosted Usenet priority, backed by a Real-Debrid secondary cache. 

Powered by **Tamtaro SEL Setup v2.6.1**, this configuration leverages advanced Stream Expression Language filtering alongside Vidhin's Regex Patterns to ensure flawless sorting, aggressive deduplication, and immediate access to the highest fidelity files.

---

## 🎨 The Formatter Aesthetic
Departing from the standard Core Nexus UI design, this template features a warm, high-contrast visual language inspired by the Auburn Tigers:

* **The Palette:** High-visibility Orange (`🔸`, `🟠`) and Navy Blue (`🔹`, `🔵`) geometric resolution badges and UI separators.
* **The Signature:** The default Core Nexus logo has been swapped for the Auburn Tiger (`🐅 Rᴇʟᴇᴀsᴇ:`) to indicate release groups.
* **Hardware Tagging:** Retains the signature `🔊 JBL Sᴘᴀᴛɪᴀʟ` tag for Dolby Digital Plus and EAC3 audio tracks.
* **Stacked Metadata:** Custom logic efficiently stacks file age, bitrate, HDR/DV visual tags, and language availability without overwhelming the UI character limits.

---

## ⚙️ Under The Hood
* **Usenet Supremacy:** TorBox Usenet links are algorithmically prioritized over standard torrent cache for maximum bandwidth saturation.
* **Smart Language Detection:** Multilingual tracks automatically display as `🗣️ ᴍᴜʟᴛɪ` while natively pushing English tracks to the top.
* **Regex Filtering:** Seamlessly pushes boutique releases, Remuxes, and specific high-bitrate encodes above standard web-rips.

---

## 🚀 Installation Guide

1. Download or copy the raw text from the `auburn-tiger-rb3.json` file in this folder.
2. Open your **AIOStreams Dashboard** and navigate to the **Template Import** menu.
3. Paste the configuration code directly into the importer.
4. Input your **TorBox** and **Real-Debrid** API keys when prompted by the setup sequence.
5. **UI Optimization:** In your main AIOStreams settings, ensure that **Show file name** and **Show bitrate** are toggled **OFF**. The Auburn Tiger formatter handles these natively, and leaving the default settings on will break the visual layout.

---

## 🎨 Formatters

### RB3 Clean v4

A minimal, clean formatter with a service-first layout. Bold unicode resolution numbers and italic unicode quality sources create clear visual hierarchy across three compact name lines, with structured `⁞`-separated metadata rows in the description.

![RB3 Clean v4 Preview](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/rb3-clean-v4-preview.svg)

**Name layout (3 lines)**

| Line | Shows |
|---|---|
| Line 1 | Service shortname · `⚡` cached or `⏳` uncached · `[USN]` if usenet |
| Line 2 | Resolution in bold unicode — `𝟰𝗞 𝗨𝗛𝗗` · `𝟭𝟬𝟴𝟬𝗽` · `𝟳𝟮𝟬𝗽` |
| Line 3 | Source in italic unicode — `𝘉𝘭𝘶-𝘳𝘢𝘺 𝘙𝘦𝘮𝘶𝘹` · `𝘞𝘌𝘉-𝘋𝘓` · `𝘞𝘌𝘉-𝘙𝘪𝘱` |

**Description layout (up to 6 lines)**

| Line | Shows |
|---|---|
| Line 1 | `📁` Title · year · episode |
| Line 2 | `🎬` Visual tags · `💿` encode |
| Line 3 | `🔊` Audio channels · `🎧` audio tags |
| Line 4 | `🌐` Language codes |
| Line 5 | `📦` File size · `〽️` bitrate |
| Line 6 | `🌱` Seeders (uncached only) · `🧩` Addon name |

[↓ Download JSON](https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Formatters/rb3-clean-v4-formatter.json)

**How to import:**

1. Click the download link above — the JSON file saves automatically
2. Open AIOStreams → **Formatter** section → tap the **Import/Export icon** (bottom right)
3. Select **Import from File** → choose the downloaded `.json` → click **Save**

