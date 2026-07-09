import { useState, useEffect } from "react";
import { User, Target, Moon, Sun, Bell, Download, LogOut, ChevronRight, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn, MEAL_LABELS } from "@/lib/utils";
import { toast } from "sonner";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsvRows(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SettingRow({
  icon: Icon, label, value, onClick, color = "text-primary",
}: {
  icon: React.ElementType; label: string; value?: string; onClick?: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 border-b border-border/40 last:border-0 active:bg-muted/50 transition-colors"
    >
      <div className={cn("w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0", color === "text-destructive" && "bg-destructive/10")}>
        <Icon size={16} className={color} />
      </div>
      <span className="flex-1 text-sm font-medium text-foreground text-left">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </button>
  );
}

function GoalsSheet({ onClose }: { onClose: () => void }) {
  const { data: goals } = trpc.goals.get.useQuery();
  const [form, setForm] = useState({
    targetWeightKg: "",
    dailyCalories: "1800",
    proteinG: "120",
    carbsG: "200",
    fatG: "60",
    reminderTime: "07:00",
  });

  useEffect(() => {
    if (goals) {
      setForm({
        targetWeightKg: goals.targetWeightKg ? String(goals.targetWeightKg) : "",
        dailyCalories: String(goals.dailyCalories ?? 1800),
        proteinG: String(goals.proteinG ?? 120),
        carbsG: String(goals.carbsG ?? 200),
        fatG: String(goals.fatG ?? 60),
        reminderTime: goals.reminderTime ?? "07:00",
      });
    }
  }, [goals]);

  const updateGoals = trpc.goals.update.useMutation({
    onSuccess: () => { toast.success("目標已更新！"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateGoals.mutate({
      targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : null,
      dailyCalories: parseInt(form.dailyCalories) || 1800,
      proteinG: parseInt(form.proteinG) || 120,
      carbsG: parseInt(form.carbsG) || 200,
      fatG: parseInt(form.fatG) || 60,
      reminderTime: form.reminderTime,
    });
  };

  const fields = [
    { key: "targetWeightKg", label: "目標體重", unit: "kg", type: "number", placeholder: "例如：65" },
    { key: "dailyCalories", label: "每日熱量目標", unit: "kcal", type: "number", placeholder: "1800" },
    { key: "proteinG", label: "蛋白質目標", unit: "g", type: "number", placeholder: "120" },
    { key: "carbsG", label: "碳水化合物目標", unit: "g", type: "number", placeholder: "200" },
    { key: "fatG", label: "脂肪目標", unit: "g", type: "number", placeholder: "60" },
    { key: "reminderTime", label: "晨間提醒時間", unit: "", type: "time", placeholder: "07:00" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ maxWidth: 430, left: "50%", transform: "translateX(-50%)" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-lg font-bold text-foreground">目標設定</h2>
          <button onClick={onClose} className="text-muted-foreground text-sm">取消</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="flex flex-col gap-4">
            {fields.map(({ key, label, unit, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {label}{unit && <span className="text-primary ml-1">({unit})</span>}
                </label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={updateGoals.isPending}
              className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base
                         shadow-lg shadow-primary/30 active:scale-[0.98] transition-all mt-2 flex items-center justify-center gap-2"
            >
              <Check size={18} />
              {updateGoals.isPending ? "儲存中..." : "儲存目標"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showGoals, setShowGoals] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { data: goals } = trpc.goals.get.useQuery();
  const utils = trpc.useUtils();

  const isDark = theme === "dark";
  const handleToggleTheme = () => { if (toggleTheme) toggleTheme(); };

  const handleExportCSV = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await utils.stats.exportAll.fetch();
      if (!data.weights.length && !data.foods.length && !data.exercises.length) {
        toast.info("目前沒有任何記錄可匯出");
        return;
      }

      const sections = [
        "=== 體重記錄 ===",
        toCsvRows(
          ["日期", "體重(kg)", "備註"],
          data.weights.map((w) => [formatDateTime(w.loggedAt), w.weightKg, w.note ?? ""])
        ),
        "",
        "=== 飲食記錄 ===",
        toCsvRows(
          ["日期", "餐別", "食物", "份量", "單位", "熱量(kcal)", "蛋白質(g)", "碳水(g)", "脂肪(g)"],
          data.foods.map((f) => [
            formatDateTime(f.loggedAt),
            MEAL_LABELS[f.mealType] ?? f.mealType,
            f.foodName, f.quantity, f.unit ?? "",
            f.calories, f.proteinG ?? 0, f.carbsG ?? 0, f.fatG ?? 0,
          ])
        ),
        "",
        "=== 運動記錄 ===",
        toCsvRows(
          ["日期", "運動類型", "時間(分鐘)", "消耗熱量(kcal)", "備註"],
          data.exercises.map((e) => [
            formatDateTime(e.loggedAt), e.exerciseType, e.durationMin, e.caloriesBurned ?? 0, e.note ?? "",
          ])
        ),
      ].join("\n");

      // BOM so Excel opens Chinese text correctly
      const blob = new Blob(["\uFEFF" + sections], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diet-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV 已匯出！");
    } catch {
      toast.error("匯出失敗，請重試");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-foreground">個人設定</h1>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* Profile card */}
        <div className="dt-card flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center shrink-0">
            <User size={28} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-base truncate">{user?.name ?? "使用者"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
        </div>

        {/* Goals summary */}
        {goals && (
          <div className="dt-card">
            <p className="text-xs font-semibold text-muted-foreground mb-3">目前目標</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "目標體重", value: goals.targetWeightKg ? `${goals.targetWeightKg} kg` : "未設定" },
                { label: "每日熱量", value: `${goals.dailyCalories} kcal` },
                { label: "蛋白質", value: `${goals.proteinG} g` },
                { label: "碳水化合物", value: `${goals.carbsG} g` },
                { label: "脂肪", value: `${goals.fatG} g` },
                { label: "提醒時間", value: goals.reminderTime ?? "07:00" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-2xl bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="dt-card">
          <SettingRow
            icon={Target} label="目標設定"
            value={goals?.dailyCalories ? `${goals.dailyCalories} kcal/天` : undefined}
            onClick={() => setShowGoals(true)}
          />
          <SettingRow
            icon={Bell} label="晨間提醒"
            value={goals?.reminderTime ?? "07:00"}
            onClick={() => setShowGoals(true)}
          />
          <SettingRow
            icon={Download} label={exporting ? "匯出中..." : "匯出 CSV 資料"}
            onClick={handleExportCSV}
          />
        </div>

        {/* Dark mode toggle */}
        <div className="dt-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {isDark ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">深色模式</span>
            <button
              onClick={handleToggleTheme}
              className={cn(
                "w-12 h-6 rounded-full transition-all duration-300 relative",
                isDark ? "bg-primary" : "bg-muted"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all duration-300",
                isDark ? "left-[26px]" : "left-0.5"
              )} />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="dt-card">
          <SettingRow
            icon={LogOut} label="登出"
            onClick={() => logout()}
            color="text-destructive"
          />
        </div>

        <p className="text-center text-xs text-muted-foreground py-2">Diet Tracker v1.0</p>
      </div>

      {showGoals && <GoalsSheet onClose={() => setShowGoals(false)} />}
    </div>
  );
}
