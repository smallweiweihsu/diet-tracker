import { describe, expect, it } from "vitest";
import { appRouter, dayRange, DAY_MS } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock context ──────────────────────────────────────────────────────────────
function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test User");
  });

  it("logout clears cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...makeCtx(),
      res: {
        clearCookie: (name: string) => { cleared.push(name); },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared).toHaveLength(1);
  });
});

// ── Goals validation ──────────────────────────────────────────────────────────
describe("goals.update input validation", () => {
  it("rejects dailyCalories below 500", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.goals.update({ dailyCalories: 100 })
    ).rejects.toThrow();
  });

  it("rejects dailyCalories above 9999", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.goals.update({ dailyCalories: 10000 })
    ).rejects.toThrow();
  });

  it("rejects invalid reminderTime format", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.goals.update({ reminderTime: "7:00" }) // missing leading zero
    ).rejects.toThrow();
  });

  it("accepts valid reminderTime", async () => {
    // This will fail at DB level in test env (no DB), but should pass validation
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    // Just check it doesn't throw on input validation (DB error is expected)
    try {
      await caller.goals.update({ reminderTime: "07:30" });
    } catch (e: unknown) {
      // DB error is acceptable in test env
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).not.toContain("Invalid");
    }
  });
});

// ── Food input validation ─────────────────────────────────────────────────────
describe("food.add input validation", () => {
  it("rejects empty foodName", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.food.add({
        mealType: "breakfast",
        foodName: "",
        calories: 100,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid mealType", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.food.add({
        mealType: "brunch" as "breakfast",
        foodName: "test",
        calories: 100,
      })
    ).rejects.toThrow();
  });

  it("rejects negative calories", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.food.add({
        mealType: "lunch",
        foodName: "test food",
        calories: -10,
      })
    ).rejects.toThrow();
  });
});

// ── Exercise input validation ─────────────────────────────────────────────────
describe("exercise.add input validation", () => {
  it("rejects empty exerciseType", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.exercise.add({ exerciseType: "", durationMin: 30 })
    ).rejects.toThrow();
  });

  it("rejects negative durationMin", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.exercise.add({ exerciseType: "慢跑", durationMin: -5 })
    ).rejects.toThrow();
  });
});

// ── Day range (timezone-safe) ─────────────────────────────────────────────────
describe("dayRange", () => {
  it("uses the client-provided day start verbatim, spanning exactly 24h", () => {
    // 2026-07-09 00:00 in UTC+8 = 2026-07-08T16:00:00Z
    const taipeiMidnight = Date.UTC(2026, 6, 8, 16, 0, 0, 0);
    const { startMs, endMs } = dayRange(taipeiMidnight);
    expect(startMs).toBe(taipeiMidnight);
    expect(endMs).toBe(taipeiMidnight + DAY_MS - 1);
  });

  it("includes entries logged late in the client's local day", () => {
    const dayStart = Date.UTC(2026, 6, 8, 16, 0, 0, 0);
    const lateEvening = dayStart + 23 * 60 * 60 * 1000; // 23:00 local
    const { startMs, endMs } = dayRange(dayStart);
    expect(lateEvening).toBeGreaterThanOrEqual(startMs);
    expect(lateEvening).toBeLessThanOrEqual(endMs);
  });
});

// ── Stats range validation ────────────────────────────────────────────────────
describe("stats.range input validation", () => {
  it("rejects days above 90", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.stats.range({ startMs: Date.now(), days: 91 })
    ).rejects.toThrow();
  });

  it("rejects non-positive days", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.stats.range({ startMs: Date.now(), days: 0 })
    ).rejects.toThrow();
  });

  it("returns one empty bucket per day when there is no data", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const startMs = Date.UTC(2026, 6, 1, 16, 0, 0, 0);
    const result = await caller.stats.range({ startMs, days: 7 });
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ dateMs: startMs, calories: 0, burned: 0 });
    expect(result[6].dateMs).toBe(startMs + 6 * DAY_MS);
  });
});

// ── Weight input validation ───────────────────────────────────────────────────
describe("weight.logToday input validation", () => {
  it("rejects non-positive weight", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.weight.logToday({ weightKg: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative weight", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.weight.logToday({ weightKg: -10 })
    ).rejects.toThrow();
  });
});
