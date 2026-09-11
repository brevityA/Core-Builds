#!/usr/bin/env bash
# Fetch the operator /healthz and /api/stats payloads.
# Usage:
#   STATS_ADMIN_TOKEN=... ./cloudflare-worker/operator-stats.sh
#   ADMIN_TOKEN=... ./cloudflare-worker/operator-stats.sh
set -euo pipefail

BASE="${WORKER_BASE_URL:-https://core-builds-cors-proxy.tlorenzato26.workers.dev}"
TOKEN="${STATS_ADMIN_TOKEN:-${ADMIN_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo "Set STATS_ADMIN_TOKEN (or ADMIN_TOKEN) in the environment." >&2
  echo "See cloudflare-worker/OPERATOR.md" >&2
  exit 1
fi

if [ "${#TOKEN}" -lt 16 ]; then
  echo "Token is shorter than 16 characters — the Worker treats that as unset." >&2
  exit 1
fi

echo "# GET $BASE/healthz"
curl -sS "$BASE/healthz" -H "Authorization: Bearer $TOKEN"
echo
echo
echo "# GET $BASE/api/stats"
curl -sS "$BASE/api/stats" -H "Authorization: Bearer $TOKEN"
echo
