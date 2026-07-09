import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { ensureLocalUser } from "./_core/auth";
import { getExerciseLogs, insertExerciseLog } from "./db";

// Receives workouts pushed from an iOS Shortcut (Apple Watch / 健康 App data).
// Auth: Authorization: Bearer <HEALTH_SYNC_TOKEN>.

const SYNC_NOTE = "Apple Watch 同步";

// Map Apple workout type names (English & Chinese variants) to the app's types.
const TYPE_MAP: Record<string, string> = {
  running: "慢跑", 跑步: "慢跑", 戶外跑步: "慢跑", 室內跑步: "慢跑",
  walking: "快走", 步行: "快走", 健走: "快走", 戶外步行: "快走", 室內步行: "快走",
  cycling: "騎自行車", 騎乘: "騎自行車", 自行車: "騎自行車", 戶外騎乘: "騎自行車", 室內騎乘: "騎自行車",
  swimming: "游泳", 游泳: "游泳", 泳池游泳: "游泳", 開放水域游泳: "游泳",
  "traditional strength training": "重量訓練", "functional strength training": "重量訓練",
  傳統肌力訓練: "重量訓練", 功能性肌力訓練: "重量訓練", 肌力訓練: "重量訓練",
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

function tokenMatches(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const got = Buffer.from(header.slice(7));
  const want = Buffer.from(expected);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function registerHealthSync(app: Express) {
  app.post("/api/health/sync", async (req: Request, res: Response) => {
    const token = process.env.HEALTH_SYNC_TOKEN ?? "";
    if (!token) {
      res.status(503).json({ error: "HEALTH_SYNC_TOKEN 未設定，同步功能未啟用" });
      return;
    }
    if (!tokenMatches(req.headers.authorization, token)) {
      res.status(401).json({ error: "無效的同步密鑰" });
      return;
    }

    const user = await ensureLocalUser();
    if (!user) {
      res.status(500).json({ error: "資料庫未連線" });
      return;
    }

    // Accept {workouts:[...]}, a bare array, or a single workout object.
    const body = req.body as { workouts?: IncomingWorkout[] } | IncomingWorkout[] | IncomingWorkout;
    const list: IncomingWorkout[] = Array.isArray(body)
      ? body
      : Array.isArray((body as { workouts?: IncomingWorkout[] }).workouts)
        ? (body as { workouts: IncomingWorkout[] }).workouts
        : [body as IncomingWorkout];

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const w of list) {
      const type = typeof w.type === "string" ? mapType(w.type) : "";
      const durationMin = Math.round(parseNumber(w.durationMin));
      const caloriesBurned = Math.round(parseNumber(w.caloriesBurned));
      const loggedAt = parseStart(w.start) ?? Date.now();

      if (!type || durationMin <= 0) {
        errors.push(`略過無效項目: ${JSON.stringify(w).slice(0, 100)}`);
        continue;
      }

      // Dedup: same type starting within ±3 minutes counts as already imported.
      const dayStart = loggedAt - 12 * 60 * 60 * 1000;
      const dayEnd = loggedAt + 12 * 60 * 60 * 1000;
      const existing = await getExerciseLogs(user.id, dayStart, dayEnd);
      const dup = existing.some(
        (e) => e.exerciseType === type && Math.abs(e.loggedAt - loggedAt) < 3 * 60 * 1000
      );
      if (dup) {
        skipped++;
        continue;
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

    res.json({ imported, skipped, errors });
  });
}
