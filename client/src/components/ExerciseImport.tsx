import { useState, useRef } from "react";
import { X, Images, Loader2, Check, Trash2, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  cn, dayStartMs, dateInputValue, dayStartFromInput,
  EXERCISE_TYPES, EXERCISE_CALORIE_PER_MIN,
} from "@/lib/utils";

// One recognized workout awaiting confirmation. Photos may span multiple days;
// the date comes from what the AI read in each screenshot (fallback: today).
interface Draft {
  id: number;
  exerciseType: string;
  dateStr: string;
  durationMin: string;
  caloriesBurned: string;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  distanceKm: number | null;
  avgSpeedKmh: number | null;
  pace: string;
  muscleGroups: string[];
}

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function draftSummary(d: Draft): string {
  const parts: string[] = [];
  if (d.distanceKm) parts.push(`${d.distanceKm} km`);
  if (d.avgHeartRate) parts.push(`♥ ${d.avgHeartRate}`);
  if (d.maxHeartRate) parts.push(`峰 ${d.maxHeartRate}`);
  if (d.avgSpeedKmh) parts.push(`${d.avgSpeedKmh} km/h`);
  if (d.pace) parts.push(`${d.pace}/100m`);
  if (d.muscleGroups.length) parts.push(d.muscleGroups.join("/"));
  return parts.join(" · ");
}

