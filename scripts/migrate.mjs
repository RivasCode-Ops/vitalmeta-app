import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(__dirname, "..", "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");
const META_TABLE = "__drizzle_migrations";

function parseDsn(dsn) {
  const url = new URL(dsn);
  return {
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("[migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  if (!existsSync(JOURNAL_PATH)) {
    console.log("[migrate] No journal found — skipping");
    return;
  }

  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8"));
  const entries = journal.entries ?? [];

  if (entries.length === 0) {
    console.log("[migrate] No migrations in journal");
    return;
  }

  const cfg = parseDsn(dbUrl);
  const conn = await mysql.createConnection(cfg);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`${META_TABLE}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`tag\` VARCHAR(255) NOT NULL UNIQUE,
      \`applied_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await conn.execute(`SELECT tag FROM \`${META_TABLE}\``);
  const appliedTags = new Set(rows.map((r) => r.tag));

  for (const entry of entries) {
    if (appliedTags.has(entry.tag)) {
      console.log(`[migrate] ✓ ${entry.tag} already applied`);
      continue;
    }

    const sqlPath = join(DRIZZLE_DIR, `${entry.tag}.sql`);
    if (!existsSync(sqlPath)) {
      console.warn(`[migrate] ✗ ${entry.tag} — SQL file not found, skipping`);
      continue;
    }

    const sql = readFileSync(sqlPath, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`[migrate] → Applying ${entry.tag} (${statements.length} statements)`);

    for (const stmt of statements) {
      try {
        await conn.execute(stmt + ";");
      } catch (err) {
        console.error(`[migrate] ✗ Error in ${entry.tag}:`, err.message);
        throw err;
      }
    }

    await conn.execute(`INSERT INTO \`${META_TABLE}\` (tag) VALUES (?)`, [entry.tag]);
    console.log(`[migrate] ✓ ${entry.tag} applied`);
  }

  await conn.end();
  console.log("[migrate] All migrations complete");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] Failed:", err);
    process.exit(1);
  });
