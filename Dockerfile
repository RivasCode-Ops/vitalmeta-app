FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine
RUN apk add --no-cache curl mysql-client
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./
RUN chmod +x scripts/start.sh
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl --fail http://localhost:3000/api/health || exit 1

LABEL org.opencontainers.image.source="https://github.com/vitalmeta-app/vitalmeta"
LABEL org.opencontainers.image.description="VitalMeta - Diabetes Management Platform"

ENTRYPOINT ["/bin/sh", "scripts/start.sh"]
