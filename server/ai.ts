import Anthropic from "@anthropic-ai/sdk";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

export interface FoodAnalysisItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  saturatedFatG: number;
  fiberG: number;
  sodiumMg: number;
}

export interface FoodAnalysisResult {
  foods: FoodAnalysisItem[];
  description: string;
}

const FOOD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "食物名稱（繁體中文）" },
          quantity: { type: "number", description: "份量數值" },
          unit: { type: "string", description: "單位，如 g、ml、份、個" },
          calories: { type: "number", description: "卡路里（kcal）" },
          proteinG: { type: "number", description: "蛋白質（g）" },
          carbsG: { type: "number", description: "碳水化合物（g）" },
          fatG: { type: "number", description: "脂肪（g）" },
          sugarG: { type: "number", description: "糖（g）" },
          saturatedFatG: { type: "number", description: "飽和脂肪（g）" },
          fiberG: { type: "number", description: "膳食纖維（g）" },
          sodiumMg: { type: "number", description: "鈉（mg）" },
        },
        required: ["name", "quantity", "unit", "calories", "proteinG", "carbsG", "fatG", "sugarG", "saturatedFatG", "fiberG", "sodiumMg"],
        additionalProperties: false,
      },
    },
    description: { type: "string", description: "整體食物描述" },
  },
  required: ["foods", "description"],
  additionalProperties: false,
} as const;

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

function normalizeMediaType(mimeType: string): SupportedImageType {
  const found = SUPPORTED_IMAGE_TYPES.find((t) => t === mimeType.toLowerCase());
  return found ?? "image/jpeg";
}

export async function analyzeFoodImage(
  imageBase64: string,
  mimeType: string,
  note?: string
): Promise<FoodAnalysisResult> {
  if (!ENV.anthropicApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "尚未設定 ANTHROPIC_API_KEY，無法使用 AI 辨識功能",
    });
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const hint = note?.trim()
    ? `\n使用者補充說明：「${note.trim()}」。照片不一定全部吃完，請依此說明調整實際食用的份量（quantity）與所有營養數值，讓數值對應實際吃下的量。`
    : "";

  const response = await client.messages.create({
    model: ENV.anthropicModel,
    max_tokens: 4096,
    system:
      "你是一位專業的營養師。請分析食物照片（也可能是包裝上的營養標示），辨識所有食物，並以合理的常見份量估算每項食物的營養成分：熱量、蛋白質、碳水化合物、脂肪、糖、飽和脂肪、膳食纖維、鈉。若照片是營養標示，直接按標示數值填寫。所有名稱使用繁體中文。" +
      hint,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: normalizeMediaType(mimeType),
              data: imageBase64,
            },
          },
          {
            type: "text",
            text:
              "請分析這張食物圖片，辨識所有食物，估算份量與營養成分。" +
              (note?.trim() ? `使用者補充：${note.trim()}` : ""),
          },
        ],
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: FOOD_ANALYSIS_SCHEMA,
      },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "AI 無法分析這張圖片，請換一張再試",
    });
  }

  const textBlock = response.content.find(
    (b): b is Extract<(typeof response.content)[number], { type: "text" }> =>
      b.type === "text"
  );
  if (!textBlock) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 分析沒有回傳結果，請重試",
    });
  }

  try {
    return JSON.parse(textBlock.text) as FoodAnalysisResult;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 分析結果解析失敗，請重試",
    });
  }
}

// ── Food text description analysis ─────────────────────────────────────────────
export async function analyzeFoodText(text: string): Promise<FoodAnalysisResult> {
  if (!ENV.anthropicApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "尚未設定 ANTHROPIC_API_KEY，無法使用 AI 辨識功能",
    });
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const response = await client.messages.create({
    model: ENV.anthropicModel,
    max_tokens: 4096,
    system:
      "你是一位專業的營養師。使用者會用文字描述他吃了什麼，請辨識所有食物，以合理的常見份量估算每項食物的營養成分：熱量、蛋白質、碳水化合物、脂肪、糖、飽和脂肪、膳食纖維、鈉。所有名稱使用繁體中文。",
    messages: [
      {
        role: "user",
        content: `我吃了：${text}。請估算營養成分。`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: FOOD_ANALYSIS_SCHEMA,
      },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "AI 無法理解這段描述，請換個說法再試" });
  }

  const textBlock = response.content.find(
    (b): b is Extract<(typeof response.content)[number], { type: "text" }> => b.type === "text"
  );
  if (!textBlock) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 分析沒有回傳結果，請重試" });
  }

  try {
    return JSON.parse(textBlock.text) as FoodAnalysisResult;
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 分析結果解析失敗，請重試" });
  }
}

