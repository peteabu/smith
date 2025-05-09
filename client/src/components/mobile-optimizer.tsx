import React, { useEffect, useState, ReactNode } from 'react';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import { motion, AnimatePresence } from 'framer-motion';
import haptics from '@/lib/haptics';
import { ANIMATIONS } from '@/lib/mobile-animations';

interface MobileOptimizerProps {
  children: ReactNode;
  className?: string;
}

/**
 * MobileOptimizer enhances mobile experience with:
 * - Adaptive layout based on device type
 * - Smooth animations and transitions
 * - Enhanced touch handling
 * - Safe area insets management
 * - Haptic feedback integration
 */
export function MobileOptimizer({ children, className = '' }: MobileOptimizerProps) {
  const device = useDeviceDetection();
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Apply mobile optimizations on mount
  useEffect(() => {
    // Prevent iOS double-tap zoom
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      const lastTouch = (window as any).lastTouch || now;
      const delta = now - lastTouch;
      if (delta < 300 && delta > 0) {
        e.preventDefault();
      }
      (window as any).lastTouch = now;
    }, false);
    
    // Disable pull-to-refresh where appropriate
    document.body.style.overscrollBehavior = 'none';
    
    // Disable long-press context menu
    document.addEventListener('contextmenu', (e) => {
      if (device.isMobile || device.isTablet) {
        e.preventDefault();
      }
    });
    
    // Mark as loaded
    setTimeout(() => setIsLoaded(true), 100);
    
    // Fire haptic feedback on load
    if (device.isMobile) {
      haptics.pageTransition();
    }
    
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, [device.isMobile, device.isTablet]);
  
  // Apply iOS-specific styles
  useEffect(() => {
    if (device.isIOS) {
      // Add iOS-specific class to body
      document.body.classList.add('ios-device');
      
      // Apply specific iOS optimizations
      (document.documentElement.style as any).webkitTapHighlightColor = 'transparent';
      (document.documentElement.style as any).webkitTouchCallout = 'none';
      (document.documentElement.style as any).webkitOverflowScrolling = 'touch';
    } else {
      document.body.classList.remove('ios-device');
    }
  }, [device.isIOS]);

  if (device.isMobile) {
    return (
      <AnimatePresence>
        {isLoaded && (
          <motion.div
            className={`mobile-optimized ${className}`}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={ANIMATIONS.FADE_IN}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Non-mobile devices just get the children without extra wrappers
  return <>{children}</>;
}

/**
 * MobileSection applies optimized animations for mobile section transitions
 */
export function MobileSection({ 
  children, 
  className = '', 
  delay = 0 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  const device = useDeviceDetection();
  
  if (device.isMobile) {
    return (
      <motion.div
        className={`mobile-section ${className}`}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={ANIMATIONS.SLIDE_UP}
        transition={{ delay }}
      >
        {children}
      </motion.div>
    );
  }
  
  return <div className={className}>{children}</div>;
}

/**
 * TouchButton adds advanced haptic feedback and animations to buttons on mobile
 */
export function TouchButton({
  children,
  onClick,
  className = '',
  hapticType = 'press',
  disabled = false,
  type = 'button'
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  hapticType?: 'subtle' | 'tap' | 'press' | 'impact';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) {
  const device = useDeviceDetection();
  
  const handleClick = () => {
    // Trigger appropriate haptic feedback
    if (device.isMobile && !disabled) {
      switch (hapticType) {
        case 'subtle':
          haptics.subtle();
          break;
        case 'tap':
          haptics.tap();
          break;
        case 'press':
          haptics.press();
          break;
        case 'impact':
          haptics.impact();
          break;
        default:
          haptics.tap();
      }
    }
    
    // Call the original onClick handler
    if (onClick && !disabled) {
      onClick();
    }
  };
  
  if (device.isMobile) {
    return (
      <motion.button
        type={type}
        className={`touch-optimized-button ${className}`}
        onClick={handleClick}
        disabled={disabled}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.button>
    );
  }
  
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}