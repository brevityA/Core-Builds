# Core Builds — AIOStreams Template Benchmark

**Status: Phase 0 complete and validated. Phases 1–3 are BLOCKED on inputs.**

The harness is built, self-tested, and ready. The leaderboard below is empty on
purpose: no AIOStreams instance URL, debrid lane, or API key was supplied, so
**zero live stream requests have been made**. Publishing scores here without
having run them would be exactly the fabrication this benchmark exists to
prevent.

| Input | Value |
|---|---|
| Test instance | **NOT SUPPLIED** — `[USER TO SUPPLY: AIOStreams instance URL]` |
| Debrid credentials | **NOT SUPPLIED** — `[USER TO SUPPLY: lane + API key]` |
| Primary lane | TorBox (assumed default; not yet exercised) |
| Live runs completed | **0** |
| Snapshots captured | **0** live · 2 static config-profile artifacts |

Everything below marked **[PENDING RUN]** fills in automatically once the run
executes. Everything not so marked is verified fact, produced offline from this
repository and from live source inspection of AIOStreams.

---

## 0. Provenance and knowledge cutoff

My training data has a cutoff in early 2025. **Every claim in this document
about AIOStreams' API, endpoint shapes, or version was verified live on
2026-09-05**, not recalled. Claims about the Core Builds templates were read
directly out of this checkout at commit `524458b`.

| Fact | Verified how | Date |
|---|---|---|
| Latest AIOStreams release is **v2.34.0** (published 2026-09-04) | GitHub Releases API, `Viren070/AIOStreams` | 2026-09-05 |
| API is mounted at `/api/v{API_VERSION}`; Stremio routes at `/stremio/:uuid/:encryptedPassword/...` | Read `packages/server/src/app.ts` @ tag `v2.34.0` | 2026-09-05 |
| `POST /api/v1/user` takes `{config, password}`, returns `{uuid, encryptedPassword}` | Read `packages/server/src/routes/api/user.ts` @ `v2.34.0` | 2026-09-05 |
| Streams served at `GET /stremio/{uuid}/{encPw}/stream/{type}/{id}.json` | Read `packages/server/src/routes/stremio/stream.ts` @ `v2.34.0` | 2026-09-05 |
| Rich per-stream metadata (`streamData`) is attached only when `provideStreamData` is on, defaulting to user-agents containing `AIOStreams/` | Read `routes/stremio/stream.ts` + `packages/core/src/transformers/stremio.ts` @ `v2.34.0` | 2026-09-05 |
| Corpus IMDb IDs resolve to the expected titles/years | Cinemeta `v3-cinemeta.strem.io/meta/...` spot-verified for 6 of 30 entries | 2026-09-05 |

### 0.1 Re-verification against upstream `main` (2026-09-06)

Re-checked one day later, because v2.34.0 was only two days old when the harness
was pinned to it and a fast-moving upstream could have invalidated the
measurement surface.

| Check | Result |
|---|---|
| Latest stable release | **still v2.34.0** — no newer stable |
| `main` vs `v2.34.0` | **`status: identical`, ahead_by 0** — the release commit `e694b6ac` *is* the head of `main` |
| Nightly channel | Last nightly `2026.09.04.2319-nightly`, same timestamp as the stable cut — no post-release nightly drift |
| `API_VERSION` | `const API_VERSION = 1` → `/api/v1` mount is correct |
| Stremio route mounts | `app.use('/stremio', …)` and `/stremio/:uuid/:encryptedPassword${VARIANT_PATH_ROUTE}` unchanged |
| `provideStreamData` UA sniff | Unchanged: falls back to `user-agent?.includes('AIOStreams/')` when `appConfig.api.provideStreamData` is `null` |
| Series id shape | `IdParser` still uses named `season`/`episode` capture groups → `tt…:S:E` holds |

**Conclusion: the harness needs no changes.** Every endpoint and behaviour it
depends on is byte-identical to what was verified on 2026-09-05.

