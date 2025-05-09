import { useState, useEffect } from 'react';

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
 * Advanced device detection hook with high-precision checks
 * 
 * Detects:
 * - Device type (mobile, tablet, desktop)
 * - Operating system (iOS, Android)
 * - Browser type (Safari, Chrome, Firefox)
 * - Feature support (touch, haptics, device orientation)
 * - User preferences (dark mode)
 */
export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    hasTouchScreen: false,
    supportsHaptics: false,
    prefersDarkMode: false,
    supportsDeviceOrientation: false,
    devicePixelRatio: 1,
    viewport: { width: 0, height: 0 }
  });
  
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    // Get the user agent and platform
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    // Detect mobile/tablet
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    const isMobileDevice = mobileRegex.test(userAgent);
    
    // More precise detection for tablets
    const isTabletDevice = 
      /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i
      .test(userAgent);
    
    // iOS detection
    const isIOS = /iphone|ipad|ipod/i.test(userAgent) || 
      (platform === 'macintel' && navigator.maxTouchPoints > 1); // For iPad Pro with iOS 13+
    
    // Android detection
    const isAndroid = /android/i.test(userAgent);
    
    // Browser detection
    const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
    const isChrome = /chrome|crios/i.test(userAgent) && !(/(opr|opera|edge|edg|brave)/i.test(userAgent));
    const isFirefox = /firefox|fxios/i.test(userAgent);
    
    // Feature detection
    const hasTouchScreen = ('ontouchstart' in window) || 
                          (navigator.maxTouchPoints > 0) || 
                          ('msMaxTouchPoints' in navigator && (navigator as any).msMaxTouchPoints > 0);
    
    // Haptics support
    const supportsHaptics = 'vibrate' in navigator;
    
    // Device orientation support
    const supportsDeviceOrientation = 'DeviceOrientationEvent' in window;
    
    // Dark mode preference
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Viewport size
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Device pixel ratio
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Update state
    setDeviceInfo({
      isMobile: isMobileDevice && !isTabletDevice,
      isTablet: isTabletDevice,
      isDesktop: !isMobileDevice || isTabletDevice,
      isIOS,
      isAndroid,
      isSafari,
      isChrome, 
      isFirefox,
      hasTouchScreen,
      supportsHaptics,
      prefersDarkMode,
      supportsDeviceOrientation,
      devicePixelRatio,
      viewport
    });
    
    // Listen for viewport changes
    const handleResize = () => {
      setDeviceInfo(prevState => ({
        ...prevState,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }));
    };
    
    // Listen for dark mode changes
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setDeviceInfo(prevState => ({
        ...prevState,
        prefersDarkMode: e.matches
      }));
    };
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    
    // Add dark mode listener
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMedia.addEventListener) {
      darkModeMedia.addEventListener('change', handleDarkModeChange);
    } else if (darkModeMedia.addListener) {
      // For older browsers
      darkModeMedia.addListener(handleDarkModeChange);
    }
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (darkModeMedia.removeEventListener) {
        darkModeMedia.removeEventListener('change', handleDarkModeChange);
      } else if (darkModeMedia.removeListener) {
        darkModeMedia.removeListener(handleDarkModeChange);
      }
    };
  }, []);
  
  return deviceInfo;
}