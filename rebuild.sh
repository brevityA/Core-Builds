#!/bin/bash
# Run this after dropping the delta files into your Core-Builds checkout
# to rebuild the dist that GitHub Pages deploys.

set -e
cd "$(dirname "$0")/configurator"
echo "Installing dependencies..."
npm ci
echo "Running tests..."
npm test
echo "Running validation..."
npm run validate
echo "Building dist..."
npm run build
echo ""
echo "✅ Done. dist/ rebuilt. Commit and push to deploy."
