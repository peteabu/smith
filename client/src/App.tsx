import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { MobileHome } from "@/pages/mobile-home";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { MobileOptimizer } from "@/components/mobile-optimizer";
import { useEffect } from "react";
import haptics from "@/lib/haptics";

function Router() {
  const device = useDeviceDetection();
  
  // Trigger initial haptic feedback on app load for mobile devices
  useEffect(() => {
    if (device.isMobile) {
      haptics.impact();
    }
  }, [device.isMobile]);
  
  // Use mobile or desktop version based on device type
  const HomeComponent = device.isMobile ? MobileHome : Home;
  
  return (
    <MobileOptimizer>
      <Switch>
        <Route path="/" component={HomeComponent} />
        <Route component={NotFound} />
      </Switch>
    </MobileOptimizer>
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
