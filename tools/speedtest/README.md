# CoreSpeed — TorBox CDN Speed Test (engine v3)

A client-side speed test for [TorBox](https://torbox.app)'s Hyperdrive CDN, built into the Core Builds tool suite. Live at `brevitya.github.io/Core-Builds/tools/speedtest/`.

## What it measures, and why the methodology matters

v3 exists because v1/v2 numbers didn't match TorBox's own speedtest — and the audit (`docs`/community reports) showed the difference was methodology, not the CDN:

- **Worker-isolated measurement.** Every byte is counted inside a dedicated Web Worker. The UI can't starve the read loop or cap measured throughput (v2 ran the read loop on the main thread while rebuilding the map/table/canvas every 250 ms).
- **1 GB file, first-byte-anchored window.** Each node gets a 15 s window (10/20 s selectable) measured from the first byte on the 1 GB file, so TCP slow-start is <10 % of the window on any line up to ~700 Mbps. (v2's 10 s cap on the 100 MB file collapsed to ~1 s on fast lines and measured a partial file on slow ones.)
- **Two reps, median.** Rep 2 re-samples the second half of the file via Range. Headline = median of per-rep *steady-state* (window minus the first 2 s) — one throttled rep dilutes instead of defining the result. Rep-to-rep σ is shown as a Consistency column.
- **Honest stats, both shown.** `Steady` (playback number), `Raw avg` = bytes ÷ time-since-first-byte, plus peak, p95, TTFB and ping (5 × 1-byte Range GETs, trimmed mean of the middle 3, 4 s timeout per round — timed, unlike TorBox's own pre-test HEADs).
- **Decimal units** (Mbps = 10⁶ bit/s; MB/s = 10⁶ B/s), with an optional correctly-labelled MiB/s toggle. (The midnight fork reports binary MiB/s labelled "MB/s" — ~4.8 % inflation.)
- **Failed/skipped nodes are never ranked** — they get a labelled "Not ranked" section with the reason.

### Modes

| Mode | What | Data (worst case) | Time (17 nodes) |
|---|---|---|---|
| **Accurate** (default) | Sequential, 1 connection, 2 reps × 15 s on 1 GB, median steady, playback verdicts | ≤ ~2 GB/node; 12 GB budget skips, never truncates | ~9 min slow … ~2 min on Gbps lines (budget-limited to ~6 nodes) |
| **Express** | Closest + top-4-by-ping, 1 rep × 15 s | ≤ 5 GB — always fits | ~90–120 s |
| **Capacity race** | All scoped nodes at once, 1–8 real Range connections each, 20 s, 250 MB–1 GB/node | ~8.5 GB @ 500 MB/node | ~20–30 s |

The capacity race is *real* parallelism (N workers, independent 1/N slices) — TorBox's own "multithreaded" mode is a single TCP connection with 1 MB buffering. Capacity numbers are pipe capacity, never a playback verdict.

## How it gets the CDN list

TorBox's speedtest API (`https://api.torbox.app/v1/api/speedtest`) doesn't send `Access-Control-Allow-Origin`, so the chain is:

1. **`?worker=` override** (your own proxy) — pass `?worker=https://your-proxy.example`
2. **Core Builds worker proxy** — `GET /proxy/v1/api/speedtest?host=…&test_length=…` against `core-builds-cors-proxy.tlorenzato26.workers.dev` (restricted to that one path; see `cloudflare-worker/worker.js` `HOST_SCOPES`)
3. **Direct API call** — kept for the day TorBox opens CORS
4. **Embedded snapshot** — last known node list (date-stamped in the badge), **probed** on load (1-byte Range GET per host); if >20 % are unreachable it retries the live list once, else the badge says `snapshot … · unverified`

TorBox renames nodes occasionally (two in the week before v3 shipped: `store-039`→`store-011` wnam, `nexus-083`→`nexus-244` latm). Refresh the `SNAPSHOT` const with:

```bash
curl -s "https://api.torbox.app/v1/api/speedtest?test_length=short"
curl -s "https://api.torbox.app/v1/api/speedtest?test_length=long"
# merge by region+name into SNAPSHOT.data (url_long from the long list)
```

The nightly CI live test will flag engine/endpoint breakage the day it happens.

## Tests & benchmark

| Command | What | Network |
|---|---|---|
| `node check-syntax.mjs` | Compiles the shipped page's inline script | no |
| `node test-engine.mjs --unit` | 27 pure-logic tests (median, verdicts, units, snapshot, ranking) | no |
| `node test-engine.mjs` | Unit + **live**: runs the shipped worker source against the real CDN (ping protocol, first-byte window, byte-exact Range slices, abort) | ~0.4 GB |
| `node benchmark.mjs [--full] [--rounds N]` | Side-by-side vs **TorBox's actual `speedtest-worker.js`** (fetched fresh) + curl, paired per-round deltas, 2.5 GB budget guard | ~0.5–1.5 GB |

`LIVE_URL=…` overrides the CDN target. CI (` .github/workflows/speedtest-engine.yml `) runs the offline job on every push to this folder and the live job nightly + on demand.

## Architecture

Single self-contained `index.html` (inline CSS + JS, ~139 KB) — matches the suite's other tool pages. Zero build step; shipped by the existing `deploy-configurator.yml` Pages workflow, which copies repo-root `tools/` beside the configurator. The script is structured so everything above the `/* ================= UI SECTION ================= */` marker is DOM-free and unit-tested in Node; the harness extracts and runs the actual shipped `WORKER_SRC`.

No API key, no tracking — everything runs in the browser. Hard 12 GB data budget, instant Stop, per-node caps, background-safe measurement (window cap checked on chunk arrival, immune to tab timer throttling).
