import { Home, UtensilsCrossed, Dumbbell, TrendingUp, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/",         label: "首頁",   Icon: Home },
  { path: "/food",     label: "飲食",   Icon: UtensilsCrossed },
  { path: "/exercise", label: "運動",   Icon: Dumbbell },
  { path: "/progress", label: "圖表",   Icon: TrendingUp },
  { path: "/profile",  label: "個人",   Icon: User },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                    bg-card border-t border-border/60 shadow-[0_-2px_16px_rgba(0,0,0,0.06)]"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center h-14">
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path} className="flex-1">
              <div className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 mx-1 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-transform duration-200"
                  style={{ transform: isActive ? "scale(1.1)" : "scale(1)" }}
                />
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
