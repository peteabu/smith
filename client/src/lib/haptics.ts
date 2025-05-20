/**
 * Simplified feedback interface that's consistent across all devices.
 * This is a no-op implementation for consistent behavior on all platforms.
 */

// Empty interface kept for backward compatibility
interface HapticOptions {
  duration?: number;
  intensity?: number;
  pattern?: 'sharp' | 'medium' | 'soft' | 'rigid' | 'heavy';
}

/**
 * Returns whether device supports haptic feedback
 */
function isSupported(): boolean {
  return false; // Always return false for consistent behavior
}

/**
 * No-op implementation for all feedback methods
 */
function noOp(_options?: HapticOptions) {
  // No operation - consistent behavior across all devices
  return;
}

/**
 * Empty implementation of haptic feedback for consistent cross-device behavior
 */
export default {
  tap: noOp,
  impact: noOp,
  heavyImpact: noOp,
  success: noOp,
  warning: noOp,
  error: noOp,
  detent: noOp,
  pageTransition: noOp,
  notification: noOp,
  selectionChanged: noOp,
  selectionChange: noOp,
  subtle: noOp,
  press: noOp,
  custom: (_pattern: number[], _options?: HapticOptions) => {},
  isSupported
};