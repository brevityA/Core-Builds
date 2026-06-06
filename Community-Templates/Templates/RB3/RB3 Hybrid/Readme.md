<img src="./rb3_banner.svg" alt="RB3 Builds Banner">

A premium, dual-service AIOStreams template designed to maximize stream availability by combining the power of **TorBox Pro** and **Real-Debrid**. Built on top of the robust Tamtaro SEL framework, this configuration is heavily biased toward high-quality, cached Usenet releases. 

## ✨ Key Features

### 🔗 Dual-Service Engine
* **Primary:** TorBox (with specific rules to respect TB Pro limits, e.g., 1TB uncached download limits).
* **Fallback:** Real-Debrid seamlessly fills in any gaps.
* **Usenet Priority:** Employs a custom Stream Expression (`/*Boost Cached Usenet*/`) to force all cached Usenet streams to the absolute top of your results.

### 📺 High-End Hardware Profile
* **Unrestricted Quality:** Prefers all premium formats ranging from 4K down to 144p. Prioritizes `BluRay REMUX` and `BluRay` releases.
* **Massive File Allowances:** Global size limits are set to a massive **100GB** for both Movies and Series.
* **Uncapped Bitrate:** Hardware bitrate ceiling is pushed to **250 Mbps**, ensuring zero compression bottlenecks for heavy 4K REMUXes.
* **Premium A/V Tags:** Fully prioritizes advanced visual tags (Dolby Vision, HDR10+, IMAX) and heavy lossless audio formats (Dolby Atmos, DTS:X, TrueHD, DTS-HD MA).

### ⚙️ Advanced Filtering & Sorting
* **Tamtaro SEL Framework (v2.6.1):** Integrates Tamtaro's live-synced Preferred, Excluded, and Included Stream Expressions (PSE/ESE/ISE) for dynamic, cloud-updated filtering.
* **Vidhin's English Regex:** Live-syncs Vidhin's Ranked Regexes to intelligently score and sort releases based on trusted release groups and formatting standards.
* **Aggressive Deduplication:** Uses AIOStreams' "Aggressive" Smart Detect deduplicator to clean up bloated result lists by merging identical files.

### ⏩ Flawless Autoplay
* **Stremio & WuPlay Ready:** The AutoPlay settings in this template are rigorously tested and guaranteed to work flawlessly across both Stremio and WuPlay. 
* **No Cinemeta Required:** These settings allow AutoPlay to function perfectly even if you completely remove Cinemeta from your setup and rely solely on AIOMetaData and AIOStreams.

### 🗣️ Language Customization
* **Native Language Support:** While this template defaults to English, it is built to be easily customizable. You can seamlessly change the output to your native language by adjusting the **Required** and **Preferred Languages** filters in the configuration menu.

### 🎨 Visual Formatter
* **Tam-Taro Default:** This template is pre-set to use Tam-Taro's highly detailed visual formatter to inject clean typography and badges (e.g., `4K`, `Remux`, `HDR`) directly into your stream list.
* **Easily Swappable:** If you prefer a different look, you can easily change this to any of the other preloaded formatters within the AIOStreams settings.

### 🧩 Included Addons (Presets)
This template comes pre-wired with a highly optimized stack of scrapers and utilities:
* **Debrid / Torrents:** Meteor, Comet, Torrentio, Knaben, Sootio
* **Usenet Search:** * **Searchⁿᶻᵇ:** This is Tam's preloaded Newznab addon configured specifically for the TorBox Search indexer. All you need to do is paste your TorBox API key into it!
  * **STorz:** Torznab integration.
* **Anime:** SeaDex
* **Subtitles:** OpenSubtitles V3+
* **UI:** Library integration (TorBox & Real-Debrid catalogs pushed to Discover)

## 🛠️ Prerequisites
To use this template to its full potential, ensure you have the following API keys ready during the AIOStreams setup:
1. **TorBox API Key** (Pro tier recommended for Usenet)
2. **Real-Debrid API Key**
3. **TMDB API Key & Read Access Token** (Free)
4. **TVDB API Key** (Free)
5. **RPDB API Key** (Free tier supported for custom posters)
