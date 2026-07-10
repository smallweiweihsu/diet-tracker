import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createProfile,
  deleteFoodLog,
  deleteExerciseLog,
  deleteProfileAndData,
  deleteWeightLog,
  getAllProfiles,
  getExerciseLogs,
  getFoodLogs,
  getTodayWeightLog,
  getUserByOpenId,
  getUserGoals,
  getWeightLogs,
  insertExerciseLog,
  insertFoodLog,
  insertWeightLog,
  updateExerciseLog,
  updateProfile,
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

// Shape of the exercise `details` JSON column.
interface ExerciseDetails {
  strokes?: Record<string, number>;
  muscleGroups?: string[];
  pace?: string;
}

function parseDetails(raw: string | null | undefined): ExerciseDetails {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

// Pace "m:ss" (per 100m) → seconds; null if unparseable.
function paceToSeconds(pace: string): number | null {
  const m = pace.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const mins = Number(m[1]);
  const secs = Number(m[2]);
  if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
  return mins * 60 + secs;
}

function secondsToPace(totalSecs: number): string {
  const rounded = Math.round(totalSecs);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
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

  // ── Profiles (multi-account) ──────────────────────────────────────────────────
  profiles: router({
    // All profiles on this device, plus which one is currently active.
    list: protectedProcedure.query(async ({ ctx }) => {
      const profiles = await getAllProfiles();
      return { profiles, activeId: ctx.user.id };
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(20),
          avatar: z.string().max(16).nullable().optional(),
          avatarColor: z.string().max(16).nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const created = await createProfile(input);
        return { success: true, id: created?.id ?? null };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          name: z.string().trim().min(1).max(20).optional(),
          avatar: z.string().max(16).nullable().optional(),
          avatarColor: z.string().max(16).nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...fields } = input;
        await updateProfile(id, fields);
        return { success: true };
      }),

    // Switch the active profile by re-signing the session cookie.
    switch: protectedProcedure
      .input(z.object({ openId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const target = await getUserByOpenId(input.openId);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "找不到此帳號" });
        }
        const token = await signSessionToken(target.openId);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "無法刪除目前使用中的帳號" });
        }
        const profiles = await getAllProfiles();
        if (profiles.length <= 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "至少需保留一個帳號" });
        }
        if (!profiles.some((p) => p.id === input.id)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "找不到此帳號" });
        }
        await deleteProfileAndData(input.id);
        return { success: true };
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

    // Per-day exercise presence for a calendar view (marks which days had
    // exercise, how many sessions, and which types). startMs is the client-local
    // day start of the first day.
    exerciseCalendar: protectedProcedure
      .input(
        z.object({
          startMs: z.number(),
          days: z.number().int().min(1).max(90),
        })
      )
      .query(async ({ ctx, input }) => {
        const fromMs = input.startMs;
        const toMs = input.startMs + input.days * DAY_MS - 1;
        const exercises = await getExerciseLogs(ctx.user.id, fromMs, toMs);

        const buckets = Array.from({ length: input.days }, (_, i) => ({
          dateMs: fromMs + i * DAY_MS,
          count: 0,
          totalMin: 0,
          totalBurned: 0,
          types: [] as string[],
        }));
        for (const e of exercises) {
          const i = Math.floor((e.loggedAt - fromMs) / DAY_MS);
          const b = buckets[i];
          if (!b) continue;
          b.count += 1;
          b.totalMin += e.durationMin ?? 0;
          b.totalBurned += e.caloriesBurned ?? 0;
          if (!b.types.includes(e.exerciseType)) b.types.push(e.exerciseType);
        }
        return buckets;
      }),

    // Distinct exercise types (with session counts) the user has logged in a
    // range — used to populate the type picker on the charts page.
    exerciseTypeList: protectedProcedure
      .input(z.object({ startMs: z.number(), endMs: z.number() }))
      .query(async ({ ctx, input }) => {
        const exercises = await getExerciseLogs(ctx.user.id, input.startMs, input.endMs);
        const counts = new Map<string, number>();
        for (const e of exercises) {
          counts.set(e.exerciseType, (counts.get(e.exerciseType) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
      }),

    // Aggregate statistics for a single exercise type over a range. Parses the
    // `details` JSON server-side to surface swim stroke distances, gym
    // muscle-group day counts, and average pace.
    exerciseSummary: protectedProcedure
      .input(
        z.object({
          exerciseType: z.string().min(1),
          startMs: z.number(),
          endMs: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const all = await getExerciseLogs(ctx.user.id, input.startMs, input.endMs);
        const logs = all.filter((e) => e.exerciseType === input.exerciseType);

        let totalMin = 0;
        let totalBurned = 0;
        let totalDistanceKm = 0;
        let hrSum = 0;
        let hrCount = 0;
        let maxHeartRate = 0;
        let speedSum = 0;
        let speedCount = 0;
        const strokes: Record<string, number> = {};
        // muscle group → set of day-start ms (count distinct days trained)
        const muscleDays: Record<string, Set<number>> = {};
        const paceSecs: number[] = [];

        for (const e of logs) {
          totalMin += e.durationMin ?? 0;
          totalBurned += e.caloriesBurned ?? 0;
          if (e.distanceKm != null) totalDistanceKm += e.distanceKm;
          if (e.avgHeartRate != null) {
            hrSum += e.avgHeartRate;
            hrCount += 1;
          }
          if (e.maxHeartRate != null && e.maxHeartRate > maxHeartRate) {
            maxHeartRate = e.maxHeartRate;
          }
          if (e.avgSpeedKmh != null) {
            speedSum += e.avgSpeedKmh;
            speedCount += 1;
          }
          const details = parseDetails(e.details);
          if (details.strokes) {
            for (const [name, meters] of Object.entries(details.strokes)) {
              if (typeof meters === "number") strokes[name] = (strokes[name] ?? 0) + meters;
            }
          }
          if (details.muscleGroups) {
            const dayKey = Math.floor(e.loggedAt / DAY_MS);
            for (const g of details.muscleGroups) {
              (muscleDays[g] ??= new Set()).add(dayKey);
            }
          }
          if (typeof details.pace === "string") {
            const secs = paceToSeconds(details.pace);
            if (secs != null) paceSecs.push(secs);
          }
        }

        const strokeMeters = Object.values(strokes).reduce((s, m) => s + m, 0);
        const avgPaceSecs =
          paceSecs.length > 0
            ? paceSecs.reduce((s, v) => s + v, 0) / paceSecs.length
            : null;

        return {
          exerciseType: input.exerciseType,
          count: logs.length,
          totalMin,
          totalBurned: Math.round(totalBurned),
          totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
          avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
          maxHeartRate: maxHeartRate > 0 ? maxHeartRate : null,
          avgSpeedKmh: speedCount > 0 ? Math.round((speedSum / speedCount) * 10) / 10 : null,
          strokes,
          strokeMeters,
          muscleGroups: Object.entries(muscleDays)
            .map(([group, days]) => ({ group, days: days.size }))
            .sort((a, b) => b.days - a.days),
          avgPace: avgPaceSecs != null ? secondsToPace(avgPaceSecs) : null,
        };
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
