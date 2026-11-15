#!/usr/bin/env bash
# Runs once, when the dev container is first created.
set -euo pipefail

echo "▶ Installing packages…"
npm install --no-audit --no-fund

if [ ! -f .env ]; then
  echo "▶ Creating .env…"
  secret=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -e "s/^JWT_SECRET=.*/JWT_SECRET=${secret}/" \
      -e "s/^DB_PASSWORD=.*/DB_PASSWORD=IncomeDev2026_Pass/" \
      .env.example > .env
fi

echo "▶ Waiting for SQL Server and creating tables (can take up to a minute)…"
for attempt in $(seq 1 30); do
  if npm run --silent db:init 2>/dev/null; then
    echo "✓ Ready. Run: npm run dev   then open http://localhost:3000"
    exit 0
  fi
  sleep 4
done

echo "⚠ SQL Server is still starting. Run 'npm run db:init' in a minute, then 'npm run dev'."
