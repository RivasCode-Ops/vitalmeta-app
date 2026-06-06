import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Timeline from "./pages/Timeline";
import QuickLog from "./pages/QuickLog";
import SOS from "./pages/SOS";
import Onboarding from "./pages/Onboarding";
import SafeMeals from "./pages/SafeMeals";
import Profile from "./pages/Profile";
import Nightscout from "./pages/Nightscout";
import Glycemia from "./pages/Glycemia";
import Insights from "./pages/Insights";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/timeline">
        <AppLayout><Timeline /></AppLayout>
      </Route>
      <Route path="/log">
        <AppLayout><QuickLog /></AppLayout>
      </Route>
      <Route path="/sos">
        <SOS />
      </Route>
      <Route path="/safe-meals">
        <AppLayout><SafeMeals /></AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout><Profile /></AppLayout>
      </Route>
      <Route path="/glycemia">
        <AppLayout><Glycemia /></AppLayout>
      </Route>
      <Route path="/insights">
        <AppLayout><Insights /></AppLayout>
      </Route>
      <Route path="/nightscout">
        <AppLayout><Nightscout /></AppLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
