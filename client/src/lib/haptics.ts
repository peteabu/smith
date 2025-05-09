/**
 * Premium haptic feedback system
 * Designed to make your web app feel like a native iOS/Android experience
 */

// Haptic feedback queue for more natural, non-overlapping haptics
let hapticQueue: number[][] = [];
let isProcessingQueue = false;

// Check if the device supports the Vibration API
const hasVibrationSupport = (): boolean => {
  return 'vibrate' in navigator || 'mozVibrate' in navigator || 'webkitVibrate' in navigator;
};

/**
 * Apple-inspired vibration patterns for different interactions
 * Carefully tuned to mimic iOS taptic engine and Android haptics
 */
export const HapticPatterns = {
  // Ultra light tap for subtle interactions (like key presses)
  SUBTLE: [3],
  
  // Light tap feedback (single short pulse)
  LIGHT_TAP: [8],
  
  // Button press feedback (crisp medium pulse)
  BUTTON_PRESS: [18],
  
  // Stronger impact for significant actions
  IMPACT: [25],
  
  // Heavy impact for major actions
  HEAVY_IMPACT: [35],
  
  // Success feedback (three pulses with increasing intensity)
  SUCCESS: [12, 40, 18, 40, 25],
  
  // Warning feedback (two medium pulses)
  WARNING: [30, 60, 30],
  
  // Error feedback (long pulse, pause, short pulse)
  ERROR: [50, 40, 80],
  
  // Selection change feedback (very light)
  SELECTION_CHANGE: [6],
  
  // Scroll haptic bump (like reaching a scroll threshold)
  SCROLL_BUMP: [5],
  
  // Detent haptic (like reaching a snap point)
  DETENT: [15, 40, 8],
  
  // Page transition (subtle double-tap)
  PAGE_TRANSITION: [10, 30, 15],
  
  // Custom notification pattern
  NOTIFICATION: [12, 60, 12, 60, 12]
};

// Process haptic feedback queue
const processHapticQueue = async () => {
  if (isProcessingQueue || hapticQueue.length === 0) return;
  
  isProcessingQueue = true;
  const pattern = hapticQueue.shift();
  
  if (pattern) {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      } else if ('mozVibrate' in navigator) {
        (navigator as any).mozVibrate(pattern);
      } else if ('webkitVibrate' in navigator) {
        (navigator as any).webkitVibrate(pattern);
      }
      
      // Calculate total duration of the pattern
      const totalDuration = pattern.reduce((sum, duration) => sum + duration, 0) + 10;
      
      // Wait for the pattern to complete before processing next item
      await new Promise(resolve => setTimeout(resolve, totalDuration));
    } catch (error) {
      // Fail silently - haptic feedback is non-essential
      console.debug('Haptic feedback error:', error);
    }
  }
  
  isProcessingQueue = false;
  
  // Process next item if available
  if (hapticQueue.length > 0) {
    processHapticQueue();
  }
};

/**
 * Trigger haptic feedback based on the provided pattern
 * Uses a queue system to prevent overlapping haptics for a more natural feel
 * Falls back gracefully on devices without vibration support
 * 
 * @param pattern Vibration pattern array (durations in ms)
 * @param priority If true, adds to front of queue
 */
export const triggerHaptic = (
  pattern: number[] = HapticPatterns.BUTTON_PRESS,
  priority: boolean = false
): void => {
  if (!hasVibrationSupport()) return;
  
  // Add to appropriate place in queue
  if (priority) {
    hapticQueue.unshift(pattern);
  } else {
    hapticQueue.push(pattern);
  }
  
  // Start processing if not already
  if (!isProcessingQueue) {
    processHapticQueue();
  }
};

/**
 * A higher-level API for premium haptic feedback
 * Designed to make your app feel like a native iOS/Android experience
 */
export const haptics = {
  // Ultra light feedback for subtle interactions
  subtle: () => triggerHaptic(HapticPatterns.SUBTLE),
  
  // Light tap for regular interactions
  tap: () => triggerHaptic(HapticPatterns.LIGHT_TAP),
  
  // Medium feedback for button presses
  press: () => triggerHaptic(HapticPatterns.BUTTON_PRESS),
  
  // Stronger feedback for primary actions (high priority)
  impact: () => triggerHaptic(HapticPatterns.IMPACT, true),
  
  // Extra strong feedback for major actions (high priority)
  heavyImpact: () => triggerHaptic(HapticPatterns.HEAVY_IMPACT, true),
  
  // Success feedback (high priority)
  success: () => triggerHaptic(HapticPatterns.SUCCESS, true),
  
  // Warning feedback
  warning: () => triggerHaptic(HapticPatterns.WARNING),
  
  // Error feedback (high priority)
  error: () => triggerHaptic(HapticPatterns.ERROR, true),
  
  // Selection change feedback (very light)
  selectionChange: () => triggerHaptic(HapticPatterns.SELECTION_CHANGE),
  
  // Scroll bump sensation
  scrollBump: () => triggerHaptic(HapticPatterns.SCROLL_BUMP),
  
  // Detent sensation (like reaching a threshold)
  detent: () => triggerHaptic(HapticPatterns.DETENT),
  
  // Page transition feedback
  pageTransition: () => triggerHaptic(HapticPatterns.PAGE_TRANSITION, true),
  
  // Notification feedback pattern
  notification: () => triggerHaptic(HapticPatterns.NOTIFICATION),
  
  // Clear any pending haptic feedback
  clear: () => {
    hapticQueue = [];
    if (hasVibrationSupport()) {
      navigator.vibrate(0); // Stop any current vibration
    }
  },
  
  // Check if device supports haptics
  isSupported: hasVibrationSupport
};

export default haptics;