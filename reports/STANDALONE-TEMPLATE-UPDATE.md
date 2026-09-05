# Standalone Template Update — v3.7.0 (2026-09-05)

Author: Arena agent (AIOStreams template-release-engineer task)
Branch: `arena/01a0723c-core-builds` @ base `524458b1e7e4` (v3.6.2 + tools work)

**Knowledge cutoff:** my training data ends in early 2025; everything about AIOStreams ≥2.32,
Vidhin05's regex list, ElfHosted host state, and this repo's pipeline below is either read from
this checkout or probed live on **2026-09-05 (UTC)** with cited sources. Claims not verifiable from
either are marked **[UNVERIFIED]**.

---

## 0. Pipeline map (verified against current source — the task brief was partially wrong)

### How a standalone template is produced

| Stage | Files | Role |
|---|---|---|
| Synced runtime inputs | `Filtering/core-builds-{pses,eses,ises}.json` | Fetched by *nothing* in the active fleet today — synced **stream-expression** URLs are banned by `tests/test_local_expression_policy.py` (SEL must be local). Still served for legacy/community consumers. |
| Regex source of truth | `Filtering/upstream/vidhin05-regexes.snapshot.json` | Exact pin of `Vidhin05/Releases-Regex@main English/regexes.json`. Re-pinned by `node scripts/check_upstream_drift.mjs --update` (drift watch; CI workflow `upstream-drift-watch.yml`). |
| Reviewed ranked list | `Filtering/ranked-regex-patterns.json` (107 of 176/177) | Human-curated subset of the snapshot, `[B]`/`[C]` = 2nd/3rd upstream entry sharing a name. Verified mechanically: **every pattern in it is a byte-exact snapshot entry** — no hand-written patterns. |
| Resolved templates | `Templates/**.json` | Generated **per family** at release time by one-off scripts (`scripts/build_*_labs_v*.py`, `gen_apple_tv_template.py`, `generate_{apex_,}mixed_template.mjs`, `promote_samsung_templates.py`) + the configurator's policy modules (`configurator/src/core/*`: `assemble-template`, `output-profile-policy`, `feature-conflict-policy`, `host-capability-policy`, `regex-whitelist`, …). Inline `rankedRegexPatterns`/`excludedRegexPatterns`/`preferredRegexPatterns`/`regexOverrides` are frozen copies of the pinned snapshot at generation time. |
| Generated artifacts | `core-builds-template-collection.json` (`scripts/sync_template_collection.py`), `configurator/src/data/regex-allowlist.js` (same script, `--regex-allowlist` — **was documented but missing; implemented this release**), `configurator/src/{data,config}/generated/*` (`configurator/scripts/sync-upstream.mjs` from `configurator/UPSTREAM.pin`), `scripts/aios-regen/snapshots/contract.source.json` (`scripts/aios-regen/cli.mjs extract source`), docs (`scripts/sync-docs.py`) |
| Validation / tests | `python3 validate_templates.py --dir Templates --dir Community-Templates` (CI `validate.yml`), `pytest tests/` (290), `configurator: npm test / run validate / run build / e2e goldens`, `cli: npm test` (74), `packages/core: npm test` (35), `node scripts/aios-regen/tests/smoke.mjs`, `scripts/check_upstream_drift.mjs`, `sync_template_collection.py --check`, `sync-docs.py --check` |
| Preflight (4-lane audit tool) | `tools/preflight/index.html` — fleet probe, static audit, live dry-run, manifest doctor (browser tool; rules mirrored in `validate_templates.py`) |

### Corrections to the brief's "pipeline facts"
- **"Base templates plus patch/preset modules (age-limit, bandwidth, library-boost,
  nzb-failover, one-click-preset, competitive-features) that resolve into standalone JSON"** — no
  such module files exist. The nearest true things: (a) `Templates/Base/core-nexus-base-torbox.json`
  + `Templates/Core-Builds-Base-Config.json` are parent configs inherited by children;
  (b) age-limit / bandwidth / library-boost / nzb-failover / quick-start are **configurator
  feature axes** (e2e golden BASE keys `ageLimit`, `bandwidthMbps`, `libraryBoost`, `nzbFailover`,
  `quickStart`), whose resolutions are baked into each family's generated file — not standalone
  patch modules applied by a resolver.
