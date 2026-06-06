import { eq, sql } from "drizzle-orm";
import { connectorConfigs } from "../../drizzle/schema";
import * as db from "../db";
import { NightscoutConnector } from "../connectors/nightscout";

const INTERVAL_MS = 300_000; // 5 minutes
let timer: ReturnType<typeof setInterval> | null = null;

async function syncUser(userId: number) {
  const config = await db.getConnectorConfig(userId, "nightscout");
  if (!config || !config.enabled || !config.baseUrl) return;

  const connector = new NightscoutConnector({
    name: "nightscout",
    enabled: true,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey ?? undefined,
    syncIntervalMs: INTERVAL_MS,
  });

  const since = config.lastSyncAt ?? Date.now() - 24 * 60 * 60 * 1000;
  const result = await connector.sync(since);

  for (const g of result.glucose) {
    try {
      await db.addGlucoseEntry({
        userId,
        sgv: g.value,
        direction: g.trendArrow ?? null,
        recordedAt: g.recordedAt,
        device: null,
        source: "nightscout",
      });
    } catch { /* skip duplicates */ }
  }

  await db.upsertConnectorConfig({
    userId,
    type: "nightscout",
    enabled: true,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    lastSyncAt: Date.now(),
  });
}

async function syncAll() {
  const _db = await db.getDb();
  if (!_db) return;

  const active = await _db.select().from(connectorConfigs)
    .where(sql`${connectorConfigs.enabled} = true`);

  await Promise.allSettled(active.map(c => syncUser(c.userId)));
}

export function startSyncScheduler() {
  if (timer) return;
  timer = setInterval(syncAll, INTERVAL_MS);
  syncAll();
}

export function stopSyncScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
