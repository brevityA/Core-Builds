# Competitor deep-research: how Core Builds can surpass every rival

Date: 2026-09-06 · Upstream pin: AIOStreams **v2.34.0**

All four rival configs were **downloaded and parsed**, not cited. Everything below
is measured from the actual JSON, resolved the way the AIOStreams frontend
resolves it.

---

## 1. The finding that invalidated the previous draft

The earlier report named four challengers but had never fetched them. On
download, **three of the four break the shape our harness assumed** (`config.presets`
is a list of dicts):

| file | outer shape | `presets` | would our old loader survive? |
|---|---|---|---|
| `Tamtaro` | `[ {metadata, config} ]` | **dict** `{__if, __value}` | **crash** — `AttributeError: 'str' object has no attribute 'get'` |
| `Vidhin05` | `[ {…} ]` | **absent** | silently profiles as empty |
| `grabberhawk` | `{metadata, config}` | list[9] | yes |
| `ang3lo-azevedo` | **bare config, no wrapper** | list[27] | silently posts the wrapper as a config |

### The serious one: Tamtaro is a *wizard template*

Its config is not a config. It is a directive tree: **286 `__if`, 21 `__switch`,
104 `__value`, 22 `cases`, 376 `{{inputs.*}}` — 549 sites across 25 top-level
fields** (`presets`, `sortCriteria`, `groups`, `resultLimits`, `selOverrides`,
`rankedRegexPatterns`, `excludedStreamExpressions`, `formatter`, …).

Directive resolution lives **entirely in `packages/frontend`**
(`src/lib/templates/processors/conditionals.ts`). The server does none of it:
`POST /api/v1/user` stores what it is given, and `routes/api/templates.ts`
contains zero directive handling (verified against v2.34.0).

**Consequence:** posting Tamtaro raw would install literal
`"{{inputs.includeAddon.timeout}}"` strings and `__if` objects — then we would
have published a leaderboard number for a config that never worked. That is a
fabricated result, and it is the single biggest correctness risk this pass found.

**Fix:** `tools/benchmark/template_processor.py` is a faithful Python port of
upstream's resolver, including its quirks (`0` is truthy; `and` > `xor` > `or`;
`services.*` ignores operators; `{{services.<id>.<key>}}` credential refs are
preserved). Resolution uses each template's **own declared defaults**, so we
benchmark rivals as their authors ship them, not as we would tune them.

Result: **549 directives → 0**, yielding a valid 10-addon config.

```
tamtaro   549 -> 0 directives (73 inputs)   10 addons
vidhin     14 -> 0 directives ( 6 inputs)    0 addons
grabber     0 -> 0                           9 addons
angelo      0 -> 0                          27 addons
```

`resolve_template()` now **refuses to post** any config with leftover directives
rather than scoring a broken install.

### Vidhin05 is not a competitor build

It resolves to **zero addons** — pure ranked regexes/SELs plus synced-URL
pointers. It is a **ranking overlay**, not a standalone config. Scoring it 0 on
coverage would be a category error, so it is marked `scoring: overlay-only` and
excluded from coverage/playability leaderboards.

---

## 2. Head-to-head, measured

| field | Core 4K Apex | tamtaro | grabber | angelo |
|---|---|---|---|---|
| enabled addons | 5 | 10 | 9 | 27 |
| requiredResolutions | `2160p,1080p` | — | — | — |
| rankedRegexPatterns | **107** | 2 | 0 | 0 |
| excludedStreamExpressions | **23** | 10 | 1 | 0 |
| synced regex URLs | 1 | 1 | 0 | 0 |
| synced **SEL** URLs | **0** | **1** | 0 | 0 |
| maxResults / per-res | 30 / 12 | — | — | — |
| dedup multiGroup | aggressive | aggressive | aggressive | conservative |
| bitrate cap (movies) | 150 Mbps | 250 Mbps | — | — |

