#!/bin/sh
set -eu

echo "[gymbuddy] Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss

echo "[gymbuddy] Running database seed..."
npx prisma db seed || true

echo "[gymbuddy] Starting Next.js on port 3000..."
npx next start -H 0.0.0.0 -p 3000
