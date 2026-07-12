# Stremio Setup

Install Core Builds on Stremio — quick import and full beginner walkthrough.

---

## Quick Import

Already have Stremio and a TorBox account? Five steps:

1. **Pick a template** — go to the [Template Directory](https://core-builds.mintlify.app/template-directory) and find your template
2. **Load the template** — click the import button. AIOStreams opens in your browser with the template pre-loaded. Click **Load Template**
3. **Enter your API key** — go to **Services** → toggle TorBox ON → paste your API key from [torbox.app/settings](https://torbox.app/settings)
4. **Save** — click **Save** at the bottom. AIOStreams generates your manifest URL
5. **Install in Stremio** — click **Install** → Stremio opens → confirm the install. Done

---

## Full Beginner Walkthrough

### 1. Install Stremio

Download Stremio from [stremio.com](https://www.stremio.com/) for your platform (Windows, macOS, Linux, Android, iOS). Create a Stremio account when prompted — it's free and required for add-on syncing.

### 2. Get a TorBox subscription

Sign up at [torbox.app](https://torbox.app/subscription?referral=d1ccddb0-f094-45ca-b52b-942a2635855e). You need at least a **Standard** plan. After signing up, go to **Dashboard → API Keys** and copy your API key.

### 3. Choose a template

Templates control how streams are filtered, sorted, and displayed. Pick one:

| If you want... | Use this template |
|---|---|
| Best 4K quality (TorBox Pro) | 4K Apex |
| 1080p streaming (TorBox Pro) | Stream |
| 4K on TorBox Essential | 4K Essential |
| 1080p on TorBox Essential | Essential |
| Anime-focused | Anime 4K or Anime |

Still unsure? See the [Template Directory](https://core-builds.mintlify.app/which-template).

### 4. Import the template into AIOStreams

AIOStreams is the engine that runs Core Builds templates. You access it through a **host** — a server that runs AIOStreams for you.

1. Go to the [Template Directory](https://core-builds.mintlify.app/template-directory)
2. Click **Import on ElfHosted** or **Import on Fortheweak** next to your chosen template
3. AIOStreams opens with the template pre-loaded
4. If it's your first time, set a password when prompted

> **ElfHosted** and **fortheweak.cloud** are the two main public hosts. Fortheweak is free with no signup. ElfHosted offers a paid private instance ($9/month) with no rate limits. Start with fortheweak to test.

### 5. Enter your API keys

In AIOStreams, go to **Services**:

1. Toggle **TorBox** ON
2. Paste your TorBox API key from step 2
3. *(Optional but recommended)* Add a **TMDB Access Token** from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) → Read Access Token

### 6. Save and install

1. Click **Save** at the bottom
2. AIOStreams shows your **manifest URL** and an **Install** button
3. Click **Install** — Stremio opens automatically
4. Click **Install** in Stremio to confirm

### 7. Test it

Open Stremio → search for any movie or show → click it → you should see a list of streams sorted by quality. The stream names show resolution, codec, audio, and file size.

> **Tip:** If no streams appear, check: is your TorBox API key correct? Is TorBox toggled ON in Services? Try a popular title first (e.g. Breaking Bad S01E01).

---

## Updating

Re-import the same template URL from the [Template Directory](https://core-builds.mintlify.app/template-directory). AIOStreams loads the latest version and merges it over your existing config — your API keys and password are preserved.

## Troubleshooting

- **No streams appearing** → Check your API key is correct and TorBox is toggled ON
- **"Regex not allowed" error** → Outdated template. Re-import the latest version
- **Streams load but won't play** → Check the codec for your device. See [Device Profiles](https://core-builds.mintlify.app/device-profiles)
- **Slow results** → Try a Speed or Flash template for cached-only results

More help: [Troubleshooting](https://core-builds.mintlify.app/troubleshooting) · [FAQ](https://core-builds.mintlify.app/faq)
