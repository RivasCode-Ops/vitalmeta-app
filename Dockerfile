FROM node:22-alpine

RUN apk add --no-cache mysql-client curl

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

RUN chmod +x scripts/start.sh
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl --fail http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/bin/sh", "scripts/start.sh"]
