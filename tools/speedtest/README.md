# CoreSpeed — TorBox CDN Speed Test

A client-side speed test for [TorBox](https://torbox.app)'s Hyperdrive CDN, built into the Core Builds tool suite. Live at `brevitya.github.io/Core-Builds/tools/speedtest/` (also linked from the Builder splash → *Utilities*).

## What it does

- **Races every TorBox CDN node at once** — latency first (3× HEAD pings per node), then sustained multi-stream downloads from TorBox's real test files (`100MB.bin` / `1GB.bin`).
- **Live leaderboard** — every region downloading simultaneously, re-ranked in real time with per-node speed bars, max, and status.
- **Speedometer + aggregate chart** — animated log-scale gauge, digital readout, and a 60 s throughput sparkline.
- **World map** — nodes sized and coloured by measured speed, winner crowned, your approximate location marked (via `ipapi.co`, falls back to your closest CDN).
- **Streaming verdicts** — each region gets a "what can this node actually stream for you" callout (4K Remux → SD) computed with 15% headroom.
- **History + compare** — last 15 runs in `localStorage`, Δ-vs-previous columns, load any past run back into the results view.
- **Exports** — copy a Markdown report, or download CSV / JSON.
- **Modes** — Burst (5–20 s per node), Quick (100 MB file), Full (1 GB file) · 1–8 streams per node · scope: all / closest-8 / closest-only · hard 12 GB data budget · instant Stop.

No API key, and no Core Builds backend, account, or analytics — measurement runs
entirely in your browser and results stay in `localStorage`.

Two requests do leave your machine besides the CDN downloads themselves, and both
disclose your IP address to a third party the same way any web request does:

- **`ipapi.co`** — called once to place your approximate location on the map. Skip
  it by declining, or ignore the map; CoreSpeed falls back to your closest CDN node.
- **The Core Builds worker proxy** — used only to fetch the public CDN list, because
  TorBox's API sends no CORS header. It forwards one `GET /v1/api/speedtest` and
  nothing else, never receives a credential, and logs no request contents.

## How it gets the CDN list

TorBox's speedtest API (`https://api.torbox.app/v1/api/speedtest`) doesn't send `Access-Control-Allow-Origin`, so browsers can't call it directly. CoreSpeed falls back in order:

1. **Core Builds worker proxy** — `GET /proxy/v1/api/speedtest?host=https://api.torbox.app&test_length=short` against the suite's Cloudflare Worker (`core-builds-cors-proxy.tlorenzato26.workers.dev`). **Requires the worker redeploy below** — until then this 403s.
2. **Direct API call** — kept for the day TorBox opens CORS; harmless when it fails.
3. **Embedded snapshot** — the last known node list (17 nodes, date-stamped in the badge). Results still measure real files on real nodes; only the *directory* can go stale if TorBox renames nodes.

## Deploying the worker change

`cloudflare-worker/worker.js` gained one allowlist entry — `https://api.torbox.app` (read-only GET endpoint):

```bash
cd cloudflare-worker
npx wrangler deploy          # or: npm run deploy, per the worker README
```

If you host your own worker instance instead, pass it to the page with `?worker=https://your-proxy.example`.

## Keeping the snapshot fresh

The embedded snapshot lives in `tools/speedtest/index.html` (`SNAPSHOT` const) and is only used when both live sources fail. Refresh it by re-generating the page from `_build/` sources (see git history) or by hand-editing the `SNAPSHOT` array with the output of:

```bash
curl -s "https://api.torbox.app/v1/api/speedtest?test_length=short"
```

## Architecture

Single self-contained `index.html` (inline CSS + JS, ~100 KB) — matches the suite's other tool pages (genies, inspector, preflight). Zero build step; shipped by the existing `deploy-configurator.yml` Pages workflow, which copies repo-root `tools/` beside the configurator.

**Measurement engine:** per node, `streams` parallel `fetch()` readers accumulate bytes; a 250 ms sampler computes per-node instantaneous Mbps (EWMA for display), aggregate throughput, and rolling samples for stability (1 − σ/μ) and sparklines. Sustained speed = total bytes ÷ active time per node. The 12 GB budget and per-mode caps (45 s quick / 90 s full) abort everything gracefully via `AbortController`, and every async path captures its run object so a stale timer can never corrupt a newer run.
