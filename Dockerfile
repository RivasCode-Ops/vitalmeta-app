FROM node:22-alpine

RUN apk add --no-cache mysql-client curl
RUN npm install -g pnpm@latest

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

RUN chmod +x scripts/start.sh
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl --fail http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/bin/sh", "scripts/start.sh"]
