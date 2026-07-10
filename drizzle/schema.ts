import {
  int,
  float,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  avatar: varchar("avatar", { length: 16 }),        // emoji shown as the profile avatar
  avatarColor: varchar("avatarColor", { length: 16 }), // avatar background color
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Weight Logs ──────────────────────────────────────────────────────────────
export const weightLogs = mysqlTable("weight_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weightKg: float("weightKg").notNull(),
  loggedAt: bigint("loggedAt", { mode: "number" }).notNull(), // UTC ms timestamp
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeightLog = typeof weightLogs.$inferSelect;
export type InsertWeightLog = typeof weightLogs.$inferInsert;

// ── Food Logs ────────────────────────────────────────────────────────────────
export const foodLogs = mysqlTable("food_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mealType: mysqlEnum("mealType", ["breakfast", "lunch", "dinner", "snack"]).notNull(),
  foodName: varchar("foodName", { length: 255 }).notNull(),
  quantity: float("quantity").notNull().default(1),
  unit: varchar("unit", { length: 32 }).default("份"),
  calories: float("calories").notNull().default(0),
  proteinG: float("proteinG").default(0),
  carbsG: float("carbsG").default(0),
  fatG: float("fatG").default(0),
  sugarG: float("sugarG").default(0),
  saturatedFatG: float("saturatedFatG").default(0),
  fiberG: float("fiberG").default(0),
  sodiumMg: float("sodiumMg").default(0),
  imageUrl: text("imageUrl"),
  loggedAt: bigint("loggedAt", { mode: "number" }).notNull(), // UTC ms timestamp
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = typeof foodLogs.$inferInsert;

// ── Exercise Logs ────────────────────────────────────────────────────────────
export const exerciseLogs = mysqlTable("exercise_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  exerciseType: varchar("exerciseType", { length: 100 }).notNull(),
  durationMin: int("durationMin").notNull().default(0),
  caloriesBurned: float("caloriesBurned").default(0),
  avgHeartRate: int("avgHeartRate"),
  maxHeartRate: int("maxHeartRate"),
  distanceKm: float("distanceKm"),
  avgSpeedKmh: float("avgSpeedKmh"),
  // JSON blob for type-specific extras: swim stroke distances, gym muscle
  // groups, etc. Kept flexible so new exercise types need no schema change.
  details: text("details"),
  note: text("note"),
  loggedAt: bigint("loggedAt", { mode: "number" }).notNull(), // UTC ms timestamp
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type InsertExerciseLog = typeof exerciseLogs.$inferInsert;

// ── User Goals ───────────────────────────────────────────────────────────────
export const userGoals = mysqlTable("user_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  targetWeightKg: float("targetWeightKg"),
  dailyCalories: int("dailyCalories").default(1800),
  sex: mysqlEnum("sex", ["male", "female"]),
  age: int("age"),
  heightCm: float("heightCm"),
  weeklyExerciseDays: int("weeklyExerciseDays"),
  goalType: mysqlEnum("goalType", ["lose", "maintain", "gain"]).default("maintain"),
  proteinG: int("proteinG").default(120),
  carbsG: int("carbsG").default(200),
  fatG: int("fatG").default(60),
  reminderTime: varchar("reminderTime", { length: 5 }).default("07:00"), // HH:MM
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserGoals = typeof userGoals.$inferSelect;
export type InsertUserGoals = typeof userGoals.$inferInsert;
