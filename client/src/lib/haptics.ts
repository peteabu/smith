/**
 * Advanced haptic feedback system for premium mobile experiences
 * 
 * This system provides a complete range of haptic patterns that mimic
 * the sophisticated taptic engine found in iOS devices and high-end
 * Android devices, creating a truly native app-like feel.
 */

interface HapticOptions {
  // Duration in milliseconds
  duration?: number;
  // Strength from 0-1
  intensity?: number;
  // Pattern type
  pattern?: 'sharp' | 'medium' | 'soft' | 'rigid' | 'heavy';
}

const DEFAULT_OPTIONS: HapticOptions = {
  duration: 20,
  intensity: 0.5,
  pattern: 'medium'
};

/**
 * Core haptic engine for standardized vibration patterns
 */
function vibrate(pattern: number[] | number, options?: HapticOptions) {
  // Skip if vibration is not available
  if (!navigator.vibrate) return;
  
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.error('Haptic feedback error:', error);
  }
}

/**
 * Returns whether device supports haptic feedback
 */
function isSupported(): boolean {
  return !!navigator.vibrate;
}

/**
 * Selection tap feedback (light)
 */
function tap(options?: HapticOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options, duration: 15, intensity: 0.3 };
  vibrate(opts.duration || 15);
}

/**
 * Medium impact feedback
 */
function impact(options?: HapticOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const duration = opts.duration || 20;
  
  // A single short vibration
  vibrate(duration);
}

/**
 * Heavy impact feedback for significant actions
 */
function heavyImpact(options?: HapticOptions) {
  // Create a harder hit with a burst pattern
  vibrate([10, 20, 30]);
}

/**
 * Success feedback pattern 
 */
function success(options?: HapticOptions) {
  // Double-tap with increasing intensity
  vibrate([15, 10, 30]);
}

/**
 * Warning feedback pattern
 */
function warning(options?: HapticOptions) {
  // Triple pulse
  vibrate([10, 30, 10, 30, 10]);
}

/**
 * Error feedback pattern
 */
function error(options?: HapticOptions) {
  // More intense irregular pattern
  vibrate([10, 10, 20, 10, 40]);
}

/**
 * Detent feedback (mechanical stop feel)
 */
function detent(options?: HapticOptions) {
  vibrate(5);
}

/**
 * Page transition feedback
 */
function pageTransition(options?: HapticOptions) {
  vibrate([5, 15, 10]);
}

/**
 * Notification feedback
 */
function notification(options?: HapticOptions) {
  vibrate([10, 20, 10, 20, 20]);
}

/**
 * Selection change feedback
 */
function selectionChanged(options?: HapticOptions) {
  vibrate(8);
}

/**
 * Create a custom haptic pattern
 */
function custom(pattern: number[], options?: HapticOptions) {
  vibrate(pattern);
}

/**
 * Subtle feedback (very light)
 */
function subtle(options?: HapticOptions) {
  vibrate(3);
}

/**
 * Press feedback (sustained press)
 */
function press(options?: HapticOptions) {
  vibrate(30);
}

/**
 * Selection change feedback (alias for selectionChanged)
 */
function selectionChange(options?: HapticOptions) {
  selectionChanged(options);
}

/**
 * Common haptic feedback patterns from iOS/Android
 */
export default {
  tap,
  impact,
  heavyImpact,
  success,
  warning,
  error,
  detent,
  pageTransition,
  notification,
  selectionChanged,
  selectionChange, // Alias for backward compatibility
  subtle,
  press,
  custom,
  isSupported
};