- **"templates are pre-resolved … golden equivalence tests cover resolved output"** — the golden
  equivalence is configurator-side: `configurator/tests/*.test.mjs` assert e.g.
  `APEX_MIXED_PSES ≡ core-nexus-4k-apex-mixed.json` PSE stack byte-for-byte; plus 15 Playwright
  `e2e/golden/*.json` config snapshots. There is **no fleet-wide "regen all templates" command**;
  per-family generators + snapshot re-derivation is the real pipeline (see 2.3).
- **"templates embed metadata.changelog shown on re-import"** — no shipped template had
  `metadata.changelog`; the prevailing convention was `metadata.changelogUrl → CHANGELOG.md`.
  The field **does exist** in the current AIOStreams schema
  (`packages/core/src/db/schemas.ts` `TemplateSchema.metadata.changelog: [{date,version,content}]`
  "version history entries", alongside `changelogUrl` "alternative to inline changelog"),
  confirmed live against `Viren070/AIOStreams@main` (e694b6ac) on 2026-09-05. This release starts
  embedding it in every changed template.
- **`scripts/template_builder.py` is scaffolding only** ("Template builder scaffolding ready.
  Next: add template definitions"). It must not be used to regenerate the fleet: its base config
  emits `syncedExcludedStreamExpressionUrls` etc., which the local-expression policy test bans.
  Left as-is; flagged.

### Personal/ classification
`Templates/Personal/` = **user-specific** (CLAUDE.md: "do not document or expose";
`scripts/push-personal.sh` publishes them for the maintainer's own fleet). `core-personal*.json`
carry custom inline patterns (file-extension blocker) and no shared ranked copies →
regeneration would be a no-op; **skipped** per task default. `core-nexus-4k-apex-selfhosted.json`
*did* carry 8 stale shared copies; they remain stale in this release (see §5 decision D1).

---

## 1. Template inventory (all `Templates/*.json`; 90 files)

Lanes: **Base (2), Stable (2), Torbox active (49), Nightly (8), Personal (6), Usenet (1)** in
scope; **Deprecated (14) archived, Legacy/v2.31.1 (16) frozen — untouched.**

43 lane templates + 2 base files were updated this release (regex re-derivation, version bump,
changelog embed). Unchanged: Anime ×7 (no inline ranked copies — they rely on the synced
Vidhin05 URL), Stable ×2 (contract: zero inline regex by design; `coreBuildsVersion 2.89` pin left
intact), Usenet ×1 (no regex), Personal ×6 (skipped), Deprecated/Legacy ×30 (frozen/archive).
Full old→new version table: `git diff` review; per-file refreshed pattern names are in §2.4.

Last logic change reflected pre-release: v3.6.2-era (2026-08-22) for the Torbox lanes; Stable at
2.89-era by contract; Nightly at their 2026-08/09 lab builds. No *behavior* patch was pending in
Base — the outstanding lag was the **regex sync**, which this release fixes.

## 2. Sync findings

### 2.1 Regex (Vidhin05 ranked list)
- Live source: `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json`,
  fetched via GitHub Contents API 2026-09-05, ETag `6ec5f06a83edd6dd8d557ae858b3ac6b20f5a51c`,
  **177 entries**. Pinned snapshot was 176 entries (2026-08-29 pin).
- Drift: `+FAND`; 7 pattern edits (Radarr HD Bluray T1/T2, Anime LQ Groups, Radarr/Sonarr Bad
  Dual Groups, LQ (Release Title) (Radarr), BR-DISK, TrueHD Exclude Groups). Re-pinned with the
  canonical command (`check_upstream_drift.mjs --update`); `scripts/sync_ranked_regex.py` (new)
  re-derived `Filtering/ranked-regex-patterns.json` and every inline copy in active lanes from
  the new pin: **8 shared-name slots refreshed** (Radarr/Sonarr Bad Dual Groups, LQ (Release
  Title) (Radarr), Anime LQ Groups, BR-DISK, Radarr HD Bluray T1/T2, TrueHD Exclude Groups).
- **Allowlist safety (ElfHosted "6/182 regexes are not allowed" class):** verified against
  sources, not folklore: AIOStreams `packages/core/src/utils/config.ts::validateRegexes` rejects
  any config where not *all* inline patterns are members of the host whitelist
  (`RegexAccess`, `packages/core/src/utils/regex-access.ts`); the whitelist is the host's static
  `REGEX_PATTERNS` + patterns synced from operator-trusted URLs — on ElfHosted that is
  Vidhin05's English/German/French lists (their live `/api/v1/status` payload, probed 2026-09-05,
  shows exactly these pattern strings and `regexAccess.level:"none"`). Post-regeneration, **every
  inline pattern in every in-scope template is byte-exact in the re-pinned (= live) list**: 0
  offenders (audit = the repo's own `configurator/src/core/regex-whitelist.js` run across all 63
  active files). 5 pre-existing offenders remain in `Templates/Personal/` only — they are the
  file-extension blocker which I **verified verbatim in ElfHosted's live allowlist** (their static
  extra), so they import cleanly despite not being in Vidhin05's file.
