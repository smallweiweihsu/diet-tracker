import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn, formatNum, MEAL_LABELS, MEAL_ICONS, dayStartMs, addDays } from "@/lib/utils";
import { toast } from "sonner";
import CameraModal from "@/components/CameraModal";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

function MealSection({
  meal, foods, dateMs, onCamera, onDelete,
}: {
  meal: string;
  foods: Array<{ id: number; foodName: string; quantity: number; unit: string | null; calories: number; proteinG: number | null; carbsG: number | null; fatG: number | null; sugarG: number | null; saturatedFatG: number | null; fiberG: number | null; sodiumMg: number | null }>;
  dateMs: number;
  onCamera: () => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = foods.reduce((s, f) => s + (f.calories ?? 0), 0);

  return (
    <div className="dt-card overflow-hidden">
      {/* Meal header */}
      <div className="flex items-center gap-3">
        <button
          className="flex-1 flex items-center gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-xl">{MEAL_ICONS[meal]}</span>
          <div className="flex-1">
            <span className="font-semibold text-foreground text-sm">{MEAL_LABELS[meal]}</span>
            {foods.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">{foods.length} 項</span>
            )}
          </div>
          {total > 0 && (
            <span className="num-display text-sm font-bold text-primary">{formatNum(total)} kcal</span>
          )}
        </button>
        <button
          onClick={onCamera}
          className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary
                     hover:bg-primary/20 active:scale-95 transition-all shrink-0"
        >
          <Camera size={15} />
        </button>
        <button onClick={() => setOpen((v) => !v)} className="shrink-0">
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
      </div>

      {/* Food list */}
      {open && (
        <div className="mt-3 flex flex-col gap-1">
          {foods.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">尚未記錄，點擊相機圖示新增</p>
          )}
          {foods.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-2 border-t border-border/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.foodName}</p>
                <p className="text-xs text-muted-foreground">{f.quantity} {f.unit}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="num-display text-sm font-semibold text-foreground">{formatNum(f.calories)} kcal</p>
                <p className="text-[10px] text-muted-foreground">
                  蛋白 {formatNum(f.proteinG ?? 0, 0)} · 碳水 {formatNum(f.carbsG ?? 0, 0)} · 脂肪 {formatNum(f.fatG ?? 0, 0)}g
                </p>
                {Boolean((f.sugarG ?? 0) || (f.saturatedFatG ?? 0) || (f.fiberG ?? 0) || (f.sodiumMg ?? 0)) && (
                  <p className="text-[10px] text-muted-foreground">
                    糖 {formatNum(f.sugarG ?? 0, 0)} · 飽脂 {formatNum(f.saturatedFatG ?? 0, 0)} · 纖 {formatNum(f.fiberG ?? 0, 0)}g · 鈉 {formatNum(f.sodiumMg ?? 0, 0)}mg
                  </p>
                )}
              </div>
              <button
                onClick={() => onDelete(f.id)}
                className="w-7 h-7 rounded-xl bg-destructive/10 flex items-center justify-center ml-1 shrink-0
                           hover:bg-destructive/20 active:scale-95 transition-all"
              >
                <Trash2 size={13} className="text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FoodDiary() {
  const [dateMs, setDateMs] = useState(() => dayStartMs(Date.now()));
  const [cameraForMeal, setCameraForMeal] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: foods = [] } = trpc.food.byDate.useQuery({ dateMs });
  const { data: stats } = trpc.stats.daily.useQuery({ dateMs });

  const deleteFood = trpc.food.delete.useMutation({
    onSuccess: () => {
      utils.food.byDate.invalidate();
      utils.stats.daily.invalidate();
      toast.success("已刪除");
    },
    onError: (e) => toast.error(e.message),
  });

  const mealFoods = useMemo(() => {
    const map: Record<string, typeof foods> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    foods.forEach((f) => { if (map[f.mealType]) map[f.mealType].push(f); });
    return map;
  }, [foods]);

  const today = dayStartMs(Date.now());
  const isToday = dateMs === today;
  const dateLabel = new Date(dateMs).toLocaleDateString("zh-TW", {
    month: "long", day: "numeric", weekday: "short",
  });

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">飲食記錄</h1>
        {/* Date nav */}
        <div className="flex items-center justify-between bg-card rounded-2xl border border-border/50 px-2 py-1">
          <button
            onClick={() => setDateMs((d) => addDays(d, -1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{dateLabel}</p>
            {isToday && <p className="text-[10px] text-primary font-medium">今天</p>}
          </div>
          <button
            onClick={() => setDateMs((d) => addDays(d, 1))}
            disabled={isToday}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
          >
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* Daily summary */}
        {stats && (
          <div className="dt-card">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "熱量", value: formatNum(stats.totalCalories), unit: "kcal", color: "text-primary" },
                { label: "蛋白質", value: formatNum(stats.totalProtein, 0), unit: "g", color: "text-[var(--color-protein)]" },
                { label: "碳水", value: formatNum(stats.totalCarbs, 0), unit: "g", color: "text-[var(--color-carbs)]" },
                { label: "脂肪", value: formatNum(stats.totalFat, 0), unit: "g", color: "text-[var(--color-fat)]" },
              ].map(({ label, value, unit, color }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                  <p className={cn("num-display text-base font-bold", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal sections */}
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            foods={mealFoods[meal] ?? []}
            dateMs={dateMs}
            onCamera={() => setCameraForMeal(meal)}
            onDelete={(id) => deleteFood.mutate({ id })}
          />
        ))}
      </div>

      {/* Camera Modal */}
      {cameraForMeal && (
        <CameraModal
          meal={cameraForMeal}
          dateMs={dateMs}
          onClose={() => setCameraForMeal(null)}
          onSaved={() => {
            utils.food.byDate.invalidate();
            utils.stats.daily.invalidate();
            setCameraForMeal(null);
            toast.success("已成功記錄飲食！");
          }}
        />
      )}
    </div>
  );
}
