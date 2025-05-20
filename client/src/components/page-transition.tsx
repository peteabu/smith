import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

interface PageTransitionProps {
  children: ReactNode;
  transitionKey?: string;
  className?: string;
}

/**
 * Consistent page transition component that works the same across all devices
 */
export function PageTransition({ 
  children, 
  transitionKey,
  className = ''
}: PageTransitionProps) {
  const [location] = useLocation();
  
  // Use the current location path as the key if not provided
  const key = transitionKey || location;
  
  // Simple fade transition for consistent experience across all devices
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        className={`page-transition ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * ModalTransition provides a consistent modal animation
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
  // Modal backdrop press handler
  const handleBackdropPress = () => {
    if (onClose) {
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
 * SlideUpTransition provides a consistent slide-up animation
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