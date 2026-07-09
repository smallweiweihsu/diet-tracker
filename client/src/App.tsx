import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import FoodDiary from "./pages/FoodDiary";
import Exercise from "./pages/Exercise";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";

function Router() {
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
