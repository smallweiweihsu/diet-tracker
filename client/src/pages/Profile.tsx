import { useState, useEffect, useMemo } from "react";
import { User, Target, Moon, Sun, Bell, Download, LogOut, ChevronRight, Check, Calculator, Plus, Pencil, Trash2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn, MEAL_LABELS, parseExerciseDetails } from "@/lib/utils";
import { toast } from "sonner";

// ── Profile avatar presets ──────────────────────────────────────────────────
const AVATAR_EMOJIS = ["😀", "😎", "🦊", "🐱", "🐻", "🐼", "🦁", "🐯", "🐨", "🐸", "🦄", "🌸", "⚡", "🔥", "💪", "🏃", "🚴", "🏊", "🥗", "🍎"];
const AVATAR_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function ProfileAvatar({
  avatar, color, size = 64, rounded = "rounded-3xl",
}: {
  avatar?: string | null; color?: string | null; size?: number; rounded?: string;
}) {
  const c = color || null;
  return (
    <div
      className={cn("flex items-center justify-center shrink-0 leading-none", rounded, !c && "bg-primary/10")}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.5),
        ...(c ? { backgroundColor: `${c}22` } : {}),
      }}
    >
      {avatar ? avatar : <User size={Math.round(size * 0.42)} className={!c ? "text-primary" : ""} style={c ? { color: c } : {}} />}
    </div>
  );
}

