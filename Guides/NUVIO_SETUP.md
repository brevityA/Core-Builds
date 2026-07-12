# Nuvio Setup

Use Core Builds with Nuvio — the Stremio-compatible client for Android, iOS, Apple TV, and Android TV.

---

## What is Nuvio?

[Nuvio](https://nuvio.app) is a Stremio-compatible streaming client by Tapframe. It works with all Stremio add-ons — including AIOStreams and Core Builds — with no configuration changes. Available on Android, iOS, Apple TV, Android TV, and web.

**Use Nuvio when:**
- You want a native app on Apple TV or iOS
- You prefer a different UI from Stremio
- You want immediate error feedback when streams fail

---

## Quick Import

Already have an AIOStreams manifest URL? Three steps:

1. **Install Nuvio** — download from [nuvio.app](https://nuvio.app) for your platform
2. **Copy your manifest URL** — open your AIOStreams instance → copy the manifest URL
3. **Add the manifest** — in Nuvio, go to **Add-ons** → paste your manifest URL → confirm

---

## Full Beginner Walkthrough

### 1. Install Nuvio

Download Nuvio from [nuvio.app](https://nuvio.app):
- **iOS / Apple TV** → App Store
- **Android / Android TV** → Google Play
- **Web** → browser version at [nuvio.app](https://nuvio.app)

### 2. Get a TorBox subscription

Sign up at [torbox.app](https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e). You need at least a **Standard** plan. Go to **Dashboard → API Keys** and copy your API key.

### 3. Choose and import a template

1. Go to the [Template Directory](https://core-builds.mintlify.app/template-directory) on your phone or computer
2. Click **Import on ElfHosted** or **Import on Fortheweak** next to your template
3. AIOStreams opens with the template pre-loaded

Recommendations:
- **Apple TV 4K** → use the [Apple TV 4K (Nightly)](https://core-builds.mintlify.app/nightly-and-labs#nightly-apple-tv-4k) template
- **Android TV / phone** → use 4K Apex (4K) or Stream (1080p)
- **iOS (iPhone/iPad)** → use Stream for 1080p

### 4. Configure AIOStreams

In AIOStreams:

1. Go to **Services** → toggle **TorBox** ON → paste your API key
2. *(Optional)* Add a TMDB Access Token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
3. Click **Save**

### 5. Copy your manifest URL

After saving, AIOStreams shows your **manifest URL**. Copy it.

### 6. Add to Nuvio

1. Open Nuvio on your device
2. Go to **Add-ons** (or Settings → Add-ons)
3. Paste your AIOStreams manifest URL
4. Confirm the install

### 7. Start streaming

Browse content in Nuvio → select a title → pick a stream. The Core Builds formatter shows resolution, codec, audio, and file size for each stream.

---

## Key Difference from Stremio

> **Important:** Nuvio shows playback errors immediately instead of silently retrying like Stremio. If a debrid link times out, you'll see a **Playback Error** message rather than a buffering spinner. This is normal — just pick a different stream, or wait and retry.

| Behavior | Stremio | Nuvio |
|---|---|---|
| Failed stream | Silent retry, then timeout | Immediate error message |
| Error visibility | Hidden behind buffering spinner | Shown as "Playback Error" |
| What it means | Same underlying issue | Same issue — just visible |

If you see frequent playback errors:
1. Check [TorBox status](https://status.torbox.app) for outages
2. Try a different stream from the list
3. Core Builds templates set `stremthruTorz` timeout to 5000ms (v2.9.0+)

> **Note:** Nuvio uses the same manifest URL as Stremio. You can use the same AIOStreams config across Stremio, Nuvio, and WuPlay simultaneously.

---

## Apple TV Setup Tips

If you're using Nuvio on Apple TV 4K:

- Use the [Apple TV 4K (Nightly)](https://core-builds.mintlify.app/nightly-and-labs#nightly-apple-tv-4k) template — tuned for DV Profile 5/8 and A15/A17 codec limits
- Nuvio handles Dolby Vision playback natively on Apple TV
- Set your Apple TV video output to match content for the best DV experience

See [Device Profiles](https://core-builds.mintlify.app/device-profiles#apple-tv-4k-a15--a17) for full codec details.

## Troubleshooting

- **Playback Error on every stream** → Check your TorBox API key and subscription status
- **Streams work in Stremio but not Nuvio** → Usually a debrid timeout. Nuvio surfaces the initial failure that Stremio hides. Try again or pick a different stream
- **No streams appearing** → Verify your manifest URL is correct
- **Apple TV codec issues** → Make sure you're using the Apple TV template. See [Device Profiles](https://core-builds.mintlify.app/device-profiles)

More help: [Troubleshooting](https://core-builds.mintlify.app/troubleshooting) · [FAQ](https://core-builds.mintlify.app/faq)
