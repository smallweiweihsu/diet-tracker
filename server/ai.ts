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
        },
        required: ["name", "quantity", "unit", "calories", "proteinG", "carbsG", "fatG"],
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
      "你是一位專業的營養師。請分析食物照片，辨識所有食物，並以合理的常見份量估算每項食物的營養成分。所有名稱使用繁體中文。",
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
