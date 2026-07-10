import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { ensureLocalUser } from "./_core/auth";
import { getExerciseLogs, insertExerciseLog, updateExerciseLog } from "./db";

// Receives workouts pushed from an iOS Shortcut (Apple Watch / 健康 App data).
// Auth: Authorization: Bearer <HEALTH_SYNC_TOKEN>.

const SYNC_NOTE = "Apple Watch 同步";

// kcal/min estimates per app type — fallback when the Shortcut can't supply
// active energy (mirrors the client's manual-entry estimator).
const CAL_PER_MIN: Record<string, number> = {
  慢跑: 8, 走路: 5, 游泳: 9, 騎自行車: 6, 健身: 5, 瑜珈: 3,
  有氧運動: 7, 跳繩: 10, 爬山: 7, 籃球: 8, 足球: 8, 羽球: 7,
};

// Map Apple workout type names (English & Chinese variants) to the app's types.
const TYPE_MAP: Record<string, string> = {
  running: "慢跑", 跑步: "慢跑", 戶外跑步: "慢跑", 室內跑步: "慢跑",
  walking: "走路", 步行: "走路", 健走: "走路", 快走: "走路", 戶外步行: "走路", 室內步行: "走路",
  cycling: "騎自行車", 騎乘: "騎自行車", 自行車: "騎自行車", 腳踏車: "騎自行車", 戶外騎乘: "騎自行車", 室內騎乘: "騎自行車",
  swimming: "游泳", 游泳: "游泳", 泳池游泳: "游泳", 開放水域游泳: "游泳",
  "traditional strength training": "健身", "functional strength training": "健身",
  傳統肌力訓練: "健身", 功能性肌力訓練: "健身", 肌力訓練: "健身", 重量訓練: "健身",
  yoga: "瑜珈", 瑜伽: "瑜珈", 瑜珈: "瑜珈",
  "high intensity interval training": "有氧運動", 高強度間歇訓練: "有氧運動", hiit: "有氧運動",
  elliptical: "有氧運動", 橢圓機: "有氧運動", 有氧: "有氧運動",
  "jump rope": "跳繩", 跳繩: "跳繩",
  hiking: "爬山", 健行: "爬山", 登山: "爬山",
  basketball: "籃球", 籃球: "籃球",
  soccer: "足球", football: "足球", 足球: "足球",
  badminton: "羽球", 羽毛球: "羽球", 羽球: "羽球",
};

function mapType(raw: string): string {
  return TYPE_MAP[raw.trim().toLowerCase()] ?? TYPE_MAP[raw.trim()] ?? raw.trim();
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function parseStart(value: unknown): number | null {
  if (typeof value === "number" && value > 1_000_000_000) {
    return value > 10_000_000_000 ? value : value * 1000; // epoch s or ms
  }
  if (typeof value === "string") {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

interface IncomingWorkout {
  type?: unknown;
  durationMin?: unknown;
  caloriesBurned?: unknown;
  start?: unknown;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function tokenMatches(req: Request, expected: string): boolean {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ") && safeEqual(header.slice(7), expected)) return true;
  const q = req.query.token;
  return typeof q === "string" && safeEqual(q, expected);
}

// iOS Shortcuts inserts "+08:00" as " 08:00" when a date lands in a query
// string — restore the timezone sign before parsing.
function fixQueryDate(value: string): string {
  return value.replace(/ (\d{2}:?\d{2})$/, "+$1");
}

export function registerHealthSync(app: Express) {
  const handler = async (req: Request, res: Response) => {
    const token = process.env.HEALTH_SYNC_TOKEN ?? "";
    if (!token) {
      res.status(503).json({ error: "HEALTH_SYNC_TOKEN 未設定，同步功能未啟用" });
      return;
    }
    if (!tokenMatches(req, token)) {
      res.status(401).json({ error: "無效的同步密鑰" });
      return;
    }

    const user = await ensureLocalUser();
    if (!user) {
      res.status(500).json({ error: "資料庫未連線" });
      return;
    }

    // Accept {workouts:[...]}, a bare array, a single object, or query params
    // (?type=跑步&durationMin=32&start=... — the zero-JSON Shortcuts mode).
    let list: IncomingWorkout[];
    if (typeof req.query.type === "string" && req.query.type) {
      list = [{
        type: req.query.type,
        durationMin: req.query.durationMin,
        caloriesBurned: req.query.caloriesBurned,
        start: typeof req.query.start === "string" ? fixQueryDate(req.query.start) : undefined,
      }];
    } else {
      const body = req.body as { workouts?: IncomingWorkout[] } | IncomingWorkout[] | IncomingWorkout;
      list = Array.isArray(body)
        ? body
        : Array.isArray((body as { workouts?: IncomingWorkout[] }).workouts)
          ? (body as { workouts: IncomingWorkout[] }).workouts
          : [body as IncomingWorkout];
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const w of list) {
      const type = typeof w.type === "string" ? mapType(w.type) : "";
      const durationMin = Math.round(parseNumber(w.durationMin));
      let caloriesBurned = Math.round(parseNumber(w.caloriesBurned));
      if (caloriesBurned <= 0 && durationMin > 0) {
        caloriesBurned = Math.round(durationMin * (CAL_PER_MIN[type] ?? 5));
      }
      const hasStart = parseStart(w.start) !== null;
      const loggedAt = parseStart(w.start) ?? Date.now();

      if (!type || durationMin <= 0) {
        errors.push(`略過無效項目: ${JSON.stringify(w).slice(0, 100)}`);
        continue;
      }

      const dayStart = loggedAt - 12 * 60 * 60 * 1000;
      const dayEnd = loggedAt + 12 * 60 * 60 * 1000;
      const existing = await getExerciseLogs(user.id, dayStart, dayEnd);

      if (!hasStart) {
        // Daily-summary mode (no start time): one synced entry per type per
        // day — re-running the shortcut refreshes the totals in place.
        const prev = existing.find((e) => e.exerciseType === type && e.note === SYNC_NOTE);
        if (prev) {
          await updateExerciseLog(prev.id, user.id, { durationMin, caloriesBurned });
          updated++;
          continue;
        }
      } else {
        // Per-workout mode: same type starting within ±3 minutes = duplicate.
        const dup = existing.some(
          (e) => e.exerciseType === type && Math.abs(e.loggedAt - loggedAt) < 3 * 60 * 1000
        );
        if (dup) {
          skipped++;
          continue;
        }
      }

      await insertExerciseLog({
        userId: user.id,
        exerciseType: type,
        durationMin,
        caloriesBurned,
        note: SYNC_NOTE,
        loggedAt,
      });
      imported++;
    }

    res.json({ imported, updated, skipped, errors });
  };
  app.post("/api/health/sync", handler);
  app.get("/api/health/sync", handler);
}
