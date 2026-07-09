import { useState } from "react";
import { X, Delete } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn, dayStartMs } from "@/lib/utils";

interface Props {
  current?: number;
  onClose: () => void;
  onSaved: () => void;
}

const KEYS = ["7","8","9","4","5","6","1","2","3",".","0","⌫"];

export default function WeightModal({ current, onClose, onSaved }: Props) {
  const [value, setValue] = useState(current ? current.toFixed(1) : "");
  const logWeight = trpc.weight.logToday.useMutation({
    onSuccess: () => {
      toast.success("體重已記錄！");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleKey = (k: string) => {
    if (k === "⌫") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (k === "." && value.includes(".")) return;
    if (value.length >= 5) return;
    setValue((v) => v + k);
  };

  const handleSave = () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 20 || num > 300) {
      toast.error("請輸入有效體重（20–300 kg）");
      return;
    }
    logWeight.mutate({ weightKg: num, dateMs: dayStartMs(Date.now()) });
  };

  const num = parseFloat(value);
  const valid = !isNaN(num) && num >= 20 && num <= 300;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ maxWidth: 430, left: "50%", transform: "translateX(-50%)" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full bg-card rounded-t-3xl shadow-2xl animate-slide-up pb-8">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold text-foreground">輸入體重</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Display */}
        <div className="mx-5 mb-4 rounded-2xl bg-muted/50 flex items-baseline justify-center py-4 gap-2">
          <span className="num-display text-5xl font-bold text-foreground tracking-tight">
            {value || "0.0"}
          </span>
          <span className="text-xl text-muted-foreground font-medium">kg</span>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 px-5 mb-4">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className={cn(
                "h-14 rounded-2xl text-xl font-semibold transition-all duration-100 active:scale-95",
                k === "⌫"
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {k === "⌫" ? <Delete size={20} className="mx-auto" /> : k}
            </button>
          ))}
        </div>

        {/* Save */}
        <div className="px-5">
          <button
            onClick={handleSave}
            disabled={!valid || logWeight.isPending}
            className={cn(
              "w-full h-14 rounded-full text-base font-bold transition-all duration-200",
              valid
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {logWeight.isPending ? "儲存中..." : "確認儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
