import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function formatDateShort(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function dayStartMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

export function addDays(ms: number, days: number): number {
  return ms + days * 24 * 60 * 60 * 1000;
}

// <input type="date"> uses local YYYY-MM-DD.
export function dateInputValue(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dayStartFromInput(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return dayStartMs(Date.now());
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString("zh-TW", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

export const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

export const EXERCISE_TYPES = [
  "走路",
  "騎自行車",
  "游泳",
  "健身",
  "羽球",
  "慢跑",
  "瑜珈",
  "爬山",
  "籃球",
  "跳繩",
  "有氧運動",
  "其他",
];

// Rough calorie burn estimates per minute
export const EXERCISE_CALORIE_PER_MIN: Record<string, number> = {
  走路: 5,
  騎自行車: 6,
  游泳: 9,
  健身: 5,
  羽球: 7,
  慢跑: 8,
  瑜珈: 3,
  爬山: 7,
  籃球: 8,
  跳繩: 10,
  有氧運動: 7,
  其他: 5,
};

// ── Per-type exercise form fields ──────────────────────────────────────────────
// Each exercise type shows a tailored set of inputs. `numeric` fields map to
// dedicated DB columns; `strokes` (swim stroke distances) and `muscleGroups`
// (gym body parts) are stored in the JSON `details` column.
export type ExerciseNumericField =
  | "durationMin"
  | "caloriesBurned"
  | "avgHeartRate"
  | "maxHeartRate"
  | "distanceKm"
  | "avgSpeedKmh";

export interface ExerciseFieldConfig {
  label: string;
  unit: string;
  decimal?: boolean;
}

export const EXERCISE_NUMERIC_LABELS: Record<ExerciseNumericField, ExerciseFieldConfig> = {
  durationMin: { label: "時間", unit: "分鐘" },
  caloriesBurned: { label: "總熱量", unit: "kcal" },
  avgHeartRate: { label: "平均心律", unit: "bpm" },
  maxHeartRate: { label: "最大心律", unit: "bpm" },
  distanceKm: { label: "距離", unit: "km", decimal: true },
  avgSpeedKmh: { label: "平均速度", unit: "km/h", decimal: true },
};

export interface ExerciseTypeConfig {
  numeric: ExerciseNumericField[];
  strokes?: boolean;      // swimming: distance per stroke style
  muscleGroups?: boolean; // gym: which body parts trained
  pace?: boolean;         // swimming: average pace (per 100m)
  lifts?: boolean;        // gym: per-exercise sets × reps × weight
}

const BASE_FIELDS: ExerciseNumericField[] = ["durationMin", "avgHeartRate", "maxHeartRate", "caloriesBurned"];

export const EXERCISE_TYPE_CONFIG: Record<string, ExerciseTypeConfig> = {
  走路: { numeric: ["durationMin", "distanceKm", "avgSpeedKmh", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
  騎自行車: { numeric: ["durationMin", "distanceKm", "avgSpeedKmh", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
  游泳: { numeric: ["durationMin", "avgHeartRate", "maxHeartRate", "caloriesBurned"], strokes: true, pace: true },
  健身: { numeric: ["durationMin", "avgHeartRate", "maxHeartRate", "caloriesBurned"], muscleGroups: true, lifts: true },
  羽球: { numeric: ["durationMin", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
  慢跑: { numeric: ["durationMin", "distanceKm", "avgSpeedKmh", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
  爬山: { numeric: ["durationMin", "distanceKm", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
  籃球: { numeric: ["durationMin", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
  有氧運動: { numeric: ["durationMin", "avgHeartRate", "maxHeartRate", "caloriesBurned"] },
};

export function exerciseConfig(type: string): ExerciseTypeConfig {
  return EXERCISE_TYPE_CONFIG[type] ?? { numeric: BASE_FIELDS };
}

export const SWIM_STROKES = ["自由式", "蛙式", "仰式", "蝶式"] as const;
export const MUSCLE_GROUPS = ["胸", "背", "腿", "肩", "手臂", "核心"] as const;

// Built-in common weight-training movements, grouped by body part, for quick-add.
export const COMMON_LIFTS: { group: string; names: string[] }[] = [
  { group: "胸", names: ["臥推", "上斜臥推", "啞鈴臥推", "蝴蝶機夾胸", "伏地挺身"] },
  { group: "背", names: ["引體向上", "滑輪下拉", "槓鈴划船", "啞鈴划船", "硬舉"] },
  { group: "腿", names: ["深蹲", "腿推", "腿彎舉", "腿伸展", "分腿蹲", "小腿舉"] },
  { group: "肩", names: ["肩推", "啞鈴肩推", "側平舉", "前平舉", "面拉"] },
  { group: "手臂", names: ["二頭彎舉", "三頭下壓", "錘式彎舉", "窄距臥推"] },
  { group: "核心", names: ["棒式", "捲腹", "懸吊抬腿"] },
];

// One weight-training set and movement, stored under details.lifts.
export interface LiftSet {
  weight: number; // kg
  reps: number;
}
export interface Lift {
  name: string;
  sets: LiftSet[];
}

// Shape stored in the `details` JSON column.
export interface ExerciseDetails {
  strokes?: Record<string, number>;   // stroke name → distance (m)
  muscleGroups?: string[];
  pace?: string;                       // avg pace, e.g. "2:05" (per 100m)
  lifts?: Lift[];                      // gym: per-exercise sets × reps × weight
}

export function parseExerciseDetails(raw: string | null | undefined): ExerciseDetails {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

// ── Weight-training math ───────────────────────────────────────────────────────
// Estimated one-rep max (Epley formula). reps=1 → the lifted weight itself.
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

// Total training volume of a movement = Σ weight × reps across its sets.
export function liftVolume(lift: Lift): number {
  return lift.sets.reduce((s, set) => s + set.weight * set.reps, 0);
}

// Best estimated 1RM across a movement's sets (used for PRs / trends).
export function liftBest1RM(lift: Lift): number {
  return lift.sets.reduce((m, set) => Math.max(m, estimate1RM(set.weight, set.reps)), 0);
}

// Heaviest single set weight of a movement.
export function liftTopWeight(lift: Lift): number {
  return lift.sets.reduce((m, set) => Math.max(m, set.weight), 0);
}

// Total volume across every movement in a session.
export function liftsVolume(lifts: Lift[]): number {
  return lifts.reduce((s, l) => s + liftVolume(l), 0);
}
