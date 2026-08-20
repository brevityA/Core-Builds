# Core Line for Android & Android TV

A real installable app — phone, tablet, Shield, Google TV, Fire TV.

It is the same Core Line chyron, wrapped in a native shell:

- Fullscreen, no browser chrome
- D-pad / remote works
- Screen stays on
- Shows up under **Apps** on Android TV (`LEANBACK_LAUNCHER`)
- Fetches scoreboards and your RSS feeds itself (no Node server on the TV)

It still does **not** play video.

```
LIVE  TOR 3-2 MTL  ·  TSN4  SN 3
```

## Get the APK

**GitHub Actions:** after the workflow is on the branch, open the run → download the `CoreLine-debug` artifact → sideload `app-debug.apk`.

If this repo cannot store workflow files from the agent, copy `github-workflow-core-line-apk.yml` to `.github/workflows/core-line-apk.yml` and push.

## Add a feed from the phone (TV)

1. On the Stick, Settings → **Add from phone (same Wi-Fi)**
2. Scan the QR or open the address on your phone
3. Paste the RSS URL + the 6-letter code
4. The crawl picks it up. No D-pad typing.

The pair listener only runs while that panel is open.

## Build an APK (Android Studio)

1. Install [Android Studio](https://developer.android.com/studio) (Hedgehog or newer is fine).
2. **Open** this folder: `ticker/android`
3. Let Gradle sync. The `syncWebAssets` task copies the web UI from `ticker/public` + `ticker/lib` into the APK.
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. The file lands at:

```
ticker/android/app/build/outputs/apk/debug/app-debug.apk
```

Rename it `CoreLine.apk` if you want. Sideload that.

Command line, if the SDK is already installed:

```bash
cd ticker/android
./gradlew :app:assembleDebug
```

If `./gradlew` is missing a wrapper JAR, Android Studio will generate it the first time you open the project. Or run **File → Settings → Build Tools → Gradle** and sync.

## Install

### Phone / tablet

- Copy the APK to the device and open it, or `adb install app-debug.apk`

### Android TV / Google TV / Shield

```bash
adb connect 192.168.x.x
adb install -r app-debug.apk
```

Then find **Core Line** in the apps row.

### Fire TV

1. Enable **Apps from Unknown Sources** and ADB (Settings → My Fire TV → Developer Options).
2. Send the APK with [Downloader](https://www.aftvnews.com/downloader/) or:

```bash
adb connect <fire-tv-ip>
adb install -r app-debug.apk
```

## First launch

Settings (⚙ or `S` on a keyboard) → paste the RSS URL from the channel app you already use.

The crawl understands:

```
Team vs team epn, tsn4, sn 3
Maple Leafs vs Canadiens — TSN4, SN 3
```

Ticker-only clock mode: the ▬ button, or `T`.

## What the native shell does

`MainActivity` is a fullscreen WebView. `LineWebClient` serves the bundled UI from APK assets at `https://coreline.local` and proxies `/api/proxy?url=` so ESPN / NHL / MLB / your RSS feeds are fetched on-device — no CORS, no home server.

Private addresses are blocked. The app never plays a stream.

## Min requirements

| | |
|---|---|
| minSdk | 24 (Android 7 / Fire OS 6) |
| targetSdk | 34 |
| Leanback | optional — one APK for phone and TV |
