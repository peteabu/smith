/**
 * Utilities for haptic feedback on mobile devices
 */

// Check if the device supports the Vibration API
const hasVibrationSupport = (): boolean => {
  return 'vibrate' in navigator || 'mozVibrate' in navigator || 'webkitVibrate' in navigator;
};

/**
 * Vibration patterns for different interactions
 */
export const HapticPatterns = {
  // Light tap feedback (single short pulse)
  LIGHT_TAP: [10],
  
  // Button press feedback (medium pulse)
  BUTTON_PRESS: [20],
  
  // Success feedback (two short pulses)
  SUCCESS: [15, 50, 15],
  
  // Warning feedback (longer pulse)
  WARNING: [40],
  
  // Error feedback (long pulse, pause, short pulse)
  ERROR: [60, 50, 20],
  
  // Selection change feedback (very light)
  SELECTION_CHANGE: [8],
};

/**
 * Trigger haptic feedback based on the provided pattern
 * Falls back gracefully on devices without vibration support
 * 
 * @param pattern Vibration pattern array (durations in ms)
 */
export const triggerHaptic = (pattern: number[] = HapticPatterns.BUTTON_PRESS): void => {
  if (!hasVibrationSupport()) return;
  
  try {
    // Handle browser prefixes for vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    } else if ('mozVibrate' in navigator) {
      (navigator as any).mozVibrate(pattern);
    } else if ('webkitVibrate' in navigator) {
      (navigator as any).webkitVibrate(pattern);
    }
  } catch (error) {
    // Fail silently - haptic feedback is non-essential
    console.debug('Haptic feedback error:', error);
  }
};

/**
 * A higher-level API for common haptic feedback scenarios
 */
export const haptics = {
  // For regular button taps
  tap: () => triggerHaptic(HapticPatterns.LIGHT_TAP),
  
  // For primary action buttons
  impact: () => triggerHaptic(HapticPatterns.BUTTON_PRESS),
  
  // For successful operations
  success: () => triggerHaptic(HapticPatterns.SUCCESS),
  
  // For warning operations
  warning: () => triggerHaptic(HapticPatterns.WARNING),
  
  // For error operations
  error: () => triggerHaptic(HapticPatterns.ERROR),
  
  // For selection changes (light feedback)
  selectionChange: () => triggerHaptic(HapticPatterns.SELECTION_CHANGE),
};

export default haptics;