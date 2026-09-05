# Add-on Inventory & Research

Research backing the benchmark's addon-related contenders. Every claim here was
read out of AIOStreams source at tag `v2.34.0` or out of this repo's templates
on **2026-09-06**. Nothing is recalled from training data.

Regenerate the usage counts with:
`python3 tools/benchmark/static_profile.py --json`

---

## 1. What Core Builds actually ships

Scanned **91 templates** across `Templates/` and `Community-Templates/`.

| preset | declared | enabled | enabled % | transport |
|---|---|---|---|---|
| `library` | 89 | 89 | 100% | **builtin** (in-process) |
| `comet` | 86 | 81 | 94% | external (StremThru) |
| `zilean` | 82 | 80 | 97% | **builtin** via torznab |
| `stremthruTorz` | 81 | 77 | 95% | external (StremThru) |
| `aiosubtitle` | 74 | 74 | 100% | external (subtitles) |
| `meteor` | 72 | 70 | 97% | external HTTP addon |
| `seadex` | 71 | 18 | 25% | **builtin** via torznab |
| `knaben` | 69 | 65 | 94% | **builtin** via torznab |
| `mediafusion` | 65 | 47 | 72% | external HTTP addon |
| `torrent-galaxy` | 60 | 46 | 76% | **builtin** via torznab |
| **`sootio`** | **59** | **0** | **0%** | external HTTP addon |
| `neko-bt` | 59 | 9 | 15% | **builtin** via torznab |
| `eztv` | 54 | 52 | 96% | **builtin** via torznab |
| `newznab` | 40 | 26 | 65% | **builtin** (in-process) |
| `hdhub` | 33 | 6 | 18% | external HTTP addon |
| `torrents-db` | 31 | 31 | 100% | external HTTP addon |
| `torbox-search` | 15 | 15 | 100% | builtin |
| `animetosho` | 9 | 9 | 100% | **builtin** via torznab |
| `debridio` | 7 | 0 | 0% | external |
| `davex` | 2 | 0 | 0% | external |

**Every preset ID used by Core Builds exists in upstream `v2.34.0`.** No dead or
renamed presets. (Checked against the 88 files in `packages/core/src/presets/`.)

### Transport matters more than I assumed

I initially classified presets by the first `class ... extends ...` in each
file, which is wrong — that's often the *stream parser*, not the preset. The
correct read is the `*Preset` class's base:

* `BuiltinAddonPreset` → runs **in-process** inside AIOStreams. No external
  addon hop.
* `TorznabPreset extends BuiltinAddonPreset` → **also builtin**. `zilean`,
  `knaben`, `eztv`, `seadex`, `torrent-galaxy`, `animetosho`, `neko-bt` are all
  in-process torznab clients, *not* external addons.
* `StremThruPreset` / `Preset` → **external** HTTP addon; a real network hop
  with its own uptime and rate limits.

This reclassifies most of the stack as builtin, which changes the latency story:
the TTFL cost of enabling `zilean` is an indexer query, not an addon round-trip.
Worth stating because "add an addon = slow" is the intuition the benchmark is
meant to test rather than assume.

---

## 2. Finding: `sootio` is inert in every shipped template

`sootio` is **declared in 59 templates and enabled in 0**.

* Upstream preset exists (`packages/core/src/presets/sootio.ts`, ID `sootio`,
  "Debrid addon", external `Preset`).
* Its project is `sooti/sootio-stremio-addon` — a fork of
  `MrMonkey42/stremio-addon-debrid-search`, 837 commits, **last commit
  2026-04-25 (~5 months stale)**, 156 stars.

It is config cruft: it inflates every template's JSON and the configurator's
preset list without ever running.

**Not benchmarkable.** I drafted a `variant-apex-drop-sootio` contender and the
harness's own guardrail rejected it:

```
ValueError: remove_preset: preset 'sootio' is already disabled — removing it is
a NO-OP, which would make this variant unattributable
```

That guardrail exists because of the earlier Zilean mistake, and it worked. A
no-op cannot produce an attributable score, so this is a **housekeeping cleanup
recommendation, not a benchmark result** — and it must not be presented as one.

---

## 3. Finding: three v2.34.0 scrapers are unused, two are free

v2.34.0 shipped three new builtin scrapers. **No Core Builds template uses any
of them.**

