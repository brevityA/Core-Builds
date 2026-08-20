# Core Line — mass handover

Copy this file into the next repo or paste it as the first message to the next agent. It is enough to continue without the original chat.

---

## 30-second brief

**Product:** Core Line — a TV-first sports & channel *ticker* (chyron). Not a player. Not a playlist. Not streams.

**The line it exists to render:**

```
LIVE  TOR 3-2 MTL  ·  TSN4  SN 3     ◆     LAL vs BOS  7:00 PM  ·  ESPN
```

**Origin:** A Core Builds supporter asked for the app missing for ~15 years: an RSS Android/TV ticker. Channel-list apps already *publish* the slate. Kodi used to crawl it. Nothing on Android / Android TV still does. The supporter’s example, treated as a first-class test:

```
Team vs team epn, tsn4, sn 3
```

`epn` → ESPN. `tsn4` → TSN4. `sn 3` → SN 3.

**Current home (until you move it):**

| | |
|---|---|
| Source repo | `brevityA/Core-Builds` |
| Branch | `arena/01a01a36-core-builds` |
| HEAD when written | `9e087f0` |
| PR | https://github.com/brevityA/Core-Builds/pull/705 |
| Folder to lift | `ticker/` (self-contained — Node 20+, zero npm deps) |

To start a **new repo**, copy the entire `ticker/` directory. It does not depend on the rest of Core Builds at runtime.

---

## Locked product decisions (do not reopen unless the owner says so)

These were decided in a structured Q&A. Treat them as requirements.

| Decision | Choice |
|---|---|
| What we are finishing | **Android/TV v1** — installable app is the product |
| Surfaces | **Phone and TV equally** — one APK, one responsive UI, both must work |
| Done looks like | **Sideload APK** for Fire Stick / Shield. Not Play Store. |
| Feeds | **Public scoreboards + user-pasted RSS only.** No bundled pirate / IPTV sources. Ever. |
| Add-feed on TV | **Same-Wi-Fi QR / IP form.** Owner will not type a URL with a Fire remote. |
| Phone layout | **One responsive UI.** Don’t build a separate phone app. Make it tappable and focusable. |
| First 3 seconds | **Open → slate is already crawling.** Never a blank first screen. Never a settings wall. |
| Pair network | Phone is on the **same Wi-Fi** as the Stick. No cloud relay. |
| APK delivery | **GitHub Actions artifact.** If the agent cannot push workflow files, owner will add the YAML. |

**Hard no:** this app does not play video, does not ship streams, does not bundle channel-list apps’ pirate sources. It is a TV *guide*. The user pastes their own RSS.

---

## What already exists

### Web ticker (works today)

```bash
cd ticker
node server.mjs          # http://0.0.0.0:8787
npm test                 # 23 tests, node:test, no deps
```

- 10-foot board + ESPN-style bottom crawl
- Ticker-only clock mode (`T`)
- Settings: feeds, leagues, speed, favorites, theme, 12/24h, keep-awake
- Sample RSS at `public/feeds/sample-sports.xml` so the crawl is never empty
- Demo slate if ESPN/NHL/MLB are unreachable (labeled in the subtitle)
- PWA manifest + service worker (web only; disabled in the native shell)

### Android / TV shell (source complete, APK not produced in the last sandbox)

`ticker/android/` — Kotlin, `minSdk 24`, `targetSdk 34`, `applicationId dev.corebuilds.line`.

- One APK, `LAUNCHER` + `LEANBACK_LAUNCHER`
- Fullscreen WebView, no browser chrome
- Serves bundled UI from assets at `https://coreline.local`
- On-device HTTP proxy `/api/proxy?url=` so ESPN / NHL / MLB / user RSS skip CORS
- Same-Wi-Fi pair server on port **8791** (QR + 6-letter code)
- Keep-awake honors the in-app toggle via `CoreLineNative.setKeepAwake`
- Gradle `syncWebAssets` copies `ticker/public` + `ticker/lib` into `app/src/main/assets/www` on every build
- `gradle-wrapper.jar` is **missing** — Android Studio generates it, or CI installs Gradle 8.7 directly

### Parser / scoreboard (shared JS, isomorphic)

| Module | Job |
|---|---|
| `lib/parser.mjs` | RSS / Atom / JSON / free-text → events. `Team vs team epn, tsn4, sn 3` is a unit test. |
| `lib/channels.mjs` | Alias table + peel/split. Do not treat prose or league words as channels. |
| `lib/teams.mjs` | Leafs → TOR, Lakers → LAL, etc. |
| `lib/scoreboard.mjs` | ESPN / NHL / MLB adapters + `buildDemoSlate()` + merge |
| `lib/client-slate.mjs` | Browser/WebView assembly. Native shell uses `/api/proxy`. |
| `lib/rss.mjs` | Node fetch + size/timeout (uses `Buffer` — **do not import in the browser**) |
| `lib/ssrf.mjs` | http(s) only, block private hosts. IPv6 unique-local check **only if host contains `:`** (facebook.com was falsely blocked). |

