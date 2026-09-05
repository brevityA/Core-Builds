# Core Builds — AIOStreams Template Benchmark Harness

A controlled, reproducible comparison of competitor AIOStreams templates and
alternative add-on combinations **against the current Core Builds templates
(the control)**, run on real stream results.

The output is `reports/TEMPLATE-BENCHMARK.md` plus sanitized raw snapshots under
`reports/benchmark-snapshots/`.

> **Nothing in this directory modifies the control templates.** Experimental
> variants are produced in memory at run time from a single-variable mutation
> declared in `contenders.json`; the JSON files in `Templates/` are read-only
> inputs.

---

## Contents

| File | What it is |
|---|---|
| `corpus/corpus-v1.json` | The fixed 30-title corpus (versioned data). |
| `corpus/corpus-v1.verified.json` | Generated: each ID verified live against Cinemeta. |
| `verify_corpus.py` | Verifies every corpus ID/title/year resolves. No credentials needed. |
| `contenders.json` | Control templates, community challengers (with citations), and single-variable variants. |
| `runner.py` | Installs each contender, queries every corpus title, snapshots the full raw result list. |
| `score.py` | Scores the rubric from the snapshots and emits the leaderboard. |
| `spotcheck.py` | Playback-headroom probe on the #1 result for a stratified subset. |
| `.env.example` | Credential template. Copy to `.env` (gitignored). |

---

## Measurement surface (verified against AIOStreams v2.34.0)

AIOStreams exposes a configured addon over the Stremio addon protocol. The
harness talks to exactly these endpoints:

| Purpose | Endpoint |
|---|---|
| Instance version / channel / commit | `GET {instance}/api/v1/status` |
| Create a config (returns `uuid` + `encryptedPassword`) | `POST {instance}/api/v1/user` with `{ config, password }` |
| Update an existing config | `PUT {instance}/api/v1/user` (Basic auth) |
| Movie streams | `GET {instance}/stremio/{uuid}/{encryptedPassword}/stream/movie/{imdbId}.json` |
| Series streams | `GET {instance}/stremio/{uuid}/{encryptedPassword}/stream/series/{imdbId}:{season}:{episode}.json` |

