import { useState, useRef } from "react";
import { X, Camera, Image as ImageIcon, PencilLine, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn, MEAL_LABELS } from "@/lib/utils";

const NUTRITION_FIELDS = [
  { field: "calories" as const, label: "熱量", unit: "kcal" },
  { field: "proteinG" as const, label: "蛋白質", unit: "g" },
  { field: "carbsG" as const, label: "碳水", unit: "g" },
  { field: "fatG" as const, label: "脂肪", unit: "g" },
  { field: "sugarG" as const, label: "糖", unit: "g" },
  { field: "saturatedFatG" as const, label: "飽和脂肪", unit: "g" },
  { field: "fiberG" as const, label: "膳食纖維", unit: "g" },
  { field: "sodiumMg" as const, label: "鈉", unit: "mg" },
];

type NutritionField = (typeof NUTRITION_FIELDS)[number]["field"];

// Editable draft — keep values as strings so typing "12." works naturally.
// `perUnit` holds the nutrition per 1 unit so changing the 份量 rescales the
// numbers (e.g. AI reads 12 蝦, user sets 份量 to 4 → values scale to 4/12).
interface FoodDraft {
  name: string;
  quantity: string;
  unit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  sugarG: string;
  saturatedFatG: string;
  fiberG: string;
  sodiumMg: string;
  perUnit: Record<NutritionField, number>;
}

function emptyDraft(): FoodDraft {
  return {
    name: "", quantity: "1", unit: "份",
    calories: "", proteinG: "", carbsG: "", fatG: "",
    sugarG: "", saturatedFatG: "", fiberG: "", sodiumMg: "",
    perUnit: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, saturatedFatG: 0, fiberG: 0, sodiumMg: 0 },
  };
}

