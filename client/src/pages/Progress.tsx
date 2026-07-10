import { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Dumbbell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn, formatDateShort, formatNum, dayStartMs, addDays } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "7天", days: 7 },
  { label: "30天", days: 30 },
  { label: "90天", days: 90 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

// Start-of-week (Monday) for the local day containing ms.
function weekStartMs(ms: number): number {
  const d = new Date(ms);
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay: 0=Sun
  return dayStartMs(ms) - daysSinceMonday * DAY_MS;
}
function monthStartMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function monthEndMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-foreground px-0.5 mb-2">{children}</h2>;
}

// ── Weekly exercise calendar ────────────────────────────────────────────────
function WeeklyExerciseCalendar() {
  const todayMs = dayStartMs(Date.now());
  const weekStart = weekStartMs(todayMs);
  const { data: cal = [] } = trpc.stats.exerciseCalendar.useQuery({
    startMs: weekStart,
    days: 7,
  });
  const weekCount = cal.filter((d) => d.count > 0).length;

  return (
    <div className="dt-card">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>本週運動</SectionTitle>
        <span className="text-xs text-muted-foreground">
          本週運動 <span className="num-display font-bold text-primary">{weekCount}</span> 天
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {(cal.length ? cal : Array.from({ length: 7 }, (_, i) => ({
          dateMs: weekStart + i * DAY_MS, count: 0, totalMin: 0, totalBurned: 0, types: [] as string[],
        }))).map((d, i) => {
          const isToday = d.dateMs === todayMs;
          const active = d.count > 0;
          return (
            <div key={d.dateMs} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs num-display",
                  active
                    ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/30"
                    : "bg-muted text-muted-foreground",
                  isToday && !active && "ring-2 ring-primary/50"
                )}
              >
                {new Date(d.dateMs).getDate()}
              </div>
              {active && (
                <span className="text-[9px] text-primary font-semibold leading-none">
                  {d.count}次
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { label: "日", key: "day" as const },
  { label: "週", key: "week" as const },
  { label: "月", key: "month" as const },
];

// ── Per-type exercise statistics explorer ───────────────────────────────────
function ExerciseStats() {
  const todayMs = dayStartMs(Date.now());
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [type, setType] = useState<string | null>(null);

  const { startMs, endMs } = useMemo(() => {
    if (period === "day") return { startMs: todayMs, endMs: todayMs + DAY_MS - 1 };
    if (period === "week") {
      const ws = weekStartMs(todayMs);
      return { startMs: ws, endMs: ws + 7 * DAY_MS - 1 };
    }
    return { startMs: monthStartMs(todayMs), endMs: monthEndMs(todayMs) };
  }, [period, todayMs]);

  // Wide window so the picker lists types even if not done this period.
  const { data: typeList = [] } = trpc.stats.exerciseTypeList.useQuery({
    startMs: todayMs - 180 * DAY_MS,
    endMs: todayMs + DAY_MS - 1,
  });

  useEffect(() => {
    if (typeList.length === 0) return;
    if (!type || !typeList.some((t) => t.type === type)) {
      setType(typeList[0].type);
    }
  }, [typeList, type]);

  const { data: summary } = trpc.stats.exerciseSummary.useQuery(
    { exerciseType: type ?? "", startMs, endMs },
    { enabled: !!type }
  );

  const metrics = useMemo(() => {
    if (!summary) return [];
    const m: { label: string; value: string }[] = [];
    m.push({ label: "次數", value: `${summary.count} 次` });
    m.push({ label: "總時間", value: `${formatNum(summary.totalMin)} 分` });
    m.push({ label: "總消耗", value: `${formatNum(summary.totalBurned)} kcal` });
    if (summary.totalDistanceKm > 0)
      m.push({ label: "總距離", value: `${summary.totalDistanceKm} km` });
    if (summary.strokeMeters > 0)
      m.push({ label: "總泳距", value: `${formatNum(summary.strokeMeters)} m` });
    if (summary.avgHeartRate)
      m.push({ label: "平均心律", value: `${summary.avgHeartRate} bpm` });
    if (summary.maxHeartRate)
      m.push({ label: "最大心律", value: `${summary.maxHeartRate} bpm` });
    if (summary.avgSpeedKmh)
      m.push({ label: "平均速度", value: `${summary.avgSpeedKmh} km/h` });
    if (summary.avgPace)
      m.push({ label: "平均配速", value: `${summary.avgPace} /100m` });
    return m;
  }, [summary]);

  if (typeList.length === 0) {
    return (
      <div className="dt-card">
        <SectionTitle>運動統計</SectionTitle>
        <div className="flex flex-col items-center justify-center h-28 text-muted-foreground text-sm gap-2">
          <Dumbbell size={24} className="opacity-50" />
          記錄運動後顯示統計
        </div>
      </div>
    );
  }

  return (
    <div className="dt-card">
      <SectionTitle>運動統計</SectionTitle>

      {/* Type picker */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
        {typeList.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={cn(
              "shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-all duration-150",
              type === t.type
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t.type}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mt-2 mb-3">
        {PERIOD_OPTIONS.map(({ label, key }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={cn(
              "flex-1 h-8 rounded-full text-xs font-semibold transition-all duration-150",
              period === key
                ? "bg-foreground text-background"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!summary || summary.count === 0 ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          此期間沒有{type}記錄
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Metric grid */}
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <div key={m.label} className="p-2.5 rounded-xl bg-muted/40">
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="num-display text-base font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Swim stroke breakdown */}
          {Object.keys(summary.strokes).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5 px-0.5">泳姿距離</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(summary.strokes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, meters]) => {
                    const pct = summary.strokeMeters > 0
                      ? Math.round((meters / summary.strokeMeters) * 100) : 0;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-xs text-foreground w-12 shrink-0">{name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="num-display text-xs font-semibold text-foreground w-16 text-right shrink-0">
                          {formatNum(meters)} m
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Muscle-group day counts */}
          {summary.muscleGroups.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5 px-0.5">訓練部位（天數）</p>
              <div className="flex flex-wrap gap-1.5">
                {summary.muscleGroups.map((g) => (
                  <span
                    key={g.group}
                    className="px-2.5 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1"
                  >
                    {g.group}
                    <span className="num-display">{g.days}天</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Progress() {
  const [days, setDays] = useState(30);
  const { data: weightHistory = [] } = trpc.weight.history.useQuery({ days });
  const { data: goals } = trpc.goals.get.useQuery();

  const todayMs = dayStartMs(Date.now());
  const { data: statsToday } = trpc.stats.daily.useQuery({ dateMs: todayMs });

  // Daily calorie totals for the selected range (capped at 90 days by the API)
  const rangeDays = Math.min(days, 90);
  const rangeStartMs = addDays(todayMs, -(rangeDays - 1));
  const { data: rangeStats = [] } = trpc.stats.range.useQuery({
    startMs: rangeStartMs,
    days: rangeDays,
  });

  const calorieData = useMemo(() => {
    return rangeStats.map((d) => ({
      date: formatDateShort(d.dateMs),
      calories: Math.round(d.calories),
    }));
  }, [rangeStats]);
  const hasCalorieData = calorieData.some((d) => d.calories > 0);

  // Weight chart data
  const weightData = useMemo(() => {
    return weightHistory.map((w) => ({
      date: formatDateShort(w.loggedAt),
      weight: w.weightKg,
    }));
  }, [weightHistory]);

  // Macro donut data (use today's stats as weekly proxy)
  const macroData = useMemo(() => {
    if (!statsToday) return [];
    const total = (statsToday.totalProtein * 4) + (statsToday.totalCarbs * 4) + (statsToday.totalFat * 9);
    if (total === 0) return [];
    return [
      { name: "蛋白質", value: Math.round(statsToday.totalProtein * 4), color: "var(--color-protein)" },
      { name: "碳水", value: Math.round(statsToday.totalCarbs * 4), color: "var(--color-carbs)" },
      { name: "脂肪", value: Math.round(statsToday.totalFat * 9), color: "var(--color-fat)" },
    ];
  }, [statsToday]);

  const goalCalories = goals?.dailyCalories ?? 1800;
  const latestWeight = weightHistory[weightHistory.length - 1]?.weightKg;
  const firstWeight = weightHistory[0]?.weightKg;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-foreground">趨勢圖表</h1>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Range selector */}
        <div className="flex gap-2">
          {RANGE_OPTIONS.map(({ label, days: d }) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "flex-1 h-9 rounded-full text-sm font-semibold transition-all duration-200",
                days === d
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Weekly exercise calendar */}
        <WeeklyExerciseCalendar />

        {/* Per-type exercise statistics */}
        <ExerciseStats />

        {/* Weight summary */}
        {latestWeight && (
          <div className="dt-card flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">最新體重</p>
              <p className="num-display text-2xl font-bold text-foreground">
                {latestWeight.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
              </p>
            </div>
            {weightChange !== null && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">{days} 天變化</p>
                <p className={cn(
                  "num-display text-lg font-bold",
                  weightChange < 0 ? "text-primary" : weightChange > 0 ? "text-accent" : "text-muted-foreground"
                )}>
                  {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
                </p>
              </div>
            )}
          </div>
        )}

        {/* Weight chart */}
        <div className="dt-card">
          <SectionTitle>體重趨勢</SectionTitle>
          {weightData.length < 2 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              記錄更多體重資料後顯示圖表
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weightData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false} axisLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                  formatter={(v: number) => [`${v.toFixed(1)} kg`, "體重"]}
                />
                <Area
                  type="monotone" dataKey="weight"
                  stroke="var(--color-primary)" strokeWidth={2.5}
                  fill="url(#weightGrad)" dot={{ fill: "var(--color-primary)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily calorie bar chart */}
        <div className="dt-card">
          <SectionTitle>每日熱量攝取</SectionTitle>
          {!hasCalorieData ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              記錄飲食後顯示圖表
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={calorieData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false} axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false} axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                  formatter={(v: number) => [`${formatNum(v)} kcal`, "攝取"]}
                />
                <ReferenceLine
                  y={goalCalories}
                  stroke="var(--color-accent)"
                  strokeDasharray="4 4"
                  label={{
                    value: `目標 ${formatNum(goalCalories)}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "var(--color-accent)",
                  }}
                />
                <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={18}>
                  {calorieData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.calories > goalCalories ? "var(--color-accent)" : "var(--color-primary)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Today calorie summary */}
        <div className="dt-card">
          <SectionTitle>今日熱量</SectionTitle>
          {statsToday ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <span className="num-display text-3xl font-bold text-foreground">
                  {formatNum(statsToday.totalCalories)}
                </span>
                <span className="text-sm text-muted-foreground mb-1">/ {goalCalories} kcal</span>
                {statsToday.totalCalories > goalCalories && (
                  <span className="text-xs text-accent font-semibold mb-1">超標</span>
                )}
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((statsToday.totalCalories / goalCalories) * 100, 100)}%`,
                    backgroundColor: statsToday.totalCalories > goalCalories
                      ? "var(--color-accent)"
                      : "var(--color-primary)",
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { label: "蛋白質", value: statsToday.totalProtein, goal: goals?.proteinG ?? 120, color: "var(--color-protein)" },
                  { label: "碳水", value: statsToday.totalCarbs, goal: goals?.carbsG ?? 200, color: "var(--color-carbs)" },
                  { label: "脂肪", value: statsToday.totalFat, goal: goals?.fatG ?? 60, color: "var(--color-fat)" },
                ].map(({ label, value, goal, color }) => (
                  <div key={label} className="text-center p-2 rounded-xl bg-muted/40">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="num-display text-base font-bold" style={{ color }}>{formatNum(value, 0)}g</p>
                    <p className="text-[10px] text-muted-foreground">/{goal}g</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">今日尚無記錄</p>
          )}
        </div>

        {/* Macro donut */}
        <div className="dt-card">
          <SectionTitle>今日營養素分佈</SectionTitle>
          {macroData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              記錄飲食後顯示分佈圖
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={macroData} cx="50%" cy="50%"
                    innerRadius={42} outerRadius={62}
                    paddingAngle={3} dataKey="value"
                    strokeWidth={0}
                  >
                    {macroData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {macroData.map((d) => {
                  const total = macroData.reduce((s, x) => s + x.value, 0);
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-foreground">{d.name}</span>
                      <span className="num-display text-xs font-bold text-foreground ml-auto">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
