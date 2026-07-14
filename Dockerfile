FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Receive NEXT_PUBLIC_ vars from docker-compose build args so Next.js can embed
# them into the client bundle at build time (they are NOT read from .env during build)
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate

# Provide dummy build-time secrets so Next.js can collect page data.
# Real values are injected at runtime via docker-compose environment.
ARG SESSION_SECRET=build-time-placeholder-not-used-at-runtime
ENV SESSION_SECRET=$SESSION_SECRET

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone output: server.js + file-traced node_modules subset (T-GB-018).
# Replaces the old `npm ci --omit=dev` + full `.next` copy (4.11GB image —
# .next/cache alone was multi-GB and never needed at runtime).
# COPY --chown instead of a trailing `chown -R /app` — the latter duplicated
# every copied byte into an extra 660MB layer.
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

# Prisma CLI + engines for `migrate deploy` in docker-start.sh.
# File tracing only bundles the client runtime, not the CLI/schema-engine.
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --chown=nextjs:nodejs --from=builder /app/docker-start.sh ./docker-start.sh

# Large static assets (public/book-exercises, public/exercises, uploads) are
# NOT baked in — they are git-tracked (or host-managed) and bind-mounted
# read-only via docker-compose. mkdir keeps the mount points owned by nextjs.
RUN chmod +x docker-start.sh \
    && mkdir -p /app/public/uploads /app/public/exercises/generated /app/public/book-exercises \
    && chown -R nextjs:nodejs /app/public

USER nextjs

EXPOSE 3000

CMD ["./docker-start.sh"]
