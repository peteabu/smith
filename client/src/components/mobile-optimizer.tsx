import React, { ReactNode } from 'react';

interface MobileOptimizerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Simplified version of MobileOptimizer that doesn't apply different behavior for mobile
 * This treats all devices the same for consistent responsive experience
 */
export function MobileOptimizer({ children, className = '' }: MobileOptimizerProps) {
  // Simply render children with the className
  return <div className={className}>{children}</div>;
}

/**
 * Simplified MobileSection that just renders children in a div
 */
export function MobileSection({ 
  children, 
  className = '', 
  delay = 0 // kept for backwards compatibility
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}

/**
 * Simplified TouchButton that doesn't use haptic feedback or special mobile styling
 */
export function TouchButton({
  children,
  onClick,
  className = '',
  hapticType = 'press', // kept for backwards compatibility
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