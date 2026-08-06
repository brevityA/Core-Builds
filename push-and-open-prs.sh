#!/usr/bin/env bash
# ============================================================================
# Core-Builds — Push & Open PRs
# Splits Core-Builds-COMBINED.patch into per-topic PRs following repo workflow.
# Requires: gh CLI authenticated, git, node 20+, npm.
# Usage: ./push-and-open-prs.sh /path/to/Core-Builds-COMBINED.patch
# ============================================================================
set -euo pipefail

PATCH="${1:-Core-Builds-COMBINED.patch}"
REPO_DIR="${2:-.}"  # Path to a fresh clone of brevityA/Core-Builds
REMOTE="${REMOTE:-origin}"
BUILD_CMD="cd configurator && npm ci && npm run build && npm test && npm run validate"
DRY_RUN="${DRY_RUN:-0}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ -f "$PATCH" ]] || error "Patch file not found: $PATCH"
cd "$REPO_DIR"

# Ensure we're on main and up to date
git checkout main
git pull "$REMOTE" main

# Git identity (repo workflow)
git config user.email "65663863+brevityA@users.noreply.github.com"
git config user.name "Branding_Brevity"
git config core.fileMode false

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  [DRY] $*"
  else
    "$@"
  fi
}

apply_files() {
  # Apply only specific files from the patch
  local patch_file="$1"; shift
  local files=("$@")
  for f in "${files[@]}"; do
    # Extract just this file's diff and apply
    filterdiff -i "a/$f" "$patch_file" 2>/dev/null | patch -p1 --forward 2>/dev/null || \
    git apply --include="$f" "$patch_file" 2>/dev/null || \
    warn "Could not apply: $f (may already be applied)"
  done
}

push_and_pr() {
  local branch="$1" base="$2" title="$3" body="$4"
  info "Pushing $branch → PR (base: $base)"
  if [[ "$DRY_RUN" != "1" ]]; then
    git push "$REMOTE" "$branch" --force-with-lease
    gh pr create \
      --base "$base" \
      --head "$branch" \
      --title "$title" \
      --body "$body" \
      --label "enhancement" 2>/dev/null || \
    warn "PR may already exist for $branch"
  fi
}

# ============================================================================
# PR 1: audit/mixed-tier-jackett-fix (base: main)
# Core changes: Mixed tier, SEL v2, soft-fail, bug fixes, version bump
# ============================================================================
info "=== PR 1: audit/mixed-tier-jackett-fix ==="
git checkout -B audit/mixed-tier-jackett-fix main

apply_files "$PATCH" \
  configurator/src/js/app.js \
  configurator/src/data/agerating.js \
  configurator/src/data/changelog.js \
  configurator/package.json \
  configurator/scripts/validate.mjs \
  configurator/tests/optional-scrapers.test.mjs \
  configurator/tests/resolution-mixed.test.mjs \
  configurator/tests/radio-allowlist-xss.test.mjs \
  configurator/tests/addon-softfail.test.mjs \
  configurator/tests/tools-deeplink.test.mjs \
  Templates/Torbox/Single/core-nexus-mixed.json \
  Templates/Torbox/README.md \
  versions.json \
  CHANGELOG.md \
  README.md \
  validate_templates.py \
  scripts/generate_mixed_template.mjs \
  docs/AUDIT-2026-07-26.md

git add -A
git commit -m "feat: Mixed/Adaptive tier, SEL Engine v2, soft-fail recovery, bug fixes (v2.85/v3.4.0)

- Add Mixed/Adaptive resolution tier for niche content (no hard caps)
- SEL Engine v2: perGroup() QR balance, debrid group conditions, adaptive score floor,
  Low Seeder Cull, RD Copyright ESE, Library/SeaDex ISE, ID-Matched Trust, Smart Play Pin,
  Bitrate Anomaly Pin, Addon Diversity PSE
- Soft-fail addon recovery: parse 'Failed to fetch manifest' → disable addon → retry
- ?simulateAddonFail= self-test hook for browser verification
- Bandwidth Mbps input → auto bitrate cap (80% of speed)
- Auto-backup config on soft-fail recovery
- Fix B-1: Jackett/Prowlarr presets never generated (filter inversion)
- Fix B-2: validate_templates.py crash on list-JSON
- Fix B-3: NC-17 label reads backwards
- Fix B-4: instanceUrl unescaped in DOM
- Fix CodeQL #158: RADIO_ALLOWED XSS guard
- Fix dead deep-links (handleDeepLink)
- Version bump: Configurator 2.84→2.85, Template Suite 3.3.2→3.4.0"

