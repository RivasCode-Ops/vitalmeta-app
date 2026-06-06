import { COOKIE_NAME, REFRESH_COOKIE_NAME, ACCESS_TOKEN_EXPIRY_MS, REFRESH_TOKEN_EXPIRY_MS } from "@shared/const";
import { getSessionCookieOptions, getRefreshCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { cache } from "./cache";
import { sdk } from "./_core/sdk";
import { generateDailyBrief, detectPatterns } from "./services/ai";
import { generateAGPReport } from "./services/agp";
import { NightscoutConnector } from "./connectors/nightscout";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    refresh: publicProcedure.mutation(async ({ ctx }) => {
      const cookies = ctx.req.headers.cookie;
      if (!cookies) return { success: false } as const;
      const parsed = Object.fromEntries(cookies.split("; ").map(c => {
        const [k, ...v] = c.split("=");
        return [k, v.join("=")];
      }));
      const refreshToken = parsed[REFRESH_COOKIE_NAME];
      if (!refreshToken) return { success: false } as const;

      try {
        const newTokens = await sdk.rotateRefreshTokenPair(decodeURIComponent(refreshToken));
        const accessOpts = getSessionCookieOptions(ctx.req);
        const refreshOpts = getRefreshCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, newTokens.accessToken, { ...accessOpts, maxAge: ACCESS_TOKEN_EXPIRY_MS });
        ctx.res.cookie(REFRESH_COOKIE_NAME, newTokens.refreshToken, { ...refreshOpts, maxAge: REFRESH_TOKEN_EXPIRY_MS });
        return { success: true } as const;
      } catch {
        ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
        ctx.res.clearCookie(REFRESH_COOKIE_NAME, { ...getRefreshCookieOptions(ctx.req), maxAge: -1 });
        return { success: false } as const;
      }
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(REFRESH_COOKIE_NAME, { ...getRefreshCookieOptions(ctx.req), maxAge: -1 });
      // Revoke refresh tokens for the user if authenticated
      if (ctx.user) {
        await db.revokeUserRefreshTokens(ctx.user.id).catch(() => {});
      }
      return { success: true } as const;
    }),
  }),

  // ─── Profile & Onboarding ───────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getProfile(ctx.user.id);
      return profile ?? null;
    }),
    update: protectedProcedure.input(z.object({
      diabetesType: z.enum(["type1", "type2", "gestational", "prediabetes", "other"]).optional(),
      deviceType: z.enum(["cgm", "glucometer", "both", "none"]).optional(),
      targetMin: z.number().min(40).max(200).optional(),
      targetMax: z.number().min(100).max(400).optional(),
      onboardingCompleted: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.upsertProfile({ userId: ctx.user.id, ...input });
      cache.delete(`dashboard:${ctx.user.id}`);
      return { success: true };
    }),
  }),

  // ─── Glucose ────────────────────────────────────────────────
  glucose: router({
    add: protectedProcedure.input(z.object({
      value: z.number().min(20).max(600),
      context: z.enum(["fasting", "pre_meal", "post_meal", "bedtime", "random"]).optional(),
      trendArrow: z.enum(["rising_fast", "rising", "stable", "falling", "falling_fast"]).optional(),
      notes: z.string().optional(),
      recordedAt: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.addGlucoseReading({ userId: ctx.user.id, ...input });
      cache.delete(`dashboard:${ctx.user.id}`);
      return { success: true };
    }),
    list: protectedProcedure.input(z.object({
      from: z.number(),
      to: z.number(),
    })).query(async ({ ctx, input }) => {
      return db.getGlucoseReadings(ctx.user.id, input.from, input.to);
    }),
    latest: protectedProcedure.query(async ({ ctx }) => {
      return db.getLatestGlucose(ctx.user.id);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteGlucoseReading(input.id, ctx.user.id);
      cache.delete(`dashboard:${ctx.user.id}`);
      return { success: true };
    }),
  }),

  // ─── Insulin ────────────────────────────────────────────────
  insulin: router({
    add: protectedProcedure.input(z.object({
      insulinType: z.enum(["rapid", "long", "mixed", "other"]).optional(),
      units: z.number().min(0.1).max(200),
      notes: z.string().optional(),
      recordedAt: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.addInsulinLog({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
    list: protectedProcedure.input(z.object({
      from: z.number(),
      to: z.number(),
    })).query(async ({ ctx, input }) => {
      return db.getInsulinLogs(ctx.user.id, input.from, input.to);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteInsulinLog(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Meals ──────────────────────────────────────────────────
  meal: router({
    add: protectedProcedure.input(z.object({
      mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
      description: z.string().optional(),
      carbsEstimate: z.number().optional(),
      isSafeMeal: z.boolean().optional(),
      notes: z.string().optional(),
      recordedAt: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.addMealLog({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
    list: protectedProcedure.input(z.object({
      from: z.number(),
      to: z.number(),
    })).query(async ({ ctx, input }) => {
      return db.getMealLogs(ctx.user.id, input.from, input.to);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteMealLog(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Fasting ────────────────────────────────────────────────
  fasting: router({
    start: protectedProcedure.input(z.object({
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.startFasting({ userId: ctx.user.id, startedAt: Date.now(), ...input });
      return { success: true };
    }),
    stop: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.endFasting(input.id, ctx.user.id, Date.now());
      return { success: true };
    }),
    active: protectedProcedure.query(async ({ ctx }) => {
      return db.getActiveFasting(ctx.user.id);
    }),
  }),

  // ─── Medication ─────────────────────────────────────────────
  medication: router({
    add: protectedProcedure.input(z.object({
      medicationName: z.string().min(1),
      dosage: z.string().optional(),
      notes: z.string().optional(),
      recordedAt: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.addMedicationLog({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
    list: protectedProcedure.input(z.object({
      from: z.number(),
      to: z.number(),
    })).query(async ({ ctx, input }) => {
      return db.getMedicationLogs(ctx.user.id, input.from, input.to);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteMedicationLog(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Emergency Contacts ─────────────────────────────────────
  emergency: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmergencyContacts(ctx.user.id);
    }),
    add: protectedProcedure.input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      relationship: z.string().optional(),
      isPrimary: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.addEmergencyContact({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteEmergencyContact(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Safe Meals ─────────────────────────────────────────────
  safeMeals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getSafeMeals(ctx.user.id);
    }),
    add: protectedProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      carbsEstimate: z.number().optional(),
      glycemicImpact: z.enum(["low", "medium", "high"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.addSafeMeal({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteSafeMeal(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Glycemia (CGM + manual, Nightscout-first) ────────────
  glycemia: router({
    latest: protectedProcedure.query(async ({ ctx }) => {
      const [entry, manual, profile] = await Promise.all([
        db.getLatestGlucoseEntry(ctx.user.id),
        db.getLatestGlucose(ctx.user.id),
        db.getProfile(ctx.user.id),
      ]);
      const targetMin = profile?.targetMin ?? 70;
      const targetMax = profile?.targetMax ?? 180;
      if (entry) return { value: entry.sgv, direction: entry.direction ?? "stable", recordedAt: entry.recordedAt, source: "nightscout" as const, targetMin, targetMax };
      if (manual) return { value: manual.value, direction: manual.trendArrow ?? "stable", recordedAt: manual.recordedAt, source: "manual" as const, targetMin, targetMax };
      return null;
    }),
    history: protectedProcedure.input(z.object({ hours: z.number().default(24) })).query(async ({ ctx, input }) => {
      const now = Date.now();
      const from = now - input.hours * 60 * 60 * 1000;
      const [entries, readings] = await Promise.all([
        db.getGlucoseEntries(ctx.user.id, from, now),
        db.getGlucoseReadings(ctx.user.id, from, now),
      ]);
      if (entries.length > 0) return entries.map(e => ({ value: e.sgv, direction: e.direction ?? "stable", recordedAt: e.recordedAt, source: "nightscout" as const })).reverse();
      return readings.map(r => ({ value: r.value, direction: r.trendArrow ?? "stable", recordedAt: r.recordedAt, source: "manual" as const })).reverse();
    }),
    stats: protectedProcedure.input(z.object({ hours: z.number().default(24) })).query(async ({ ctx, input }) => {
      const now = Date.now();
      const from = now - input.hours * 60 * 60 * 1000;
      const [entries, readings, profile] = await Promise.all([
        db.getGlucoseEntries(ctx.user.id, from, now),
        db.getGlucoseReadings(ctx.user.id, from, now),
        db.getProfile(ctx.user.id),
      ]);
      const targetMin = profile?.targetMin ?? 70;
      const targetMax = profile?.targetMax ?? 180;
      const data = entries.length > 0 ? entries : readings;
      const values = data.map(d => "sgv" in d ? d.sgv : d.value);
      const n = values.length;
      if (n === 0) return { readings: 0, meanGlucose: 0, timeInRange: 0, coefficientOfVariation: 0, glucoseManagementIndicator: 0, targetMin, targetMax };
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const inRange = values.filter(v => v >= targetMin && v <= targetMax).length;
      const variance = n > 1 ? values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
      const sd = Math.sqrt(variance);
      return {
        readings: n,
        meanGlucose: Math.round(mean * 10) / 10,
        timeInRange: Math.round((inRange / n) * 100),
        coefficientOfVariation: mean > 0 ? Math.round((sd / mean) * 100 * 10) / 10 : 0,
        glucoseManagementIndicator: Math.round((12.71 + 4.70587 * (mean / 18.015)) * 10) / 10,
        targetMin, targetMax,
      };
    }),
  }),

  // ─── Dashboard (cached) ─────────────────────────────────────
  dashboard: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return cache.getOrSet(
        `dashboard:${ctx.user.id}`,
        () => db.getDashboardData(ctx.user.id),
        30000,
      );
    }),
  }),

  // ─── Timeline ───────────────────────────────────────────────
  timeline: router({
    events: protectedProcedure.input(z.object({
      from: z.number(),
      to: z.number(),
    })).query(async ({ ctx, input }) => {
      return db.getTimelineEvents(ctx.user.id, input.from, input.to);
    }),
  }),

  // ─── Connectors (Nightscout) ────────────────────────────────
  connectors: router({
    nightscout: router({
      connect: protectedProcedure.input(z.object({
        baseUrl: z.string().url(),
        apiKey: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const connector = new NightscoutConnector({
          name: "nightscout",
          enabled: true,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          syncIntervalMs: 300000,
        });
        const valid = await connector.validate();
        if (!valid) throw new Error("Could not connect to Nightscout. Check the URL and API key.");
        await db.upsertConnectorConfig({
          userId: ctx.user.id,
          type: "nightscout",
          enabled: true,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey ?? null,
          lastSyncAt: null,
        });
        return { success: true, message: "Connected to Nightscout successfully." };
      }),
      status: protectedProcedure.query(async ({ ctx }) => {
        const config = await db.getConnectorConfig(ctx.user.id, "nightscout");
        if (!config) return { connected: false };
        return { connected: config.enabled, baseUrl: config.baseUrl, lastSyncAt: config.lastSyncAt };
      }),
      sync: protectedProcedure.mutation(async ({ ctx }) => {
        const config = await db.getConnectorConfig(ctx.user.id, "nightscout");
        if (!config || !config.baseUrl) throw new Error("Nightscout not connected. Use connectors.nightscout.connect first.");
        const connector = new NightscoutConnector({
          name: "nightscout",
          enabled: true,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey ?? undefined,
          syncIntervalMs: 300000,
        });
        const since = config.lastSyncAt ?? Date.now() - 24 * 60 * 60 * 1000;
        const data = await connector.sync(since);
        let imported = 0;
        for (const g of data.glucose) {
          try {
            await db.addGlucoseEntry({
              userId: ctx.user.id,
              sgv: g.value,
              direction: g.trendArrow ?? null,
              recordedAt: g.recordedAt,
              device: null,
              source: "nightscout",
            });
            imported++;
          } catch { /* skip duplicates */ }
        }
        await db.upsertConnectorConfig({
          userId: ctx.user.id,
          type: "nightscout",
          enabled: true,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          lastSyncAt: Date.now(),
        });
        cache.delete(`dashboard:${ctx.user.id}`);
        return {
          success: true,
          imported: { glucose: imported, treatments: data.treatments.length },
        };
      }),
      disconnect: protectedProcedure.mutation(async ({ ctx }) => {
        await db.deleteConnectorConfig(ctx.user.id, "nightscout");
        return { success: true };
      }),
    }),
  }),

  // ─── Insights (AI-powered) ───────────────────────────────────
  insights: router({
    dailyBrief: protectedProcedure.query(async ({ ctx }) => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const profile = await db.getProfile(ctx.user.id);
      const [glucose, meals, insulin, medications] = await Promise.all([
        db.getGlucoseReadings(ctx.user.id, dayAgo, now),
        db.getMealLogs(ctx.user.id, dayAgo, now),
        db.getInsulinLogs(ctx.user.id, dayAgo, now),
        db.getMedicationLogs(ctx.user.id, dayAgo, now),
      ]);

      const targetMin = profile?.targetMin ?? 70;
      const targetMax = profile?.targetMax ?? 180;

      const patterns = detectPatterns(
        glucose.map(g => ({ value: g.value, recordedAt: g.recordedAt, context: g.context })),
        targetMin, targetMax,
      );

      const brief = await generateDailyBrief({
        glucose: glucose.map(g => ({ value: g.value, recordedAt: g.recordedAt, context: g.context })),
        meals: meals.map(m => ({ description: m.description, carbsEstimate: m.carbsEstimate, recordedAt: m.recordedAt, mealType: m.mealType })),
        insulin: insulin.map(i => ({ units: i.units, insulinType: i.insulinType, recordedAt: i.recordedAt })),
        medications: medications.map(m => ({ medicationName: m.medicationName, dosage: m.dosage, recordedAt: m.recordedAt })),
        targetMin,
        targetMax,
      });

      return { brief, patterns };
    }),

    patterns: protectedProcedure.query(async ({ ctx }) => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const profile = await db.getProfile(ctx.user.id);
      const readings = await db.getGlucoseReadings(ctx.user.id, dayAgo, now);
      const targetMin = profile?.targetMin ?? 70;
      const targetMax = profile?.targetMax ?? 180;
      return detectPatterns(
        readings.map(r => ({ value: r.value, recordedAt: r.recordedAt, context: r.context })),
        targetMin, targetMax,
      );
    }),
  }),

  // ─── Reports ────────────────────────────────────────────────
  reports: router({
    agp: protectedProcedure.input(z.object({
      from: z.number(),
      to: z.number(),
    })).query(async ({ ctx, input }) => {
      const profile = await db.getProfile(ctx.user.id);
      const readings = await db.getGlucoseReadings(ctx.user.id, input.from, input.to);
      return generateAGPReport(
        readings,
        profile?.targetMin ?? 70,
        profile?.targetMax ?? 180,
        input.from,
        input.to,
      );
    }),
  }),
});

export type AppRouter = typeof appRouter;
