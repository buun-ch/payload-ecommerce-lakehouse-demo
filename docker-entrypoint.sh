#!/bin/sh
set -e

# Check if static pages need to be generated (only on first run or if .next/BUILD_ID is missing)
if [ ! -f .next/BUILD_ID ] || [ ! -d .next/server/app ]; then
  echo "Generating static pages..."
  NODE_OPTIONS="--no-deprecation --max-old-space-size=8000" node_modules/.bin/next build --experimental-build-mode generate || echo "Static generation skipped or failed, continuing with dynamic rendering"
else
  echo "Static pages already generated, skipping generation..."
fi

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
