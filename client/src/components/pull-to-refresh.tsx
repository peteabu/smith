import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  pullThreshold?: number;
  distanceMultiplier?: number;
  className?: string;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
}

/**
 * Premium pull-to-refresh component with native iOS-like physics
 */
export function PullToRefresh({
  children,
  onRefresh,
  pullThreshold = 80,
  distanceMultiplier = 0.5,
  className = '',
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh'
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [readyToRefresh, setReadyToRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const device = useDeviceDetection();
  
  // Spring physics for pull
  const springY = useSpring(0, {
    stiffness: 200,
    damping: 30
  });
  
  const pullDistance = useTransform(
    springY,
    [0, pullThreshold],
    [0, pullThreshold]
  );
  
  const spinnerOpacity = useTransform(
    springY,
    [0, pullThreshold * 0.4, pullThreshold],
    [0, 0.4, 1]
  );
  
  const spinnerScale = useTransform(
    springY,
    [0, pullThreshold],
    [0.5, 1]
  );
  
  const spinnerRotation = useTransform(
    springY, 
    [0, pullThreshold], 
    [0, 180]
  );
  
  // Handle the start of touch
  const handleTouchStart = (e: TouchEvent) => {
    if (refreshing) return;
    
    // Only activate if we're at the top of the container
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      setPulling(true);
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
    }
  };
  
  // Handle touch move
  const handleTouchMove = (e: TouchEvent) => {
    if (!pulling || refreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = (currentY.current - startY.current) * distanceMultiplier;
    
    // Only allow pulling down
    if (deltaY > 0) {
      springY.set(deltaY);
      
      if (deltaY >= pullThreshold && !readyToRefresh) {
        setReadyToRefresh(true);
        haptics.detent(); // Give haptic feedback when reaching the threshold
      } else if (deltaY < pullThreshold && readyToRefresh) {
        setReadyToRefresh(false);
      }
      
      // Prevent default to avoid scroll bounce on iOS
      if (device.isIOS) {
        e.preventDefault();
      }
    }
  };
  
  // Handle end of touch
  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;
    
    if (readyToRefresh) {
      // Trigger refresh
      setRefreshing(true);
      haptics.impact(); // Strong impact for refresh action
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        haptics.error(); // Error feedback
      } finally {
        setRefreshing(false);
        haptics.success(); // Success feedback when done
      }
    }
    
    // Reset
    setPulling(false);
    setReadyToRefresh(false);
    springY.set(0);
  };
  
  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [pulling, refreshing, readyToRefresh]);
  
  return (
    <div 
      ref={containerRef} 
      className={`pull-to-refresh-container relative overflow-y-auto ${className}`}
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Pull indicator */}
      <motion.div 
        className="absolute top-0 left-0 w-full flex justify-center items-center pointer-events-none"
        style={{ y: pullDistance, opacity: spinnerOpacity }}
      >
        <div className="flex flex-col items-center py-3">
          <motion.div 
            className="w-6 h-6 mb-2"
            style={{ 
              scale: spinnerScale,
              rotate: refreshing ? 360 : spinnerRotation 
            }}
            animate={refreshing ? { rotate: 360 } : {}}
            transition={refreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-brown-dark"
            >
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
            </svg>
          </motion.div>
          <div className="text-sm text-brown-dark font-mono">
            {refreshing 
              ? refreshingText 
              : readyToRefresh 
                ? releaseText 
                : pullText}
          </div>
        </div>
      </motion.div>
      
      {/* Actual content */}
      <motion.div 
        style={{ y: pullDistance }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}