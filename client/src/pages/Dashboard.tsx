import { useState, useMemo } from "react";
import { Camera, ChevronRight, Scale, Flame, Droplets, Beef, Wheat } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn, formatNum, MEAL_LABELS, MEAL_ICONS, dayStartMs } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import WeightModal from "@/components/WeightModal";
import CameraModal from "@/components/CameraModal";

// Calorie ring SVG
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(consumed / Math.max(goal, 1), 1);
  const dash = pct * circ;
  const remaining = goal - consumed;
  const over = remaining < 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12"
            className="stroke-muted" />
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12"
            strokeLinecap="round"
            stroke={over ? "var(--color-accent)" : "var(--color-primary)"}
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.23,1,0.32,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num-display text-2xl text-foreground">{formatNum(consumed)}</span>
          <span className="text-[10px] text-muted-foreground">kcal 已攝取</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-muted-foreground">目標</p>
          <p className="num-display text-lg font-semibold text-foreground">{formatNum(goal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{over ? "超出" : "剩餘"}</p>
          <p className={cn("num-display text-lg font-semibold", over ? "text-accent" : "text-primary")}>
            {formatNum(Math.abs(remaining))}
          </p>
        </div>
      </div>
    </div>
  );
}

// Macro progress bar
function MacroBar({ label, value, goal, color, icon: Icon }: {
  label: string; value: number; goal: number; color: string; icon: React.ElementType;
}) {
  const pct = Math.min((value / Math.max(goal, 1)) * 100, 100);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 mb-1">
        <Icon size={12} style={{ color }} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="num-display text-base font-bold text-foreground">{formatNum(value, 0)}</span>
        <span className="text-[10px] text-muted-foreground">/{goal}g</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Meal summary card
function MealCard({ meal, calories, foods, onCamera }: {
  meal: string; calories: number; foods: string[]; onCamera: () => void;
}) {
  return (
    <div className="dt-card flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
        {MEAL_ICONS[meal]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">{MEAL_LABELS[meal]}</span>
          {calories > 0 && (
            <span className="num-display text-sm text-primary font-bold">{formatNum(calories)} kcal</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {foods.length > 0 ? foods.slice(0, 3).join("、") : "尚未記錄"}
        </p>
      </div>
      <button
        onClick={onCamera}
        className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center
                   text-primary hover:bg-primary/20 active:scale-95 transition-all duration-150 shrink-0"
      >
        <Camera size={16} />
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading, login, loginPending } = useAuth();
  const [password, setPassword] = useState("");
  const [showWeight, setShowWeight] = useState(false);
  const [cameraForMeal, setCameraForMeal] = useState<string | null>(null);
  const [todayMs] = useState(() => dayStartMs(Date.now()));

  const utils = trpc.useUtils();
  const { data: stats } = trpc.stats.daily.useQuery({ dateMs: todayMs });
  const { data: weightToday } = trpc.weight.today.useQuery({ dateMs: todayMs });
  const { data: foods } = trpc.food.byDate.useQuery({ dateMs: todayMs });

  const mealSummary = useMemo(() => {
    const meals: Record<string, { calories: number; foods: string[] }> = {
      breakfast: { calories: 0, foods: [] },
      lunch: { calories: 0, foods: [] },
      dinner: { calories: 0, foods: [] },
      snack: { calories: 0, foods: [] },
    };
    (foods ?? []).forEach((f) => {
      if (meals[f.mealType]) {
        meals[f.mealType].calories += f.calories ?? 0;
        meals[f.mealType].foods.push(f.foodName);
      }
    });
    return meals;
  }, [foods]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  if (!isAuthenticated) {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-dvh">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Flame size={36} className="text-primary" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-2">
          <Flame size={36} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center">Diet Tracker</h1>
        <p className="text-muted-foreground text-center text-sm">記錄飲食、追蹤運動、達成健康目標</p>
        <form
          className="w-full max-w-xs flex flex-col gap-3 mt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await login(password);
            } catch {
              toast.error("密碼錯誤，請重試");
            }
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入密碼"
            autoFocus
            className="w-full h-12 rounded-2xl border border-border bg-card px-4 text-foreground text-center
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={!password || loginPending}
            className="btn-pill bg-primary text-primary-foreground px-8 py-3 text-base font-semibold shadow-md shadow-primary/30 disabled:opacity-50"
          >
            {loginPending ? "登入中..." : "登入開始使用"}
          </button>
        </form>
      </div>
    );
  }

  const goals = stats?.goals ?? { dailyCalories: 1800, proteinG: 120, carbsG: 200, fatG: 60 };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-xs text-muted-foreground mb-0.5">{dateStr}</p>
        <h1 className="text-xl font-bold text-foreground">
          {user?.name ? `嗨，${user.name} 👋` : "今日總覽"}
        </h1>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* Weight Card */}
        <button
          onClick={() => setShowWeight(true)}
          className="dt-card flex items-center gap-3 w-full text-left active:scale-[0.99] transition-transform duration-150"
        >
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <Scale size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">今日體重</p>
            <p className="text-sm text-muted-foreground/70">
              {weightToday ? "點擊更新體重" : "點擊輸入晨間體重"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {weightToday ? (
              <span className="num-display text-2xl font-bold text-primary">
                {weightToday.weightKg.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">未記錄</span>
            )}
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </button>

        {/* Calorie Ring Card */}
        <div className="dt-card">
          <CalorieRing
            consumed={stats?.totalCalories ?? 0}
            goal={goals.dailyCalories}
          />
        </div>

        {/* Macros Card */}
        <div className="dt-card flex gap-4">
          <MacroBar
            label="蛋白質" value={stats?.totalProtein ?? 0} goal={goals.proteinG}
            color="var(--color-protein)" icon={Beef}
          />
          <MacroBar
            label="碳水" value={stats?.totalCarbs ?? 0} goal={goals.carbsG}
            color="var(--color-carbs)" icon={Wheat}
          />
          <MacroBar
            label="脂肪" value={stats?.totalFat ?? 0} goal={goals.fatG}
            color="var(--color-fat)" icon={Droplets}
          />
        </div>

        {/* Meal Cards */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2 px-0.5">今日餐點</h2>
          <div className="flex flex-col gap-2">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
              <MealCard
                key={meal}
                meal={meal}
                calories={mealSummary[meal]?.calories ?? 0}
                foods={mealSummary[meal]?.foods ?? []}
                onCamera={() => setCameraForMeal(meal)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWeight && (
        <WeightModal
          current={weightToday?.weightKg}
          onClose={() => setShowWeight(false)}
          onSaved={() => {
            utils.weight.today.invalidate();
            utils.stats.daily.invalidate();
            setShowWeight(false);
          }}
        />
      )}
      {cameraForMeal && (
        <CameraModal
          meal={cameraForMeal}
          dateMs={todayMs}
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
