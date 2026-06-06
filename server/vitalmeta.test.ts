import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-vitalmeta-user",
    email: "test@vitalmeta.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("VitalMeta Router Tests", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@vitalmeta.com");
    });

    it("returns null when not authenticated", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });
  });

  describe("protected procedures require auth", () => {
    it("profile.get throws UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.profile.get()).rejects.toThrow();
    });

    it("dashboard.get throws UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.dashboard.get()).rejects.toThrow();
    });

    it("glucose.add throws UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.glucose.add({ value: 120, recordedAt: Date.now() })
      ).rejects.toThrow();
    });

    it("safeMeals.list throws UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.safeMeals.list()).rejects.toThrow();
    });

    it("emergency.list throws UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.emergency.list()).rejects.toThrow();
    });

    it("timeline.events throws UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.timeline.events({ from: Date.now() - 86400000, to: Date.now() })
      ).rejects.toThrow();
    });
  });

  describe("input validation", () => {
    it("glucose.add rejects value below 20", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.glucose.add({ value: 10, recordedAt: Date.now() })
      ).rejects.toThrow();
    });

    it("glucose.add rejects value above 600", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.glucose.add({ value: 700, recordedAt: Date.now() })
      ).rejects.toThrow();
    });

    it("insulin.add rejects units below 0.1", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.insulin.add({ units: 0, recordedAt: Date.now() })
      ).rejects.toThrow();
    });

    it("emergency.add rejects empty name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.emergency.add({ name: "", phone: "123456" })
      ).rejects.toThrow();
    });

    it("safeMeals.add rejects empty name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.safeMeals.add({ name: "" })
      ).rejects.toThrow();
    });

    it("profile.update rejects targetMin below 40", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.profile.update({ targetMin: 10 })
      ).rejects.toThrow();
    });

    it("profile.update rejects targetMax above 400", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.profile.update({ targetMax: 500 })
      ).rejects.toThrow();
    });
  });
});
