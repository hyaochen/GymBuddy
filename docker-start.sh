#!/bin/sh
set -eu

echo "[gymbuddy] Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "${NODE_ENV:-}" = "production" ] && [ "${COOKIE_SECURE:-}" != "true" ] && [ "${ALLOW_INSECURE_COOKIES:-}" != "true" ]; then
  echo "[gymbuddy] Refusing to start: COOKIE_SECURE=true is required in production."
  exit 1
fi

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  if [ "${NODE_ENV:-}" = "production" ]; then
    echo "[gymbuddy] Ignoring RUN_DB_SEED=true in production."
  else
    echo "[gymbuddy] Running database seed..."
    ./node_modules/.bin/prisma db seed
  fi
else
  echo "[gymbuddy] Skipping database seed."
fi

echo "[gymbuddy] Starting Next.js on port 3000..."
./node_modules/.bin/next start -H 0.0.0.0 -p 3000
