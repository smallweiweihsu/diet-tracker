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
  "慢跑",
  "快走",
  "游泳",
  "騎自行車",
  "重量訓練",
  "瑜珈",
  "有氧運動",
  "跳繩",
  "爬山",
  "籃球",
  "足球",
  "羽球",
  "其他",
];

// Rough calorie burn estimates per minute
export const EXERCISE_CALORIE_PER_MIN: Record<string, number> = {
  慢跑: 8,
  快走: 5,
  游泳: 9,
  騎自行車: 6,
  重量訓練: 5,
  瑜珈: 3,
  有氧運動: 7,
  跳繩: 10,
  爬山: 7,
  籃球: 8,
  足球: 8,
  羽球: 7,
  其他: 5,
};
