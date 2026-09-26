# Stadium sync

A venue bridge for [Core Line](https://github.com/brevityA/CoreBuildsApps). It reads the scoreboard in the building and publishes the game in the shape Core Line already crawls.

It does not play video. It does not ship a league feed. The console, or a volunteer on the manual pad, is the source.

```bash
cd packages/stadium-sync
node server.mjs
```

| Surface | URL |
|---|---|
| Operator pad | `http://<gym-ip>:8792/` |
| Full-screen bug for the gym TV | `http://<gym-ip>:8792/display` |
| Layout mocks (not the shipping ticker) | `http://<gym-ip>:8792/mocks` |
| Feed to paste into Core Line | `http://<gym-ip>:8792/coreline.json` |

Node 20+. No npm install. `npm test` runs the decoder, feed, and HTTP checks.

The gym bug patches score and clock in place. It does not rebuild the page on each poll, and the crawl does not carry the ticking clock. The operator page and the gym bug use the suite tokens already in Icon Pack and Core Shift: night `#0D1117`, signal cyan `#00D4FF`, ink `#E6EDF3`, muted `#8B949E`, cyan CTA with dark ink, ghost buttons, and a mono kicker. Scores use the same Barlow Condensed and Outfit files Core Line ships (OFL). Live red is Core Line's broadcast state, not a second brand colour.

## What it accepts

- **Manual pad** on the operator page. Enough for a youth game with no controller.
- **Daktronics All Sport 5000 RTD.** 19200 8N1, frames `0x16` … `0x17`, packet prefix `004210`. Point a serial-to-Ethernet adapter at `udpPort` / `tcpPort` in the config, or `POST` the raw frame to `/api/ingest/<board>/rtd`. Field offsets follow the public maps in [daktronics-allsport-5000-rs](https://github.com/zabackary/daktronics-allsport-5000-rs) for basketball, football, hockey, lacrosse, volleyball, and soccer. Calibrate on a real console before a championship night — those maps are transcribed, not an official Daktronics SDK.
- **Sportzcast / ScoreLink JSON.** The [shared sport contract](https://docs.sportzcast.net/public/data-integration/mqtt-json-contracts/base-contract-reference/) (`HomeTeamName`, `GuestScore`, `Clock`, `ClockStatus`, `EventId`, …). POST it to `/api/ingest/<board>?format=sportzcast`. A local ScoreConnect on TCP 1402 can be set as `sportzcast.host`; the bridge sends the documented `JB` command and backs off at least 10 seconds. MQTT itself is not bundled — post the JSON your broker already delivers.
- **Any other controller** (Fair-Play, OES, Nevco, a school app):

```json
{
  "guest": "Riverside",
  "home": "Oak Hill",
  "guestScore": 18,
  "homeScore": 21,
  "clock": "3:12",
  "period": "Q2",
  "running": true,
  "status": "live"
}
```

Copy `stadium.config.example.json` to a path of your choosing and start with `STADIUM_CONFIG=./stadium.config.json node server.mjs`.

## Security

With no token, score pushes are accepted only from LAN peers. Set `STADIUM_TOKEN` before this process is reachable from the internet, and send `Authorization: Bearer <token>`. Do not port-forward it open.

`GET /coreline.json` is intentionally readable. A gym score is not a secret. Changing the score is.

## Core Line 1.3.0 will refuse a raw LAN URL

`SafeUrl.kt` and `lib/ssrf.mjs` block `10.x`, `192.168.x`, and `172.16–31`. That guard is right for arbitrary RSS. It also blocks the gym.

What works tonight, without an APK change:

1. Open `/display` in the gym TV's browser. That is the in-venue bug. It does not go through Core Line's proxy.
2. Pair a **hostname** into Core Line, not a raw private IP. The shipping check looks at the host string, not the address it resolves to. A split-horizon name such as `http://scoreboard.riverside.edu:8792/coreline.json` is accepted; `http://192.168.1.20:8792/coreline.json` is not.

The allowlist the app should grow is `classifyFeedUrl()` in `lib/lan.mjs`: public feeds stay public-only, a paired stadium host is allowed, `169.254.169.254` is never allowed.

Core Line's fastest refresh is 15 seconds. This bridge projects a running clock at request time and stamps `HELD` after 20 seconds of silence, so a dead console does not keep counting on the crawl.

## Tests

```bash
cd packages/stadium-sync && npm test
```