#### Open upstream PRs that would affect this benchmark if merged

None are merged, so none affect the pinned run — but three are worth watching,
and the run manifest records the live instance version precisely so a mid-flight
upstream bump is detectable rather than silent.

| PR | Effect on the benchmark |
|---|---|
| [#1266](https://github.com/Viren070/AIOStreams/pull/1266) `feat: adaptive resolution floor` | **Directly targets the H2 mechanism.** Adds an opt-in `adaptiveResolutionFloor` flag: if *no* stream meets `requiredResolutions`, the filter is relaxed instead of returning an empty list. If this lands and is enabled, H2's "empty list" failure mode disappears and the recommended fix changes from "relax the filter" to "enable the flag". Opt-in, so a default-config run is unaffected. |
| [#1265](https://github.com/Viren070/AIOStreams/pull/1265) `fix(parser): strip provider media-info residue` | Changes parsed filenames for HTTP streams, which is an input to the junk-rate scorer. Could shift `junk_pct` slightly for HTTP-source addons. |
| [#1277](https://github.com/Viren070/AIOStreams/pull/1277) `fix(server): expose Content-Range/Accept-Ranges` | Affects cross-origin `fetch()` reads of proxy links. `spotcheck.py` is a server-side Python client, not a browser, so it is **not** affected. |

Sources: <https://github.com/Viren070/AIOStreams> (v2.34.0),
<https://guides.viren070.me/stremio/addons/aiostreams/documentation>.

> **[UNVERIFIED]** The remaining 24 of 30 corpus IDs were not individually
> confirmed: outbound HTTPS to `v3-cinemeta.strem.io` is blocked from this
> sandbox except through the page-fetch path, so `verify_corpus.py` could not
> complete a full sweep here. Run it yourself first — it takes ~15 seconds and
> exits non-zero on any mismatch. The 6 that were confirmed all matched exactly.

---

## 1. Method

### 1.1 Measurement surface

A configured AIOStreams user is an addon. The harness creates one config per
contender via the API, then reads that config's aggregated result list straight
off the Stremio stream endpoint. No browser, no Stremio client in the loop.

```
POST {instance}/api/v1/user          -> uuid + encryptedPassword
GET  {instance}/api/v1/status        -> version, tag, channel, commit  (recorded per run)
GET  {instance}/stremio/{uuid}/{encPw}/stream/movie/tt15239678.json
GET  {instance}/stremio/{uuid}/{encPw}/stream/series/tt11280740:2:1.json
```

The harness sends `User-Agent: AIOStreams/benchmark-harness-1.0`, which makes
the server attach `streamData` to every result: service id and **cache flag**,
`parsedFile` (resolution, quality, encode, visual/audio tags, languages, season,
episode, release group), torrent infohash and seeders, size, duration, addon
name, regex and SEL scores. Without it a snapshot is just display text and the
junk/dedup/rank metrics lose their evidence base.

### 1.2 Controlled conditions

| Condition | Enforcement |
|---|---|
| Same instance | One `AIOS_INSTANCE_URL`; version/tag/commit stamped into every run manifest **and** every individual snapshot. |
| Same debrid account | One lane key; `apply_lane()` force-**disables every other service** in every contender's config, so a challenger cannot quietly win by having three debrid providers. |
| Same corpus | `corpus-v1.json`, pinned by id+version in the manifest. Identical 30 titles for all contenders. No per-contender selection. |
| Same window | All contenders installed up front; the loop is `repeat → contender → title`, so contenders are **interleaved** and cache/seeder drift hits them evenly. |
| ≥3 repeats | `--repeats` defaults to 3; below that the runner warns and the run is marked incomplete. |
| Rate limits | Strictly serial. 1.5 s between stream calls, 10 s between contenders, no retry storms, no concurrency. |
| Control unmodified | `Templates/` is read-only input. Variants are mutated **in memory** at run time. |
| Failures ≠ zeros | Install failure or HTTP error → `status:"error"`, `result_count: null`; excluded from means, surfaced in a `failures` column. |

### 1.3 Evidence and credential handling

Every score traces to one snapshot file, `r{repeat}__{contender}__{title_key}.json`,
holding the full ordered result list. `score.py` writes `scores.json` with a
`per_snapshot` array that names the source file for every row.

Credentials live only in the gitignored `tools/benchmark/.env`. Every snapshot
passes a `Sanitizer` that literally replaces known secrets and pattern-redacts
`apiKey`/`token`/`password`/`credentials`/`uuid`/`encryptedPassword`/`url` keys,
bare UUIDs, JWTs, and `key=value` query secrets. Playback URLs are credentialed
debrid links, so they go **only** into a gitignored `*.local.json` sidecar that
`spotcheck.py` reads locally. Verified: the two committed artifacts contain zero
matches for `apikey` or `password`.

---

## 2. Rubric

Scored automatically by `tools/benchmark/score.py`.

| Metric | Definition | Direction |
|---|---|---|
| `cov_any_cached` | % of corpus titles with ≥1 cached result | higher |
| `cov_cached_4k` | % with a cached 2160p option | higher |
| `cov_cached_1080p` | % with a cached 1080p option | higher |
| `mean_playable` | mean non-error, non-junk results per title | higher |
| `rank_tier_ok_pct` | #1 result matches the profile's stated tier. 4K profile: top is 2160p, **or** no 2160p existed at all (a genuinely 4K-less title is not a failure) | higher |
| `rank_cache_ok_pct` | cache-first ordering: no uncached result above any cached one | higher |
| bitrate-cap adherence | #1 result's measured bitrate (`size×8/duration`) vs the template's declared band; per-snapshot | in-band |
| `junk_pct` | % flagged: cam/telecine/screener, mislabeled resolution (declared vs filename), non-matching title, wrong year, wrong season/episode, wrong language | lower |
| `dup_pct` | % of rows repeating an infohash or filename already in the same list | lower |
| `ttfl_ms` | time-to-full-list, measured | lower |
| playback headroom | 256 KiB ranged GET on the #1 result, ≥10 streams, fixed seed | higher reachable |

**Time-to-first-result is deliberately absent as a separate number.** AIOStreams
returns one aggregated JSON body; at the protocol level first-result and
full-list are the same instant. A TTFR figure would have to come from
instance-side timing logs. The harness does not invent one — see README.

The junk scorer's title matcher rejects loose substring matches (a containment
match must cover ≥80% of the longer string), so *Dune* (2021) is correctly
flagged as junk for a *Dune: Part Two* query rather than passing as a prefix.
All 14 scorer assertions pass in `selftest.py`.

---

## 3. Corpus — `corpus-v1`, 30 titles

Locked at `tools/benchmark/corpus/corpus-v1.json`. Every series entry pins a
specific episode. Buckets, with counts:

| Bucket | n | Examples |
|---|---|---|
| recent-blockbuster | 3 | Oppenheimer, Barbie, Dune: Part Two |
| catalog-older | 4 | The Godfather (1972), Pulp Fiction, Back to the Future, Blade Runner |
| 4k-showcase | 2 | Interstellar, Inception |
| non-english | 4 | Parasite (ko), The Intouchables (fr), Spirited Away (ja), Squid Game S2E1 (ko) |
| regional | 2 | RRR (te), Dangal (hi) |
| obscure | 3 | Hardcore Henry, Primer, Coherence |
| completed-series | 4 | Breaking Bad S1E1, Game of Thrones S4E9, Chernobyl S1E3, The Wire S3E11 |
| documentary-4k | 1 | Planet Earth II S1E1 |
| current-season | 3 | Severance S2E1, The Last of Us S2E1, The Bear S3E1 |
| anime | 4 | Attack on Titan S1E1, Demon Slayer S1E19, Death Note S1E1, Frieren S1E1 |

Deliberately includes titles that *should* be hard: Primer and Coherence stress
obscure-catalog coverage; RRR and Dangal stress regional language handling;
Demon Slayer S1E19 stresses absolute-vs-seasonal anime episode numbering, which
is the classic wrong-episode junk generator.

---

## 4. Contenders — 21 on the TorBox lane, 1 on AllDebrid

Registry: `tools/benchmark/contenders.json`. Plan verified with `--dry-run`:
**21 contenders × 30 titles × 3 repeats = 1,890 stream requests** on the TorBox
lane.

### 4.1 Control — unmodified Core Builds (6)

| id | Template | Enabled addons | Sort head | Notable |
|---|---|---|---|---|
| `control-4k-apex-torbox` | `Templates/Torbox/Single/core-nexus-4k-apex-torbox.json` | 5 | `cached → streamExpressionMatched → seadex → resolution` | required res `[2160p,1080p]`, 23 excluded SELs, 107 ranked regexes, global bitrate cap 150 Mbps, `maxResults` 30 |
| `control-stream-1080p-torbox` | `Templates/Torbox/Single/core-nexus-stream.json` | 11 | same | required res `[1080p,720p]`, bitrate cap **60 Mbps**, `maxResults` 35 |
| `control-stable-4k-torbox` | `Templates/Stable/core-stable-torbox-4k.json` | 7 | `cached → resolution → quality` | no regex/SEL engine, excludes CAM/TS/TC/SCR natively, `maxResults` 12 |
| `control-stable-1080p-torbox` | `Templates/Stable/core-stable-torbox-1080p.json` | 7 | same | excludes 2160p/1440p, `maxResults` 10 |
| `control-anime-4k-torbox` | `Templates/Torbox/Anime/core-nexus-anime-4k.json` | 14 | `cached → seadex → streamExpressionMatched` | seadex promoted above SEL; scored on the anime bucket |
| `control-4k-apex-alldebrid` | `Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json` | 11 | same as Apex | secondary lane, separate leaderboard |

### 4.2 Challengers (7)

| id | Source | Citation |
|---|---|---|
| `challenger-aiostreams-default` | no template; schema defaults + debrid key | AIOStreams v2.34.0 default `UserData` |
| `challenger-tamtaro-sel` | Tamtaro Complete SEL Setup | <https://github.com/Tam-Taro/SEL-Filtering-and-Sorting> |
| `challenger-vidhin05-regex` | Vidhin's Regexes, score-based sorting | <https://github.com/Vidhin05/Releases-Regex> |
| `challenger-grabberhawk` | 1080p-first, REMUX detection, anime filler skip | <https://github.com/grabberhawk/stremio-aiostreams-config> |
| `challenger-ang3lo-azevedo` | English-only quality-focused multi-addon | <https://github.com/ang3lo-azevedo/AIOStreams-config> |
| `challenger-community-mightyicyy` | Prism TorBox Essential 1080p (in-repo) | `Community-Templates/Templates/MightyIcyy/README.md` |
| `challenger-community-rb3` | RB3 Auburn Tiger (in-repo) | `Community-Templates/Templates/RB3/README.md` |

Tamtaro and Vidhin05 are the two most-cited community AIOStreams template
projects and are whitelisted in several public instances' `TEMPLATE_URLS`, so
they are the strongest available challengers rather than convenient ones.

### 4.3 Experimental variants — one variable each (9)

Each was **mechanically proved** single-variable: `static_profile.py --diff`
shows the declared-config delta versus the control, and `selftest.py` asserts
the mutation touches exactly one field (or only the `presets`/`sortCriteria`
subtree for add/remove/reorder ops).

| id | The one variable | Measured delta vs control | Question |
|---|---|---|---|
| `variant-apex-plus-torrentio` | add addon `torrentio` | `addon_count 5 → 6` | does a broad public scraper lift obscure/regional coverage? |
| `variant-apex-enable-zilean` | enable the declared-but-disabled `zilean` | `addon_count 5 → 6` | cheapest coverage lever in the template — worth its latency? |
| `variant-apex-minus-torrentsdb` | drop addon `torrents-db` | `addon_count 5 → 4` | is it contributing results, or duplicates and junk? |
| `variant-apex-dedup-off` | `deduplicator.multiGroupBehaviour: aggressive → conservative` | exactly that field | does aggressive smart-dedup discard genuinely distinct releases? |
| `variant-apex-bitrate-cap-off` | `bitrate.global.movies: [0, 150 Mbps] → [0, ∞)` | exactly that field | what does the strict cap cost in coverage, and what junk does it prevent? |
| `variant-apex-cached-first-off` | demote sort key `cached` below `resolution` | `cached_first True → False`, `resolution_rank 3 → 2` | how much of Core Builds' quality comes from cached-first? |
| `variant-apex-plus-tpb` | add addon `the-pirate-bay` (new in v2.34.0) | `addon_count 5 → 6` | credential-free in-process indexer; **no Core Builds template uses it** |
| `variant-apex-plus-therarbg` | add addon `therarbg` (new in v2.34.0) | `addon_count 5 → 6` | same, different index — targets the buckets H1/H2 predict Apex loses |
| `variant-apex-allow-unknown-res` | `requiredResolutions: [2160p,1080p] → [2160p,1080p,Unknown]` | exactly that field | **tests H2 directly**: what does dropping every undeclared-resolution stream cost, and what junk returns if we stop? |

Add-on research backing these variants — usage counts across all 91 templates,
builtin-vs-external transport, liveness, and the `sootio`/`newznab` findings —
is in [`tools/benchmark/addon-inventory.md`](../tools/benchmark/addon-inventory.md).

Three variants I originally drafted were **discarded as invalid** once measured
against the real config, and this is worth recording because it is exactly the
"don't assume the behaviour" discipline the brief asks for:

* *"drop Zilean"* — 4K Apex ships Zilean **already disabled**. Removing it is a
  no-op and any score difference would have been noise misread as a finding.
  The runner now raises on removing an already-disabled preset. Inverted into
  `variant-apex-enable-zilean`.
* *"drop sootio"* — `sootio` is declared in **59 templates and enabled in zero**.
  The same guardrail rejected it. A no-op yields no attributable score, so it is
  recorded as a **housekeeping cleanup recommendation, not a benchmark result**.
* *"lift the 2160p bitrate cap"* — 4K Apex has **no per-resolution bitrate
  band**; the JSON pointer would have silently created one, making the variant
  two changes (add a band *and* set it). Retargeted to the real
  `bitrate.global` cap it actually uses.

---

## 5. Static configuration profile (offline evidence, not scores)

Evidence: [`reports/benchmark-snapshots/static-config-profile.json`](benchmark-snapshots/static-config-profile.json),
[`reports/benchmark-snapshots/static-diff-vs-4k-apex.txt`](benchmark-snapshots/static-diff-vs-4k-apex.txt).

These are declared-configuration facts, generated by `static_profile.py`. They
are **not** benchmark results — they are the attribution map you read the live
scores against.

| contender | addons | cached-first | required res | bitrate cap (movies) | dedup | excl. SEL | maxResults |
|---|---|---|---|---|---|---|---|
| `control-4k-apex-torbox` | 5 | yes | 2160p,1080p | 0–150 Mbps | aggressive | 23 | 30 |
| `control-stream-1080p-torbox` | 11 | yes | 1080p,720p | 0–60 Mbps | aggressive | 24 | 35 |
| `control-stable-4k-torbox` | 7 | yes | — | none | aggressive | 1 | 12 |
| `control-stable-1080p-torbox` | 7 | yes | — | none | aggressive | 1 | 10 |
| `control-anime-4k-torbox` | 14 | yes | — | none | aggressive | 21 | 30 |
| `control-4k-apex-alldebrid` | 11 | yes | 2160p,1080p | 0–150 Mbps | aggressive | 23 | 30 |
| `challenger-community-mightyicyy` | 1 | yes | 1080p | none | aggressive (no smartDetect) | 2 | ∞ |
| `challenger-community-rb3` | 0 | **no** | — | none | none | 0 | ∞ |

Three structural observations that generate falsifiable predictions for the run:

1. **4K Apex runs only 4 real scrapers** (`library`, `stremthruTorz`, `newznab`,
   `torrents-db`; `aiosubtitle` is subtitles). The 1080p Stream profile runs 10.
   Prediction: Apex will lose `cov_any_cached` on the obscure and regional
   buckets to both its own 1080p sibling and to wide-addon challengers. This is
   the single most likely place Core Builds loses.
2. **Apex requires `[2160p, 1080p]` and Stable 1080p excludes 2160p.** A required
   resolution list is a hard filter: any title with no 2160p/1080p release
   returns an **empty list**, not a degraded one. Prediction: catalog-older and
   obscure buckets show total-coverage failures, not merely lower quality.
3. **`challenger-community-rb3` declares zero addon presets and no dedup.** It
   is a formatter/sort-oriented template. If it returns nothing on this
   instance, that is an **install/config failure to record**, not a score of
   zero — the harness will mark it `status:"error"`.

---

## 6. Leaderboard — **[PENDING RUN]**

Populate with:

```bash
python3 tools/benchmark/runner.py --lane torbox --repeats 3
python3 tools/benchmark/score.py  --run reports/benchmark-snapshots/run-<id> --markdown
```

### 6.1 TorBox lane (primary) — [PENDING RUN]

| Contender | cached cov % | cached 4K % | cached 1080p % | mean playable | junk % | dup % | tier-ok % | cache-order ok % | TTFL ms | failures |
|---|---|---|---|---|---|---|---|---|---|---|
| _awaiting run_ | | | | | | | | | | |

Cells carry `mean ± population stdev across the 3 repeats`. Every row links to
its snapshot set via `scores.json → per_snapshot[].file`.

### 6.2 AllDebrid lane (secondary) — [PENDING RUN]

Separate table by design: debrid cache contents are not comparable across
accounts or providers, so cross-lane ranking would be meaningless.

### 6.3 Per-bucket breakdown — [PENDING RUN]

`scores.json` carries `bucket` per snapshot; aggregate the anime bucket for
`control-anime-4k-torbox` and the obscure/regional buckets for the coverage
diagnosis in §7.

### 6.4 Playback headroom spot check — [PENDING RUN]

≥10 top results, stratified one-per-(contender,bucket), fixed seed 20260905.
Method: single 256 KiB ranged GET per stream; record status, latency, bytes,
and measured bitrate against the template's band. Not a decode test.

---

## 7. Loss diagnosis — **[PENDING RUN]**

No losses can be diagnosed before there are scores. The procedure, so it is not
improvised later:

For each metric where a challenger beats a control:
1. Pull the losing and winning snapshots for the specific titles driving the gap.
2. Identify the **addon** that supplied the winning result (`results[].addon`) —
   present in the winner's config, absent or disabled in the control's?
3. Identify the **rule** that buried or dropped it: hard filter
   (`requiredResolutions`, `excludedQualities`, bitrate/size band), sort weight
   (`sortCriteria.global` position), regex/SEL score, or `maxResults` truncation.
4. Confirm by finding the same title where the control *did* win — if the rule
   fires there too, the rule is not the cause.
5. Map to **one** template change and re-run it as a single-variable variant
   before recommending it.

A cause is only accepted when the variant reproduces the gain in isolation.
"Competitor X scored higher" is not a diagnosis and will not appear here.

---

## 8. Ranked recommended changes — **[PENDING RUN]**

The output format, deliberately empty:

| # | Change | Target template | Expected gain | Risk | Evidence |
|---|---|---|---|---|---|
| _awaiting run_ | | | | | |

Each entry must be single-variable, carry a measured expected gain (not an
estimate), a stated risk, and a snapshot link. Per the brief, **no template
files are edited** by this benchmark — the deliverable is the diff list.

Three hypotheses are pre-registered from §5 so they cannot be retrofitted to
whatever the data shows. Pre-registration means a miss is reported as a miss:

* **H1** — Enabling Zilean or adding Torrentio to 4K Apex raises
  `cov_any_cached` on the obscure+regional buckets by ≥10 points, at a TTFL cost
  under 2 s. *Falsified if* coverage gain <5 points or TTFL rises >4 s.
* **H2** — Apex's `requiredResolutions: [2160p, 1080p]` produces total coverage
  failures (empty lists) on ≥2 catalog-older/obscure titles that Stable 4K
  serves. *Falsified if* Apex returns ≥1 result for every such title.
  **Mechanism confirmed in source** (`packages/core/src/streams/filterer.ts` @
  `main`, read 2026-09-06): the filter coerces a missing resolution to the
  literal string `'Unknown'` and drops the stream unless `'Unknown'` is itself
  in the allowlist. Apex's allowlist is `['2160p','1080p']`, so **every stream
  whose resolution the parser cannot determine is discarded**, not merely
  low-resolution ones. This widens H2: the loss should show up not only on
  catalog/obscure titles but on any source that publishes undeclared
  resolutions. Note the same templates' **`requiredLanguages` allowlists do
  include `Unknown`** (verified in `core-nexus-4k-apex-torbox`,
  `core-nexus-stream`, `core-nexus-4k-alldebrid`) — the identical defensive
  guard, applied to the language filter but *not* to the resolution filter.
  That asymmetry looks like an oversight rather than a decision.
  The cheap candidate fix (pending measurement) is adding `'Unknown'` to
  `requiredResolutions`; upstream PR #1266 is solving the same problem with an
  opt-in relaxation flag.
* **H3** — `cached-first` sorting is worth ≥15 points of `rank_cache_ok_pct`
  versus `variant-apex-cached-first-off`, confirming it as a genuine Core Builds
  strength rather than a stylistic choice. *Falsified if* the gap is <5 points.

---

## 9. Self-check

| Requirement | Status |
|---|---|
| Same instance, account, corpus, window; ≥3 repeats | Enforced in the harness; **not yet exercised** |
| Every score traceable to a snapshot | Enforced: `scores.json.per_snapshot[].file`; no scores exist yet |
| Control is the unmodified current template | Yes — `Templates/` is read-only input; variants mutate in memory |
| Variants single-variable | Yes — mechanically proved by `static_profile.py --diff` + `selftest.py`; two invalid variants were caught and fixed this way |
| Credentials absent from committed artifacts | Yes — `Sanitizer` + gitignore; the 2 committed artifacts grep clean |
| Each loss diagnosed and mapped to a change | Procedure defined in §7; **no losses measured yet** |
| No invented results | **Nothing invented.** 0 live requests, 0 fabricated scores. |

## 10. Open [UNVERIFIED] items

* 24 of 30 corpus IDs not individually confirmed against Cinemeta from this
  sandbox (network-restricted). Run `verify_corpus.py` before the first run.
* The four remote community templates were identified and cited from live
  search, but their JSON was **not downloaded or parsed**; their bundle shape
  (single config vs `templates[]` array) is handled defensively by
  `load_remote_template` but is unconfirmed. A shape mismatch will surface as an
  install failure, recorded as such.
* Whether the target instance sets `API_PROVIDE_STREAM_DATA=false` is unknown.
  If it does, the scorer degrades to filename-only parsing — note it in the run.
* Whether the instance permits public config creation (`POST /api/v1/user`
  without an access key) is instance-specific. If it is gated, supply the access
  key or pre-create the configs; the runner records a 403 as an install failure.
