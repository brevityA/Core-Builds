# Core Nexus Samsung TV Templates *(Nightly)*

Samsung TV and Dolby Vision-incompatible device variants of the Core Nexus stream templates. DV-only streams are excluded by default — HDR10, HDR10+, HLG, SDR, and DV+HDR10 dual-layer files all pass through normally.

> 🌙 **Nightly** — stable for daily use, gathering community feedback before promotion to stable.

---

## Templates

### Core Nexus Samsung TV

1080p build tuned for Samsung smart TVs and devices without Dolby Vision support.

| | |
|---|---|
| **File** | `core-nexus-samsung-tv.json` |
| **Version** | v0.1.0 |
| **Plan** | TorBox Pro |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv.json` |
| **Resolution** | 1080p · 720p fallback |
| **Visual** | HDR10 · HDR10+ · HLG · SDR — DV-only excluded |
| **Usenet** | ❌ |

---

### Core Nexus Samsung TV 4K

4K variant. HDR10+ is the preferred visual tag — Samsung TVs support HDR10+ natively. DV-Only Kill ESE enabled; DV-only streams excluded, all other HDR modes pass through.

| | |
|---|---|
| **File** | `core-nexus-samsung-tv-4k.json` |
| **Version** | v0.1.0 |
| **Plan** | TorBox Pro |
| **Import URL** | `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/Nightly/Samsung/core-nexus-samsung-tv-4k.json` |
| **Resolution** | 2160p · 1080p fallback |
| **Visual** | HDR10+ preferred · HDR10 · HLG · SDR · DV+HDR10 dual-layer — DV-only excluded |
| **Usenet** | ❌ |

---

## Why a Samsung-Specific Template?

Samsung TVs do not support Dolby Vision. DV-only files will either refuse to play or fall back to SDR, losing all HDR. These templates activate a **DV-Only Kill ESE** that strips streams flagged as DV-exclusive from the result list entirely. Files that carry both DV and HDR10 (dual-layer) are not affected and appear normally.

---

*Part of [Core Builds by Brevity](https://github.com/brevityA/Core-Builds) · [Template Directory](https://github.com/brevityA/Core-Builds/blob/main/Templates/Torbox/README.md)*
