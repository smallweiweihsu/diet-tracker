import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Dumbbell, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn, formatNum, formatDateShort, dayStartMs } from "@/lib/utils";

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
function paceLabel(secs: number): string {
  const r = Math.round(secs);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-foreground px-0.5 mb-2">{children}</h2>;
}

// ── Weekly exercise calendar (navigable, tap a day to jump) ─────────────────
function WeeklyCalendar({ onPickDay }: { onPickDay: (dateMs: number) => void }) {
  const todayMs = dayStartMs(Date.now());
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week
  const weekStart = weekStartMs(todayMs) + weekOffset * 7 * DAY_MS;
  const { data: cal = [] } = trpc.stats.exerciseCalendar.useQuery({ startMs: weekStart, days: 7 });
  const weekCount = cal.filter((d) => d.count > 0).length;

  const days = cal.length
    ? cal
    : Array.from({ length: 7 }, (_, i) => ({
        dateMs: weekStart + i * DAY_MS, count: 0, totalMin: 0, totalBurned: 0, types: [] as string[],
      }));

  const rangeLabel = `${formatDateShort(weekStart)} - ${formatDateShort(weekStart + 6 * DAY_MS)}`;

  return (
    <div className="dt-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
          >
            <ChevronLeft size={16} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[92px] text-center">{rangeLabel}</span>
          <button
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
            disabled={weekOffset >= 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
          >
            <ChevronRight size={16} className="text-foreground" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          運動 <span className="num-display font-bold text-primary">{weekCount}</span> 天
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const isToday = d.dateMs === todayMs;
          const active = d.count > 0;
          const future = d.dateMs > todayMs;
          return (
            <button
              key={d.dateMs}
              onClick={() => onPickDay(d.dateMs)}
              disabled={future}
              className="flex flex-col items-center gap-1 disabled:opacity-40 active:scale-95 transition-transform"
            >
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
              {active && <span className="text-[9px] text-primary font-semibold leading-none">{d.count}次</span>}
            </button>
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

// ── Small trend line chart ──────────────────────────────────────────────────
function TrendChart({
  title, points, color, tickFormatter, tooltipFormatter, invert,
}: {
  title: string;
  points: { label: string; value: number }[];
  color: string;
  tickFormatter?: (v: number) => string;
  tooltipFormatter: (v: number) => string;
  invert?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-1 px-0.5">{title}</p>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={points} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
            tickLine={false} axisLine={false} width={40}
            domain={["auto", "auto"]}
            reversed={invert}
            tickFormatter={tickFormatter}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)", border: "1px solid var(--color-border)",
              borderRadius: 12, fontSize: 12, color: "var(--color-foreground)",
            }}
            formatter={(v: number) => [tooltipFormatter(v), title]}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
            dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Per-type statistics + trends ────────────────────────────────────────────
function ExerciseTypeStats() {
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

  const { data: typeList = [] } = trpc.stats.exerciseTypeList.useQuery({
    startMs: todayMs - 180 * DAY_MS,
    endMs: todayMs + DAY_MS - 1,
  });

  useEffect(() => {
    if (typeList.length === 0) return;
    if (!type || !typeList.some((t) => t.type === type)) setType(typeList[0].type);
  }, [typeList, type]);

  const { data: summary } = trpc.stats.exerciseSummary.useQuery(
    { exerciseType: type ?? "", startMs, endMs },
    { enabled: !!type }
  );

  // Trends span a wider window (last ~12 weeks) regardless of the period toggle.
  const { data: series = [] } = trpc.stats.exerciseSeries.useQuery(
    { exerciseType: type ?? "", startMs: todayMs - 84 * DAY_MS, endMs: todayMs + DAY_MS - 1 },
    { enabled: !!type }
  );

  const metrics = useMemo(() => {
    if (!summary) return [];
    const m: { label: string; value: string }[] = [];
    m.push({ label: "次數", value: `${summary.count} 次` });
    m.push({ label: "總時間", value: `${formatNum(summary.totalMin)} 分` });
    m.push({ label: "總消耗", value: `${formatNum(summary.totalBurned)} kcal` });
    if (summary.totalDistanceKm > 0) m.push({ label: "總距離", value: `${summary.totalDistanceKm} km` });
    if (summary.strokeMeters > 0) m.push({ label: "總泳距", value: `${formatNum(summary.strokeMeters)} m` });
    if (summary.avgHeartRate) m.push({ label: "平均心律", value: `${summary.avgHeartRate} bpm` });
    if (summary.maxHeartRate) m.push({ label: "最大心律", value: `${summary.maxHeartRate} bpm` });
    if (summary.avgSpeedKmh) m.push({ label: "平均速度", value: `${summary.avgSpeedKmh} km/h` });
    if (summary.avgPace) m.push({ label: "平均配速", value: `${summary.avgPace} /100m` });
    return m;
  }, [summary]);

  // Build trend charts from series, keeping only metrics that have ≥2 points.
  const charts = useMemo(() => {
    const out: React.ReactNode[] = [];
    const collect = (pick: (p: (typeof series)[number]) => number | null) =>
      series
        .map((p) => ({ label: formatDateShort(p.dateMs), value: pick(p) }))
        .filter((p): p is { label: string; value: number } => p.value != null && p.value > 0);

    const distance = collect((p) => p.distanceKm);
    const strokes = collect((p) => p.strokeMeters);
    const maxHr = collect((p) => p.maxHeartRate);
    const pace = collect((p) => p.paceSecs);
    const speed = collect((p) => p.avgSpeedKmh);
    const cals = collect((p) => p.caloriesBurned);

    if (distance.length >= 2)
      out.push(<TrendChart key="dist" title="距離 (km)" points={distance} color="var(--color-primary)"
        tooltipFormatter={(v) => `${v} km`} />);
    if (strokes.length >= 2)
      out.push(<TrendChart key="swim" title="泳距 (m)" points={strokes} color="var(--color-primary)"
        tooltipFormatter={(v) => `${formatNum(v)} m`} />);
    if (pace.length >= 2)
      out.push(<TrendChart key="pace" title="平均配速 (/100m，越低越快)" points={pace} color="var(--color-carbs)"
        invert tickFormatter={paceLabel} tooltipFormatter={(v) => `${paceLabel(v)}/100m`} />);
    if (speed.length >= 2)
      out.push(<TrendChart key="spd" title="平均速度 (km/h)" points={speed} color="var(--color-carbs)"
        tooltipFormatter={(v) => `${v} km/h`} />);
    if (maxHr.length >= 2)
      out.push(<TrendChart key="hr" title="最大心律 (bpm)" points={maxHr} color="var(--color-accent)"
        tooltipFormatter={(v) => `${v} bpm`} />);
    if (out.length === 0 && cals.length >= 2)
      out.push(<TrendChart key="cal" title="消耗 (kcal)" points={cals} color="var(--color-accent)"
        tooltipFormatter={(v) => `${formatNum(v)} kcal`} />);
    return out;
  }, [series]);

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
              period === key ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground hover:text-foreground"
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
                    const pct = summary.strokeMeters > 0 ? Math.round((meters / summary.strokeMeters) * 100) : 0;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-xs text-foreground w-12 shrink-0">{name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="num-display text-xs font-semibold text-foreground w-16 text-right shrink-0">{formatNum(meters)} m</span>
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
                  <span key={g.group} className="px-2.5 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
                    {g.group}
                    <span className="num-display">{g.days}天</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trend charts */}
          {charts.length > 0 && (
            <div className="flex flex-col gap-3 pt-1">
              <p className="text-xs font-semibold text-muted-foreground px-0.5">趨勢（近 12 週）</p>
              {charts}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExerciseStats({ onPickDay }: { onPickDay: (dateMs: number) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <WeeklyCalendar onPickDay={onPickDay} />
      <ExerciseTypeStats />
    </div>
  );
}
