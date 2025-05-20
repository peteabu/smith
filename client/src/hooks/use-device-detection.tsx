import { useState, useEffect } from 'react';

export interface ScreenInfo {
  // Screen size breakpoints
  isSmallScreen: boolean;    // < 768px
  isMediumScreen: boolean;   // >= 768px and < 1024px
  isLargeScreen: boolean;    // >= 1024px
  // Feature detection (responsive design)
  hasTouchCapability: boolean;
  prefersDarkMode: boolean;
  // Viewport information
  viewport: { width: number; height: number };
}

/**
 * Responsive design hook focused on screen sizes and capabilities
 * rather than specific device detection
 */
export function useResponsiveDesign(): ScreenInfo {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    isSmallScreen: false,
    isMediumScreen: false,
    isLargeScreen: true,
    hasTouchCapability: false,
    prefersDarkMode: false,
    viewport: { width: 0, height: 0 }
  });
  
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    const updateScreenInfo = () => {
      const width = window.innerWidth;
      
      // Determine screen size based on breakpoints
      const isSmallScreen = width < 768;
      const isMediumScreen = width >= 768 && width < 1024;
      const isLargeScreen = width >= 1024;
      
      // Feature detection
      const hasTouchCapability = ('ontouchstart' in window) || 
                                  (navigator.maxTouchPoints > 0) || 
                                  ('msMaxTouchPoints' in navigator && (navigator as any).msMaxTouchPoints > 0);
      
      // Dark mode preference
      const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Viewport size
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // Update state
      setScreenInfo({
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
        hasTouchCapability,
        prefersDarkMode,
        viewport
      });
    };
    
    // Initial update
    updateScreenInfo();
    
    // Listen for viewport changes
    window.addEventListener('resize', updateScreenInfo);
    
    // Listen for dark mode changes
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setScreenInfo(prevState => ({
        ...prevState,
        prefersDarkMode: e.matches
      }));
    };
    
    if (darkModeMedia.addEventListener) {
      darkModeMedia.addEventListener('change', handleDarkModeChange);
    } else if ('addListener' in darkModeMedia) {
      // For older browsers
      (darkModeMedia as any).addListener(handleDarkModeChange);
    }
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      
      if (darkModeMedia.removeEventListener) {
        darkModeMedia.removeEventListener('change', handleDarkModeChange);
      } else if ('removeListener' in darkModeMedia) {
        (darkModeMedia as any).removeListener(handleDarkModeChange);
      }
    };
  }, []);
  
  return screenInfo;
}

// For backward compatibility
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  hasTouchScreen: boolean;
  supportsHaptics: boolean;
  prefersDarkMode: boolean;
  supportsDeviceOrientation: boolean;
  devicePixelRatio: number;
  viewport: { width: number; height: number };
}

/**
 * Legacy device detection hook - maintained for backward compatibility
 * New components should use useResponsiveDesign instead
 */
export function useDeviceDetection(): DeviceInfo {
  const responsive = useResponsiveDesign();
  
  // Convert responsive info to legacy device info format
  return {
    isMobile: responsive.isSmallScreen,
    isTablet: responsive.isMediumScreen,
    isDesktop: responsive.isLargeScreen,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    hasTouchScreen: responsive.hasTouchCapability,
    supportsHaptics: false,
    prefersDarkMode: responsive.prefersDarkMode,
    supportsDeviceOrientation: false,
    devicePixelRatio: window.devicePixelRatio || 1,
    viewport: responsive.viewport
  };
}