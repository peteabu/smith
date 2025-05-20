import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { lazy, Suspense } from "react";

// Only keep the borderless experience as our primary experience
const BorderlessExperience = lazy(() => import("@/pages/borderless-experience").then(module => ({
  default: module.BorderlessExperience
})));

function Router() {
  const LoadingFallback = (
    <div className="h-screen w-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 rounded-full border-4 border-t-transparent border-brown animate-spin mx-auto"></div>
        <p className="text-brown font-mono">Loading experience...</p>
      </div>
    </div>
  );
  
  // Use a consistent routing approach for all devices
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/borderless">
        {() => (
          <Suspense fallback={LoadingFallback}>
            <BorderlessExperience />
          </Suspense>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
