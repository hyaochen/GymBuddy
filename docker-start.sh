#!/bin/sh
set -eu

echo "[gymbuddy] Applying Prisma migrations..."
npx prisma migrate deploy

echo "[gymbuddy] Running database seed..."
npx prisma db seed || true

echo "[gymbuddy] Starting Next.js on port 3000..."
npx next start -H 0.0.0.0 -p 3000
