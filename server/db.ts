import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  userProfiles, InsertUserProfile,
  glucoseReadings, InsertGlucoseReading,
  insulinLogs, InsertInsulinLog,
  mealLogs, InsertMealLog,
  fastingSessions, InsertFastingSession,
  medicationLogs, InsertMedicationLog,
  emergencyContacts, InsertEmergencyContact,
  safeMeals, InsertSafeMeal,
  refreshTokens, InsertRefreshToken,
  connectorConfigs, InsertConnectorConfig,
  glucoseEntries, InsertGlucoseEntry,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    if (process.env.DATABASE_URL) {
      try {
        _db = drizzle(process.env.DATABASE_URL);
      } catch (error) {
        console.warn("[Database] Failed to connect:", error);
        _db = null;
      }
    } else {
      console.warn("[Database] DATABASE_URL not configured — database unavailable");
    }
  }
  return _db;
}

// ─── User Auth ───────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return undefined; }
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── User Profiles ───────────────────────────────────────────────
export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return undefined; }
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0] ?? undefined;
}

export async function upsertProfile(data: InsertUserProfile) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  const existing = await getProfile(data.userId);
  if (existing) {
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, data.userId));
  } else {
    await db.insert(userProfiles).values(data);
  }
}

// ─── Glucose Readings ────────────────────────────────────────────
export async function addGlucoseReading(data: InsertGlucoseReading) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(glucoseReadings).values(data);
}

export async function getGlucoseReadings(userId: number, from: number, to: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(glucoseReadings)
    .where(and(eq(glucoseReadings.userId, userId), gte(glucoseReadings.recordedAt, from), lte(glucoseReadings.recordedAt, to)))
    .orderBy(desc(glucoseReadings.recordedAt));
}

export async function getLatestGlucose(userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return undefined; }
  const result = await db.select().from(glucoseReadings)
    .where(eq(glucoseReadings.userId, userId))
    .orderBy(desc(glucoseReadings.recordedAt)).limit(1);
  return result[0] ?? undefined;
}

export async function deleteGlucoseReading(id: number, userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.delete(glucoseReadings).where(and(eq(glucoseReadings.id, id), eq(glucoseReadings.userId, userId)));
}

// ─── Insulin Logs ────────────────────────────────────────────────
export async function addInsulinLog(data: InsertInsulinLog) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(insulinLogs).values(data);
}

export async function getInsulinLogs(userId: number, from: number, to: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(insulinLogs)
    .where(and(eq(insulinLogs.userId, userId), gte(insulinLogs.recordedAt, from), lte(insulinLogs.recordedAt, to)))
    .orderBy(desc(insulinLogs.recordedAt));
}

export async function deleteInsulinLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.delete(insulinLogs).where(and(eq(insulinLogs.id, id), eq(insulinLogs.userId, userId)));
}

// ─── Meal Logs ───────────────────────────────────────────────────
export async function addMealLog(data: InsertMealLog) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(mealLogs).values(data);
}

export async function getMealLogs(userId: number, from: number, to: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), gte(mealLogs.recordedAt, from), lte(mealLogs.recordedAt, to)))
    .orderBy(desc(mealLogs.recordedAt));
}

export async function deleteMealLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.delete(mealLogs).where(and(eq(mealLogs.id, id), eq(mealLogs.userId, userId)));
}

// ─── Fasting Sessions ────────────────────────────────────────────
export async function startFasting(data: InsertFastingSession) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(fastingSessions).values(data);
}

export async function endFasting(id: number, userId: number, endedAt: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.update(fastingSessions).set({ endedAt }).where(and(eq(fastingSessions.id, id), eq(fastingSessions.userId, userId)));
}

export async function getActiveFasting(userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return undefined; }
  const result = await db.select().from(fastingSessions)
    .where(and(eq(fastingSessions.userId, userId), sql`${fastingSessions.endedAt} IS NULL`))
    .orderBy(desc(fastingSessions.startedAt)).limit(1);
  return result[0] ?? undefined;
}

export async function getFastingSessions(userId: number, from: number, to: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(fastingSessions)
    .where(and(eq(fastingSessions.userId, userId), gte(fastingSessions.startedAt, from), lte(fastingSessions.startedAt, to)))
    .orderBy(desc(fastingSessions.startedAt));
}

// ─── Medication Logs ─────────────────────────────────────────────
export async function addMedicationLog(data: InsertMedicationLog) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(medicationLogs).values(data);
}

export async function getMedicationLogs(userId: number, from: number, to: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(medicationLogs)
    .where(and(eq(medicationLogs.userId, userId), gte(medicationLogs.recordedAt, from), lte(medicationLogs.recordedAt, to)))
    .orderBy(desc(medicationLogs.recordedAt));
}

export async function deleteMedicationLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.delete(medicationLogs).where(and(eq(medicationLogs.id, id), eq(medicationLogs.userId, userId)));
}

// ─── Emergency Contacts ──────────────────────────────────────────
export async function getEmergencyContacts(userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
}

export async function addEmergencyContact(data: InsertEmergencyContact) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(emergencyContacts).values(data);
}

export async function deleteEmergencyContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.delete(emergencyContacts).where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId)));
}

// ─── Safe Meals ──────────────────────────────────────────────────
export async function getSafeMeals(userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return []; }
  return db.select().from(safeMeals).where(eq(safeMeals.userId, userId));
}

export async function addSafeMeal(data: InsertSafeMeal) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.insert(safeMeals).values(data);
}

export async function deleteSafeMeal(id: number, userId: number) {
  const db = await getDb();
  if (!db) { console.warn("[Database] DB unavailable"); return; }
  await db.delete(safeMeals).where(and(eq(safeMeals.id, id), eq(safeMeals.userId, userId)));
}