run bash -c "$BUILD_CMD"
push_and_pr "audit/mixed-tier-jackett-fix" "main" \
  "feat: Mixed/Adaptive tier + SEL Engine v2 + soft-fail recovery (v2.85)" \
  "## Summary

Core release: v2.85 / Template Suite v3.4.0

### SEL Engine v2
- \`perGroup()\` replaces 8 slice expressions (device-aware limits)
- Debrid group conditions (cached-aware, sequential Fast→Standard→Extended)
- Adaptive Score Floor (age-scaled threshold)
- Library/SeaDex protection ISE, ID-Matched Trust, Smart Play Pin
- Bitrate Anomaly Pin, Addon Diversity PSE, Low Seeder Cull, RD Copyright ESE

### Install Recovery
- Soft-fail: parse addon fetch errors → disable → retry with remaining addons
- \`?simulateAddonFail=Name:reason\` self-test hook
- Auto-backup on recovery

### Bug Fixes
- B-1 Jackett/Prowlarr, B-2 validator crash, B-3 NC-17 label, B-4 instanceUrl XSS
- CodeQL #158 RADIO_ALLOWED, dead deep-links

### New Tier
- Mixed/Adaptive: no hard resolution caps, 4K→1080p→720p→SD niche fallback"

# ============================================================================
# PR 2: feature/4k-apex-mixed (base: audit/mixed-tier-jackett-fix)
# ============================================================================
info "=== PR 2: feature/4k-apex-mixed ==="
git checkout -B feature/4k-apex-mixed audit/mixed-tier-jackett-fix

apply_files "$PATCH" \
  Templates/Torbox/Nightly/Single/core-nexus-4k-apex-mixed.json \
  scripts/generate_apex_mixed_template.mjs \
  configurator/tests/apex-mixed.test.mjs

git add -A
git commit -m "feat: 4K Apex Mixed template (Nightly)

- IQR Tukey fences + Mixed tier (no hard caps)
- Adaptive bitrate with pow() decay for niche content
- Generation script + test coverage"

push_and_pr "feature/4k-apex-mixed" "audit/mixed-tier-jackett-fix" \
  "feat: 4K Apex Mixed template (Nightly tier)" \
  "Adds \`core-nexus-4k-apex-mixed.json\` — combines IQR statistical filtering with the Mixed/Adaptive tier for niche content that lacks 4K REMUX availability."

# ============================================================================
# PR 3: feature/apex-mixed-configurator (base: feature/4k-apex-mixed)
# ============================================================================
info "=== PR 3: feature/apex-mixed-configurator ==="
git checkout -B feature/apex-mixed-configurator feature/4k-apex-mixed

apply_files "$PATCH" \
  configurator/index.html \
  scripts/push-personal.sh

git add -A
git commit -m "feat: wire Apex Mixed into Configurator UI

- APEX_MIXED_PSES selection in PSE Architecture dropdown
- pseArch:'apex-mixed' state + build() integration
- index.html version bump"

push_and_pr "feature/apex-mixed-configurator" "feature/4k-apex-mixed" \
  "feat: Wire Apex Mixed into Configurator UI" \
  "Adds Apex Mixed as a PSE Architecture option in the Configurator. Users can select it alongside Standard and Apex IQR."

# ============================================================================
# PR 4: fix/configurator-layering (base: main)
# ============================================================================
info "=== PR 4: fix/configurator-layering ==="
git checkout -B fix/configurator-layering main

apply_files "$PATCH" \
  configurator/src/styles/01-core.css \
  configurator/src/js/contact-widget.js \
  configurator/e2e/ui-fixes.spec.mjs

git add -A
git commit -m "fix: UI layering — import dialog z-index + info card overflow

- Import Custom Formatter dialog opens above modal (z-index 10000→10050)
- Content Preference info cards no longer clip text (overflow-y: auto)
- Contact widget z-index below modals
- Playwright e2e spec for both fixes

Fixes Discord bug-report: 'window opens in background' + 'text partially covered'"

push_and_pr "fix/configurator-layering" "main" \
  "fix: UI layering — import dialog z-index + info card overflow" \
  "Fixes two Discord bug-reports:
1. Import Custom Formatter dialog opens behind the modal
2. Content Preference info cards clip text

Both are z-index/overflow fixes with Playwright e2e coverage."

# ============================================================================
# PR 5: feature/docs-auto-sync (base: main)
# ============================================================================
info "=== PR 5: feature/docs-auto-sync ==="
git checkout -B feature/docs-auto-sync main

apply_files "$PATCH" \
  scripts/sync-docs.py \
  .github/workflows/sync-docs.yml \
  .github/workflows/docs-changelog-gate.yml \
  ROADMAP.md \
  tools/index.html \
  tools/inspector/index.html \
  tests/test_docs_generated.py \
  AGENT-RUNBOOK-ROADMAP-DOCS-AUTOMATION.md

git add -A
git commit -m "feat: docs auto-sync + tools page update + Inspector improvements

- sync-docs.py: auto-generate ROADMAP completed section + tools What's New
- Managed markers: AUTO:ROOT_COMPLETED:* / AUTO:TOOLS_WHATSNEW:*
- sync-docs.yml: adds ROADMAP.md + tools/index.html to git add, guarded setup-node
- docs-changelog-gate.yml: blocks merges without changelog update
- Tools page: managed v2.85 region + changelog link
- Inspector: file-picker + drag-drop + unwrap() + direction: fix
- test_docs_generated.py: validates managed regions parse correctly"

run bash -c "python3 -m pytest tests/test_docs_generated.py -v"
push_and_pr "feature/docs-auto-sync" "main" \
  "feat: Docs auto-sync + Tools page v2.85 + Inspector improvements" \
  "Automates ROADMAP.md and tools/index.html updates via managed markers. Adds Inspector file-picker and drag-drop. Includes changelog gate workflow."

# ============================================================================
# PR 6: ci/vidhin05-drift-watch (base: main)
# ============================================================================
info "=== PR 6: ci/vidhin05-drift-watch ==="
git checkout -B ci/vidhin05-drift-watch main

apply_files "$PATCH" \
  .github/workflows/upstream-drift-watch.yml \
  scripts/check_upstream_drift.mjs \
  Filtering/upstream/README.md \
  Filtering/upstream/vidhin05-expressions.snapshot.json \
  Filtering/upstream/vidhin05-regexes.snapshot.json

git add -A
git commit -m "ci: Vidhin05 upstream drift watch

- Daily cron checks Vidhin05/Releases-Regex@main for changes
- Compares against local snapshots (174 regexes + 243 expressions)
- Opens issue on drift with diff summary
- Snapshots stored in Filtering/upstream/ for audit trail"

push_and_pr "ci/vidhin05-drift-watch" "main" \
  "ci: Vidhin05 upstream drift watch" \
  "Daily GitHub Action that detects when Vidhin05/Releases-Regex changes upstream. Opens an issue with a diff summary so we can review and re-sync."

# ============================================================================
# PR 7: feature/golden-config-snapshots (base: feature/apex-mixed-configurator)
# ============================================================================
info "=== PR 7: feature/golden-config-snapshots ==="
git checkout -B feature/golden-config-snapshots feature/apex-mixed-configurator

apply_files "$PATCH" \
  configurator/e2e/golden-configs.spec.mjs \
  "configurator/e2e/golden/*.json" \
  .gitignore

git add -A
git commit -m "test: golden config snapshots for regression detection

- 12 golden fixtures covering all service/resolution/device combos
- Playwright spec builds config and diffs against golden
- Catches unintended PSE/sort/filter regressions across releases"

push_and_pr "feature/golden-config-snapshots" "feature/apex-mixed-configurator" \
  "test: Golden config snapshots for regression detection" \
  "12 golden config fixtures + Playwright spec. Any change to build() that alters output for standard combinations will fail CI."

# ============================================================================
# Done
# ============================================================================
info "=== ALL 7 PRs PUSHED ==="
echo ""
echo "PR topology:"
echo "  main ← PR1: audit/mixed-tier-jackett-fix"
echo "              ← PR2: feature/4k-apex-mixed"
echo "                   ← PR3: feature/apex-mixed-configurator"
echo "                        ← PR7: feature/golden-config-snapshots"
echo "  main ← PR4: fix/configurator-layering"
echo "  main ← PR5: feature/docs-auto-sync"
echo "  main ← PR6: ci/vidhin05-drift-watch"
echo ""
echo "Merge order: PR4, PR5, PR6 (independent) → PR1 → PR2 → PR3 → PR7"
info "Done. Review PRs at: https://github.com/brevityA/Core-Builds/pulls"
