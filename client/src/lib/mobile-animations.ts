/**
 * Animation utilities for creating premium mobile-first animations
 */

// Spring physics configurations for natural-feeling animations
export const SPRINGS = {
  // Fast, responsive spring for UI elements that need to feel snappy
  SNAPPY: {
    stiffness: 800,
    damping: 45,
    mass: 1
  },
  // Medium spring for general UI transitions
  MEDIUM: {
    stiffness: 400, 
    damping: 40,
    mass: 1
  },
  // Gentle spring for subtle animations
  GENTLE: {
    stiffness: 200,
    damping: 28,
    mass: 1
  },
  // Bouncy spring for playful elements
  BOUNCY: {
    stiffness: 500,
    damping: 10, 
    mass: 1.2
  }
};

// Timing functions that mimic natural motion
export const EASING = {
  // Standard easing for most UI elements
  STANDARD: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  // For elements entering the screen
  ENTER: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  // For elements leaving the screen
  EXIT: 'cubic-bezier(0.4, 0.0, 1, 1)',
  // Creates a slight anticipation before movement
  ANTICIPATE: 'cubic-bezier(0.38, -0.4, 0.88, 0.65)',
  // Produces an elastic effect
  ELASTIC: 'cubic-bezier(0.2, 0.8, 0.0, 1.0)'
};

// Duration presets for animations
export const DURATION = {
  INSTANT: 100,  // 0.1s - Extremely fast transitions
  FAST: 200,     // 0.2s - Fast transitions like button presses
  NORMAL: 300,   // 0.3s - Standard UI transitions
  MEDIUM: 500,   // 0.5s - Medium transitions
  SLOW: 800,     // 0.8s - Slower, more deliberate animations
  VERY_SLOW: 1200 // 1.2s - Dramatic transitions
};

// Staggered animation helpers
export const staggerChildren = (count: number, baseDelay = 50) => {
  return Array.from({ length: count }).map((_, i) => i * baseDelay);
};

// Common animation variants that can be used with framer-motion
export const ANIMATIONS = {
  FADE_IN: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3, ease: EASING.ENTER } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: EASING.EXIT } }
  },
  
  SLIDE_UP: {
    initial: { y: 20, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.4, 
        ease: EASING.STANDARD 
      } 
    },
    exit: { 
      y: 20, 
      opacity: 0, 
      transition: { 
        duration: 0.3, 
        ease: EASING.EXIT 
      } 
    }
  },
  
  SCALE_IN: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      transition: { 
        type: 'spring', 
        ...SPRINGS.MEDIUM 
      } 
    },
    exit: { 
      scale: 0.9, 
      opacity: 0, 
      transition: { 
        duration: 0.2, 
        ease: EASING.EXIT 
      } 
    }
  },

  POP_IN: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      transition: { 
        type: 'spring', 
        ...SPRINGS.BOUNCY
      } 
    },
    exit: { 
      scale: 0.8, 
      opacity: 0, 
      transition: { 
        duration: 0.2, 
        ease: EASING.EXIT 
      } 
    }
  },
  
  PUSH_BUTTON: {
    initial: { scale: 1 },
    whileTap: { 
      scale: 0.95, 
      transition: { 
        duration: 0.1, 
        ease: EASING.STANDARD 
      } 
    }
  }
};

// Helper to generate staggered animations for lists
export const createStaggeredListAnimation = (
  staggerDelay = 0.05,
  baseAnimation = ANIMATIONS.SLIDE_UP
) => {
  return {
    ...baseAnimation,
    animate: {
      ...baseAnimation.animate,
      transition: {
        ...baseAnimation.animate.transition,
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  };
};