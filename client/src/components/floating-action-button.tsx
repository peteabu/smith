import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  color?: 'primary' | 'secondary' | 'custom';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  showLabel?: boolean;
  disabled?: boolean;
  tooltip?: string;
  hasMenu?: boolean;
  menuItems?: {
    icon: ReactNode;
    label: string;
    onClick: () => void;
  }[];
}

/**
 * A premium floating action button component with native-like interactions
 * Features:
 * - Beautiful animations on press
 * - Haptic feedback
 * - Expandable menu options
 * - Dynamic positioning
 */
export function FloatingActionButton({
  icon,
  onClick,
  className = '',
  position = 'bottom-right',
  color = 'primary',
  size = 'medium',
  label,
  showLabel = false,
  disabled = false,
  tooltip,
  hasMenu = false,
  menuItems = []
}: FloatingActionButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const device = useDeviceDetection();
  
  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2'
  };
  
  // Color classes
  const colorClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 active:bg-gray-100',
    custom: ''
  };
  
  // Size classes
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-14 h-14',
    large: 'w-16 h-16'
  };
  
  // Handle button click
  const handleClick = () => {
    if (disabled) return;
    
    // If has menu, toggle it
    if (hasMenu) {
      setMenuOpen(!menuOpen);
      
      // Haptic feedback
      if (device.isMobile) {
        if (!menuOpen) {
          haptics.impact();
        } else {
          haptics.tap();
        }
      }
    } 
    // Otherwise execute onClick
    else if (onClick) {
      onClick();
      
      // Haptic feedback
      if (device.isMobile) {
        haptics.impact();
      }
    }
  };
  
  // Handle menu item click
  const handleMenuItemClick = (itemOnClick: () => void) => {
    // Close menu
    setMenuOpen(false);
    
    // Execute item's onClick
    itemOnClick();
    
    // Haptic feedback
    if (device.isMobile) {
      haptics.tap();
    }
  };
  
  // Handle long press to show tooltip
  const handleLongPress = () => {
    if (tooltip && !tooltipVisible) {
      setTooltipVisible(true);
      
      // Hide tooltip after 2 seconds
      setTimeout(() => {
        setTooltipVisible(false);
      }, 2000);
      
      // Haptic feedback for tooltip
      if (device.isMobile) {
        haptics.selectionChange();
      }
    }
  };
  
  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      {/* Menu Items */}
      <AnimatePresence>
        {menuOpen && hasMenu && (
          <div className="absolute bottom-full mb-2 w-max">
            {menuItems.map((item, index) => (
              <motion.button
                key={index}
                className={`${colorClasses[color]} flex items-center justify-start mb-3 py-2 px-4 rounded-full shadow-lg`}
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0, scale: 0.8 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 500, 
                  damping: 30,
                  delay: 0.05 * (menuItems.length - index - 1) 
                }}
                onClick={() => handleMenuItemClick(item.onClick)}
              >
                <span className="mr-2">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
      
      {/* Main Button */}
      <motion.button
        className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full flex items-center justify-center shadow-lg ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        whileTap={{ scale: device.isMobile ? 0.92 : 0.95 }}
        onClick={handleClick}
        onContextMenu={(e) => {
          // Prevent context menu on mobile to allow for long press
          if (device.isMobile && tooltip) {
            e.preventDefault();
          }
        }}
        disabled={disabled}
        onTouchStart={() => {
          // Set up long press for tooltip
          if (tooltip) {
            const timer = setTimeout(handleLongPress, 500);
            return () => clearTimeout(timer);
          }
        }}
      >
        {icon}
      </motion.button>
      
      {/* Label */}
      {label && showLabel && (
        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs text-center font-medium text-gray-700">
          {label}
        </div>
      )}
      
      {/* Tooltip */}
      <AnimatePresence>
        {tooltipVisible && tooltip && (
          <motion.div
            className="absolute bottom-full mb-2 bg-black bg-opacity-75 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap left-1/2 transform -translate-x-1/2"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 5, opacity: 0 }}
          >
            {tooltip}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-black bg-opacity-75"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}