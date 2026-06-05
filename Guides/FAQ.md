# ❓ Frequently Asked Questions

Quick answers to the most common questions. If yours isn't here, open a [Discussion](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/discussions).

---

## Importing

**"Every group must have at least one addon" on import**
This was a bug in templates prior to v2.2.6. A removed addon (MediaFusion) was still referenced in the groups config. Re-import using the latest template from the [import guide](README.md#1--importing-a-template).

**"Template has 1 regex pattern that is not trusted"**
One of the inline regex patterns isn't in your instance's whitelist. You can still import — tap **Import Anyway**. This warning doesn't affect functionality.

**"Failed to parse JSON" on formatter import**
You copied the formatter from the GitHub file view instead of downloading the raw file. Use the raw URL links in the [Formatter Guide](README.md#2--formatters) — they download the actual file, not the rendered page.

**My services got reset after re-importing**
This is expected behaviour. AIOStreams resets service toggles to template defaults on every import. Your API keys are preserved — just re-enable your services in the Services tab after each import. TorBox is pre-toggled on in all Core Builds templates.

**The BUILD badge shows "Repo or workflow not found"**
The GitHub Actions validation workflow hasn't been triggered yet. It runs automatically on the next commit that changes a JSON file. Push any template update and the badge will resolve.

---

## Streams

**No streams showing at all**
Most likely cause: services aren't enabled. After importing, go to **Services** and make sure TorBox (and any other services you subscribe to) is toggled on with your API key entered.

**YouTube / trailer links appearing in my stream list**
This was fixed in v2.2.3+. The `Hard YouTube Kill` ESE now blocks streams by type, source, and quality field. Re-import the latest template. If you're on Stremio specifically, some trailer links come from Stremio's own catalog addon — these can't be filtered by AIOStreams.

**Clicking a stream opens the AIOStreams GitHub page**
Fixed in v2.2.3+. AIOStreams was injecting an informational entry as a stream when errors occurred. The `Hard YouTube Kill` ESE now also blocks `type: external` streams. Re-import the latest template.

**Wrong episode playing**
Fixed in v2.2.3+. Two ESEs (`Kill Ambiguous Season Packs` and `Kill Season Packs When Episode Streams Exist`) now use AIOStreams' `seasonPack()` function to prevent season pack torrents from playing as individual episodes. Re-import the latest template.

**Fewer Real-Debrid results than expected**
Real-Debrid introduced server-side keyword filtering in May 2026. Files with certain filename patterns (WEB-DL tags, streaming service identifiers) are blocked by RD before they ever reach AIOStreams. This is an RD policy issue, not a template issue. TorBox does not have this restriction and covers the gap.

**Streams load slowly**
Try a Speed tier template — Library, Search NZB (TorBox), Comet, and Zilean only, 3500ms timeouts, delivers results in 2-3 seconds. If you're on a standard template, the timeout ceiling is 4500ms (Knaben). Switching to a faster host also helps.

---

## Formatters

**Which formatter should I use?**
- Want maximum information → **Omni Diamond Hybrid** or **Core Zenith Diamond**
- Want a clean dark look → **Midnight Slate**
- Want it to look like native Stremio → **Core Clean Stream**

**The formatter looks wrong / fields are missing**
Make sure **Show file name** and **Show bitrate** are turned OFF in AIOStreams settings when using Core Zenith Diamond or Omni Diamond Hybrid. These formatters handle bitrate natively — leaving the settings on duplicates the data.

---

## Plans & Templates

**What's the difference between TorBox Pro and Essential?**
TorBox Essential is the entry-level plan — it gives you torrent caching but no Usenet access. TorBox Pro adds Usenet, meaning the Hybrid template and the `cacheAndPlay`/`nzbFailover` features work. See the [comparison guide](WHICH_TEMPLATE.md) for a full breakdown.

**Should I use the Speed tier or a standard template?**
Speed tier trades source coverage for load time. It uses 4 addons instead of 8-9, so it finds fewer total results but delivers them in 2-3 seconds. If TorBox has your content cached, Speed is excellent. If you regularly watch niche or older content that isn't well-cached, a standard template covers more ground.

**Can I use Real-Debrid with Core Builds?**
Yes — the Advanced (Dual Core) templates pair TorBox with RD. Due to RD's May 2026 filter enforcement, these work best on WuPlay. Stremio users may see reduced RD results for some content. See the [Advanced templates](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/tree/refs/heads/main/Templates/Torbox/Deprecated/Dual).

**What happened to the Dual Core templates?**
They were briefly deprecated due to RD's May 2026 server-side filter causing issues, then reclassified as **Advanced** after community reports of them working well on WuPlay. They're still available and maintained — just moved to `Templates/Torbox/Deprecated/Dual/` for now.

---

## Stremio vs WuPlay

**Why does WuPlay work better with some templates?**
WuPlay handles stream types differently to Stremio. YouTube-typed streams that slip through ESE filtering in Stremio are automatically handled by WuPlay. RD's copyright filter errors also display more gracefully. See the [Stremio vs WuPlay guide](STREMIO_VS_WUPLAY.md) for a full comparison.

---

*[Back to Master Guide](README.md) · [Report a bug](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/issues/new/choose)*
