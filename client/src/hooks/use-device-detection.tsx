import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPortrait: true,
    isLandscape: false,
    isTouch: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width <= 640;
      const isTablet = width > 640 && width <= 1024;
      const isDesktop = width > 1024;
      const isPortrait = height > width;
      const isLandscape = width > height;
      
      // Check if device is touch-capable
      const isTouch = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0 ||
                      (navigator as any).msMaxTouchPoints > 0;
      
      // Detect iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                   (navigator.platform === 'MacIntel' && isTouch);
      
      // Detect Android devices
      const isAndroid = /Android/.test(navigator.userAgent);
      
      // Detect browsers
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isPortrait,
        isLandscape,
        isTouch,
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        viewportWidth: width,
        viewportHeight: height,
        devicePixelRatio: window.devicePixelRatio,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}