Route shapes confirmed in `packages/server/src/app.ts`
(`app.use('/api/v1', apiRouter)`, `app.use('/stremio/:uuid/:encryptedPassword…')`),
`packages/server/src/routes/api/user.ts`, and
`packages/server/src/routes/stremio/stream.ts` at tag `v2.34.0`
(<https://github.com/Viren070/AIOStreams>).

**Why the harness sends `User-Agent: AIOStreams/...`:** the server only attaches
the rich `streamData` object (service + cache flag, `parsedFile` resolution /
quality / audio / language / season / episode, torrent infohash and seeders,
regex and SEL scores, addon name, size, duration) when `provideStreamData` is
on, and its default behaviour is to enable it for user-agents containing
`AIOStreams/` (`routes/stremio/stream.ts`, `transformers/stremio.ts` @ v2.34.0).
Without that header the snapshot degrades to name/description text only and the
junk/dedup/rank scores lose most of their evidence. If your instance sets
`API_PROVIDE_STREAM_DATA=false`, the run is still valid but the scorer falls
back to filename parsing — note it in the report.

---

## Controlled conditions

The rubric is only meaningful if the following hold, and the runner enforces or
records each one:

| Condition | How it is held |
|---|---|
| Same instance | Single `AIOS_INSTANCE_URL`; version/tag/commit read from `/api/v1/status` and written into every run manifest. |
| Same debrid account | One lane key from the env file, injected into every contender's config; **all other services are force-disabled** in `apply_lane()`. |
| Same corpus | `corpus-v1.json`, version-pinned in the manifest. No per-contender title selection. |
| Same time window | All contenders installed up front, then repeats loop `repeat → contender → title` so lanes are **interleaved**, not run back to back. |
| ≥3 repeats | `--repeats` defaults to 3; the runner warns and the scorer marks the run incomplete below that. |
| Rate limits | Serial requests only, `--delay` (default 1.5 s) between every stream call and `--contender-pause` (default 10 s) between contenders. No concurrency, no retries storm. |
| Failures ≠ zeros | An install failure or HTTP error is stored with `status: "error"` and `result_count: null`; the scorer excludes it from means and counts it in the `failures` column. |

---

## Credentials and sanitisation

* All secrets live in `tools/benchmark/.env`, which is **gitignored**. Nothing
  reads credentials from anywhere else.
* Every snapshot passes through `Sanitizer` before it is written to the
  committed file: known secret values are replaced literally, and any
  `apiKey` / `token` / `password` / `credentials` / `uuid` /
  `encryptedPassword` / `url` key, UUID, JWT, or `key=value` query secret is
  redacted by pattern.
* Playback URLs are credentialed debrid links, so they are redacted from the
  committed snapshot and kept only in a `*.local.json` sidecar next to it —
  also gitignored — so `spotcheck.py` can probe them locally.
* Before committing evidence, sanity-check:
  `grep -rIl -e "$TORBOX_API_KEY" reports/benchmark-snapshots || echo clean`

---

## Reproducing a run

```bash
cd /path/to/Core-Builds
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # harness itself is stdlib-only

# 1. credentials
cp tools/benchmark/.env.example tools/benchmark/.env
$EDITOR tools/benchmark/.env
set -a; . tools/benchmark/.env; set +a

# 2. verify the corpus still resolves (no credentials needed)
python3 tools/benchmark/verify_corpus.py

# 3. see the plan without touching the network
python3 tools/benchmark/runner.py --lane torbox --dry-run

# 4. run it (30 titles x N contenders x 3 repeats, serialised — budget hours)
python3 tools/benchmark/runner.py --lane torbox --repeats 3

# 5. score + leaderboard
python3 tools/benchmark/score.py --run reports/benchmark-snapshots/run-<id> --markdown

# 6. playback headroom on >=10 top results
python3 tools/benchmark/spotcheck.py --run reports/benchmark-snapshots/run-<id> --n 10
```

Secondary lanes (e.g. AllDebrid) are separate runs with `--lane alldebrid`; each
lane gets its own leaderboard because debrid cache contents are not comparable
across accounts.

### Runtime budget

30 titles × 3 repeats × 1.5 s delay = ~2.3 min of pure delay per contender per
lane, plus real scrape latency (typically 5–20 s per title for a full multi-addon
config). Expect **roughly 30–90 minutes per contender for a 3-repeat run**.
Plan the whole sweep inside one window; if you must split it, split at a repeat
boundary and record it.

---

## Rubric

Scored automatically by `score.py` from the raw snapshots.

**Coverage**
* `cov_any_cached` — % of corpus titles with ≥1 cached result.
* `cov_cached_4k` / `cov_cached_1080p` — % with a cached 2160p / 1080p option.
* `mean_playable` — mean count of non-error, non-junk results per title.

**Rank correctness**
* `rank_tier_ok_pct` — is the #1 result the profile's stated tier? For a 4K
  profile: the top result is 2160p, *or* no 2160p existed in the list at all
  (so a genuinely 4K-less title is not scored as a failure).
* `rank_cache_ok_pct` — cache-first ordering: no uncached result ranked above
  any cached one.
* Bitrate-cap adherence — the #1 result's measured bitrate (`size*8/duration`)
  against the template's `bitrate.resolution` band, reported per snapshot.

**Junk rate** (`junk_pct`) — % of results flagged by filename/`parsedFile`
parsing against the corpus fixture: cam/telecine/screener, mislabeled resolution
(declared vs filename), non-matching title, wrong season/episode, wrong
language. Each flag carries a reason string in the snapshot score.

**Dedup** (`dup_pct`) — % of rows repeating an infohash or filename already seen
in the same result list.

**Speed** — `ttfl_ms` is time-to-full-list, measured directly. Time-to-first-
result is **not** separately measurable from this endpoint: AIOStreams returns
one aggregated JSON body, so first-result and full-list coincide at the protocol
level. Any TTFR figure must come from instance-side timing logs; the harness
does not invent one.

**Playback headroom** — `spotcheck.py`, method documented in its docstring and
in the report.

---

## Adding a contender

Append to `contenders.json`:

* **Community challenger** — `source: "url"` (or `"local"` for an in-repo
  community build) and a `citation`. No citation, no entry.
* **Single-variable variant** — `variant_of`, a human-readable
  `single_variable` string, and exactly one `mutation`. Supported ops:
  `set` (JSON-pointer), `add_preset`, `remove_preset`, `demote_sort_key`.
  Two changes in one variant makes the win unattributable — split it.
