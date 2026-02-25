FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Receive NEXT_PUBLIC_ vars from docker-compose build args so Next.js can embed
# them into the client bundle at build time (they are NOT read from .env during build)
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate
RUN npm run build

FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

RUN chmod +x docker-start.sh

EXPOSE 3000

CMD ["./docker-start.sh"]