Normalized event shape:

```js
{
  id, source, league, status, // 'live' | 'upcoming' | 'final'
  start, detail,
  away: { name, abbr, score, logo, winner } | null,
  home: { name, abbr, score, logo, winner } | null,
  channels: ['TSN4', 'SN 3'],
  headline, rawTitle, feed, venue
}
```

---

## Architecture

```
                    ┌─ web ─────────────────────────────────────────┐
                    │  browser  →  GET /api/slate  →  Node server   │
                    │             (proxies ESPN + user RSS, SSRF)   │
                    └───────────────────────────────────────────────┘

                    ┌─ Android / TV ────────────────────────────────┐
                    │  WebView loads https://coreline.local/index.html?native=1[&tv=1]
                    │  LineWebClient serves assets from APK
                    │  JS buildClientSlate() → GET /api/proxy?url=
                    │  Kotlin HttpURLConnection fetches ESPN / RSS
                    │  PairServer :8791  ← phone browser on LAN
                    └───────────────────────────────────────────────┘
```

Native detection:

- Query `?native=1` and/or `window.CORELINE_NATIVE`
- Query `?tv=1` and/or `window.CORELINE_TV` (leanback / Fire TV feature)
- JS bridge object: `window.CoreLineNative` (`startPair`, `stopPair`, `takeInbox`, `setKeepAwake`)

Settings persist in `localStorage` key `coreline.v1`. Last slate cached as `coreline.v1.slate`.

---

## File map

```
ticker/
  HANDOVER.md                 ← this file
  README.md
  package.json                ← start / test only
  server.mjs                  ← static + /api/health|leagues|scoreboard|rss|slate
  lib/                        ← shared parsers (also copied into APK assets/www/lib)
  public/                     ← web UI
    index.html
    css/app.css
    js/app.js state.js tv.js
    feeds/sample-sports.xml
    icon.svg  icons/  manifest.webmanifest  sw.js
  tests/                      ← node --test
  android/                    ← Android Studio project root
    README.md
    github-workflow-core-line-apk.yml   ← COPY to .github/workflows/
    app/src/main/java/dev/corebuilds/line/
      MainActivity.kt
      LineWebClient.kt        ← asset server + proxy
      LineBridge.kt           ← JS interface
      PairServer.kt           ← LAN add-feed
      SafeUrl.kt              ← SSRF for proxy + pair POST
```

Repo-level mentions (only if staying inside Core-Builds): `README.md` folder table, `ROADMAP.md` ideas row, `tools/index.html` card.

---

## How to run / test / build

**Web**

```bash
cd ticker
node server.mjs          # PORT=8787 HOST=0.0.0.0
npm test
```

Keys: D-pad move · Enter select · `S` settings · `T` ticker-only · `R` refresh · `F` fullscreen.

**Android Studio**

1. Open `ticker/android`
2. Let Gradle sync (creates wrapper JAR if missing)
3. Build → Build APK(s)
4. Output: `ticker/android/app/build/outputs/apk/debug/app-debug.apk`

**CI APK (owner action required)**

This sandbox’s GitHub App **cannot push** `.github/workflows/*` (`workflows` permission denied). The YAML is ready at:

```
ticker/android/github-workflow-core-line-apk.yml
```

Copy it to `.github/workflows/core-line-apk.yml` and push. Then Actions → **Core Line APK** → download `CoreLine-debug`.

Sideload:

```bash
adb connect <tv-ip>
adb install -r app-debug.apk
```

Fire TV: unknown sources + Downloader also works.

---

## Add-feed on TV (implemented)

1. Stick: Settings → **Add from phone (same Wi-Fi)**
2. Pair server binds `0.0.0.0:8791`, shows QR (`api.qrserver.com`) + URL + 6-char code
3. Phone on same LAN opens the URL, pastes RSS + code, POST
4. JS polls `CoreLineNative.takeInbox()` every 1s and calls `addFeed()`
5. Closing settings / **Stop pairing** shuts the listener

Pair box is hidden on the web (`isNativeShell()` false).

---

## Legal / safety (non-negotiable)

- **No stream URLs. No IPTV playlists. No bundled pirate feeds.**
- User-pasted RSS is allowed; we only display titles + channel names.
- Proxy and pair POST run `SafeUrl`: http(s) only, block localhost / RFC1918 / link-local / metadata.
- IPv6 unique-local (`fc` / `fd` / `fe80`) must be applied **only when the host contains `:`**. A previous bug blocked `facebook.com`.
- Pair server: code-gated POST, no proxy on that port, only while the panel is open.
- Pair HTML escapes label / reason text.