- `FAND` (new upstream tier-2 group) is **not** adopted into the curated 107 — reviewed-list
  membership is human-gated by repo rule; recommended for the next curation pass.
- Lookbehind note: ElfHosted-status evidence shows whitelisted patterns with `(?<=…)` are
  *allowed by the host*; the configurator's stricter strip-on-export (`hasLookbehind`) is a
  Core Builds policy for user configs, unchanged here. **[UNVERIFIED]** whether every *other*
  public host's whitelist matches Vidhin05 exactly (only ElfHosted was probeable).

### 2.2 Add-on / endpoint liveness (probed 2026-09-05, post-regeneration identical to pre)

| Endpoint (referenced by) | Status | Evidence |
|---|---|---|
| `raw.githubusercontent.com/Vidhin05/…/English/regexes.json` (49 active files, `syncedRankedRegexUrls`) | **ALIVE** | Contents API 200 + ETag `6ec5f06a…`; 177 entries |
| `meteorfortheweebs.midnightignite.me` (Meteor preset, 48 files) | **ALIVE** | `manifest.json` 200: `community.meteor` v1.0.0 |
| `sooti.info` (Sootio preset, 49 files) | **ALIVE** | configure page up, "Sootio v1.9.1", Sept-2026 donation wall |
| `mediafusion.elfhosted.com` (MediaFusion preset) | **ALIVE** | landing page v6.1.5 |
| `api.nzbgeek.info/api` (newznab, Personal+Usenet lanes) | **ALIVE** (HTTP 500 to keyless GET = server responding; auth-gated) | direct probe |
| `search-api.torbox.app/newznab[/api]` (TorBox newznab, 13 files) | **ALIVE (auth-gated)** | TorBox status page "all services online — Search API operational", updated Sep 5 2026; keyless GET rejected |
| 71 self-referenced `raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/…` URLs (sourceUrls, icons, banners, Filtering files, changelog) | **ALIVE** | every path present in the `main` tree (git trees API, full recursive compare) |
| debrid bridges (stremthruTorz/Store, easynews, zilean, knaben, comet) | **ALIVE by host** — instance-bundled presets, no embedded URLs; AIOStreams host itself probed (ElfHosted v2.34.0) | `/api/v1/status` payload |

No template points at a DEAD endpoint. Lane defaults: every lane keeps ≥1 working enabled-by-default
source (TorBox/AllDebrid lanes: service bridge + Meteor + Zilean/Knaben; Anime: animetosho+
stremthruTorz; Speed/EasyNews: easynews; Usenet: easynews/easynewsPlusPlus; Stable: library/meteor/
comet; free/P2P: none ships standalone — configurator-only, as before).

### 2.3 AIOStreams schema sync
- `UPSTREAM.pin` v2.33.2 (`f36d0f93`) → **v2.34.0** (`e694b6ace7309091289a8680c3f817210e261e46`,
  released; == `main` HEAD == the version ElfHosted runs). Regenerated all `src/{data,config}/generated/*`
  + `upstream-snapshot.json` via `npm run sync:upstream` (report: no removals, additive only).
- `aios-regen` contract re-pinned (`extract source --pin`): `a9505e3e` → `55ad4579`, reviewed as
  **additive**; `diff --fail` now ✓ in sync.
