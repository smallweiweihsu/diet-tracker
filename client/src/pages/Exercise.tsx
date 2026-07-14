import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, Dumbbell, Flame, Clock, X, ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, Loader2, Timer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ExerciseImport from "@/components/ExerciseImport";
import ExerciseStats from "@/components/ExerciseStats";
import {
  cn, formatNum, dayStartMs, addDays, dateInputValue, dayStartFromInput,
  EXERCISE_TYPES, EXERCISE_CALORIE_PER_MIN,
  EXERCISE_NUMERIC_LABELS, exerciseConfig,
  SWIM_STROKES, MUSCLE_GROUPS, COMMON_LIFTS,
  parseExerciseDetails, estimate1RM,
  type ExerciseNumericField, type Lift,
} from "@/lib/utils";
import { toast } from "sonner";

type ExerciseRecord = {
  id: number;
  exerciseType: string;
  durationMin: number;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  distanceKm: number | null;
  avgSpeedKmh: number | null;
  details: string | null;
  note: string | null;
  loggedAt: number;
};

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// String-based working copy of a weight-training movement (for inputs).
type SetDraft = { weight: string; reps: string };
type LiftDraft = { name: string; sets: SetDraft[] };

const draftSetVolume = (s: SetDraft) => num(s.weight) * num(s.reps);
const draftLiftVolume = (l: LiftDraft) => l.sets.reduce((sum, s) => sum + draftSetVolume(s), 0);
const draftLift1RM = (l: LiftDraft) =>
  l.sets.reduce((m, s) => Math.max(m, estimate1RM(num(s.weight), num(s.reps))), 0);

