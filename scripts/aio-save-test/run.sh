#!/usr/bin/env bash
# Save every matrix config into a throwaway AIOStreams and fail on any refusal.
#   run.sh open        permissive host: regex and SEL sync open to all
#   run.sh restricted  ElfHosted's rules: REGEX_FILTER_ACCESS from allowlist.elfhosted.json
# Needs docker, node, and a built configurator (npm run build --prefix configurator).
# AIO_DOCKER_ARGS passes extra `docker run` flags (e.g. proxy env on a restricted network).
set -euo pipefail

VARIANT="${1:-open}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
TAG="$(node -p "JSON.parse(require('fs').readFileSync('$ROOT/configurator/UPSTREAM.pin','utf8')).ref")"
IMAGE="${AIO_IMAGE:-ghcr.io/viren070/aiostreams:$TAG}"
PORT="${AIO_PORT:-3999}"
STUB_PORT="${STUB_PORT:-4100}"
NAME="aio-save-$VARIANT"

case "$VARIANT" in
  open)
    ACCESS=(-e REGEX_FILTER_ACCESS=all -e SEL_SYNC_ACCESS=all) ;;
  restricted)
    ALLOW="$HERE/allowlist.elfhosted.json"
    ACCESS=(-e "REGEX_FILTER_ACCESS=$(node -p "require('$ALLOW').level")" -e SEL_SYNC_ACCESS=trusted
            -e "WHITELISTED_REGEX_PATTERNS_URLS=$(node -p "JSON.stringify(require('$ALLOW').urls)")"
            -e "WHITELISTED_REGEX_PATTERNS=$(node -p "JSON.stringify(require('$ALLOW').patterns)")")
    export MATRIX_HOST=elfhosted ;;
  *) echo "unknown variant: $VARIANT (open|restricted)" >&2; exit 2 ;;
esac

echo "AIOStreams $IMAGE, variant $VARIANT"
docker pull -q "$IMAGE" >/dev/null
node "$HERE/gen-env.mjs" "$IMAGE" "http://127.0.0.1:$STUB_PORT"

STUB_PORT="$STUB_PORT" node "$HERE/stub-addons.mjs" &
STUB_PID=$!
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; kill "$STUB_PID" 2>/dev/null || true; }
trap cleanup EXIT

# shellcheck disable=SC2086
docker run -d --name "$NAME" --network host \
  -e PORT="$PORT" -e BASE_URL="http://127.0.0.1:$PORT" -e INTERNAL_URL="http://127.0.0.1:$PORT" \
  -e SECRET_KEY="$(openssl rand -hex 32)" -e DISABLE_RATE_LIMITS=true \
  "${ACCESS[@]}" ${AIO_DOCKER_ARGS:-} --env-file "$HERE/stub.env" "$IMAGE" >/dev/null

for _ in $(seq 1 90); do
  curl -sf "http://127.0.0.1:$PORT/api/v1/status" >/dev/null && break
  sleep 1
done
if ! curl -sf "http://127.0.0.1:$PORT/api/v1/status" >/dev/null; then
  echo "AIOStreams did not come up" >&2; docker logs --tail 50 "$NAME" >&2; exit 1
fi

AIO_URL="http://127.0.0.1:$PORT" node "$HERE/matrix.mjs"
