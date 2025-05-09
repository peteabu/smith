import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { useEffect, lazy, Suspense, useState } from "react";
import haptics from "@/lib/haptics";

// Dynamically import experiences for code splitting
const MobileExperience = lazy(() => import("@/components/mobile-experience").then(module => ({
  default: module.MobileExperience
})));

const BorderlessExperience = lazy(() => import("@/pages/borderless-experience").then(module => ({
  default: module.BorderlessExperience
})));

function Router() {
  const device = useDeviceDetection();
  // Always use borderless by default, save in localStorage to persist across refreshes
  const [useBorderlessExperience, setUseBorderlessExperience] = useState(() => {
    const saved = localStorage.getItem('useBorderlessExperience');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Trigger initial haptic feedback on app load for mobile devices
  useEffect(() => {
    if (device.isMobile) {
      haptics.impact();
      
      // Lock body scrolling on mobile to prevent bounce effects
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Apply iOS-specific optimizations
      if (device.isIOS) {
        // Add iOS-specific class to body
        document.body.classList.add('ios-device');
        
        // Prevent rubber-banding/overscroll effect
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        
        // Disable tap highlight
        (document.documentElement.style as any).webkitTapHighlightColor = 'transparent';
      }
    }
    
    return () => {
      // Clean up
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overscrollBehavior = '';
    };
  }, [device.isMobile, device.isIOS]);
  
  // Toggle between experiences with double tap anywhere on the screen
  useEffect(() => {
    if (device.isMobile) {
      let lastTap = 0;
      const handleDoubleTap = () => {
        const now = new Date().getTime();
        const timeSince = now - lastTap;
        
        if (timeSince < 300 && timeSince > 0) {
          // Double tap detected
          haptics.impact();
          setUseBorderlessExperience((prev: boolean) => {
            const newValue = !prev;
            // Save to localStorage to persist across page refreshes
            localStorage.setItem('useBorderlessExperience', JSON.stringify(newValue));
            return newValue;
          });
        }
        
        lastTap = now;
      };
      
      window.addEventListener('touchend', handleDoubleTap);
      
      return () => {
        window.removeEventListener('touchend', handleDoubleTap);
      };
    }
  }, [device.isMobile]);
  
  if (device.isMobile) {
    const LoadingFallback = (
      <div className="h-screen w-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full border-4 border-t-transparent border-brown animate-spin mx-auto"></div>
          <p className="text-brown font-mono">Loading experience...</p>
        </div>
      </div>
    );
    
    return (
      <Suspense fallback={LoadingFallback}>
        {useBorderlessExperience ? <BorderlessExperience /> : <MobileExperience />}
      </Suspense>
    );
  }
  
  // Desktop experience
  return (
    <Switch>
      <Route path="/" component={Home} />
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