| preset | ID | credentials | transport | source |
|---|---|---|---|---|
| The Pirate Bay | `the-pirate-bay` | **none** | builtin (torznab) via `apibay.org` | [PR #1273](https://github.com/Viren070/AIOStreams/pull/1273) |
| TheRARBG | `therarbg` | **none** | builtin (torznab) | [PR #1269](https://github.com/Viren070/AIOStreams/pull/1269) |
| Anime Tosho (New) | `anime-tosho-new` | **free API key required** | builtin (torznab) | [PR #1271](https://github.com/Viren070/AIOStreams/pull/1271) |

Verified from source: TPB and TheRARBG declare only `name` and `timeout` as
required options — **no `apiKey` option exists**. Both describe themselves as
"general-purpose public torrent indexer (movies, TV and anime) … searches by
title and, when available, by IMDB ID." `anime-tosho-new` *does* require an
`apiKey`, so it is not a free lever.

This matters because **4K Apex runs only four real scrapers**
(`library`, `stremthruTorz`, `newznab`, `torrents-db`). Two credential-free
in-process indexers are the cheapest available coverage lever for exactly the
obscure/catalog buckets where H1/H2 predict Apex loses.

Added as single-variable variants (both proved `addon_count 5 → 6`, nothing else
changed):

* `variant-apex-plus-tpb`
* `variant-apex-plus-therarbg`

---

## 4. Verified: 4K Apex's `newznab` config is correct

This looked like a bug and is not. Worth recording so nobody "fixes" it.

4K Apex configures `newznab` as:

```json
{ "name": "Search…", "services": ["torbox"], "searchMode": "auto",
  "api": { "url": "https://search-api.torbox.app/newznab/api" } }
```

* The `url` field is a **subOption nested under `api`**, so the `api.url` shape
  matches the schema — it is not a misplaced key.
* `https://search-api.torbox.app/newznab/api` is a **first-class entry in
  upstream's `NEWZNAB_INDEXERS` list** ("TorBox Search"), alongside NZBgeek,
  DrunkenSlug, NZBFinder etc.
* `apiKey` is `required: false` for newznab, and the TorBox lane key is supplied
  via the service block — so the harness's `apply_lane()` covers it.

**Implication for the benchmark:** Apex's 4th scraper is a *usenet* indexer tied
to the TorBox account. On the AllDebrid lane (`control-4k-apex-alldebrid`) this
source has no equivalent, which is a real confound to note when comparing lanes —
another reason the two lanes get separate leaderboards.

---

## 5. Liveness

Sandbox egress blocks direct `curl` to addon hosts (every probe returned `000`),
so liveness was confirmed through the page-fetch path instead. **`000` in a raw
curl here means "sandbox blocked", not "addon down"** — an important distinction,
since misreading it would fabricate an outage.

| endpoint | status |
|---|---|
| `torrentio.strem.fun/manifest.json` | **live** — `com.stremio.torrentio.addon` v0.0.15 |
| `torrentsdb.com/manifest.json` | **live** — `com.torrentsdb.addon` v1.0.0 |

Torrentio and TorrentsDB advertise heavily overlapping provider lists (YTS, EZTV,
1337x, ThePirateBay, KickassTorrents, TorrentGalaxy, Nyaa, TokyoTosho, Rutor,
Rutracker, Torrent9, ilCorSaRoNeRo…). Since Apex already runs `torrents-db`,
**`variant-apex-plus-torrentio` may deliver mostly duplicates rather than new
coverage** — which is exactly what `dup_pct` and `mean_playable` will settle.
Prediction recorded here before the run so it can be scored as right or wrong.

> **[UNVERIFIED]** Liveness of `comet.elfhosted.com`, `mediafusion.elfhosted.com`,
> `meteorfortheweebs.midnightignite.me`, `stremthru.elfhosted.com`, and
> `zilean.elfhosted.com` was **not** confirmed — sandbox egress blocked them and
> I did not find an authoritative status page. The live run records per-addon
> errors, so an outage will surface as recorded failures rather than a silent
> coverage loss.

---

## 6. Recommendations (pending measurement)

Ranked by expected value; **none should be applied before the run scores them.**

| # | Change | Rationale | Risk | Status |
|---|---|---|---|---|
| 1 | Add `the-pirate-bay` to thin profiles (esp. 4K Apex) | Credential-free in-process indexer; Apex has only 4 scrapers | May raise `junk_pct` — public indexer, low-quality releases | measured by `variant-apex-plus-tpb` |
| 2 | Add `therarbg` to thin profiles | Same; different index than TPB | Same | measured by `variant-apex-plus-therarbg` |
| 3 | Delete `sootio` from all 59 templates | Enabled 0/59; upstream project ~5 months stale | None — provably inert | **not benchmarkable** (no-op); housekeeping PR |
| 4 | Consider `anime-tosho-new` for anime profiles | Newer AnimeTosho index | Needs a free API key → new credential in templates | not benchmarked (credential requirement) |

Items 3 and 4 are deliberately **outside** the benchmark: one produces no
measurable delta, the other needs a credential the harness doesn't provision.
Recording them as research findings rather than smuggling them into the
leaderboard.
