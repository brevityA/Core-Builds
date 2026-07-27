# AGENT RUNBOOK — roadmap cleanup + close the docs-automation loop

> **Audience: an autonomous coding agent.** Execute end-to-end without asking the human.
> Every step has a success criterion; on failure, recover as specified and report — never
> improvise, never push partial work. Work on a **new branch off `main`** (e.g.
> `docs/roadmap-cleanup-and-automation`); this is one docs/CI PR.

## Mission
Two goals, one PR:
**(A)** Fix the three staleness bugs in the roadmaps. **(B)** Close the automation loop so a
merged PR that adds/changes a user-facing feature **cannot** leave the docs stale, and a PR
that ships a feature *without* a changelog entry gets an advisory nudge.

The end-state automation (this is the design you are implementing):
```
PR opened/updated
  └─ docs-changelog-gate (NEW, advisory)  ── if user-facing paths changed but neither
       CHANGELOG.md nor configurator/.../changelog.js did → post a reminder comment
       (non-blocking; respect [skip docs-gate] / [chore] / [fix-only] opt-outs)
PR merged to main  (CHANGELOG.md and/or changelog.js changed)
  └─ sync-docs.yml (EXTENDED)  ── regenerates ALL derived docs from the changelogs:
       docs/changelog.mdx   (managed recent-releases index)   [already exists]
       docs/roadmap.mdx     (managed "Recently shipped" table) [already exists]
       docs/whats-new.mdx   (regenerated from changelog.js)    [already exists]
       ROADMAP.md           (managed "Recently Completed")     [THIS RUNBOOK ADDS]
     then commits + pushes them.
  └─ test_docs_generated.py (EXTENDED) fails CI if any derived doc drifts from source.
```
So "new thing lands" ⇒ author (or the gate's nudge) adds a changelog line ⇒ on merge the
docs AND the root roadmap update themselves. No hand-editing of "shipped" lists ever again.

## Inputs / where things live
- Repo `brevityA/Core-Builds`, clean clone, on a new branch off `main`.
- Existing generator: `scripts/sync-docs.py` — functions `parse_root_changelog()`,
  `parse_config_changelog()`, `_replace_managed_region(text, begin, end, inner)`,
  `gen_changelog_index_md()`, `gen_roadmap_shipped_md()`, `gen_whats_new_page()`,
  `sync_generated_pages(patcher)`. Markers already defined: `CHANGELOG_BEGIN/END`,
  `ROADMAP_BEGIN/END`. Main entry has an `os` import and a `GITHUB_OUTPUT` emit block.
- Existing workflow: `.github/workflows/sync-docs.yml` — runs `python3 scripts/sync-docs.py
  --apply`, then `git add` of an explicit file list, commits if changed, pushes. Triggers on
  push to `main` touching `Templates/Torbox/**/*.json` or `CHANGELOG.md`, plus
  `workflow_dispatch`.
- Existing guard: `tests/test_docs_generated.py` (loads sync-docs via importlib).
- Truth sources: `CHANGELOG.md` (template-suite, `## X.Y.Z (date)` + `### Added/Fixed/Changed`
  + bullets) and `configurator/src/data/changelog.js` (configurator, `{ v, date, items }`).

## Hard constraints (never violate)
1. `CHANGELOG.md` + `changelog.js` are the ONLY sources for *shipped* content. Never invent.
2. Never edit the **hand-curated** parts of `ROADMAP.md` (In Progress / Planned / Ideas) except
   the three explicit cleanups in Step 2. Never touch curated prose in `docs/changelog.mdx`.
3. The PR gate is **advisory** (warning comment + a non-failing check), NEVER a hard block.
   Honor opt-outs: title/body containing `[skip docs-gate]`, or label `chore`/`docs`, or a
   `fix`/`hotfix`-only diff.
4. Exactly ONE managed region per file; markers must be unique.
5. Do not break the existing `sync-docs.yml` behaviour; only EXTEND it.
6. Idempotent: running the generator twice changes nothing the second time.

---

## Part A — the three staleness fixes

### Step 1 — Make root ROADMAP.md "Recently Completed" auto-derived
In `scripts/sync-docs.py` add constants:
```
ROOT_ROADMAP_BEGIN = "<!-- AUTO:ROOT_COMPLETED:BEGIN -->"
ROOT_ROADMAP_END   = "<!-- AUTO:ROOT_COMPLETED:END -->"
```
Add `gen_root_roadmap_completed(entries, limit=14)` returning, for the newest `limit`
`CHANGELOG.md` entries, a markdown table `| Version | Date | Highlights |` where *Highlights*
is the first **real bullet** of the entry (skip `###` subsection headings — reuse the
`_first_summary_line` logic, which already strips headings/bold/backticks). Prefix the table
with a one-line note: `Auto-generated from [\`CHANGELOG.md\`](...) by \`scripts/sync-docs.py\`.
In Progress / Planned / Ideas below are hand-curated.`

In `sync_generated_pages(patcher)`, add a block that reads `ROADMAP.md`, calls
`_replace_managed_region(text, ROOT_ROADMAP_BEGIN, ROOT_ROADMAP_END,
gen_root_roadmap_completed(entries))`, and writes it back when changed (mirror the existing
`docs/roadmap.mdx` block's print/dry-run pattern).

**Seed the markers (one-time) in `ROADMAP.md`:** delete the entire hand-maintained
`## ✅ Recently Completed` section — *including its `### v2.84 …`, `### v2.81–v2.83 …`, and
`### v2.56–v2.8.0 …` subsections and their tables* — and replace that whole span (from the
`## ✅ Recently Completed` heading up to but **not** including the `---` before
`## 🔄 In Progress`) with:
```
## ✅ Recently Completed

<!-- AUTO:ROOT_COMPLETED:BEGIN -->
_Managed region — regenerated by `scripts/sync-docs.py` from `CHANGELOG.md`._
<!-- AUTO:ROOT_COMPLETED:END -->
```
Leave `## 🔄 In Progress`, `## 📋 Planned`, `## 💡 Ideas / Under Consideration`, and the
`## 🙏 Want to Contribute?` footer **exactly as-is.**

### Step 2 — the three content cleanups (hand-curated sections)
- **Template Migration Tool shipped:** in `## 💡 Ideas / Under Consideration`, **remove** the
  `| Template Migration Tool | Under consideration — auto-upgrade old schemas to current version |`
  row. It shipped in **v3.2.9** (visual diff on update) and now also appears automatically in
  the managed "Recently Completed" table — leaving it in Ideas is the staleness bug.
- **Removed PSEs annotation:** the managed table will now list v2.84's *Audio Pinnacle PSE* and
  *HDR/DV Priority PSE* as shipped (true at v2.84). They were **removed in 3.2.8** (REMUX-ranking
  fix). Add a single clarifying bullet under `## 🔄 In Progress` **or** a short
  `### Notes on shipped-then-removed` line right after the managed region:
  `> Audio Pinnacle PSE and HDR/DV Priority PSE shipped at v2.84 and were **removed in v3.2.8**
  > (REMUX-ranking fix). Do not re-implement.` (Place it OUTSIDE the managed markers so the
  generator won't wipe it.)
- **De-duplicate shipped tables:** now that the root "Recently Completed" is auto-derived from
  the same source as `docs/roadmap.mdx`'s "Recently shipped", they are intentionally the same
  data in two surfaces — that's fine (README vs docs site). No action beyond Step 1. (If the
  human later wants one removed, that's a separate decision — do NOT delete either here.)

---

## Part B — close the automation loop

### Step 3 — extend sync-docs.yml so ROADMAP.md is committed
In `.github/workflows/sync-docs.yml`, in the `git add …` line, add `ROADMAP.md` to the list
(alongside the existing `docs/changelog.mdx docs/roadmap.mdx docs/whats-new.mdx`). Also add
`CHANGELOG.md`-independent trigger path `configurator/src/data/changelog.js` to the `on.push.paths`
list so a configurator-only changelog bump also regenerates `whats-new.mdx`. Keep the commit
message; optionally change it to `chore: sync doc versions + roadmap from changelogs`.

### Step 4 — NEW advisory PR gate: `.github/workflows/docs-changelog-gate.yml`
Create a workflow: `on: pull_request` (types `opened`, `synchronize`, `reopened`, `edited`).
Permissions: `pull-requests: write`, `contents: read`. One job, steps:
1. Checkout with `fetch-depth: 0` (need the merge-base).
2. Compute changed files: `git diff --name-only origin/${{ github.base_ref }}...HEAD`.
3. Set `user_facing=true` if any changed path matches:
   `configurator/src/**` , `Templates/**` , `Formatters/**` , `Filtering/**` , `AIOMetadata/**`.
   (Use a `grep -E` over the file list; bash.)
4. Set `changelog_touched=true` if `CHANGELOG.md` or `configurator/src/data/changelog.js` changed.
5. Set `opt_out=true` if the PR title or body contains `[skip docs-gate]`, or the PR has a label
   in {`chore`,`docs`}, or **no** user-facing path changed (i.e. `user_facing=false`).
   (Read title/body via `gh pr view --json title,body --jq ...` using `GITHUB_TOKEN`.)
6. Decision: if `user_facing && !changelog_touched && !opt_out` → post (or update, via a hidden
   HTML marker comment `<!-- docs-changelog-gate -->`) a **comment** on the PR:
   > ⚠️ This PR changes user-facing code/templates but doesn't touch `CHANGELOG.md` or
   > `configurator/src/data/changelog.js`. On merge, the docs + roadmap auto-regenerate **from
   > the changelog** — so add a bullet there (under `### Added`/`### Fixed`/`### Changed`) or the
   > release won't show up in the docs/roadmap. Add `[skip docs-gate]` to the title if this is
   > intentionally internal.
   Set the check step outcome to **success** regardless (advisory). If `changelog_touched ||
   opt_out` → if a prior gate comment exists, optionally leave it; emit a success log line.
7. Use `gh` for comment create/edit (dedupe by searching for the marker via
   `gh pr view --json comments --jq`). Never fail the build.

### Step 5 — extend tests/test_docs_generated.py
Add `test_root_roadmap_completed_matches_source()`: read `ROADMAP.md`; assert the
`ROOT_ROADMAP_BEGIN/END` region equals a fresh `gen_root_roadmap_completed(parse_root_changelog())`
(assert markers present first); assert the top `CHANGELOG.md` version string appears in the file.
Mirror the existing three tests' style. (The existing tests already cover the three `docs/*.mdx`.)

---

## Verification gate (run before committing)
```
python3 scripts/sync-docs.py --apply      # expect: ROADMAP.md UPDATED once, others "in sync"
python3 scripts/sync-docs.py --apply      # expect: every generated doc "in sync" (idempotent)
python3 -m pip install -q pytest && python3 -m pytest tests/test_docs_generated.py -q   # all pass
bash -n .github/workflows/docs-changelog-gate.yml   # wait, yaml not bash — instead:
python3 -c "import yaml,glob;[yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')];print('workflows parse OK')"
```
Manual gate sanity (simulate, don't need a real PR): confirm the gate's path patterns would
flag a `configurator/src/js/app.js` change with no changelog edit, and would NOT flag a
`docs/**`-only or `[chore]`-labelled change.

Negative control for the guard test (optional but recommended): temporarily corrupt the
managed `ROADMAP.md` region and confirm `test_root_roadmap_completed_matches_source` fails,
then revert.

## Error recovery
- Markers missing in `ROADMAP.md` after seeding → `_replace_managed_region` returns `None`; the
  generator prints a WARN and skips. Re-check the seed edit (exact marker strings, exactly one
  region).
- `gen_root_roadmap_completed` returns an empty table → `parse_root_changelog()` regex
  `^## ([\d][\d.\w\-+]*)\s*\(([^)]*)\)` didn't match; do NOT commit an empty managed region.
- sync-docs commit/push loop on a self-triggered commit → the existing `chore: …` commit must
  carry `[skip ci]`? **No** — sync-docs triggers on `CHANGELOG.md`/template paths; its own commit
  only touches docs/ROADMAP, so it won't re-trigger. Verify by checking the trigger `paths` do
  NOT include `docs/**` or `ROADMAP.md`. (They don't, currently — keep it that way.)
- PR gate posting duplicate comments → dedupe by the `<!-- docs-changelog-gate -->` marker.

## Final Report (return exactly this, filled in)
```
BRANCH: <name>
FILES CHANGED:
  scripts/sync-docs.py            — + gen_root_roadmap_completed, + ROOT_ROADMAP_* markers, + sync block
  ROADMAP.md                      — managed "Recently Completed" seeded; Migration Tool row removed; removed-PSE note added
  .github/workflows/sync-docs.yml — + ROADMAP.md in git add; + changelog.js trigger path
  .github/workflows/docs-changelog-gate.yml — NEW advisory PR gate
  tests/test_docs_generated.py    — + test_root_roadmap_completed_matches_source

VERIFICATION: sync-docs idempotent = <yes/no> | pytest test_docs_generated = <n> pass | workflows parse = OK
GATE BEHAVIOUR: feature-no-changelog => <warn> ; chore/docs/opt-out => <silent>
STALENESS FIXES: Migration Tool moved = <yes>; removed-PSE note = <yes>; shipped tables = auto-derived (root) + auto-generated (docs)
ISSUES: <none or list>
```
Then summarize the resulting automation in 3 lines (PR gate nudge → merge sync-docs regenerates
all derived docs + root roadmap → guard test blocks future drift).
