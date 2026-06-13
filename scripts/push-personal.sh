#!/usr/bin/env bash
set -e

cd "$(git rev-parse --show-toplevel)"

BRANCH="${1:-main}"
MSG="${2:-chore: update personal suite $(date +%Y-%m-%d)}"

if ! git diff --quiet HEAD -- Templates/Personal/ 2>/dev/null || \
   ! git diff --cached --quiet -- Templates/Personal/ 2>/dev/null; then
  git add Templates/Personal/
  git commit -m "$MSG"
fi

git push -u origin "$BRANCH"
echo "Personal suite pushed to $BRANCH"
