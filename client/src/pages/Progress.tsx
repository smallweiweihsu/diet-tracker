import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { cn, formatDateShort, formatNum, dayStartMs, addDays } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "7天", days: 7 },
  { label: "30天", days: 30 },
  { label: "90天", days: 90 },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-foreground px-0.5 mb-2">{children}</h2>;
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
