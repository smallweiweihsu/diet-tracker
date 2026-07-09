import { useState } from "react";
import { Plus, Trash2, Dumbbell, Flame, Clock, X, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn, formatNum, dayStartMs, EXERCISE_TYPES, EXERCISE_CALORIE_PER_MIN } from "@/lib/utils";
import { toast } from "sonner";

function AddExerciseSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(EXERCISE_TYPES[0]);
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [note, setNote] = useState("");
  const [showTypes, setShowTypes] = useState(false);

  const addExercise = trpc.exercise.add.useMutation({
    onSuccess: () => { toast.success("運動已記錄！"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const durationNum = parseInt(duration) || 0;
  const estimatedCal = Math.round(durationNum * (EXERCISE_CALORIE_PER_MIN[type] ?? 5));

  const handleSubmit = () => {
    if (!type || durationNum <= 0) {
      toast.error("請填寫運動類型與時間");
      return;
    }
    const cal = parseFloat(calories) || estimatedCal;
    addExercise.mutate({
      exerciseType: type,
      durationMin: durationNum,
      caloriesBurned: cal,
      note: note || undefined,
      loggedAt: Date.now(),
    });
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
          <h2 className="text-lg font-bold text-foreground">新增運動</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="flex flex-col gap-4">
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
                <div className="mt-1 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
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

            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">時間（分鐘）</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="例如：30"
                className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Calories */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                消耗卡路里（選填）
                {durationNum > 0 && (
                  <span className="text-primary ml-2">估算 {estimatedCal} kcal</span>
                )}
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder={durationNum > 0 ? `留空使用估算值 ${estimatedCal}` : "kcal"}
                className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">備註（選填）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：跑步 8 km、健身房胸推..."
                rows={2}
                className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={addExercise.isPending || !type || durationNum <= 0}
              className={cn(
                "w-full h-14 rounded-full font-bold text-base transition-all active:scale-[0.98]",
                type && durationNum > 0
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {addExercise.isPending ? "儲存中..." : "確認記錄"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Exercise() {
  const [showAdd, setShowAdd] = useState(false);
  const [todayMs] = useState(() => dayStartMs(Date.now()));
  const utils = trpc.useUtils();

  const { data: exercises = [] } = trpc.exercise.byDate.useQuery({ dateMs: todayMs });
  const { data: stats } = trpc.stats.daily.useQuery({ dateMs: todayMs });

  const deleteExercise = trpc.exercise.delete.useMutation({
    onSuccess: () => {
      utils.exercise.byDate.invalidate();
      utils.stats.daily.invalidate();
      toast.success("已刪除");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalCal = stats?.totalBurned ?? 0;
  const totalMin = stats?.totalExerciseMin ?? 0;
  const count = stats?.exerciseCount ?? 0;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-foreground">運動記錄</h1>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {/* Stats */}
        <div className="dt-card">
          <p className="text-xs font-semibold text-muted-foreground mb-3">今日運動統計</p>
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
            <h2 className="text-sm font-semibold text-foreground">今日運動</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold
                         shadow-sm shadow-primary/30 active:scale-95 transition-all"
            >
              <Plus size={14} />
              新增
            </button>
          </div>

          {exercises.length === 0 ? (
            <div className="dt-card flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
                <Dumbbell size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">今天還沒有運動記錄</p>
              <button
                onClick={() => setShowAdd(true)}
                className="btn-pill bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold shadow-md shadow-primary/30"
              >
                新增第一筆運動
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {exercises.map((ex) => (
                <div key={ex.id} className="dt-card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{ex.exerciseType}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.durationMin} 分鐘
                      {ex.note ? ` · ${ex.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="num-display text-sm font-bold text-accent">
                      {formatNum(ex.caloriesBurned ?? 0)} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => deleteExercise.mutate({ id: ex.id })}
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
      </div>

      {showAdd && (
        <AddExerciseSheet
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            utils.exercise.byDate.invalidate();
            utils.stats.daily.invalidate();
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
