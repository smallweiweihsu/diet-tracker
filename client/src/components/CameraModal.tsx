import { useState, useRef } from "react";
import { X, Camera, Upload, Check, Loader2, Minus, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn, MEAL_LABELS } from "@/lib/utils";

interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface Props {
  meal: string;
  dateMs: number;
  onClose: () => void;
  onSaved: () => void;
}

type Step = "capture" | "analyzing" | "confirm";

export default function CameraModal({ meal, dateMs, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = trpc.food.analyzeImage.useMutation({
    onSuccess: (data) => {
      setFoods(data.foods);
      setImageUrl(data.imageUrl);
      setStep("confirm");
    },
    onError: (e) => {
      toast.error("分析失敗：" + e.message);
      setStep("capture");
    },
  });

  const addFood = trpc.food.add.useMutation();

  const handleFile = (file: File) => {
    const mime = file.type || "image/jpeg";
    setMimeType(mime);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1] ?? "";
      setImageBase64(base64);
      setStep("analyzing");
      analyze.mutate({ imageBase64: base64, mimeType: mime });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAll = async () => {
    try {
      await Promise.all(
        foods.map((f) =>
          addFood.mutateAsync({
            mealType: meal as "breakfast" | "lunch" | "dinner" | "snack",
            foodName: f.name,
            quantity: f.quantity,
            unit: f.unit,
            calories: f.calories,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            imageUrl,
            loggedAt: dateMs,
          })
        )
      );
      onSaved();
    } catch {
      toast.error("儲存失敗，請重試");
    }
  };

  const updateFood = (idx: number, field: keyof FoodItem, val: number | string) => {
    setFoods((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: val } : f)));
  };

  const removeFood = (idx: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ maxWidth: 430, left: "50%", transform: "translateX(-50%)" }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step === "capture" ? onClose : undefined} />

      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">AI 拍照辨識</h2>
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
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Camera size={40} className="text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                拍攝或上傳食物照片，AI 將自動辨識食物內容與營養成分
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base
                           shadow-lg shadow-primary/30 active:scale-[0.98] transition-all duration-150
                           flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                拍照 / 選擇圖片
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

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="flex flex-col gap-4">
              {preview && (
                <img src={preview} alt="food" className="w-full max-h-36 object-cover rounded-2xl" />
              )}
              <p className="text-sm font-semibold text-foreground">辨識結果（可調整）</p>
              {foods.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">未辨識到食物，請重新拍照</p>
              )}
              {foods.map((food, idx) => (
                <div key={idx} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{food.name}</p>
                      <p className="text-xs text-muted-foreground">{food.quantity} {food.unit}</p>
                    </div>
                    <button
                      onClick={() => removeFood(idx)}
                      className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center ml-2"
                    >
                      <X size={14} className="text-destructive" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "卡路里", field: "calories" as const, unit: "kcal", color: "text-primary" },
                      { label: "蛋白質", field: "proteinG" as const, unit: "g", color: "text-[var(--color-protein)]" },
                      { label: "碳水", field: "carbsG" as const, unit: "g", color: "text-[var(--color-carbs)]" },
                      { label: "脂肪", field: "fatG" as const, unit: "g", color: "text-[var(--color-fat)]" },
                    ].map(({ label, field, unit, color }) => (
                      <div key={field} className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateFood(idx, field, Math.max(0, Number(food[field]) - (field === "calories" ? 5 : 1)))}
                            className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
                          >
                            <Minus size={10} />
                          </button>
                          <span className={cn("num-display text-sm font-bold", color)}>
                            {Math.round(Number(food[field]))}
                          </span>
                          <button
                            onClick={() => updateFood(idx, field, Number(food[field]) + (field === "calories" ? 5 : 1))}
                            className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {foods.length > 0 && (
                <div className="rounded-2xl bg-primary/10 p-3 text-center">
                  <p className="text-sm text-muted-foreground">合計熱量</p>
                  <p className="num-display text-2xl font-bold text-primary">
                    {Math.round(foods.reduce((s, f) => s + f.calories, 0))} kcal
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("capture"); setPreview(null); }}
                  className="flex-1 h-12 rounded-full border border-border text-foreground font-medium active:scale-[0.98] transition-all"
                >
                  重新拍照
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={foods.length === 0 || addFood.isPending}
                  className={cn(
                    "flex-1 h-12 rounded-full font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                    foods.length > 0
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
