#!/usr/bin/env bash
# announce-discord.sh — post a "docs synced / release" embed to Discord.
#
# Reusable release announcer extracted so the docs-sync workflow can announce
# automatically (no more manual run) while the manual sync-docs-discord nav-dump
# keeps working unchanged. Reads the webhook from $WEBHOOK_URL (set by the caller
# from a secret) and never echoes it.
#
# Usage:
#   WEBHOOK_URL=... ./scripts/announce-discord.sh <version> [title] [extra_line ...]
#
# Example (from a workflow):
#   WEBHOOK_URL="${{ secrets.DISCORD_WEBHOOK_URL }}" \
#     ./scripts/announce-discord.sh "$VER" \
#       "📚 Docs synced for v$VER" \
#       "Changelog, roadmap & What's New regenerated from source."

set -euo pipefail

VERSION="${1:?usage: announce-discord.sh <version> [title] [lines...]}"
TITLE="${2:-📚 Docs synced for v${VERSION}}"
shift 2 || true

if [ -z "${WEBHOOK_URL:-}" ]; then
  echo "WEBHOOK_URL not set — skipping Discord post (dry run)." >&2
  echo "Title: $TITLE" >&2
  for line in "$@"; do echo "  - $line" >&2; done
  exit 0
fi

BASE="https://core-builds.mintlify.app"
REPO="https://github.com/brevityA/Core-Builds"
COLOR=5814783  # matches sync-releases-discord embed colour

# Build description lines: caller-provided bullets + fixed doc links.
desc="$TITLE"$'\n\n'
for line in "$@"; do
  desc+="• ${line}"$'\n'
done
desc+=$'\n'"📄 [Changelog](${BASE}/changelog)  ·  🗺️ [Roadmap](${BASE}/roadmap)  ·  ✨ [What's New](${BASE}/whats-new)"

payload=$(jq -n \
  --arg title "$TITLE" \
  --arg desc "$desc" \
  --arg ver "v${VERSION}" \
  --arg url "${REPO}/blob/main/CHANGELOG.md" \
  --argjson color "$COLOR" \
  '{ embeds: [{
      title: $title,
      url: $url,
      description: $desc,
      color: $color,
      footer: { text: ("Core Builds · " + $ver) },
      timestamp: now
    }] }')

curl -X POST -H 'Content-type: application/json' -d "$payload" \
  --fail-with-body --silent --show-error "$WEBHOOK_URL" >/dev/null

echo "Posted Discord announcement for v${VERSION}."
