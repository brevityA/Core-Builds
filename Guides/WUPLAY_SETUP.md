# WuPlay Setup

Use Core Builds with WuPlay — stream in your browser, cast to Chromecast, no app install required.

---

## What is WuPlay?

WuPlay is a web-based streaming client that works with Stremio add-ons — including AIOStreams and Core Builds. No app install needed. It runs in your browser and supports Chromecast for casting to TVs.

**Use WuPlay when:**
- Your device doesn't have a native Stremio app
- You want to cast to a Chromecast or smart TV
- You prefer streaming in a browser tab

---

## Quick Import

Already have a TorBox account and a configured AIOStreams template? Three steps:

1. **Copy your manifest URL** — open your AIOStreams instance → copy the manifest URL from the top of the config page
2. **Open WuPlay** — go to [wuplay.app](https://wuplay.app)
3. **Add the manifest** — go to **Add-ons** → paste your manifest URL → click **Install**

---

## Full Beginner Walkthrough

### 1. Get a TorBox subscription

Sign up at [torbox.app](https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e). You need at least a **Standard** plan. Go to **Dashboard → API Keys** and copy your API key.

### 2. Choose and import a template

1. Go to the [Template Directory](https://core-builds.mintlify.app/template-directory)
2. Click **Import on ElfHosted** or **Import on Fortheweak** next to your chosen template
3. AIOStreams opens with the template pre-loaded

Not sure which template? See [Which Template?](https://core-builds.mintlify.app/which-template). For most people: **4K Apex** (4K) or **Stream** (1080p).

### 3. Configure AIOStreams

In AIOStreams:

1. Go to **Services** → toggle **TorBox** ON → paste your API key
2. *(Optional)* Add a TMDB Access Token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
3. Click **Save**

### 4. Copy your manifest URL

After saving, AIOStreams shows your **manifest URL**. Copy it. It looks like:

```
https://aiostreams.elfhosted.com/stremio/abcdef1234/manifest.json
```

### 5. Set up WuPlay

1. Go to [wuplay.app](https://wuplay.app)
2. Navigate to **Add-ons**
3. Paste your AIOStreams manifest URL
4. Click **Install** or **Add**

### 6. Start streaming

Browse movies and shows in WuPlay. Click any title → select a stream → playback starts in your browser. To cast, use the Chromecast icon in the player controls.

> **Tip:** WuPlay uses the same manifest URL as Stremio — you can use both clients with the same AIOStreams config.

---

## WuPlay vs Stremio

| | WuPlay | Stremio |
|---|---|---|
| Platform | Web browser (any device) | Desktop + mobile apps |
| Install required | No | Yes |
| Chromecast | Built-in cast support | Not natively supported |
| Offline use | No | Download for offline (desktop) |
| Library sync | No | Syncs across devices via account |
| Best for | Casting, quick access, no-install | Daily use, full library management |

## Troubleshooting

- **No streams appearing** → Make sure your manifest URL is correct and your TorBox API key is active
- **Cast not working** → Ensure your Chromecast and browser are on the same Wi-Fi network
- **Streams buffer or stall** → Try a Speed or Flash template for faster cached results
- **Playback error** → Some codecs may not play in-browser. Try a different stream — H.264 is most reliable in browsers

More help: [Troubleshooting](https://core-builds.mintlify.app/troubleshooting) · [FAQ](https://core-builds.mintlify.app/faq)