- Delta adopted/skipped (requirement 4):
  - new config keys `healthChecks`, `healthResults`, `autoVariants`, `manifestNotice`,
    `linkedAccounts` — **not adopted** in templates: they configure new v2.34 features
    (health checks / variant automation / UI notice); shipping them would be a behavior change,
    not a sync. Documented for a future feature release.
  - new presets `the-pirate-bay`, `therarbg`, `anime-tosho-new`, `usa-tv-next` — **validator
    registry only** (templates keep using `animetosho`/existing lanes; `anime-tosho-new`
    supersession, if any, is an upstream *deprecation* decision — none published **[UNVERIFIED]**).
  - enums `PCM` (audio), `MPEG-4` (encode), `DVD REMUX` (quality), `DV Only`/`HDR Only`/`Upscaled`
    (visual), sort keys `addon/keyword/regexPatterns/streamType` — synced into
    `validate_templates.py` VALID sets; sort key `private` deliberately **not** allowed
    (Core's 2026-08-08 audit bans the `private(...)` family; no shipped template needs it).
  - new SEL functions `folderSize` (already known), `health` → validator registry.
- Migrations: nothing deprecated/renamed between pins (contract diff had zero removals);
  `torbox-search` remains confined to `Templates/Legacy/v2.31.1/` (validator gate passes).
  All 28 shipped preset types verified against the live `main` preset registry: **all exist, none
  `DISABLED`** (`extractSource()` run 2026-09-05). Unknown keys: none (validator + schema
  regeneration green; required-options floor satisfied — 0 validator errors).
- Keyed presets ship disabled: enforced by validator rule "ship keyed presets disabled" — 0
  violations; credential scan of this diff: only `rpdbApiKey:"t0-free-rpdb"` (pre-existing public
  free-tier poster key convention) — no secrets introduced.

### 2.4 Diff classification (every hunk)
Mechanically auditable: for all 43 changed templates, reverting the four regex fields to the old
HEAD text, deleting `metadata.changelog`, and undoing the patch bump reproduces HEAD **byte-for-byte
(0 residues, 43/43)** — so the only changes are:
- **DRIFT FIX** — refreshed pattern strings in `rankedRegexPatterns`/`preferredRegexPatterns`/
  `excludedRegexPatterns`/`regexOverrides` (8 upstream slots, §2.1) in 43 files.
- **INTENTIONAL** — `metadata.version` patch bump + new `metadata.changelog` entry (43 files);
  `Filtering/ranked-regex-patterns.json` (5 entries); `Filtering/upstream/vidhin05-regexes.snapshot.json`
  (re-pin); `configurator/src/data/regex-allowlist.js` (regenerated, 177);
  `configurator/UPSTREAM.pin`+`src/{data,config}/generated/*` (v2.34.0); `validate_templates.py`
  (registry sync + non-template skip + CI-matching default dirs); `scripts/sync_ranked_regex.py`
  (new pipeline step); `scripts/sync_template_collection.py` (implements the documented-but-missing
  `--regex-allowlist`); `core-builds-template-collection.json` (regenerated, 65 entries);
  `scripts/aios-regen/snapshots/contract.source.json` (re-pin); `versions.json` `3.6.2→3.7.0`;
  `CHANGELOG.md` + all `sync-docs.py` surfaces (README, CLAUDE.md inventory, Guides/LABS.md,
  docs/*.mdx, ROADMAP.md, Torbox README) and `configurator/index.html` (rebuilt shell embedding the
  regenerated data — 1-line diff: baked `regex-allowlist`/schema payloads).
- **UNEXPECTED — none.**

## 3. Validation & verification results
Run 2026-09-05 after all regeneration (pasted outputs in the PR comment / agent transcript):
- `validate_templates.py --dir Templates --dir Community-Templates` → **0 errors** / exit 0;
  214 warnings are the pre-existing accepted policy set, byte-identical in count/content-class to
  the 3.6.2 baseline (SEL length >2400 near-limit + community-template advisories; zero introduced
  by this release). "Zero warnings" would require weakening those policy warnings or editing
  community/Personal lanes — out of contract, not done.
- `sync_ranked_regex.py --check` → ✅ synced (177 patterns, 54 files).
- `check_upstream_drift.mjs` → ✅ in sync (177). `aios-regen diff --fail` → ✅ fingerprint
  `55ad4579`. `sync-docs --check` → ✅ all surfaces in sync. `sync_template_collection.py
  --check` → ✅ 65 templates. `--regex-allowlist --check` → ✅.
- pytest **290 passed**; configurator `npm test` **484 pass/0 fail**, `npm run validate` all
  PASS (incl. version consistency), `npm run build` standalone 1,023,101 B + web; `cli` **74
  pass**; `packages/core` **35 pass**; `aios-regen smoke` ok.
- Playwright e2e + golden refresh: **not runnable in this sandbox** (browser download egress
  blocked). No generated-config semantics changed (goldens embed `coreBuildsVersion "3.1"`,
  which was **not** bumped, see D2), so no golden update was needed; CI's
  `configurator-e2e.yml` is the authoritative re-run. No Playwright issue-number flakes apply.

### Preflight 4-lane audit (tools/preflight)
1. **Fleet probe** — ElfHosted `v2.34.0` stable, commit `e694b6ac`, `regexAccess.level=none`
   (probed 2026-09-05 via status payload). Other fleet hosts unreachable from this sandbox
   (egress allowlist) — run in a browser: Tools → Preflight → Re-probe.
2. **Static audit** — the tool's own `staticAudit()` rule engine was extracted from
   `index.html` and run headless over all 63 active template/community files, before vs after:
   **0 changed findings**. Existing findings are the structural pre-service classes (empty
   credential placeholders until install, version-stamp advisory) — by design for template files.
3. **Live dry-run** — requires registering throwaway users against real hosts (keys/cookies the
   agent must not create). Exact command for the user: open
   `tools/preflight/index.html`, paste template config, choose host, "🛰️ Run live dry-run".
   Not run → no findings to fix.
4. **Manifest doctor** — template-level equivalent executed as the §2.2 endpoint matrix (0 dead).

## 4. Versions & changelogs
- `versions.json`: templateSuite **3.7.0** (semver patch-space of the suite: 3.6.2→3.7.0 for a
  new sync mechanism + data bump), configurator 3.1.0 unchanged, `minimumAIOStreams` 2.32.0
  unchanged (templates stay valid 2.32→2.34; no 2.34-only feature shipped).
- Every changed template carries `metadata.changelog` `[{date:"2026-09-05", version:<new>,
  content:"Inline regex sync …"}]` (schema-verified, §0).
- `CHANGELOG.md` 3.7.0 section + repo docs updated by `sync-docs.py --apply` (not hand-edited).

## 5. Decisions needing maintainer attention
- **D1 — Personal/ skipped (task default).** `Personal/core-nexus-4k-apex-selfhosted.json` still
  carries the 8 stale shared copies (target: self-hosted hosts where `REGEX_FILTER_ACCESS=all`
  makes the allowlist moot). `python3 scripts/sync_ranked_regex.py --apply --include-personal`
  re-derives it in one command whenever you want it in-lane.
- **D2 — CONFIGURATOR_VERSION not bumped (3.1 kept).** The task brief asks for a lockstep bump,
  but per CLAUDE.md a bump forces regeneration of the 15 Playwright goldens (browser tooling,
  unavailable here) and every configurator *behavior* is unchanged (data-only). Bumping without the
  tool would hand-edit generated goldens — forbidden. Cut 3.2.0 as a configurator release whenever
  you next ship app changes; `validate.mjs`'s dynamic checks keep it consistent at that time.
- **D3 — Deprecated/ frozen** like Legacy (14 files retain old-pinned patterns; they are absent
  from the collection and carry archived #671-class stubs with no generator; syncing them is
  `--include-deprecated` if you decide archived lanes must stay host-green).
- **D4 — validator bare-run default now `Templates + Community-Templates`** (matches CI; previously
  scanned the whole repo and crashed on non-template JSON — the documented guard was incomplete).
  Non-template objects (badge packs, generated contract) are now skipped instead of half-validated.
- **D5 — `template_builder.py` scaffolding** left untouched (flagged: it cannot safely regenerate
  the fleet; see §0). Consider deleting or finishing it in a separate change.
- **D6 — FAND + curated-list curation pass** pending (human-gated by policy).
- **Sandbox transport note:** this environment blocks `raw.githubusercontent.com`/host egress; all
  live fetches above went through the GitHub Contents API (`Accept: application/vnd.github.raw`) or
  the agent's fetch tool. The repo tools were run as-is with a fetch transport shim; re-runs on a
  normal network need no changes.
