#!/usr/bin/env bash
# push-and-open-prs.sh — apply the 7 audit patches as branches, push them, and open
# the PRs with the correct base (stacked chain + 3 independents).
#
# Designed to run in a GitHub Codespace (or any clone) of brevityA/Core-Builds where
# you are ALREADY authenticated with `gh` (Codespaces provides this automatically).
# The repo only needs to be at `main` — the script creates every branch itself from
# the bundled patches in ./patches/.
#
# Usage:
#   chmod +x push-and-open-prs.sh
#   ./push-and-open-prs.sh            # dry-run: apply locally, print gh commands, push NOTHING
#   ./push-and-open-prs.sh --push     # actually push branches + open draft PRs
#   ./push-and-open-prs.sh --draft=false   # open non-draft PRs
#
# Re-runnable: skips branches/PRs that already exist. Never force-pushes.
set -euo pipefail

DO_PUSH=0; DRAFT="true"
for a in "$@"; do
  case "$a" in
    --push) DO_PUSH=1 ;;
    --draft=false|--draft=no) DRAFT="false" ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
  esac
done

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: run this from inside the Core-Builds git clone." >&2; exit 1
fi
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
PATCH_DIR="$ROOT/patches"
[ -d "$PATCH_DIR" ] || { echo "ERROR: ./patches/ not found next to this script." >&2; exit 1; }

# name | patch-file | base-branch | PR title
ROWS=(
  "audit/mixed-tier-jackett-fix|Core-Builds-PR-mixed-tier.patch|main|fix+feat: Mixed resolution tier, Jackett/Prowlarr preset fix, validator crash (v2.85/3.4.0)"
  "feature/4k-apex-mixed|Core-Builds-PR-apex-mixed.patch|audit/mixed-tier-jackett-fix|feat: Core Nexus 4K Apex Mixed nightly template"
  "feature/apex-mixed-configurator|Core-Builds-PR-apex-mixed-configurator.patch|feature/4k-apex-mixed|feat(configurator): Apex Mixed PSE architecture for any device"
  "feature/golden-config-snapshots|Core-Builds-PR-golden-snapshots.patch|feature/apex-mixed-configurator|test: golden config snapshots across the generation pipeline"
  "ci/vidhin05-drift-watch|Core-Builds-PR-drift-watch.patch|main|ci: Vidhin05 upstream drift watch + tracking issue"
  "fix/configurator-layering|Core-Builds-PR-layering-fix.patch|main|fix(configurator): UI layering + restore feedback widget"
  "feature/docs-auto-sync|Core-Builds-PR-docs-auto-sync.patch|main|feat(docs): auto-sync changelog/roadmap/what's-new + Discord announce"
)

declare -A BODIES=(
  ["audit/mixed-tier-jackett-fix"]="Audit PR #1. Adds the Mixed/Adaptive resolution tier (configurator + core-nexus-mixed.json), fixes the Jackett/Prowlarr preset regression (restores credKey && !apiUrl from #557), and stops validate_templates.py crashing when run bare. Stacked: #2 builds on this."
  ["feature/4k-apex-mixed"]="Audit PR #2 (stacked on #1). 4K Apex IQR stack with the Mixed adaptive policy: requiredResolutions cap lifted (wakes dormant 480p/240p tiers), 576p niche tier, quality-blend sort, blended DAF exit. Nightly per repo convention."
  ["feature/apex-mixed-configurator"]="Audit PR #3 (stacked on #2). Third PSE architecture option so any device/service can generate the IQR x adaptive flagship. APEX_MIXED_PSES ported verbatim from the nightly template and golden-linked to it."
  ["feature/golden-config-snapshots"]="Audit PR #4 (stacked on #3). Playwright e2e drives the real generation pipeline across 12 service x resolution x architecture combos and diffs full output against checked-in goldens; any logic change that alters templates now fails CI."
  ["ci/vidhin05-drift-watch"]="Independent. Daily snapshot comparison of the Vidhin05 ranked regex/expressions (live-synced by 41/48 templates) with a deduplicated tracking issue on drift. Merge anytime."
  ["fix/configurator-layering"]="Independent. Three UI defects from Core Crew bug-reports: import modal behind the Fine-Tune drawer (z-index), clipped help tooltips (portaled to body), and the missing feedback widget (v2.83 module was never imported — now wired). Each e2e-guarded. Merge anytime."
  ["feature/docs-auto-sync"]="Independent. Auto-regenerates the frozen docs (changelog index / roadmap shipped table / what's-new) from CHANGELOG.md + changelog.js, auto-announces synced releases to Discord via a reusable script, and adds a CI guard so the docs can never freeze silently. Merge anytime."
)

if [ "$DO_PUSH" = 1 ] && ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: --push needs the GitHub CLI (gh). In a Codespace it is preinstalled and logged in." >&2; exit 1
fi

REMOTE_HEAD="$(git rev-parse main 2>/dev/null || true)"
echo "==> main at ${REMOTE_HEAD:0:7}. Mode: $([ $DO_PUSH = 1 ] && echo PUSH+PR || echo DRY-RUN \(no push\))."
echo

for row in "${ROWS[@]}"; do
  IFS='|' read -r branch patch base title <<< "$row"
  pf="$PATCH_DIR/$patch"
  if [ ! -f "$pf" ]; then echo "!! missing $pf — skipping $branch"; continue; fi

  # 1) create branch from base (or reuse if present)
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "== $branch exists locally — reusing (NOT rebasing onto $base)"
  else
    git rev-parse --verify --quiet "$base" >/dev/null || { echo "!! base $base missing — skipping $branch"; continue; }
    git checkout -q "$base"; git checkout -q -b "$branch"
    if ! git am --whitespace=nowarn "$pf" >/dev/null 2>&1; then
      echo "!! git am failed for $patch on $branch — aborting this branch"; git am --abort 2>/dev/null || true
      git checkout -q main; continue
    fi
    echo "== applied $patch -> $branch (base $base)"
  fi

  # 2) push + PR (only in push mode)
  if [ "$DO_PUSH" = 1 ]; then
    git push -u origin "$branch" 2>/dev/null || git push --set-upstream origin "$branch"
    if gh pr view "$branch" >/dev/null 2>&1; then
      echo "   PR for $branch already open: $(gh pr view "$branch" --json url -q .url)"
    else
      body="${BODIES[$branch]}"
      url="$(gh pr create --base "$base" --head "$branch" --draft="$DRAFT" --title "$title" --body "$body" 2>&1)"
      echo "   opened PR ($base <- $branch): $url"
    fi
  else
    echo "   [dry-run] would: git push -u origin $branch  &&  gh pr create --base $base --head $branch --draft=$DRAFT"
  fi
done

git checkout -q main
echo
echo "Done. $([ $DO_PUSH = 1 ] && echo 'Pushed + opened draft PRs.' || echo 'Dry-run complete. Re-run with --push to push and open PRs.')"
echo "Tip: merge the 3 independents (drift-watch, layering-fix, docs-auto-sync) in any order;"
echo "     merge the chain strictly 1 -> 2 -> 3 -> 4 (mixed-tier -> apex-mixed -> configurator -> golden)."