**Core Builds already wins on curation** — 107 ranked regexes and 23 exclusion
SELs versus rivals' 0–10 — and its rivals mostly *do less*. The advantage is real
and should not be traded away.

Two corrections to earlier assumptions:
- Core Builds **already syncs Vidhin's regexes** (64/90 templates). It is not
  behind on regex freshness.
- But **0/90 templates sync stream expressions**, while Tamtaro does. Note that
  SEL sync is gated by instance env (`SEL_SYNC_ACCESS`, `WHITELISTED_SEL_URLS`),
  so this is only actionable on a self-host that permits it — it is a caveat,
  not a free win.

---

## 3. Capabilities rivals use that Core Builds does not

All verified present in upstream's schema at v2.34.0 (not invented):

| field | who uses it | why it matters |
|---|---|---|
| **`failover`** | tamtaro (enabled) | **Largest gap.** On a dead pick, retries up to N alternates *server-side* instead of handing the user a broken stream. No Core build sets it. |
| `excludedKeywords` | grabberhawk | Hard-drops known bad re-encode groups; Apex only *demotes* them via regex. |
| `episodeTitleMatching` | tamtaro (present, off) | Targets absolute-numbering / mislabelled-episode failures on anime + series. |
| `requiredSeederRange` | tamtaro | A 0-seeder uncached torrent can never be pulled by debrid — a guaranteed dead slot. |
| `languageInference` | tamtaro | Infers language when the release name omits it. |
| `alwaysPrecache` | ang3lo | Warms the next episode. |

`failover` is the strategically important one: it attacks **playability**, the
metric users actually feel, and *no* rival except Tamtaro uses it either. It is
the clearest path to beating the field rather than matching it.

---

## 4. Four new single-variable variants

Added to `contenders.json` (now **26** contenders, 25 on torbox):

| variant | single change | hypothesis |
|---|---|---|
| `variant-apex-failover-on` | set `/failover` enabled, 5 attempts, parallel 2 | raises `playable_pct`; costs latency only on the failing path |
| `variant-apex-excluded-keywords` | grabberhawk's 10-keyword blocklist | does hard exclusion beat soft ranking — or over-filter obscure titles? |
| `variant-apex-episode-title-matching` | enable at 0.85 similarity | cuts `junk_pct` on anime/series rows |
| `variant-apex-seeder-floor` | require ≥3 seeders | fewer dead uncached slots, without hurting obscure coverage |

Each is **proved single-variable** by `static_profile.py --diff`:

```
variant-apex-failover-on            failover_enabled: None -> True
                                    failover_max_attempts: None -> 5
variant-apex-excluded-keywords      excluded_keywords_count: 0 -> 10
variant-apex-episode-title-matching episode_title_matching: None -> True
variant-apex-seeder-floor           required_seeder_range: None -> [3, 100000]
```

The differ initially reported all four as *identical* — it was blind to these
fields. Profiling them was required before the variants could be attributed at
all; an unprovable variant is not a benchmark result.

---

## 5. Harness hardening

- `template_processor.py` — new; upstream-faithful directive resolver + guardrail.
- `runner.py` — `_extract_config()` handles all four wrapper shapes;
  `resolve_template()` resolves directives and **refuses** unresolved configs;
  the lane is passed so `{{services}}` resolves correctly.
- `static_profile.py` — tolerates absent/directive-valued list fields; profiles
  10 new fields.
- `selftest.py` — **+31 checks** (61 total, ALL PASS) covering the four shapes,
  every condition operator, each directive form, and the refusal guardrail.

One self-test caught a genuine semantic subtlety: an *undeclared* input resolves
to `""` (upstream substitutes unconditionally), so it is not "unresolved" — only
a foreign namespace is. The guardrail tests that real case.

---

## 6. Honest scope

Still **not run**: no live benchmark has executed. Every number above is
static/declared configuration, which cannot tell you what actually streams. The
live run needs an instance URL, a debrid lane + API key, and remains blocked.
Ranked-quality claims stay `[PENDING RUN]`.
