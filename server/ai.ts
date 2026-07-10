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
  mimeType: string
): Promise<FoodAnalysisResult> {
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
      "你是一位專業的營養師。請分析食物照片（也可能是包裝上的營養標示），辨識所有食物，並以合理的常見份量估算每項食物的營養成分：熱量、蛋白質、碳水化合物、脂肪、糖、飽和脂肪、膳食纖維、鈉。若照片是營養標示，直接按標示數值填寫。所有名稱使用繁體中文。",
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
            text: "請分析這張食物圖片，辨識所有食物，估算份量與營養成分。",
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
    dateText: {
      type: "string",
      description: "截圖上顯示的運動日期，轉成 YYYY-MM-DD（例如 2026-07-10）；若截圖沒有日期則填空字串",
    },
  },
  required: [
    "exerciseType", "durationMin", "caloriesBurned", "avgHeartRate",
    "maxHeartRate", "distanceKm", "avgSpeedKmh", "pace", "muscleGroups", "dateText",
  ],
  additionalProperties: false,
} as const;

export async function analyzeWorkoutImage(
  imageBase64: string,
  mimeType: string
): Promise<WorkoutAnalysisResult> {
  if (!ENV.anthropicApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "尚未設定 ANTHROPIC_API_KEY，無法使用 AI 辨識功能",
    });
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const response = await client.messages.create({
    model: ENV.anthropicModel,
    max_tokens: 2048,
    system:
      "你是一位運動數據分析助手。使用者會提供一張運動 App（例如 Apple 健身、Apple Watch、Strava、Garmin 等）的運動摘要截圖。請讀出其中的數據並以 JSON 回傳。運動類型必須對應到指定的選項；找不到對應就填「其他」。看不到的數值一律填 0（配速填空字串、部位填空陣列），不要亂猜。",
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
            text: "請讀出這張運動截圖的類型、時間、卡路里、平均/最大心律、距離、平均速度、配速；若是重量訓練請判斷訓練部位。",
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