function num(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

interface Props {
  meal: string;
  dateMs: number;
  onClose: () => void;
  onSaved: () => void;
}

type Step = "capture" | "analyzing" | "confirm";

type AnalyzedFood = {
  name: string; quantity: number; unit: string; calories: number;
  proteinG: number; carbsG: number; fatG: number;
  sugarG?: number; saturatedFatG?: number; fiberG?: number; sodiumMg?: number;
};

function toDrafts(items: AnalyzedFood[]): FoodDraft[] {
  return items.map((f) => {
    const q = f.quantity > 0 ? f.quantity : 1;
    const raw: Record<NutritionField, number> = {
      calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG,
      sugarG: f.sugarG ?? 0, saturatedFatG: f.saturatedFatG ?? 0,
      fiberG: f.fiberG ?? 0, sodiumMg: f.sodiumMg ?? 0,
    };
    const perUnit = {} as Record<NutritionField, number>;
    const strings = {} as Record<NutritionField, string>;
    for (const { field } of NUTRITION_FIELDS) {
      perUnit[field] = raw[field] / q;
      strings[field] = String(Math.round(raw[field]));
    }
    return {
      name: f.name,
      quantity: String(f.quantity),
      unit: f.unit,
      ...strings,
      perUnit,
    } as FoodDraft;
  });
}

export default function CameraModal({ meal, dateMs, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [foods, setFoods] = useState<FoodDraft[]>([]);
  const [description, setDescription] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const analyze = trpc.food.analyzeImage.useMutation({
    onSuccess: (data) => { setFoods(toDrafts(data.foods)); setStep("confirm"); },
    onError: (e) => {
      toast.error("分析失敗：" + e.message);
      setStep("capture");
    },
  });

  const analyzeText = trpc.food.analyzeText.useMutation({
    onSuccess: (data) => { setFoods(toDrafts(data.foods)); setStep("confirm"); },
    onError: (e) => {
      toast.error("分析失敗：" + e.message);
      setStep("capture");
    },
  });

  const addFood = trpc.food.add.useMutation();

  const handleFile = (file: File) => {
    const mime = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1] ?? "";
      setStep("analyzing");
      analyze.mutate({ imageBase64: base64, mimeType: mime, note: description.trim() || undefined });
    };
    reader.readAsDataURL(file);
  };

  const handleAskText = () => {
    if (!description.trim()) return;
    setPreview(null);
    setStep("analyzing");
    analyzeText.mutate({ text: description.trim() });
  };

  const startManual = () => {
    setPreview(null);
    setFoods([emptyDraft()]);
    setStep("confirm");
  };

  const validFoods = foods.filter((f) => f.name.trim().length > 0);

  const handleSaveAll = async () => {
    if (validFoods.length === 0) {
      toast.error("請至少填寫一項食物名稱");
      return;
    }
    try {
      await Promise.all(
        validFoods.map((f) =>
          addFood.mutateAsync({
            mealType: meal as "breakfast" | "lunch" | "dinner" | "snack",
            foodName: f.name.trim(),
            quantity: num(f.quantity) || 1,
            unit: f.unit || "份",
            calories: num(f.calories),
            proteinG: num(f.proteinG),
            carbsG: num(f.carbsG),
            fatG: num(f.fatG),
            sugarG: num(f.sugarG),
            saturatedFatG: num(f.saturatedFatG),
            fiberG: num(f.fiberG),
            sodiumMg: num(f.sodiumMg),
            loggedAt: dateMs,
          })
        )
      );
      const cal = Math.round(validFoods.reduce((s, f) => s + num(f.calories), 0));
      toast.success(`已儲存 ${validFoods.length} 項食物 · 共 ${cal} kcal`, { duration: 3500 });
      onSaved();
    } catch {
      toast.error("儲存失敗，請重試");
    }
  };

  const updateFood = (idx: number, field: "name" | "unit", val: string) => {
    setFoods((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: val } : f)));
  };

  // Changing 份量 rescales every nutrition value from its per-unit amount.
  const updateQuantity = (idx: number, val: string) => {
    setFoods((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const q = num(val);
        if (q <= 0) return { ...f, quantity: val }; // empty / mid-typing: don't zero out
        const next: FoodDraft = { ...f, quantity: val };
        for (const { field } of NUTRITION_FIELDS) {
          next[field] = String(Math.round((f.perUnit[field] ?? 0) * q));
        }
        return next;
      })
    );
  };

  // Editing a nutrition value updates its per-unit basis so later 份量 changes
  // scale correctly.
  const updateNutrition = (idx: number, field: NutritionField, val: string) => {
    setFoods((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const q = num(f.quantity) || 1;
        return { ...f, [field]: val, perUnit: { ...f.perUnit, [field]: num(val) / q } };
      })
    );
  };

  const removeFood = (idx: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalCalories = Math.round(validFoods.reduce((s, f) => s + num(f.calories), 0));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step === "capture" ? onClose : undefined} />

      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col max-w-[430px]"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">記錄飲食</h2>
            <p className="text-xs text-muted-foreground">{MEAL_LABELS[meal] ?? meal}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* Step: Capture */}
          {step === "capture" && (
            <div className="flex flex-col items-center gap-3 py-2">
              {/* Describe to AI */}
              <div className="w-full rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  描述食物 / 給 AI 備註（份量等）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例如：只吃一半、大約 4 隻蝦、一個排骨便當"
                  rows={2}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <button
                  onClick={handleAskText}
                  disabled={!description.trim()}
                  className="w-full mt-2 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm
                             active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  問 AI 並辨識
                </button>
              </div>

              <div className="flex items-center gap-3 w-full my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground">或用照片 / 手動</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <input
                ref={cameraRef} type="file" accept="image/*" capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <input
                ref={galleryRef} type="file" accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="py-3 rounded-2xl bg-primary/10 text-primary font-semibold text-sm
                             active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                >
                  <Camera size={17} />
                  拍照
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="py-3 rounded-2xl bg-primary/10 text-primary font-semibold text-sm
                             active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                >
                  <ImageIcon size={17} />
                  相簿
                </button>
              </div>
              {description.trim() && (
                <p className="text-[11px] text-primary/80 text-center -mt-1">
                  拍照 / 相簿會一併參考上方備註調整份量
                </p>
              )}
              <button
                onClick={startManual}
                className="w-full py-3 rounded-2xl border border-border text-foreground font-medium text-sm
                           active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <PencilLine size={17} />
                手動輸入營養成分
              </button>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === "analyzing" && (
            <div className="flex flex-col items-center gap-4 py-6">
              {preview && (
                <img src={preview} alt="food" className="w-full max-h-48 object-cover rounded-2xl" />
              )}
              <div className="flex items-center gap-3 text-primary">
                <Loader2 size={24} className="animate-spin" />
                <span className="font-medium">AI 正在分析食物...</span>
              </div>
              <p className="text-xs text-muted-foreground">通常需要 5–15 秒</p>
            </div>
          )}

          {/* Step: Confirm / Manual edit */}
          {step === "confirm" && (
            <div className="flex flex-col gap-4">
              {preview && (
                <img src={preview} alt="food" className="w-full max-h-36 object-cover rounded-2xl" />
              )}
              <p className="text-sm font-semibold text-foreground">
                {preview ? "辨識結果（可調整）" : "輸入食物與營養成分"}
              </p>
              {foods.map((food, idx) => (
                <div key={idx} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <input
                      type="text"
                      value={food.name}
                      onChange={(e) => updateFood(idx, "name", e.target.value)}
                      placeholder="食物名稱"
                      className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground
                                 placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => removeFood(idx)}
                      className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"
                    >
                      <X size={15} className="text-destructive" />
                    </button>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">份量</label>
                      <input
                        type="number" inputMode="decimal" value={food.quantity}
                        onChange={(e) => updateQuantity(idx, e.target.value)}
                        className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">單位</label>
                      <input
                        type="text" value={food.unit}
                        onChange={(e) => updateFood(idx, "unit", e.target.value)}
                        placeholder="份 / g / ml"
                        className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {NUTRITION_FIELDS.map(({ field, label, unit }) => (
                      <div key={field}>
                        <label className="text-[10px] text-muted-foreground mb-1 block">
                          {label} <span className="opacity-70">({unit})</span>
                        </label>
                        <input
                          type="number" inputMode="decimal" min={0}
                          value={food[field]}
                          onChange={(e) => updateNutrition(idx, field, e.target.value)}
                          placeholder="0"
                          className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm num-display text-foreground
                                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={() => setFoods((prev) => [...prev, emptyDraft()])}
                className="w-full h-11 rounded-2xl border border-dashed border-border text-muted-foreground text-sm font-medium
                           flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
              >
                <Plus size={15} />
                再加一項食物
              </button>

              {validFoods.length > 0 && (
                <div className="rounded-2xl bg-primary/10 p-3 text-center">
                  <p className="text-sm text-muted-foreground">合計熱量</p>
                  <p className="num-display text-2xl font-bold text-primary">{totalCalories} kcal</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("capture"); setPreview(null); setFoods([]); }}
                  className="flex-1 h-12 rounded-full border border-border text-foreground font-medium active:scale-[0.98] transition-all"
                >
                  重新選擇
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={validFoods.length === 0 || addFood.isPending}
                  className={cn(
                    "flex-1 h-12 rounded-full font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                    validFoods.length > 0
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {addFood.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  加入記錄
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
