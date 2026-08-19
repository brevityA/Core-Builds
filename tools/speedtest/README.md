# CoreSpeed — TorBox CDN Speed Test

A client-side speed test for [TorBox](https://torbox.app)'s Hyperdrive CDN, built into the Core Builds tool suite. Live at `brevitya.github.io/Core-Builds/tools/speedtest/` (also linked from the Builder splash → *Utilities*).

## Why the methodology matters (v2)

TorBox's CDN is a mix of direct per-region servers (Lisbon, Mumbai, Tokyo…) and Cloudflare-fronted edge nodes (`store-XXX`). The official TorBox speedtest answers one question: **what does a single connection from your ISP to each node actually get?** It tests nodes **sequentially** (one at a time, so nothing else eats your line), with **one connection** (what a player uses), ~30 s per node, ping = trimmed mean of 5 HEADs, all inside a Web Worker.

CoreSpeed v1 raced all 17 nodes **concurrently with 4 streams each** — fun, but misleading: parallel streams mask latency (a player can't use them), and the concurrent start makes fast-ramping nodes steal bandwidth, so rankings became ramp noise. A supporter in southern Europe could legitimately see *India* win — their ISP routes to Akamai Mumbai well over 4 streams — while real single-connection playback there would buffer. That's exactly the "opposite to the TorBox website" report.

**CoreSpeed v2 fixes this:**

- **Sequential mode (default)** — one node at a time, **one connection**, 10 s cap or file-complete. Same approach as TorBox's own test, ~75–180 s for all 17 nodes. This is the number that matters for playback, and the only mode that produces streaming verdicts.
- **Burst / Quick / Full** are explicitly labeled **multi-stream capacity races** — they show pipe capacity and are fun, but produce no playback verdicts.
- **Ping = trimmed mean of 5 HEADs** (drop best & worst, mean the middle 3) — matching TorBox's site.
- **Verdicts are ping-aware** — a node with >250 ms ping can't earn a "4K" verdict no matter how fast it downloads; >400 ms caps at SD. (Buffering on high-latency routes is real even when throughput looks fine.)
- **Route-anomaly notices** — if a far node wins, the winner banner says so explicitly instead of just crowning it.
- **Topology transparency** — Cloudflare-fronted / edge nodes are badged in the table and legend, because "US West" served from *your* local Cloudflare edge is a different beast from a direct server.
- **Diagnostics export** — the ⛨ button downloads a JSON report (per-node pings, all 5 rounds, DNS A-records, your ISP/ASN, measurement metadata) so supporters can share evidence instead of screenshots.

## What it does

- **Sequential accurate test (default)** — single connection per node, live gauge/sparkline for the current node, ETA, then a ranked table with stability, verdicts, and a winner banner.
- **Capacity races** — Burst (5–20 s/node, N streams), Quick (100 MB file), Full (1 GB file), all nodes at once with live leaderboard.
- **World map** — nodes sized/coloured by measured speed, winner crowned, your location marked (ipwho.is, falls back to your closest CDN).
- **History + compare** — last 15 runs in `localStorage`, Δ-vs-previous columns, load any past run back.
- **Exports** — Markdown report (copy), CSV, JSON, and the diagnostics JSON.
- Hard 12 GB data budget, instant Stop, per-node caps (10 s sequential, 45/90 s quick/full).

No API key, no backend, no tracking — everything runs in the browser.

## How it gets the CDN list

TorBox's speedtest API (`https://api.torbox.app/v1/api/speedtest`) doesn't send `Access-Control-Allow-Origin`, so browsers can't call it directly. CoreSpeed falls back in order:

1. **Core Builds worker proxy** — `GET /proxy/v1/api/speedtest?host=https://api.torbox.app&test_length=short` against the suite's Cloudflare Worker. **Live since 19 Aug 2026** — no allowlist edit or redeploy is needed any more, and it was verified against the running worker rather than assumed.
2. **Direct API call** — kept for the day TorBox opens CORS; harmless when it fails.
3. **Embedded snapshot** — the last known node list (date-stamped in the badge). Results still measure real files on real nodes; only the *directory* can go stale if TorBox renames nodes — they do rename occasionally (e.g. `store-039` replaced `nexus-125`), so refresh the snapshot when the badge date is old.

If you host your own worker instance, pass it with `?worker=https://your-proxy.example`.

### How narrow that lane is

The generic proxy accepts GET/POST/PATCH on any path and forwards a caller-supplied
`Authorization` header, which the WuPlay device-token lane depends on. Applied to a
third-party API where users hold their own account keys, that would make the worker an
authenticated relay for the whole of TorBox. `HOST_SCOPES` in `cloudflare-worker/worker.js`
therefore restricts this host to `GET /v1/api/speedtest` and strips credentials; four tests
in `worker.test.js` hold it shut, and the deployed worker returns
`path not allowed for this host` / `method not allowed for this host` for anything else.

Deployment is automatic — `.github/workflows/deploy-worker.yml` fires on any push to `main`
touching `cloudflare-worker/**`. Note that workflow reports success even when it *skips* the
deploy because secrets are unset, so a green tick alone does not prove anything shipped:
check that the "Deploy to Cloudflare Workers" step actually ran.

## Keeping the snapshot fresh

The embedded snapshot lives in `tools/speedtest/index.html` (`SNAPSHOT` const). Refresh it with the output of:

```bash
curl -s "https://api.torbox.app/v1/api/speedtest?test_length=short"
curl -s "https://api.torbox.app/v1/api/speedtest?test_length=long"
```

(merge by region+name; see the `SNAPSHOT.data` shape in the file).

## Architecture

Single self-contained `index.html` (inline CSS + JS, ~115 KB) — matches the suite's other tool pages (genies, inspector, preflight). Zero build step; shipped by the existing `deploy-configurator.yml` Pages workflow, which copies repo-root `tools/` beside the configurator.

**Measurement engine:** ping phase (5× HEAD per node, concurrent) → sequential single-stream phase or concurrent multi-stream race. Byte counting happens in the fetch read loop (`performance.now()`-deltas, not timer-based), a 250 ms sampler drives the UI (gauge, spark, table), first-interval baselines exclude connection-setup buffering, stability = 1 − σ/μ over post-slow-start samples, sustained = bytes ÷ active time. Every async path captures its run object so a stale timer can never corrupt a newer run.
