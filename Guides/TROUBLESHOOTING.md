# Troubleshooting Common Errors

Quick fixes for the most common errors encountered when importing templates, saving configuration, or loading streams.

---


## Clicking a Stream Opens the GitHub Page Instead of Playing

**What it means:** AIOStreams returned an informational entry rather than a real stream. Stremio requires all entries to be clickable, so clicking the info card opens the AIOStreams GitHub page. This is expected behaviour -- the info entry is not a real stream.

**Why it happens:** No real streams were found. The most common cause is that no debrid services are enabled.

**Fix:**
1. Open your AIOStreams dashboard
2. Go to the **Services** section
3. Enable at least one debrid service and enter its API key
4. Click **Save** and reinstall the manifest in Stremio

If services are already enabled and you still see the GitHub card, check that your API keys are valid and not expired.

---

## "Failed to fetch manifest for MediaFusion RD: 400 - Bad Request"

**What it means:** AIOStreams tried to contact the MediaFusion server to build your personalised manifest but the request failed. This is almost always a transient server-side hiccup, not a problem with your configuration.

**Fix:** Click **Save** again. The second attempt succeeds in the vast majority of cases.

If it fails repeatedly:
1. Wait 60 seconds and try again -- MediaFusion may be momentarily overloaded
2. Check the [AIOStreams host status page](https://docs.aiostreams.viren070.me/getting-started/public-instances/) to confirm your instance is healthy
3. Check MediaFusion's own status -- ElfHosted's public instance occasionally undergoes maintenance

> This error does not mean your Real-Debrid credentials are wrong. It is a connectivity issue between AIOStreams and the MediaFusion server, not a credential validation failure.

---

## "Failed to import template: HTTP error! status: 404"

**What it means:** The raw GitHub URL you pasted does not point to an existing file.

**Common causes:**
- The file has not been uploaded to the repository yet
- The folder path in the URL is wrong (folder names are case-sensitive on GitHub)
- The filename in the URL does not match the actual filename on GitHub

**Fix:** Double-check the URL matches the exact path in the repo. Raw URLs follow this pattern:
```
https://raw.githubusercontent.com/Branding-Brevity/Core-Builds-By-Brevity/main/Templates/Torbox/Dual/core-nexus-4k-dual-core.json
```

Note: `Torbox` has a lowercase `b`. `Dual`, `Single`, and `Hybrid` are capitalised. Filenames are all lowercase with hyphens.

---

## "Failed to import template: Invalid template"

**What it means:** The JSON file is malformed -- a missing comma, extra bracket, or other syntax error is preventing AIOStreams from parsing it.

**Fix:**
1. Download the template file
2. Paste its contents into [jsonlint.com](https://jsonlint.com)
3. Fix the highlighted error
4. Re-import the corrected file

---

## "invalid attribute 'WEB-DL'" (Stream Expression Error)

**What it means:** A stream expression is using the `keyword()` function incorrectly. The `keyword()` function requires an attribute as its second argument (`filename`, `folderName`, `indexer`, `releaseGroup`, or `all`) before listing the keywords.

**Wrong:**
```
keyword(streams, 'WEB-DL', 'WEBRip', 'AMZN')
```
**Correct:**
```
keyword(streams, 'all', 'WEB-DL', 'WEBRip', 'AMZN')
```

**Fix:** Update to v2.1.2 of the Core Builds templates -- this was corrected in that release.

---

## Stremio Showing a Wall of Red Errors After Saving

**What it means:** The streams are loading but the files have been flagged by your debrid service. This is most commonly the Real-Debrid "infringing file" issue where RD has blocked certain WEB-DL and streaming platform rips.

**Fix:** The Core Builds dual-service templates include an RD Infringing File Scrub that filters these results before they reach Stremio. If you are seeing red errors, confirm you are on v2.1.2 or later and that the MediaFusion and Real-Debrid presets are correctly configured.

---

## Stremio Showing Old Streams After Saving New Config

**What it means:** The Stremio addon is still using a cached version of the old manifest. Your configuration has changed but Stremio has not picked up the new URL.

**Fix:**
1. Open Stremio -- go to **Addons**
2. Find the AIOStreams entry and tap **Uninstall**
3. Open your AIOStreams dashboard and copy the manifest URL
4. Paste it into Stremio's search bar or tap **Install** directly from the dashboard

A full app restart after reinstalling speeds up the refresh.

---


## AnimeTosho or TorrentGalaxy Returning Errors or No Results

**AnimeTosho** is an anime-specific torrent source. It returns 0 results for movies and TV shows that are not anime -- this is expected and not a bug. It has been moved to opt-in as of v2.1.4.

**TorrentGalaxy** is periodically blocked by Cloudflare, causing it to return an HTML page instead of JSON results. This produces a `Partial Success` or `Unexpected token '<'` error in the scrape summary. It has been moved to opt-in as of v2.1.4.

Both addons are now **disabled by default**. Enable them in your addon settings only if you specifically want them -- AnimeTosho for anime content, TorrentGalaxy when it is not being blocked.

---

## No Streams Appearing At All

Work through these in order:

1. **Are your debrid services enabled?** Open your AIOStreams dashboard and confirm at least one service has credentials entered and is toggled on.
2. **Is the manifest installed in Stremio?** Go to Addons and confirm AIOStreams appears in the installed list.
3. **Is your AIOStreams host online?** Check [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/public-instances/).
4. **Is the content available in your debrid library?** Try a well-known popular title first to rule out a content availability issue.
5. **Are your ESEs filtering everything?** Open the AIOStreams dashboard, go to **Statistics**, and check the filter breakdown to see how many streams are being excluded at each stage.

---

## NZBGeek Returns No Results (Hybrid Template)

**What it means:** The NZBGeek API key placeholder has not been replaced with your actual key.

**Fix:**
1. Open your AIOStreams dashboard
2. Go to **Addons** -- find **NZBGeek**
3. Tap the settings icon and replace the placeholder text with your API key from [nzbgeek.info](https://nzbgeek.info) under Account -- API Key
4. Tap **Save**

---

## Still Stuck?

- See the [Reset Guide](./RESET_GUIDE.md) if your configuration is in a broken state and you need to start over
- See the [Advanced Editing Guide](./ADVANCED_EDITING.md) for JSON editing and validation tips
- Open an issue on the [GitHub repository](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/issues) with a description of the error

---

*Return to the [Main README](../README.md)*