// Add or edit an exercise. When `existing` is provided the form is in edit mode.
function ExerciseSheet({
  dateMs, existing, onClose, onSaved,
}: {
  dateMs: number;
  existing?: ExerciseRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(existing);
  const [type, setType] = useState(existing?.exerciseType ?? EXERCISE_TYPES[0]);
  const [showTypes, setShowTypes] = useState(false);

  const initialNumeric = () => {
    const e = existing;
    return {
      durationMin: e ? String(e.durationMin) : "",
      caloriesBurned: e?.caloriesBurned != null ? String(Math.round(e.caloriesBurned)) : "",
      avgHeartRate: e?.avgHeartRate != null ? String(e.avgHeartRate) : "",
      maxHeartRate: e?.maxHeartRate != null ? String(e.maxHeartRate) : "",
      distanceKm: e?.distanceKm != null ? String(e.distanceKm) : "",
      avgSpeedKmh: e?.avgSpeedKmh != null ? String(e.avgSpeedKmh) : "",
    } as Record<ExerciseNumericField, string>;
  };
  const [fields, setFields] = useState<Record<ExerciseNumericField, string>>(initialNumeric);

  const initialDetails = parseExerciseDetails(existing?.details);
  const [strokes, setStrokes] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {};
    for (const name of SWIM_STROKES) {
      const v = initialDetails.strokes?.[name];
      s[name] = v != null ? String(v) : "";
    }
    return s;
  });
  const [muscles, setMuscles] = useState<string[]>(initialDetails.muscleGroups ?? []);
  const [pace, setPace] = useState(initialDetails.pace ?? "");
  const [lifts, setLifts] = useState<LiftDraft[]>(() =>
    (initialDetails.lifts ?? []).map((l) => ({
      name: l.name,
      sets: l.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })),
    }))
  );
  const [note, setNote] = useState(existing?.note ?? "");
  // Rest timer between sets (weight training).
  const [restSec, setRestSec] = useState(90);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  // Date the exercise is logged to. Edit mode keeps the record's own day;
  // add mode defaults to the page's selected day.
  const [dateStr, setDateStr] = useState(() =>
    dateInputValue(existing ? dayStartMs(existing.loggedAt) : dateMs)
  );
  const galleryRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const config = exerciseConfig(type);
  const durationNum = parseInt(fields.durationMin) || 0;
  const estimatedCal = Math.round(durationNum * (EXERCISE_CALORIE_PER_MIN[type] ?? 5));

  const analyzeImage = trpc.exercise.analyzeImage.useMutation();

  const handleImage = (file: File) => {
    const mime = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      setAnalyzing(true);
      try {
        const r = await analyzeImage.mutateAsync({ imageBase64: base64, mimeType: mime });
        if (r.exerciseType && EXERCISE_TYPES.includes(r.exerciseType)) setType(r.exerciseType);
        setFields((f) => ({
          ...f,
          durationMin: r.durationMin > 0 ? String(Math.round(r.durationMin)) : f.durationMin,
          caloriesBurned: r.caloriesBurned > 0 ? String(Math.round(r.caloriesBurned)) : f.caloriesBurned,
          avgHeartRate: r.avgHeartRate > 0 ? String(Math.round(r.avgHeartRate)) : f.avgHeartRate,
          maxHeartRate: r.maxHeartRate > 0 ? String(Math.round(r.maxHeartRate)) : f.maxHeartRate,
          distanceKm: r.distanceKm > 0 ? String(r.distanceKm) : f.distanceKm,
          avgSpeedKmh: r.avgSpeedKmh > 0 ? String(r.avgSpeedKmh) : f.avgSpeedKmh,
        }));
        if (r.pace) setPace(r.pace);
        if (r.muscleGroups?.length) setMuscles(r.muscleGroups.filter((m) => MUSCLE_GROUPS.includes(m as (typeof MUSCLE_GROUPS)[number])));
        toast.success("已辨識，請確認數值");
      } catch (err) {
        toast.error("辨識失敗：" + (err instanceof Error ? err.message : "請重試"));
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const utils = trpc.useUtils();
  const templatesQuery = trpc.templates.list.useQuery(undefined, { enabled: Boolean(config.lifts) });
  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => { utils.templates.list.invalidate(); toast.success("已儲存課表"); },
    onError: (e) => toast.error(e.message),
  });
  const removeTemplate = trpc.templates.remove.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });

  const addExercise = trpc.exercise.add.useMutation({
    onSuccess: () => { toast.success("運動已記錄！"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const updateExercise = trpc.exercise.update.useMutation({
    onSuccess: () => { toast.success("已更新！"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const pending = addExercise.isPending || updateExercise.isPending;

  const setField = (key: ExerciseNumericField, v: string) =>
    setFields((f) => ({ ...f, [key]: v }));

  const toggleMuscle = (m: string) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  // Rest-timer countdown: ticks each second, alerts at zero.
  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft <= 0) {
      setRestLeft(null);
      toast.success("休息結束，開始下一組！");
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    const t = setTimeout(() => setRestLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);
  const restLabel = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  // ── Weight-training movement editing ──
  const addLift = (name = "") =>
    setLifts((prev) => [...prev, { name, sets: [{ weight: "", reps: "" }] }]);
  const removeLift = (li: number) =>
    setLifts((prev) => prev.filter((_, i) => i !== li));
  const setLiftName = (li: number, name: string) =>
    setLifts((prev) => prev.map((l, i) => (i === li ? { ...l, name } : l)));
  // Adding a set copies the previous one — repeating 60×10 is a single tap —
  // and kicks off the rest countdown for the set just finished.
  const addSet = (li: number) => {
    setLifts((prev) =>
      prev.map((l, i) =>
        i === li ? { ...l, sets: [...l.sets, { ...(l.sets[l.sets.length - 1] ?? { weight: "", reps: "" }) }] } : l
      )
    );
    setRestLeft(restSec);
  };
  const removeSet = (li: number, si: number) =>
    setLifts((prev) =>
      prev.map((l, i) => (i === li ? { ...l, sets: l.sets.filter((_, j) => j !== si) } : l))
    );
  const setSetField = (li: number, si: number, field: keyof SetDraft, val: string) =>
    setLifts((prev) =>
      prev.map((l, i) =>
        i === li ? { ...l, sets: l.sets.map((s, j) => (j === si ? { ...s, [field]: val } : s)) } : l
      )
    );

  const cleanLifts: Lift[] = lifts
    .map((l) => ({
      name: l.name.trim(),
      sets: l.sets
        .map((s) => ({ weight: num(s.weight), reps: Math.round(num(s.reps)) }))
        .filter((s) => s.weight > 0 || s.reps > 0),
    }))
    .filter((l) => l.name.length > 0 && l.sets.length > 0);
  const hasLifts = cleanLifts.length > 0;

  // Load a saved 課表 into the movement editor.
  const loadTemplate = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Lift[];
      setLifts(
        parsed.map((l) => ({
          name: l.name,
          sets: l.sets.length
            ? l.sets.map((s) => ({ weight: s.weight ? String(s.weight) : "", reps: s.reps ? String(s.reps) : "" }))
            : [{ weight: "", reps: "" }],
        }))
      );
      setShowTemplates(false);
      toast.success("已帶入課表");
    } catch {
      toast.error("課表讀取失敗");
    }
  };
  const saveTemplate = () => {
    if (!hasLifts) { toast.error("先新增動作再儲存課表"); return; }
    const name = window.prompt("課表名稱？");
    if (!name?.trim()) return;
    createTemplate.mutate({ name: name.trim(), lifts: cleanLifts });
  };
  // Gym sessions logged purely as movements don't need a duration.
  const canSave = durationNum > 0 || (config.lifts && hasLifts);

  const handleSubmit = () => {
    if (!type || !canSave) {
      toast.error(config.lifts ? "請填寫時間或至少一個動作" : "請填寫運動類型與時間");
      return;
    }
    const cal = fields.caloriesBurned ? num(fields.caloriesBurned) : estimatedCal;

    const details: {
      strokes?: Record<string, number>; muscleGroups?: string[]; pace?: string; lifts?: Lift[];
    } = {};
    if (config.strokes) {
      const s: Record<string, number> = {};
      for (const name of SWIM_STROKES) {
        const v = num(strokes[name]);
        if (v > 0) s[name] = v;
      }
      if (Object.keys(s).length) details.strokes = s;
    }
    if (config.muscleGroups && muscles.length) details.muscleGroups = muscles;
    if (config.pace && pace.trim()) details.pace = pace.trim();
    if (config.lifts && hasLifts) details.lifts = cleanLifts;
    const detailsStr = Object.keys(details).length ? JSON.stringify(details) : null;

    const has = (k: ExerciseNumericField) => config.numeric.includes(k);
    const payload = {
      exerciseType: type,
      durationMin: durationNum,
      caloriesBurned: cal,
      avgHeartRate: has("avgHeartRate") && fields.avgHeartRate ? Math.round(num(fields.avgHeartRate)) : null,
      maxHeartRate: has("maxHeartRate") && fields.maxHeartRate ? Math.round(num(fields.maxHeartRate)) : null,
      distanceKm: has("distanceKm") && fields.distanceKm ? num(fields.distanceKm) : null,
      avgSpeedKmh: has("avgSpeedKmh") && fields.avgSpeedKmh ? num(fields.avgSpeedKmh) : null,
      details: detailsStr,
      note: note || null,
    };

    const chosenDayStart = dayStartFromInput(dateStr);
    if (isEdit && existing) {
      // Edit keeps midday so the record lands squarely inside the chosen day.
      updateExercise.mutate({ id: existing.id, ...payload, loggedAt: chosenDayStart + 12 * 60 * 60 * 1000 });
    } else {
      // Add embeds current time-of-day so same-day entries stay in order.
      const timeOfDay = Date.now() - dayStartMs(Date.now());
      addExercise.mutate({ ...payload, note: note || undefined, loggedAt: chosenDayStart + timeOfDay });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col max-w-[430px]"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? "編輯運動" : "新增運動"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="flex flex-col gap-4">
            {/* AI screenshot recognition */}
            <input
              ref={galleryRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }}
            />
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={analyzing}
              className="w-full py-3 rounded-2xl border border-primary/40 bg-primary/5 text-primary font-semibold text-sm
                         active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {analyzing ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              {analyzing ? "AI 辨識中..." : "AI 辨識運動截圖（Apple 健身、Strava…）"}
            </button>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">日期</label>
              <input
                type="date"
                value={dateStr}
                max={dateInputValue(dayStartMs(Date.now()))}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Exercise type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">運動類型</label>
              <button
                onClick={() => setShowTypes((v) => !v)}
                className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 flex items-center justify-between text-foreground"
              >
                <span className="font-medium">{type}</span>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", showTypes && "rotate-180")} />
              </button>
              {showTypes && (
                <div className="mt-1 rounded-2xl border border-border bg-card shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {EXERCISE_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setType(t); setShowTypes(false); }}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm transition-colors",
                        t === type ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Numeric fields (two per row) */}
            <div className="grid grid-cols-2 gap-3">
              {config.numeric.map((key) => {
                const cfg = EXERCISE_NUMERIC_LABELS[key];
                const isCal = key === "caloriesBurned";
                return (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {cfg.label} <span className="text-primary">({cfg.unit})</span>
                      {isCal && durationNum > 0 && !fields.caloriesBurned && (
                        <span className="text-[10px] text-muted-foreground ml-1">估 {estimatedCal}</span>
                      )}
                    </label>
                    <input
                      type="number"
                      inputMode={cfg.decimal ? "decimal" : "numeric"}
                      value={fields[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={isCal && durationNum > 0 ? String(estimatedCal) : "0"}
                      className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 num-display text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                );
              })}
            </div>

            {/* Swim stroke distances */}
            {config.strokes && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">各泳姿距離（公尺，選填）</label>
                <div className="grid grid-cols-2 gap-3">
                  {SWIM_STROKES.map((name) => (
                    <div key={name}>
                      <label className="text-[11px] text-muted-foreground mb-1 block">{name}</label>
                      <input
                        type="number" inputMode="numeric"
                        value={strokes[name]}
                        onChange={(e) => setStrokes((s) => ({ ...s, [name]: e.target.value }))}
                        placeholder="0"
                        className="w-full h-11 rounded-2xl border border-border bg-muted/30 px-3 num-display text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Swim average pace */}
            {config.pace && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  平均配速 <span className="text-primary">(每 100m)</span>
                </label>
                <input
                  type="text"
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  placeholder="例如 2:05"
                  className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 num-display text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {/* Gym muscle groups */}
            {config.muscleGroups && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">今日訓練部位</label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMuscle(m)}
                      className={cn(
                        "px-4 h-10 rounded-full text-sm font-medium border transition-all active:scale-95",
                        muscles.includes(m)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weight-training movements (sets × reps × weight) */}
            {config.lifts && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">訓練動作</label>
                  {/* Rest timer */}
                  {restLeft !== null ? (
                    <button
                      onClick={() => setRestLeft(null)}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold num-display active:scale-95 transition-all"
                    >
                      <Timer size={13} /> {restLabel(restLeft)} · 略過
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Timer size={13} className="text-muted-foreground" />
                      {[60, 90, 120].map((s) => (
                        <button
                          key={s}
                          onClick={() => setRestSec(s)}
                          className={cn(
                            "px-2 h-7 rounded-full text-[11px] font-semibold num-display transition-all",
                            restSec === s ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2.5">
                  {lifts.map((lift, li) => (
                    <div key={li} className="rounded-2xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={lift.name}
                          onChange={(e) => setLiftName(li, e.target.value)}
                          placeholder="動作名稱，例如 臥推"
                          className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                          onClick={() => removeLift(li)}
                          className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {lift.sets.map((set, si) => (
                          <div key={si} className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground w-8 shrink-0">第{si + 1}組</span>
                            <input
                              type="number" inputMode="decimal" value={set.weight}
                              onChange={(e) => setSetField(li, si, "weight", e.target.value)}
                              placeholder="重量"
                              className="flex-1 h-9 rounded-lg border border-border bg-card px-2 num-display text-sm text-foreground text-center placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <span className="text-xs text-muted-foreground">kg ×</span>
                            <input
                              type="number" inputMode="numeric" value={set.reps}
                              onChange={(e) => setSetField(li, si, "reps", e.target.value)}
                              placeholder="次"
                              className="w-16 h-9 rounded-lg border border-border bg-card px-2 num-display text-sm text-foreground text-center placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                              onClick={() => removeSet(li, si)}
                              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
                            >
                              <X size={13} className="text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <button
                          onClick={() => addSet(li)}
                          className="text-xs font-semibold text-primary flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <Plus size={13} /> 加一組
                        </button>
                        {draftLiftVolume(lift) > 0 && (
                          <span className="text-[11px] text-muted-foreground num-display">
                            訓練量 {formatNum(draftLiftVolume(lift))} kg · 估 1RM {formatNum(draftLift1RM(lift))} kg
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addLift()}
                      className="flex-1 h-11 rounded-2xl border border-dashed border-border text-muted-foreground text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                    >
                      <Plus size={15} /> 新增動作
                    </button>
                    <button
                      onClick={() => { setShowLibrary((v) => !v); setShowTemplates(false); }}
                      className={cn(
                        "px-3.5 h-11 rounded-2xl border text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all",
                        showLibrary ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      <Dumbbell size={15} /> 常用
                    </button>
                    <button
                      onClick={() => { setShowTemplates((v) => !v); setShowLibrary(false); }}
                      className={cn(
                        "px-3.5 h-11 rounded-2xl border text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all",
                        showTemplates ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      <Clock size={15} /> 課表
                    </button>
                  </div>
                  {showTemplates && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-3 flex flex-col gap-2">
                      {(templatesQuery.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-1">尚無課表，先新增動作後可存成課表</p>
                      ) : (
                        (templatesQuery.data ?? []).map((t) => (
                          <div key={t.id} className="flex items-center gap-2">
                            <button
                              onClick={() => loadTemplate(t.data)}
                              className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground text-left active:scale-[0.99] transition-all"
                            >
                              {t.name}
                            </button>
                            <button
                              onClick={() => removeTemplate.mutate({ id: t.id })}
                              className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        onClick={saveTemplate}
                        className="w-full h-10 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
                      >
                        <Plus size={14} /> 儲存目前動作為課表
                      </button>
                    </div>
                  )}
                  {showLibrary && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-3 flex flex-col gap-2">
                      {COMMON_LIFTS.map(({ group, names }) => (
                        <div key={group}>
                          <p className="text-[10px] text-muted-foreground mb-1">{group}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {names.map((name) => (
                              <button
                                key={name}
                                onClick={() => { addLift(name); setShowLibrary(false); }}
                                className="px-2.5 h-7 rounded-full bg-card border border-border text-xs text-foreground active:scale-95 transition-all"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">備註（選填）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：河濱公園、狀態不錯..."
                rows={2}
                className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={pending || !canSave}
              className={cn(
                "w-full h-14 rounded-full font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                canSave
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Check size={18} />
              {pending ? "儲存中..." : isEdit ? "儲存變更" : "確認記錄"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact one-line summary of the extra metrics for the list view.
function exerciseSummary(ex: ExerciseRecord): string {
  const parts: string[] = [`${ex.durationMin} 分鐘`];
  if (ex.distanceKm) parts.push(`${formatNum(ex.distanceKm, 1)} km`);
  if (ex.avgSpeedKmh) parts.push(`${formatNum(ex.avgSpeedKmh, 1)} km/h`);
  if (ex.avgHeartRate) parts.push(`♥ ${ex.avgHeartRate}`);
  if (ex.maxHeartRate) parts.push(`峰 ${ex.maxHeartRate}`);
  const d = parseExerciseDetails(ex.details);
  if (d.muscleGroups?.length) parts.push(d.muscleGroups.join("/"));
  if (d.lifts?.length) {
    const vol = d.lifts.reduce((s, l) => s + l.sets.reduce((a, st) => a + st.weight * st.reps, 0), 0);
    parts.push(`${d.lifts.length} 動作`);
    if (vol > 0) parts.push(`${formatNum(vol)} kg`);
  }
  if (d.strokes) {
    const total = Object.values(d.strokes).reduce((s, v) => s + v, 0);
    if (total > 0) parts.push(`${total}m`);
  }
  if (d.pace) parts.push(`${d.pace}/100m`);
  return parts.join(" · ");
}

export default function Exercise() {
  const [dateMs, setDateMs] = useState(() => dayStartMs(Date.now()));
  const [view, setView] = useState<"records" | "stats">("records");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<ExerciseRecord | null>(null);
  const utils = trpc.useUtils();

  const { data: exercises = [] } = trpc.exercise.byDate.useQuery({ dateMs });
  const { data: stats } = trpc.stats.daily.useQuery({ dateMs });

  const deleteExercise = trpc.exercise.delete.useMutation({
    onSuccess: () => {
      utils.exercise.byDate.invalidate();
      utils.stats.daily.invalidate();
      toast.success("已刪除");
    },
    onError: (e) => toast.error(e.message),
  });

  const invalidate = () => {
    utils.exercise.byDate.invalidate();
    utils.stats.daily.invalidate();
  };

  const totalCal = stats?.totalBurned ?? 0;
  const totalMin = stats?.totalExerciseMin ?? 0;
  const count = stats?.exerciseCount ?? 0;

  const today = dayStartMs(Date.now());
  const isToday = dateMs === today;
  const dateLabel = useMemo(
    () => new Date(dateMs).toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" }),
    [dateMs]
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Header + record/stats toggle */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">運動記錄</h1>
        <div className="flex gap-2 mb-4">
          {([["records", "記錄"], ["stats", "統計"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "flex-1 h-9 rounded-full text-sm font-semibold transition-all duration-200",
                view === key
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "records" && (
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
        )}
      </div>

      {view === "stats" ? (
        <div className="px-4 pb-4">
          <ExerciseStats />
        </div>
      ) : (
      <div className="px-4 flex flex-col gap-3">
        {/* Stats */}
        <div className="dt-card">
          <p className="text-xs font-semibold text-muted-foreground mb-3">當日運動統計</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Flame, label: "消耗熱量", value: formatNum(totalCal), unit: "kcal", color: "text-accent" },
              { icon: Clock, label: "總時間", value: formatNum(totalMin), unit: "分鐘", color: "text-primary" },
              { icon: Dumbbell, label: "運動次數", value: String(count), unit: "次", color: "text-[var(--color-protein)]" },
            ].map(({ icon: Icon, label, value, unit, color }) => (
              <div key={label} className="flex flex-col items-center text-center p-3 rounded-2xl bg-muted/40">
                <Icon size={20} className={cn("mb-1.5", color)} />
                <p className={cn("num-display text-xl font-bold", color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h2 className="text-sm font-semibold text-foreground">{isToday ? "今日運動" : "當日運動"}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/40 text-primary text-xs font-semibold
                           active:scale-95 transition-all"
              >
                <Sparkles size={13} />
                AI 匯入
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold
                           shadow-sm shadow-primary/30 active:scale-95 transition-all"
              >
                <Plus size={14} />
                新增
              </button>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="dt-card flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
                <Dumbbell size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{isToday ? "今天還沒有運動記錄" : "這天沒有運動記錄"}</p>
              <button
                onClick={() => setShowAdd(true)}
                className="btn-pill bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold shadow-md shadow-primary/30"
              >
                新增運動
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {exercises.map((ex) => (
                <div key={ex.id} className="dt-card flex items-center gap-3">
                  <button
                    onClick={() => setEditing(ex as ExerciseRecord)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Dumbbell size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{ex.exerciseType}</p>
                      <p className="text-xs text-muted-foreground truncate">{exerciseSummary(ex as ExerciseRecord)}</p>
                      {ex.note && <p className="text-[10px] text-muted-foreground/70 truncate">{ex.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="num-display text-sm font-bold text-accent">
                        {formatNum(ex.caloriesBurned ?? 0)} kcal
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteExercise.mutate({ id: ex.id })}
                    className="w-7 h-7 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0
                               hover:bg-destructive/20 active:scale-95 transition-all"
                  >
                    <Trash2 size={13} className="text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {showAdd && (
        <ExerciseSheet
          dateMs={dateMs}
          onClose={() => setShowAdd(false)}
          onSaved={() => { invalidate(); setShowAdd(false); }}
        />
      )}
      {editing && (
        <ExerciseSheet
          dateMs={dateMs}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { invalidate(); setEditing(null); }}
        />
      )}
      {showImport && (
        <ExerciseImport
          onClose={() => setShowImport(false)}
          onSaved={() => { invalidate(); setShowImport(false); }}
        />
      )}
    </div>
  );
}