// Flatten the exercise `details` JSON into a readable CSV cell.
function exerciseDetailText(raw: string | null | undefined): string {
  const d = parseExerciseDetails(raw);
  const parts: string[] = [];
  if (d.muscleGroups?.length) parts.push(`部位:${d.muscleGroups.join("/")}`);
  if (d.strokes) {
    const s = Object.entries(d.strokes).map(([k, v]) => `${k}${v}m`).join(" ");
    if (s) parts.push(s);
  }
  if (d.pace) parts.push(`配速${d.pace}/100m`);
  if (d.lifts?.length) {
    const s = d.lifts
      .map((l) => `${l.name} ${l.sets.map((st) => `${st.weight}x${st.reps}`).join("/")}`)
      .join("；");
    if (s) parts.push(s);
  }
  return parts.join("；");
}

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
  const { data: weightHistory = [] } = trpc.weight.history.useQuery({ days: 90 });
  const latestWeight = weightHistory[weightHistory.length - 1]?.weightKg ?? null;

  const [form, setForm] = useState({
    targetWeightKg: "",
    dailyCalories: "1800",
    proteinG: "120",
    carbsG: "200",
    fatG: "60",
    reminderTime: "07:00",
  });
  const [calc, setCalc] = useState({
    sex: "" as "" | "male" | "female",
    age: "",
    heightCm: "",
    weeklyExerciseDays: "3",
    goalType: "maintain" as "lose" | "maintain" | "gain",
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
      setCalc({
        sex: (goals.sex as "male" | "female" | null) ?? "",
        age: goals.age ? String(goals.age) : "",
        heightCm: goals.heightCm ? String(goals.heightCm) : "",
        weeklyExerciseDays: String(goals.weeklyExerciseDays ?? 3),
        goalType: (goals.goalType as "lose" | "maintain" | "gain" | null) ?? "maintain",
      });
    }
  }, [goals]);

  const updateGoals = trpc.goals.update.useMutation({
    onSuccess: () => { toast.success("目標已更新！"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  // ── 建議熱量：Mifflin-St Jeor BMR × 活動係數（依每週運動天數）±目標調整 ──
  const suggestion = useMemo(() => {
    const age = parseInt(calc.age);
    const height = parseFloat(calc.heightCm);
    const days = parseInt(calc.weeklyExerciseDays);
    if (!calc.sex || !age || !height || latestWeight === null || Number.isNaN(days)) return null;

    const bmr =
      10 * latestWeight + 6.25 * height - 5 * age + (calc.sex === "male" ? 5 : -161);
    const activityFactor =
      days <= 0 ? 1.2 : days <= 2 ? 1.375 : days <= 4 ? 1.55 : days <= 6 ? 1.725 : 1.9;
    const adjustment = calc.goalType === "lose" ? -400 : calc.goalType === "gain" ? 300 : 0;
    const calories = Math.max(1000, Math.round((bmr * activityFactor + adjustment) / 50) * 50);

    // 蛋白質 1.6 g/kg、脂肪佔 25% 熱量、碳水補足剩餘
    const proteinG = Math.round(latestWeight * 1.6);
    const fatG = Math.round((calories * 0.25) / 9);
    const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
    return { calories, proteinG, fatG, carbsG };
  }, [calc, latestWeight]);

  const applySuggestion = () => {
    if (!suggestion) return;
    setForm((f) => ({
      ...f,
      dailyCalories: String(suggestion.calories),
      proteinG: String(suggestion.proteinG),
      carbsG: String(suggestion.carbsG),
      fatG: String(suggestion.fatG),
    }));
    toast.success("已套用建議值，記得按儲存");
  };

  const handleSave = () => {
    updateGoals.mutate({
      targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : null,
      dailyCalories: parseInt(form.dailyCalories) || 1800,
      proteinG: parseInt(form.proteinG) || 120,
      carbsG: parseInt(form.carbsG) || 200,
      fatG: parseInt(form.fatG) || 60,
      reminderTime: form.reminderTime,
      sex: calc.sex || null,
      age: calc.age ? parseInt(calc.age) : null,
      heightCm: calc.heightCm ? parseFloat(calc.heightCm) : null,
      weeklyExerciseDays: calc.weeklyExerciseDays ? parseInt(calc.weeklyExerciseDays) : null,
      goalType: calc.goalType,
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

  const inputCls =
    "w-full h-11 rounded-2xl border border-border bg-muted/30 px-3 text-foreground text-sm " +
    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col max-w-[430px]"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-lg font-bold text-foreground">目標設定</h2>
          <button onClick={onClose} className="text-muted-foreground text-sm">取消</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="flex flex-col gap-4">
            {/* ── 熱量目標計算機 ─────────────────────────────────── */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-primary" />
                <p className="text-sm font-bold text-foreground">依運動量計算建議熱量</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">性別</label>
                  <div className="flex gap-1">
                    {([["male", "男"], ["female", "女"]] as const).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setCalc((c) => ({ ...c, sex: value }))}
                        className={cn(
                          "flex-1 h-11 rounded-2xl text-sm font-medium border transition-all",
                          calc.sex === value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 text-muted-foreground border-border"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">年齡</label>
                  <input type="number" inputMode="numeric" value={calc.age} placeholder="30"
                    onChange={(e) => setCalc((c) => ({ ...c, age: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">身高 (cm)</label>
                  <input type="number" inputMode="decimal" value={calc.heightCm} placeholder="170"
                    onChange={(e) => setCalc((c) => ({ ...c, heightCm: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">每週運動天數</label>
                  <select
                    value={calc.weeklyExerciseDays}
                    onChange={(e) => setCalc((c) => ({ ...c, weeklyExerciseDays: e.target.value }))}
                    className={inputCls}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>{d} 天</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">目標</label>
                <div className="flex gap-1">
                  {([["lose", "減重"], ["maintain", "維持"], ["gain", "增重"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setCalc((c) => ({ ...c, goalType: value }))}
                      className={cn(
                        "flex-1 h-10 rounded-2xl text-sm font-medium border transition-all",
                        calc.goalType === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {latestWeight === null ? (
                <p className="text-xs text-muted-foreground">先在首頁記錄一次體重，才能計算建議熱量</p>
              ) : suggestion ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">以體重 {latestWeight.toFixed(1)} kg 計算</p>
                    <p className="num-display text-xl font-bold text-primary">
                      {suggestion.calories} <span className="text-xs font-normal">kcal/天</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      蛋白 {suggestion.proteinG}g · 碳水 {suggestion.carbsG}g · 脂肪 {suggestion.fatG}g
                    </p>
                  </div>
                  <button
                    onClick={applySuggestion}
                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/30 active:scale-95 transition-all shrink-0"
                  >
                    套用建議
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">填齊性別、年齡、身高後顯示建議熱量</p>
              )}
            </div>

            {/* ── 手動目標欄位 ───────────────────────────────────── */}
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

// ── Profile create/edit form ────────────────────────────────────────────────
function ProfileEditor({
  initial, onDone, onCancel,
}: {
  initial: { id: number; name: string; avatar: string | null; avatarColor: string | null } | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(initial?.avatar ?? AVATAR_EMOJIS[0]);
  const [color, setColor] = useState<string | null>(initial?.avatarColor ?? AVATAR_COLORS[0]);

  const createMutation = trpc.profiles.create.useMutation({
    onSuccess: async () => {
      await utils.profiles.list.invalidate();
      toast.success("已新增帳號");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.profiles.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.profiles.list.invalidate(), utils.auth.me.invalidate()]);
      toast.success("已更新");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("請輸入名稱");
      return;
    }
    if (initial) {
      updateMutation.mutate({ id: initial.id, name: trimmed, avatar, avatarColor: color });
    } else {
      createMutation.mutate({ name: trimmed, avatar, avatarColor: color });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <ProfileAvatar avatar={avatar} color={color} size={72} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">帳號名稱</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="輸入名稱"
          maxLength={20}
          autoFocus
          className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 text-foreground
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">頭貼</label>
        <div className="grid grid-cols-8 gap-1.5">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setAvatar(e)}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center text-lg transition-all",
                avatar === e ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/40"
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">顏色</label>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-8 h-8 rounded-full transition-all",
                color === c ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110" : ""
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onCancel}
          className="flex-1 h-12 rounded-full border border-border text-muted-foreground font-semibold active:scale-[0.98] transition-all"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold
                     shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Check size={18} />
          {pending ? "儲存中..." : "儲存"}
        </button>
      </div>
    </div>
  );
}

// ── Account switcher sheet ──────────────────────────────────────────────────
function ProfilesSheet({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data } = trpc.profiles.list.useQuery();
  // null = list view; "new" = create form; number = edit that profile.
  const [editing, setEditing] = useState<"new" | number | null>(null);

  const switchMutation = trpc.profiles.switch.useMutation({
    onSuccess: async () => {
      // Active user changed server-side — refetch everything.
      await utils.invalidate();
      toast.success("已切換帳號");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.profiles.remove.useMutation({
    onSuccess: async () => {
      await utils.profiles.list.invalidate();
      toast.success("已刪除帳號");
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const profiles = data?.profiles ?? [];
  const activeId = data?.activeId;
  const editingProfile =
    typeof editing === "number" ? profiles.find((p) => p.id === editing) ?? null : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col max-w-[430px]"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {editing === "new" ? "新增帳號" : editingProfile ? "編輯帳號" : "切換帳號"}
          </h2>
          <button
            onClick={editing !== null ? () => setEditing(null) : onClose}
            className="text-muted-foreground text-sm"
          >
            {editing !== null ? "返回" : "關閉"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {editing !== null ? (
            <ProfileEditor
              initial={
                editingProfile
                  ? {
                      id: editingProfile.id,
                      name: editingProfile.name ?? "",
                      avatar: editingProfile.avatar,
                      avatarColor: editingProfile.avatarColor,
                    }
                  : null
              }
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {profiles.map((p) => {
                const isActive = p.id === activeId;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                      isActive ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:opacity-100"
                      disabled={isActive || switchMutation.isPending}
                      onClick={() => switchMutation.mutate({ openId: p.openId })}
                    >
                      <ProfileAvatar avatar={p.avatar} color={p.avatarColor} size={44} rounded="rounded-2xl" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.name ?? "未命名"}</p>
                        {isActive ? (
                          <p className="text-xs text-primary font-medium">使用中</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">點擊切換</p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => setEditing(p.id)}
                      className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground active:scale-95 transition-all shrink-0"
                    >
                      <Pencil size={15} />
                    </button>
                    {!isActive && profiles.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`刪除「${p.name ?? "此帳號"}」？此帳號的所有記錄都會一併刪除。`)) {
                            removeMutation.mutate({ id: p.id });
                          }
                        }}
                        className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive active:scale-95 transition-all shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => setEditing("new")}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-border text-muted-foreground font-semibold active:scale-[0.99] transition-all mt-1"
              >
                <Plus size={18} />
                新增帳號
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showGoals, setShowGoals] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
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
          ["日期", "餐別", "食物", "份量", "單位", "熱量(kcal)", "蛋白質(g)", "碳水(g)", "脂肪(g)", "糖(g)", "飽和脂肪(g)", "膳食纖維(g)", "鈉(mg)"],
          data.foods.map((f) => [
            formatDateTime(f.loggedAt),
            MEAL_LABELS[f.mealType] ?? f.mealType,
            f.foodName, f.quantity, f.unit ?? "",
            f.calories, f.proteinG ?? 0, f.carbsG ?? 0, f.fatG ?? 0,
            f.sugarG ?? 0, f.saturatedFatG ?? 0, f.fiberG ?? 0, f.sodiumMg ?? 0,
          ])
        ),
        "",
        "=== 運動記錄 ===",
        toCsvRows(
          ["日期", "運動類型", "時間(分鐘)", "消耗熱量(kcal)", "平均心律", "最大心律", "距離(km)", "平均速度(km/h)", "詳細", "備註"],
          data.exercises.map((e) => [
            formatDateTime(e.loggedAt), e.exerciseType, e.durationMin, e.caloriesBurned ?? 0,
            e.avgHeartRate ?? "", e.maxHeartRate ?? "", e.distanceKm ?? "", e.avgSpeedKmh ?? "",
            exerciseDetailText(e.details), e.note ?? "",
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
        {/* Profile card — tap to switch account */}
        <button
          onClick={() => setShowProfiles(true)}
          className="dt-card flex items-center gap-4 w-full text-left active:scale-[0.99] transition-transform duration-150"
        >
          <ProfileAvatar avatar={user?.avatar} color={user?.avatarColor} size={64} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-base truncate">{user?.name ?? "使用者"}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Users size={12} /> 切換帳號
            </p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

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
      {showProfiles && <ProfilesSheet onClose={() => setShowProfiles(false)} />}
    </div>
  );
}