---

## Known leftover bugs / debt

Fix these before calling v1 done.

1. **`refreshGen` is declared in `app.js` but the guard is not applied** in `refresh()`. Overlapping 60s / manual / league-toggle refreshes can apply a stale slate. Re-add `const gen = ++refreshGen` and bail if `gen !== refreshGen` after each `await`.
2. **No APK has been built in this environment.** Last sandbox had no JDK/SDK; Debian mirrors and some HTTPS endpoints were blocked. You must produce the APK (Studio or the workflow).
3. **`gradle-wrapper.jar` is not in git.** `./gradlew` locally prints a hint and exits 1 until Android Studio or `gradle wrapper --gradle-version 8.7` generates it. CI YAML installs Gradle 8.7 and runs `gradle` directly — that path does not need the jar.
4. **QR image depends on `api.qrserver.com`.** If that CDN fails, the big URL + code still work; the `<img>` hides on error. A local QR encoder would be more robust on a Stick.
5. **Pair POST body** relies on `Content-Length`. Fine for the phone form we ship; don’t assume chunked encoding.
6. **ES modules + Fire OS 6 WebView** is a risk. Document Fire OS 7+ / current Android System WebView. minSdk is 24 for install, not a guarantee of modules.
7. **First paint uses `buildDemoSlate()`** then `refresh()` upgrades. If live ESPN returns a real (possibly empty off-season) slate, demo goes away. Sample feed is on by default so the crawl should stay populated.
8. **Ticker tests are not in Core-Builds `supporting-js-ci.yml`.** Adding them requires a workflow edit (same permission issue). In a new repo, add `cd ticker && npm test` to CI immediately.
9. **Google Fonts** (Barlow Condensed, Outfit) are loaded from the network. Fallbacks exist. Fine if offline; looks better online.

---

## Tests that must stay green

```bash
cd ticker && npm test
```

Must include:

- `Team vs team epn, tsn4, sn 3` → ESPN, TSN4, SN 3
- Maple Leafs vs Canadiens + TSN4 / SN 3 / RDS / SN ONT
- Prose descriptions are **not** channels
- League word next to `SN ONT` is **not** a channel
- `facebook.com` / `flickr.com` are **allowed** feed hosts
- localhost / 10.x / 169.254 / `file:` blocked
- Demo slate always has TOR vs MTL on TSN4, SN 3, RDS

Do not “simplify” the parser in a way that breaks the supporter line.

---

## Suggested first tasks in the new repo

In order:

1. Copy `ticker/` in. `npm test`. `node server.mjs`. Confirm the crawl.
2. Add CI: `node --test tests/*.test.mjs` + the APK workflow YAML under `.github/workflows/`.
3. Apply the `refreshGen` guard in `public/js/app.js`.
4. Open `android/` in Android Studio **or** run the APK workflow. Sideload onto a Stick.
5. On device: first launch crawls → Settings → Add from phone → paste a harmless public RSS → confirm it appears.
6. Only then: polish, themes, more leagues, local QR encoder.

Do **not** start with a native Kotlin rewrite of the board. The WebView + shared JS parser is the product.

---

## Owner / brand

- Project: Core Builds by Brevity (`brevityA`)
- Look: midnight `#07090d`, accent `#00d4ff`, live `#ff2d55`, condensed score type
- Icon: hex + red pip + `VS` (see `public/icon.svg` and `public/icons/core-line-icon.png`)
- Community: the same living-room crowd as the AIOStreams templates. This is adjacent, not a template.

---

## Prompt to paste to the next agent

```
You are continuing Core Line. Read ticker/HANDOVER.md first. Do not reopen
locked decisions. Do not add streams or pirate sources.

Product: Android/TV sports + channel ticker. Team vs Team · ESPN, TSN4, SN 3.
Sideload APK. Public scoreboards + user-pasted RSS only. Same-Wi-Fi QR to add
feeds on a Fire Stick. First launch already crawling.

Immediate work:
1. Confirm `cd ticker && npm test` is green
2. Fix refreshGen guard in public/js/app.js
3. Land the APK workflow (copy android/github-workflow-core-line-apk.yml
   to .github/workflows/core-line-apk.yml) and produce a debug APK
4. Sideload-ready README stays accurate

Hard no: video playback, IPTV playlists, bundled illegal sources.
```

---

*Handover written 2026-08-20 against Core-Builds `arena/01a01a36-core-builds` @ `9e087f0`.*
