import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import FoodDiary from "./pages/FoodDiary";
import Exercise from "./pages/Exercise";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";

// Left/right swipe on empty areas switches between the bottom-nav tabs.
const TAB_ORDER = ["/", "/food", "/exercise", "/progress", "/profile"];

function useSwipeNav() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    let x0 = 0, y0 = 0, ignore = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      x0 = t.clientX;
      y0 = t.clientY;
      // Ignore swipes that begin on scrollable chip rows or on any modal/overlay.
      ignore = false;
      let el: HTMLElement | null = e.target as HTMLElement;
      while (el && el !== document.body) {
        if (el.hasAttribute?.("data-swipe-ignore")) { ignore = true; break; }
        const st = window.getComputedStyle(el);
        if (st.position === "fixed" && Number(st.zIndex) >= 50) { ignore = true; break; }
        el = el.parentElement;
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (ignore) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      // Require a clearly horizontal swipe.
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      const cur = Math.max(
        0,
        TAB_ORDER.findIndex((p) => (p === "/" ? location === "/" : location.startsWith(p)))
      );
      const next = dx < 0 ? cur + 1 : cur - 1;
      if (next >= 0 && next < TAB_ORDER.length) setLocation(TAB_ORDER[next]);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [location, setLocation]);
}

function Router() {
  useSwipeNav();
  return (
    <>
      <div className="pb-nav min-h-dvh">
        <Switch>
          <Route path="/"         component={Dashboard} />
          <Route path="/food"     component={FoodDiary} />
          <Route path="/exercise" component={Exercise} />
          <Route path="/progress" component={Progress} />
          <Route path="/profile"  component={Profile} />
          <Route path="/404"      component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
