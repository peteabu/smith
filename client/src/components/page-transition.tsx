import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';

interface PageTransitionProps {
  children: ReactNode;
  transitionKey?: string;
  className?: string;
}

type TransitionVariant = 'slide' | 'fade' | 'scale' | 'ios-push' | 'ios-modal';

interface PageTransitionsConfig {
  variant: TransitionVariant;
  initialProps: any;
  animateProps: any;
  exitProps: any;
  transition: any;
}

// Preset transitions inspired by iOS, Android, and other premium mobile apps
const TRANSITION_PRESETS: Record<TransitionVariant, PageTransitionsConfig> = {
  'slide': {
    variant: 'slide',
    initialProps: { x: '100%' },
    animateProps: { x: 0 },
    exitProps: { x: '-100%' },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  'fade': {
    variant: 'fade',
    initialProps: { opacity: 0 },
    animateProps: { opacity: 1 },
    exitProps: { opacity: 0 },
    transition: { duration: 0.25 }
  },
  'scale': {
    variant: 'scale',
    initialProps: { opacity: 0, scale: 0.95 },
    animateProps: { opacity: 1, scale: 1 },
    exitProps: { opacity: 0, scale: 1.05 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  'ios-push': {
    variant: 'ios-push',
    initialProps: { x: '100%', opacity: 1, scale: 0.95 },
    animateProps: { x: 0, opacity: 1, scale: 1 },
    exitProps: { x: '-30%', opacity: 0.8, scale: 0.95 },
    transition: { type: 'spring', stiffness: 350, damping: 30 }
  },
  'ios-modal': {
    variant: 'ios-modal',
    initialProps: { y: '100%', opacity: 1 },
    animateProps: { y: 0, opacity: 1 },
    exitProps: { y: '100%', opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

/**
 * PageTransition component that provides native-like page transitions for mobile
 */
export function PageTransition({ 
  children, 
  transitionKey,
  className = ''
}: PageTransitionProps) {
  const [location] = useLocation();
  const device = useDeviceDetection();
  
  // Use the current location path as the key if not provided
  const key = transitionKey || location;
  
  // Choose transition variant based on device
  const getTransitionVariant = (): TransitionVariant => {
    if (device.isIOS) return 'ios-push';
    if (device.isAndroid) return 'slide';
    return 'fade';
  };
  
  const variant = getTransitionVariant();
  const transitionConfig = TRANSITION_PRESETS[variant];
  
  // Trigger haptic feedback on page transition
  useEffect(() => {
    if (device.isMobile) {
      haptics.pageTransition();
    }
  }, [location, device.isMobile]);
  
  if (!device.isMobile) {
    // For desktop, skip animations
    return <div className={className}>{children}</div>;
  }
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        className={`page-transition ${className}`}
        initial={transitionConfig.initialProps}
        animate={transitionConfig.animateProps}
        exit={transitionConfig.exitProps}
        transition={transitionConfig.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * ModalTransition provides a beautiful modal animation for mobile
 */
export function ModalTransition({ 
  children, 
  isOpen, 
  onClose,
  className = ''
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const device = useDeviceDetection();
  
  // Trigger haptic feedback when modal opens
  useEffect(() => {
    if (isOpen && device.isMobile) {
      haptics.impact();
    }
  }, [isOpen, device.isMobile]);
  
  // Modal backdrop press handler
  const handleBackdropPress = () => {
    if (onClose) {
      if (device.isMobile) {
        haptics.tap();
      }
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropPress}
          />
          
          {/* Modal */}
          <motion.div
            className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30 
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * SlideUpTransition provides a beautiful iOS-like slide-up animation
 */
export function SlideUpTransition({ 
  children, 
  isVisible,
  className = ''
}: {
  children: ReactNode;
  isVisible: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={className}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 500, 
            damping: 30 
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}