/**
 * Premium swipe gestures system for iOS-like interactions
 * Provides native-feeling swipe, drag, and pinch gestures
 */

export interface TouchPoint {
  x: number;
  y: number;
}

export interface GestureState {
  startPoint: TouchPoint;
  currentPoint: TouchPoint;
  deltaX: number;
  deltaY: number;
  distance: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  velocity: number;
  isActive: boolean;
  startTime: number;
  duration: number;
}

export interface GestureOptions {
  swipeThreshold?: number;
  velocityThreshold?: number;
  onSwipeLeft?: (state: GestureState) => void;
  onSwipeRight?: (state: GestureState) => void;
  onSwipeUp?: (state: GestureState) => void;
  onSwipeDown?: (state: GestureState) => void;
  onGestureStart?: (state: GestureState) => void;
  onGestureMove?: (state: GestureState) => void;
  onGestureEnd?: (state: GestureState) => void;
  preventScroll?: boolean;
  lockAxis?: boolean;
}

const defaultOptions: GestureOptions = {
  swipeThreshold: 50,
  velocityThreshold: 0.3,
  preventScroll: false,
  lockAxis: false
};

/**
 * Calculate the distance between two points
 */
const getDistance = (p1: TouchPoint, p2: TouchPoint): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Get the direction of a swipe
 */
const getDirection = (deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' | null => {
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? 'right' : 'left';
  } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
    return deltaY > 0 ? 'down' : 'up';
  }
  return null;
};

/**
 * Apply swipe gestures to an element
 */
export const applySwipeGestures = (
  element: HTMLElement, 
  options: GestureOptions = {}
): (() => void) => {
  const opts = { ...defaultOptions, ...options };
  
  let state: GestureState = {
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    deltaX: 0,
    deltaY: 0,
    distance: 0,
    direction: null,
    velocity: 0,
    isActive: false,
    startTime: 0,
    duration: 0
  };
  
  let lockedAxis: 'x' | 'y' | null = null;
  
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    state = {
      startPoint: { x: touch.clientX, y: touch.clientY },
      currentPoint: { x: touch.clientX, y: touch.clientY },
      deltaX: 0,
      deltaY: 0,
      distance: 0,
      direction: null,
      velocity: 0,
      isActive: true,
      startTime: Date.now(),
      duration: 0
    };
    
    lockedAxis = null;
    
    if (opts.onGestureStart) {
      opts.onGestureStart(state);
    }
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!state.isActive || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const currentPoint = { x: touch.clientX, y: touch.clientY };
    const deltaX = currentPoint.x - state.startPoint.x;
    const deltaY = currentPoint.y - state.startPoint.y;
    
    // Lock to the axis with greater movement if option is enabled
    if (opts.lockAxis && !lockedAxis && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      lockedAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }
    
    // Apply axis locking
    let newDeltaX = deltaX;
    let newDeltaY = deltaY;
    if (opts.lockAxis && lockedAxis) {
      if (lockedAxis === 'x') {
        newDeltaY = 0;
      } else {
        newDeltaX = 0;
      }
    }
    
    const distance = getDistance(state.startPoint, currentPoint);
    const duration = Date.now() - state.startTime;
    const velocity = distance / duration;
    const direction = getDirection(newDeltaX, newDeltaY);
    
    state = {
      ...state,
      currentPoint,
      deltaX: newDeltaX,
      deltaY: newDeltaY,
      distance,
      direction,
      velocity,
      duration
    };
    
    if (opts.onGestureMove) {
      opts.onGestureMove(state);
    }
    
    // Prevent scrolling if option is enabled
    if (opts.preventScroll) {
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (!state.isActive) return;
    
    const threshold = opts.swipeThreshold || 0;
    const velocityThreshold = opts.velocityThreshold || 0;
    
    // Determine if a swipe occurred
    const isSwipe = state.distance > threshold || state.velocity > velocityThreshold;
    
    if (isSwipe && state.direction) {
      // Trigger the appropriate swipe handler
      switch(state.direction) {
        case 'left':
          if (opts.onSwipeLeft) opts.onSwipeLeft(state);
          break;
        case 'right':
          if (opts.onSwipeRight) opts.onSwipeRight(state);
          break;
        case 'up':
          if (opts.onSwipeUp) opts.onSwipeUp(state);
          break;
        case 'down':
          if (opts.onSwipeDown) opts.onSwipeDown(state);
          break;
      }
    }
    
    if (opts.onGestureEnd) {
      opts.onGestureEnd({...state, isActive: false });
    }
    
    state.isActive = false;
  };
  
  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: !opts.preventScroll });
  element.addEventListener('touchmove', handleTouchMove, { passive: !opts.preventScroll });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('touchcancel', handleTouchEnd);
  
  // Return a cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchEnd);
  };
};

/**
 * Hook version of swipe gestures to use with React refs
 */
export const useSwipeGestures = () => {
  return {
    applySwipeGestures
  };
};