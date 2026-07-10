import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  deleteFoodLog,
  deleteExerciseLog,
  deleteWeightLog,
  getExerciseLogs,
  getFoodLogs,
  getTodayWeightLog,
  getUserGoals,
  getWeightLogs,
  insertExerciseLog,
  insertFoodLog,
  insertWeightLog,
  updateExerciseLog,
  updateWeightLog,
  upsertUserGoals,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  isPasswordRequired,
  signSessionToken,
  verifyPassword,
} from "./_core/auth";
import { analyzeFoodImage, analyzeFoodText, analyzeWorkoutImage } from "./ai";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ── Helpers ──────────────────────────────────────────────────────────────────
export const DAY_MS = 24 * 60 * 60 * 1000;

// Clients send the start-of-day timestamp computed in *their* timezone
// (see client dayStartMs). The server must not re-derive day boundaries in
// its own timezone, so a day is simply [dayStartMs, dayStartMs + 24h).
export function dayRange(dayStartMs: number) {
  return { startMs: dayStartMs, endMs: dayStartMs + DAY_MS - 1 };
}

// Fallback for requests that omit dateMs: server-local start of today.
function serverTodayStartMs() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// ── App Router ────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    // Whether the client must show the password gate before using the app.
    config: publicProcedure.query(() => ({
      passwordRequired: isPasswordRequired(),
    })),

    login: publicProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!isPasswordRequired()) return { success: true } as const;
        if (!verifyPassword(input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "密碼錯誤" });
        }
        const token = await signSessionToken();
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Weight ──────────────────────────────────────────────────────────────────
  weight: router({
    logToday: protectedProcedure
      .input(
        z.object({
          weightKg: z.number().positive(),
          note: z.string().optional(),
          dateMs: z.number().optional(), // client-local start of today
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { startMs, endMs } = dayRange(input.dateMs ?? serverTodayStartMs());
        const existing = await getTodayWeightLog(ctx.user.id, startMs, endMs);
        if (existing) {
          await updateWeightLog(existing.id, ctx.user.id, input.weightKg, input.note);
        } else {
          await insertWeightLog({
            userId: ctx.user.id,
            weightKg: input.weightKg,
            loggedAt: Date.now(),
            note: input.note,
          });
        }
        return { success: true };
      }),

    today: protectedProcedure
      .input(z.object({ dateMs: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { startMs, endMs } = dayRange(input?.dateMs ?? serverTodayStartMs());
        return getTodayWeightLog(ctx.user.id, startMs, endMs);
      }),

    history: protectedProcedure
      .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
      .query(async ({ ctx, input }) => {
        const toMs = Date.now();
        const fromMs = toMs - input.days * 24 * 60 * 60 * 1000;
        return getWeightLogs(ctx.user.id, fromMs, toMs);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWeightLog(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── Food ────────────────────────────────────────────────────────────────────
  food: router({
    add: protectedProcedure
      .input(
        z.object({
          mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
          foodName: z.string().min(1),
          quantity: z.number().positive().default(1),
          unit: z.string().default("份"),
          calories: z.number().min(0),
          proteinG: z.number().min(0).default(0),
          carbsG: z.number().min(0).default(0),
          fatG: z.number().min(0).default(0),
          sugarG: z.number().min(0).default(0),
          saturatedFatG: z.number().min(0).default(0),
          fiberG: z.number().min(0).default(0),
          sodiumMg: z.number().min(0).default(0),
          imageUrl: z.string().optional(),
          loggedAt: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await insertFoodLog({
          userId: ctx.user.id,
          mealType: input.mealType,
          foodName: input.foodName,
          quantity: input.quantity,
          unit: input.unit,
          calories: input.calories,
          proteinG: input.proteinG,
          carbsG: input.carbsG,
          fatG: input.fatG,
          sugarG: input.sugarG,
          saturatedFatG: input.saturatedFatG,
          fiberG: input.fiberG,
          sodiumMg: input.sodiumMg,
          imageUrl: input.imageUrl,
          loggedAt: input.loggedAt ?? Date.now(),
        });
        return { success: true };
      }),

    byDate: protectedProcedure
      .input(z.object({ dateMs: z.number() }))
      .query(async ({ ctx, input }) => {
        const { startMs, endMs } = dayRange(input.dateMs);
        return getFoodLogs(ctx.user.id, startMs, endMs);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFoodLog(input.id, ctx.user.id);
        return { success: true };
      }),

    analyzeImage: protectedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input }) => {
        const result = await analyzeFoodImage(input.imageBase64, input.mimeType);
        return { ...result, imageUrl: "" };
      }),

    analyzeText: protectedProcedure
      .input(z.object({ text: z.string().min(1).max(500) }))
      .mutation(async ({ input }) => {
        const result = await analyzeFoodText(input.text);
        return { ...result, imageUrl: "" };
      }),
  }),

  // ── Exercise ─────────────────────────────────────────────────────────────────
  exercise: router({
    add: protectedProcedure
      .input(
        z.object({
          exerciseType: z.string().min(1),
          durationMin: z.number().int().min(0),
          caloriesBurned: z.number().min(0).default(0),
          avgHeartRate: z.number().int().min(0).max(300).nullable().optional(),
          maxHeartRate: z.number().int().min(0).max(300).nullable().optional(),
          distanceKm: z.number().min(0).nullable().optional(),
          avgSpeedKmh: z.number().min(0).nullable().optional(),
          details: z.string().nullable().optional(),
          note: z.string().optional(),
          loggedAt: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await insertExerciseLog({
          userId: ctx.user.id,
          exerciseType: input.exerciseType,
          durationMin: input.durationMin,
          caloriesBurned: input.caloriesBurned,
          avgHeartRate: input.avgHeartRate ?? null,
          maxHeartRate: input.maxHeartRate ?? null,
          distanceKm: input.distanceKm ?? null,
          avgSpeedKmh: input.avgSpeedKmh ?? null,
          details: input.details ?? null,
          note: input.note,
          loggedAt: input.loggedAt ?? Date.now(),
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          exerciseType: z.string().min(1),
          durationMin: z.number().int().min(0),
          caloriesBurned: z.number().min(0).default(0),
          avgHeartRate: z.number().int().min(0).max(300).nullable().optional(),
          maxHeartRate: z.number().int().min(0).max(300).nullable().optional(),
          distanceKm: z.number().min(0).nullable().optional(),
          avgSpeedKmh: z.number().min(0).nullable().optional(),
          details: z.string().nullable().optional(),
          note: z.string().nullable().optional(),
          loggedAt: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, loggedAt, ...fields } = input;
        await updateExerciseLog(id, ctx.user.id, {
          exerciseType: fields.exerciseType,
          durationMin: fields.durationMin,
          caloriesBurned: fields.caloriesBurned,
          avgHeartRate: fields.avgHeartRate ?? null,
          maxHeartRate: fields.maxHeartRate ?? null,
          distanceKm: fields.distanceKm ?? null,
          avgSpeedKmh: fields.avgSpeedKmh ?? null,
          details: fields.details ?? null,
          note: fields.note ?? null,
          ...(loggedAt !== undefined ? { loggedAt } : {}),
        });
        return { success: true };
      }),

    analyzeImage: protectedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input }) => {
        return analyzeWorkoutImage(input.imageBase64, input.mimeType);
      }),

    byDate: protectedProcedure
      .input(z.object({ dateMs: z.number() }))
      .query(async ({ ctx, input }) => {
        const { startMs, endMs } = dayRange(input.dateMs);
        return getExerciseLogs(ctx.user.id, startMs, endMs);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deleteExerciseLog(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── Goals ────────────────────────────────────────────────────────────────────
  goals: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const goals = await getUserGoals(ctx.user.id);
      return (
        goals ?? {
          targetWeightKg: null,
          dailyCalories: 1800,
          proteinG: 120,
          carbsG: 200,
          fatG: 60,
          sex: null,
          age: null,
          heightCm: null,
          weeklyExerciseDays: null,
          goalType: "maintain" as const,
          reminderTime: "07:00",
        }
      );
    }),

    update: protectedProcedure
      .input(
        z.object({
          targetWeightKg: z.number().positive().nullable().optional(),
          dailyCalories: z.number().int().min(500).max(9999).optional(),
          sex: z.enum(["male", "female"]).nullable().optional(),
          age: z.number().int().min(5).max(120).nullable().optional(),
          heightCm: z.number().min(80).max(250).nullable().optional(),
          weeklyExerciseDays: z.number().int().min(0).max(7).nullable().optional(),
          goalType: z.enum(["lose", "maintain", "gain"]).optional(),
          proteinG: z.number().int().min(0).optional(),
          carbsG: z.number().int().min(0).optional(),
          fatG: z.number().int().min(0).optional(),
          reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUserGoals({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
  }),

  // ── Stats ────────────────────────────────────────────────────────────────────
  stats: router({
    daily: protectedProcedure
      .input(z.object({ dateMs: z.number() }))
      .query(async ({ ctx, input }) => {
        const { startMs, endMs } = dayRange(input.dateMs);
        const [foods, exercises, goals] = await Promise.all([
          getFoodLogs(ctx.user.id, startMs, endMs),
          getExerciseLogs(ctx.user.id, startMs, endMs),
          getUserGoals(ctx.user.id),
        ]);

        const totalCalories = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
        const totalProtein = foods.reduce((s, f) => s + (f.proteinG ?? 0), 0);
        const totalCarbs = foods.reduce((s, f) => s + (f.carbsG ?? 0), 0);
        const totalFat = foods.reduce((s, f) => s + (f.fatG ?? 0), 0);
        const totalBurned = exercises.reduce((s, e) => s + (e.caloriesBurned ?? 0), 0);
        const totalExerciseMin = exercises.reduce((s, e) => s + (e.durationMin ?? 0), 0);

        const dailyCaloriesGoal = goals?.dailyCalories ?? 1800;
        const remaining = dailyCaloriesGoal - totalCalories;

        return {
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
          totalBurned,
          totalExerciseMin,
          exerciseCount: exercises.length,
          remaining,
          goals: {
            dailyCalories: dailyCaloriesGoal,
            proteinG: goals?.proteinG ?? 120,
            carbsG: goals?.carbsG ?? 200,
            fatG: goals?.fatG ?? 60,
          },
        };
      }),

    // Per-day calorie totals for a consecutive range of days.
    // startMs is the client-local day start of the first day.
    range: protectedProcedure
      .input(
        z.object({
          startMs: z.number(),
          days: z.number().int().min(1).max(90),
        })
      )
      .query(async ({ ctx, input }) => {
        const fromMs = input.startMs;
        const toMs = input.startMs + input.days * DAY_MS - 1;
        const [foods, exercises] = await Promise.all([
          getFoodLogs(ctx.user.id, fromMs, toMs),
          getExerciseLogs(ctx.user.id, fromMs, toMs),
        ]);

        const buckets = Array.from({ length: input.days }, (_, i) => ({
          dateMs: fromMs + i * DAY_MS,
          calories: 0,
          burned: 0,
        }));
        const bucketIndex = (loggedAt: number) =>
          Math.floor((loggedAt - fromMs) / DAY_MS);

        for (const f of foods) {
          const i = bucketIndex(f.loggedAt);
          if (buckets[i]) buckets[i].calories += f.calories ?? 0;
        }
        for (const e of exercises) {
          const i = bucketIndex(e.loggedAt);
          if (buckets[i]) buckets[i].burned += e.caloriesBurned ?? 0;
        }
        return buckets;
      }),

    // Full data dump for CSV export.
    exportAll: protectedProcedure.query(async ({ ctx }) => {
      const toMs = Date.now();
      const [weights, foods, exercises] = await Promise.all([
        getWeightLogs(ctx.user.id, 0, toMs),
        getFoodLogs(ctx.user.id, 0, toMs),
        getExerciseLogs(ctx.user.id, 0, toMs),
      ]);
      return { weights, foods, exercises };
    }),
  }),
});

export type AppRouter = typeof appRouter;