export default function ExerciseImport({
  onClose, onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const [openType, setOpenType] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const analyzeImage = trpc.exercise.analyzeImage.useMutation();
  const addExercise = trpc.exercise.add.useMutation();

  const readAsBase64 = (file: File) =>
    new Promise<{ base64: string; mime: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({ base64: dataUrl.split(",")[1] ?? "", mime: file.type || "image/jpeg" });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files: FileList) => {
    const list = Array.from(files);
    setAnalyzing(true);
    setProgress({ done: 0, total: list.length });
    const today = dateInputValue(dayStartMs(Date.now()));
    let failed = 0;

    for (const file of list) {
      try {
        const { base64, mime } = await readAsBase64(file);
        const r = await analyzeImage.mutateAsync({ imageBase64: base64, mimeType: mime });
        const type = EXERCISE_TYPES.includes(r.exerciseType) ? r.exerciseType : "其他";
        const est = Math.round((r.durationMin || 0) * (EXERCISE_CALORIE_PER_MIN[type] ?? 5));
        setDrafts((prev) => [
          ...prev,
          {
            id: nextId.current++,
            exerciseType: type,
            dateStr: /^\d{4}-\d{2}-\d{2}$/.test(r.dateText) ? r.dateText : today,
            durationMin: r.durationMin > 0 ? String(Math.round(r.durationMin)) : "",
            caloriesBurned: r.caloriesBurned > 0 ? String(Math.round(r.caloriesBurned)) : String(est),
            avgHeartRate: r.avgHeartRate > 0 ? Math.round(r.avgHeartRate) : null,
            maxHeartRate: r.maxHeartRate > 0 ? Math.round(r.maxHeartRate) : null,
            distanceKm: r.distanceKm > 0 ? r.distanceKm : null,
            avgSpeedKmh: r.avgSpeedKmh > 0 ? r.avgSpeedKmh : null,
            pace: r.pace || "",
            muscleGroups: r.muscleGroups ?? [],
          },
        ]);
      } catch {
        failed++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setAnalyzing(false);
    if (failed > 0) toast.error(`${failed} 張辨識失敗，已略過`);
  };

  const patch = (id: number, f: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...f } : d)));

  const remove = (id: number) => setDrafts((prev) => prev.filter((d) => d.id !== id));

  const valid = drafts.filter((d) => num(d.durationMin) > 0);

  const handleSaveAll = async () => {
    if (valid.length === 0) {
      toast.error("沒有可儲存的運動（請填時間）");
      return;
    }
    setSaving(true);
    try {
      const timeOfDay = Date.now() - dayStartMs(Date.now());
      for (const d of valid) {
        const details: { pace?: string; muscleGroups?: string[] } = {};
        if (d.exerciseType === "游泳" && d.pace) details.pace = d.pace;
        if (d.exerciseType === "健身" && d.muscleGroups.length) details.muscleGroups = d.muscleGroups;
        await addExercise.mutateAsync({
          exerciseType: d.exerciseType,
          durationMin: Math.round(num(d.durationMin)),
          caloriesBurned: num(d.caloriesBurned),
          avgHeartRate: d.avgHeartRate,
          maxHeartRate: d.maxHeartRate,
          distanceKm: d.distanceKm,
          avgSpeedKmh: d.avgSpeedKmh,
          details: Object.keys(details).length ? JSON.stringify(details) : null,
          loggedAt: dayStartFromInput(d.dateStr) + timeOfDay,
        });
      }
      toast.success(`已匯入 ${valid.length} 筆運動`, { duration: 3500 });
      onSaved();
    } catch {
      toast.error("儲存失敗，請重試");
    } finally {
      setSaving(false);
    }
  };

  const today = dateInputValue(dayStartMs(Date.now()));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[92dvh] flex flex-col max-w-[430px]"
           style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">AI 批次匯入運動</h2>
            <p className="text-xs text-muted-foreground">可一次選多張截圖，會自動讀出各自日期</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <input
            ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="w-full py-3 rounded-2xl border border-primary/40 bg-primary/5 text-primary font-semibold text-sm
                       active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mb-3"
          >
            {analyzing
              ? <><Loader2 size={17} className="animate-spin" /> 辨識中 {progress.done}/{progress.total}...</>
              : <><Images size={17} /> {drafts.length ? "再選更多截圖" : "選擇運動截圖（可多張）"}</>}
          </button>

          {drafts.length === 0 && !analyzing && (
            <p className="text-sm text-muted-foreground text-center py-8">
              從相簿選取 Apple 健身、Strava 等運動摘要截圖，<br />AI 會逐張辨識並列在這裡讓你確認。
            </p>
          )}

          <div className="flex flex-col gap-2">
            {drafts.map((d) => (
              <div key={d.id} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {/* type selector */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setOpenType(openType === d.id ? null : d.id)}
                      className="w-full h-10 rounded-xl border border-border bg-card px-3 flex items-center justify-between text-sm font-semibold text-foreground"
                    >
                      {d.exerciseType}
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </button>
                    {openType === d.id && (
                      <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                        {EXERCISE_TYPES.map((t) => (
                          <button
                            key={t}
                            onClick={() => { patch(d.id, { exerciseType: t }); setOpenType(null); }}
                            className={cn("w-full px-3 py-2.5 text-left text-sm", t === d.exerciseType ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted")}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => remove(d.id)}
                    className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">日期</label>
                    <input
                      type="date" value={d.dateStr} max={today}
                      onChange={(e) => patch(d.id, { dateStr: e.target.value })}
                      className="w-full h-9 rounded-xl border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">時間(分)</label>
                    <input
                      type="number" inputMode="numeric" value={d.durationMin}
                      onChange={(e) => patch(d.id, { durationMin: e.target.value })}
                      placeholder="0"
                      className="w-full h-9 rounded-xl border border-border bg-card px-2 num-display text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">熱量</label>
                    <input
                      type="number" inputMode="numeric" value={d.caloriesBurned}
                      onChange={(e) => patch(d.id, { caloriesBurned: e.target.value })}
                      placeholder="0"
                      className="w-full h-9 rounded-xl border border-border bg-card px-2 num-display text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
                {draftSummary(d) && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">{draftSummary(d)}</p>
                )}
              </div>
            ))}
          </div>

          {drafts.length > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving || valid.length === 0}
              className={cn(
                "w-full h-13 py-3.5 rounded-full font-bold text-base mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                valid.length > 0 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? "匯入中..." : `全部加入（${valid.length} 筆）`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
