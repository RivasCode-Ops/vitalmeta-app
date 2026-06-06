#!/bin/sh
set -e

echo "[start] Waiting for MySQL..."
node -e "
import('mysql2/promise').then(async (mysql) => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log('[start] DATABASE_URL not set, skipping wait'); process.exit(0); }
  const u = new URL(url);
  const cfg = {
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
  for (let i = 0; i < 30; i++) {
    try {
      const c = await mysql.default.createConnection(cfg);
      await c.ping();
      await c.end();
      console.log('[start] MySQL is ready');
      process.exit(0);
    } catch {
      console.log('[start] Waiting for MySQL... (' + (i + 1) + '/30)');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error('[start] MySQL not available after 60s');
  process.exit(1);
});
"

echo "[start] Running migrations..."
node scripts/migrate.mjs

echo "[start] Starting app..."
exec node dist/index.js