// ── Workout screenshot analysis ────────────────────────────────────────────────
export interface WorkoutAnalysisResult {
  exerciseType: string;      // one of the app's types (see prompt)
  durationMin: number;
  caloriesBurned: number;
  avgHeartRate: number;      // 0 if unknown
  maxHeartRate: number;      // 0 if unknown
  distanceKm: number;        // 0 if not applicable
  avgSpeedKmh: number;       // 0 if not applicable
  pace: string;              // "" if not applicable, e.g. "2:05" (per 100m / per km)
  muscleGroups: string[];    // gym only, subset of 胸/背/腿/肩/手臂/核心
  strokes: { name: string; meters: number }[]; // swimming only, per-stroke distance
  dateText: string;          // "" if not shown, else YYYY-MM-DD read from screenshot
}

const WORKOUT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    exerciseType: {
      type: "string",
      description:
        "運動類型，必須從這些選項擇一（繁體中文）：走路、騎自行車、游泳、健身、羽球、慢跑、瑜珈、爬山、籃球、跳繩、有氧運動、其他",
    },
    durationMin: { type: "number", description: "運動總時間（分鐘）" },
    caloriesBurned: { type: "number", description: "總消耗熱量（kcal），未顯示填 0" },
    avgHeartRate: { type: "number", description: "平均心律（bpm），未顯示填 0" },
    maxHeartRate: { type: "number", description: "最大心律（bpm），未顯示填 0" },
    distanceKm: { type: "number", description: "距離（公里），不適用填 0" },
    avgSpeedKmh: { type: "number", description: "平均速度（km/h），不適用填 0" },
    pace: { type: "string", description: "平均配速，如 2:05；不適用填空字串" },
    muscleGroups: {
      type: "array",
      items: { type: "string" },
      description: "健身時的訓練部位，只從 胸/背/腿/肩/手臂/核心 中選；其他運動填空陣列",
    },
    strokes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "泳姿：自由式、蛙式、仰式、蝶式 擇一" },
          meters: { type: "number", description: "該泳姿的總距離（公尺）" },
        },
        required: ["name", "meters"],
        additionalProperties: false,
      },
      description:
        "游泳時各泳姿的『總距離』（公尺）。請讀畫面上方泳姿名稱旁括號內的總距離，例如「自由式（925公尺）蛙式（200公尺）」→ [{name:自由式,meters:925},{name:蛙式,meters:200}]。務必用各泳姿的整場總距離，不要用『自動組合/每趟/分段』表格裡單趟的 25、50、100 這種小數字；各泳姿總和應約等於總距離。非游泳填空陣列。",
    },
    dateText: {
      type: "string",
      description:
        "截圖上顯示的運動日期，轉成 YYYY-MM-DD。截圖通常只有『月、日』與星期而沒有年份，請依提供的今天日期推斷正確年份：結果必須是今天或過去、不可未來；只有月日時取最近一次的那個過去日期。截圖完全沒有日期才填空字串。",
    },
  },
  required: [
    "exerciseType", "durationMin", "caloriesBurned", "avgHeartRate",
    "maxHeartRate", "distanceKm", "avgSpeedKmh", "pace", "muscleGroups", "strokes", "dateText",
  ],
  additionalProperties: false,
} as const;

export async function analyzeWorkoutImage(
  imageBase64: string,
  mimeType: string,
  todayStr?: string
): Promise<WorkoutAnalysisResult> {
  if (!ENV.anthropicApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "尚未設定 ANTHROPIC_API_KEY，無法使用 AI 辨識功能",
    });
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const dateHint = todayStr
    ? `\n今天的日期是 ${todayStr}。判斷 dateText 的年份時務必依此推斷：日期一定是今天或過去、不會是未來；截圖只有月日時，選最近一次的那個過去日期。`
    : "";

  const response = await client.messages.create({
    model: ENV.anthropicModel,
    max_tokens: 2048,
    system:
      "你是一位運動數據分析助手。使用者會提供一張運動 App（例如 Apple 健身、Apple Watch、Strava、Garmin 等）的運動摘要截圖。請讀出其中的數據並以 JSON 回傳。運動類型必須對應到指定的選項（例如「室外自行車」「室內單車」對應「騎自行車」，「戶外跑步」對應「慢跑」）；找不到對應就填「其他」。看不到的數值一律填 0（配速填空字串、部位填空陣列），不要亂猜。" +
      dateHint,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: normalizeMediaType(mimeType),
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "請讀出這張運動截圖的類型、時間、卡路里、平均/最大心律、距離、平均速度、配速；若是游泳請讀出各泳姿的『整場總距離』（畫面上方泳姿名稱旁括號的公尺數，非單趟分段數字）；若是重量訓練請判斷訓練部位。",
          },
        ],
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: WORKOUT_ANALYSIS_SCHEMA,
      },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "AI 無法分析這張圖片，請換一張再試",
    });
  }

  const textBlock = response.content.find(
    (b): b is Extract<(typeof response.content)[number], { type: "text" }> =>
      b.type === "text"
  );
  if (!textBlock) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 分析沒有回傳結果，請重試",
    });
  }

  try {
    return JSON.parse(textBlock.text) as WorkoutAnalysisResult;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 分析結果解析失敗，請重試",
    });
  }
}
