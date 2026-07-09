import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  exerciseLogs,
  foodLogs,
  InsertExerciseLog,
  InsertFoodLog,
  InsertUser,
  InsertUserGoals,
  InsertWeightLog,
  userGoals,
  users,
  weightLogs,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

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
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Weight Logs ──────────────────────────────────────────────────────────────
export async function insertWeightLog(data: InsertWeightLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(weightLogs).values(data);
}

export async function getWeightLogs(userId: number, fromMs: number, toMs: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weightLogs)
    .where(
      and(
        eq(weightLogs.userId, userId),
        gte(weightLogs.loggedAt, fromMs),
        lte(weightLogs.loggedAt, toMs)
      )
    )
    .orderBy(weightLogs.loggedAt);
}

export async function getTodayWeightLog(userId: number, dayStartMs: number, dayEndMs: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(weightLogs)
    .where(
      and(
        eq(weightLogs.userId, userId),
        gte(weightLogs.loggedAt, dayStartMs),
        lte(weightLogs.loggedAt, dayEndMs)
      )
    )
    .orderBy(desc(weightLogs.loggedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateWeightLog(
  id: number,
  userId: number,
  weightKg: number,
  note?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(weightLogs)
    .set(note === undefined ? { weightKg } : { weightKg, note })
    .where(and(eq(weightLogs.id, id), eq(weightLogs.userId, userId)));
}

export async function deleteWeightLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(weightLogs)
    .where(and(eq(weightLogs.id, id), eq(weightLogs.userId, userId)));
}

// ── Food Logs ────────────────────────────────────────────────────────────────
export async function insertFoodLog(data: InsertFoodLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(foodLogs).values(data);
}

export async function getFoodLogs(userId: number, dayStartMs: number, dayEndMs: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.userId, userId),
        gte(foodLogs.loggedAt, dayStartMs),
        lte(foodLogs.loggedAt, dayEndMs)
      )
    )
    .orderBy(foodLogs.loggedAt);
}

export async function deleteFoodLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(foodLogs)
    .where(and(eq(foodLogs.id, id), eq(foodLogs.userId, userId)));
}

// ── Exercise Logs ────────────────────────────────────────────────────────────
export async function insertExerciseLog(data: InsertExerciseLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(exerciseLogs).values(data);
}

export async function getExerciseLogs(userId: number, dayStartMs: number, dayEndMs: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(exerciseLogs)
    .where(
      and(
        eq(exerciseLogs.userId, userId),
        gte(exerciseLogs.loggedAt, dayStartMs),
        lte(exerciseLogs.loggedAt, dayEndMs)
      )
    )
    .orderBy(exerciseLogs.loggedAt);
}

export async function deleteExerciseLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(exerciseLogs)
    .where(and(eq(exerciseLogs.id, id), eq(exerciseLogs.userId, userId)));
}

// ── User Goals ───────────────────────────────────────────────────────────────
export async function getUserGoals(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(userGoals)
    .where(eq(userGoals.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertUserGoals(data: InsertUserGoals) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(userGoals)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        targetWeightKg: data.targetWeightKg,
        dailyCalories: data.dailyCalories,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
        sex: data.sex,
        age: data.age,
        heightCm: data.heightCm,
        weeklyExerciseDays: data.weeklyExerciseDays,
        goalType: data.goalType,
        reminderTime: data.reminderTime,
      },
    });
}