// ─── Dashboard Aggregation ───────────────────────────────────────
export async function getDashboardData(userId: number) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const readings = await getGlucoseReadings(userId, dayAgo, now);
  const profile = await getProfile(userId);
  const latest = await getLatestGlucose(userId);
  const activeFast = await getActiveFasting(userId);

  const targetMin = profile?.targetMin ?? 70;
  const targetMax = profile?.targetMax ?? 180;

  // Time in Range calculation
  const inRange = readings.filter(r => r.value >= targetMin && r.value <= targetMax).length;
  const timeInRange = readings.length > 0 ? Math.round((inRange / readings.length) * 100) : 0;

  // Metabolic Score (0-100) based on time in range, variability, and trend
  let score = timeInRange;
  if (readings.length >= 2) {
    const values = readings.map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / avg;
    // Lower CV is better, penalize high variability
    const cvPenalty = Math.min(cv * 100, 30);
    score = Math.max(0, Math.min(100, Math.round(score - cvPenalty)));
  }

  return {
    score,
    timeInRange,
    readingsCount: readings.length,
    latestGlucose: latest ? { value: latest.value, trendArrow: latest.trendArrow, recordedAt: latest.recordedAt, context: latest.context } : null,
    activeFasting: activeFast ? { id: activeFast.id, startedAt: activeFast.startedAt } : null,
    targetMin,
    targetMax,
  };
}

// ─── Timeline Aggregation ────────────────────────────────────────
export async function getTimelineEvents(userId: number, from: number, to: number) {
  const [glucose, insulin, meals, fasting, meds] = await Promise.all([
    getGlucoseReadings(userId, from, to),
    getInsulinLogs(userId, from, to),
    getMealLogs(userId, from, to),
    getFastingSessions(userId, from, to),
    getMedicationLogs(userId, from, to),
  ]);

  const events: Array<{ type: string; timestamp: number; data: Record<string, unknown> }> = [];

  glucose.forEach(r => events.push({ type: "glucose", timestamp: r.recordedAt, data: { value: r.value, context: r.context, trendArrow: r.trendArrow, id: r.id } }));
  insulin.forEach(r => events.push({ type: "insulin", timestamp: r.recordedAt, data: { units: r.units, insulinType: r.insulinType, id: r.id } }));
  meals.forEach(r => events.push({ type: "meal", timestamp: r.recordedAt, data: { mealType: r.mealType, description: r.description, carbsEstimate: r.carbsEstimate, id: r.id } }));
  fasting.forEach(r => events.push({ type: "fasting", timestamp: r.startedAt, data: { endedAt: r.endedAt, id: r.id } }));
  meds.forEach(r => events.push({ type: "medication", timestamp: r.recordedAt, data: { medicationName: r.medicationName, dosage: r.dosage, id: r.id } }));

  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}

// ─── Refresh Tokens (VM-001) ──────────────────────────────────

export async function createRefreshToken(data: InsertRefreshToken) {
  const _db = await getDb();
  if (!_db) return;
  await _db.insert(refreshTokens).values(data);
}

export async function findRefreshTokenByJti(jti: string) {
  const _db = await getDb();
  if (!_db) return null;
  const result = await _db.select().from(refreshTokens).where(eq(refreshTokens.jti, jti)).limit(1);
  return result[0] ?? null;
}

export async function markRefreshTokenRotated(jti: string) {
  const _db = await getDb();
  if (!_db) return;
  await _db.update(refreshTokens).set({ rotatedAt: Date.now() }).where(eq(refreshTokens.jti, jti));
}

export async function revokeUserRefreshTokens(userId: number) {
  const _db = await getDb();
  if (!_db) return;
  await _db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

// ─── Connector Configs ────────────────────────────────────

export async function getConnectorConfig(userId: number, type: string) {
  const _db = await getDb();
  if (!_db) return null;
  const result = await _db.select().from(connectorConfigs)
    .where(and(eq(connectorConfigs.userId, userId), eq(connectorConfigs.type, type)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertConnectorConfig(data: InsertConnectorConfig) {
  const _db = await getDb();
  if (!_db) return;
  const existing = await getConnectorConfig(data.userId, data.type);
  if (existing) {
    await _db.update(connectorConfigs).set(data).where(eq(connectorConfigs.id, existing.id));
  } else {
    await _db.insert(connectorConfigs).values(data);
  }
}

export async function deleteConnectorConfig(userId: number, type: string) {
  const _db = await getDb();
  if (!_db) return;
  await _db.delete(connectorConfigs)
    .where(and(eq(connectorConfigs.userId, userId), eq(connectorConfigs.type, type)));
}

// ─── Glucose Entries (Nightscout sync) ────────────────────

export async function addGlucoseEntry(data: InsertGlucoseEntry) {
  const _db = await getDb();
  if (!_db) return;
  await _db.insert(glucoseEntries).values(data);
}

export async function getGlucoseEntries(userId: number, from: number, to: number) {
  const _db = await getDb();
  if (!_db) return [];
  return _db.select().from(glucoseEntries)
    .where(and(
      eq(glucoseEntries.userId, userId),
      gte(glucoseEntries.recordedAt, from),
      lte(glucoseEntries.recordedAt, to),
    ))
    .orderBy(desc(glucoseEntries.recordedAt));
}

export async function getLatestGlucoseEntry(userId: number) {
  const _db = await getDb();
  if (!_db) return null;
  const result = await _db.select().from(glucoseEntries)
    .where(eq(glucoseEntries.userId, userId))
    .orderBy(desc(glucoseEntries.recordedAt))
    .limit(1);
  return result[0] ?? null;
}
