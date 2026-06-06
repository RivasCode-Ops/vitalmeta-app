import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, float, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User metabolic profile - diabetes type, devices, targets
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  diabetesType: mysqlEnum("diabetesType", ["type1", "type2", "gestational", "prediabetes", "other"]),
  deviceType: mysqlEnum("deviceType", ["cgm", "glucometer", "both", "none"]),
  targetMin: int("targetMin").default(70),
  targetMax: int("targetMax").default(180),
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Glucose readings with context
 */
export const glucoseReadings = mysqlTable("glucose_readings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  value: int("value").notNull(),
  context: mysqlEnum("context", ["fasting", "pre_meal", "post_meal", "bedtime", "random"]).default("random"),
  trendArrow: mysqlEnum("trendArrow", ["rising_fast", "rising", "stable", "falling", "falling_fast"]).default("stable"),
  notes: text("notes"),
  recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GlucoseReading = typeof glucoseReadings.$inferSelect;
export type InsertGlucoseReading = typeof glucoseReadings.$inferInsert;

/**
 * Insulin logs
 */
export const insulinLogs = mysqlTable("insulin_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  insulinType: mysqlEnum("insulinType", ["rapid", "long", "mixed", "other"]).default("rapid"),
  units: float("units").notNull(),
  notes: text("notes"),
  recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsulinLog = typeof insulinLogs.$inferSelect;
export type InsertInsulinLog = typeof insulinLogs.$inferInsert;

/**
 * Meal logs
 */
export const mealLogs = mysqlTable("meal_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mealType: mysqlEnum("mealType", ["breakfast", "lunch", "dinner", "snack"]).default("snack"),
  description: text("description"),
  carbsEstimate: int("carbsEstimate"),
  isSafeMeal: boolean("isSafeMeal").default(false),
  notes: text("notes"),
  recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MealLog = typeof mealLogs.$inferSelect;
export type InsertMealLog = typeof mealLogs.$inferInsert;

/**
 * Fasting sessions
 */
export const fastingSessions = mysqlTable("fasting_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  startedAt: bigint("startedAt", { mode: "number" }).notNull(),
  endedAt: bigint("endedAt", { mode: "number" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FastingSession = typeof fastingSessions.$inferSelect;
export type InsertFastingSession = typeof fastingSessions.$inferInsert;

/**
 * Medication logs
 */
export const medicationLogs = mysqlTable("medication_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  medicationName: varchar("medicationName", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }),
  notes: text("notes"),
  recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = typeof medicationLogs.$inferInsert;

/**
 * Emergency contacts
 */
export const emergencyContacts = mysqlTable("emergency_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  relationship: varchar("relationship", { length: 100 }),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;

/**
 * Safe meals (favorites)
 */
export const safeMeals = mysqlTable("safe_meals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  carbsEstimate: int("carbsEstimate"),
  glycemicImpact: mysqlEnum("glycemicImpact", ["low", "medium", "high"]).default("low"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SafeMeal = typeof safeMeals.$inferSelect;
export type InsertSafeMeal = typeof safeMeals.$inferInsert;

/**
 * Connector configs (Nightscout, etc.) — persisted per user
 */
export const connectorConfigs = mysqlTable("connector_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  enabled: boolean("enabled").default(false),
  baseUrl: varchar("baseUrl", { length: 500 }),
  apiKey: varchar("apiKey", { length: 255 }),
  lastSyncAt: bigint("lastSyncAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConnectorConfig = typeof connectorConfigs.$inferSelect;
export type InsertConnectorConfig = typeof connectorConfigs.$inferInsert;

/**
 * Glucose entries synced from Nightscout
 */
export const glucoseEntries = mysqlTable("glucose_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sgv: int("sgv").notNull(),
  direction: varchar("direction", { length: 20 }),
  recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
  device: varchar("device", { length: 100 }),
  source: varchar("source", { length: 50 }).default("nightscout"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GlucoseEntry = typeof glucoseEntries.$inferSelect;
export type InsertGlucoseEntry = typeof glucoseEntries.$inferInsert;

/**
 * Refresh tokens for session rotation (VM-001)
 */
export const refreshTokens = mysqlTable("refresh_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jti: varchar("jti", { length: 36 }).notNull().unique(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  rotatedAt: bigint("rotatedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
