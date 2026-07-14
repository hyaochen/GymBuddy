#!/bin/sh
set -eu

# Standalone image has no node_modules/.bin symlinks — call the CLI entry directly.
echo "[gymbuddy] Applying Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

if [ "${NODE_ENV:-}" = "production" ] && [ "${COOKIE_SECURE:-}" != "true" ] && [ "${ALLOW_INSECURE_COOKIES:-}" != "true" ]; then
  echo "[gymbuddy] Refusing to start: COOKIE_SECURE=true is required in production."
  exit 1
fi

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  if [ "${NODE_ENV:-}" = "production" ]; then
    echo "[gymbuddy] Ignoring RUN_DB_SEED=true in production."
  else
    echo "[gymbuddy] Running database seed..."
    node node_modules/prisma/build/index.js db seed
  fi
else
  echo "[gymbuddy] Skipping database seed."
fi

# Standalone server; host/port come from HOSTNAME/PORT env (set in Dockerfile).
echo "[gymbuddy] Starting Next.js (standalone) on port 3000..."
exec node server.js
