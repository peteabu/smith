import React, { useState, useRef, useEffect, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';

// Common props for both text inputs and textareas
interface CommonInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  onTrailingIconClick?: () => void;
  onIconClick?: () => void;
  containerClassName?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
  showFloatingLabel?: boolean;
}

// Text input props
interface TextInputProps extends CommonInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  variant?: 'outlined' | 'filled' | 'minimal';
}

// Textarea props
interface TextareaInputProps extends CommonInputProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  variant?: 'outlined' | 'filled' | 'minimal';
  autoExpand?: boolean;
  maxRows?: number;
}

/**
 * Premium iOS/Android-like text input with advanced animation
 */
export function MobileTextInput({
  label,
  error,
  helperText,
  icon,
  trailingIcon,
  onIconClick,
  onTrailingIconClick,
  containerClassName = '',
  labelClassName = '',
  inputWrapperClassName = '',
  inputClassName = '',
  errorClassName = '',
  helperClassName = '',
  showFloatingLabel = true,
  variant = 'outlined',
  ...props
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isLabelFloating, setIsLabelFloating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const device = useDeviceDetection();
  
  // Determine if the label should float (either focused or has value)
  useEffect(() => {
    if (inputRef.current) {
      setIsLabelFloating(
        isFocused || !!inputRef.current.value || !!props.value
      );
    }
  }, [isFocused, props.value]);
  
  // Variant-specific styles
  const getVariantClasses = () => {
    switch (variant) {
      case 'filled':
        return 'bg-paper rounded-t-lg border-b-2 border-brown/30 focus-within:border-brown px-3 pt-5 pb-2';
      case 'minimal':
        return 'bg-transparent border-b border-brown/30 focus-within:border-brown px-1 pb-1';
      case 'outlined':
      default:
        return 'bg-white border border-brown/30 focus-within:border-brown rounded-lg px-3 py-2.5';
    }
  };

  // Handle focus with haptic feedback
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
    
    // Subtle haptic feedback on focus
    if (device.isMobile) {
      haptics.subtle();
    }
  };

  // Handle blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };
  
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={props.id}
          className={`
            block 
            ${isLabelFloating && showFloatingLabel ? 'text-xs text-brown transform -translate-y-0.5' : 'text-sm text-brown-dark'} 
            transition-all duration-200
            ${variant === 'filled' || variant === 'outlined' ? 'ml-0.5 mb-1' : ''}
            ${labelClassName}
          `}
        >
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div 
        className={`
          relative flex items-center
          ${getVariantClasses()}
          transition-all duration-200
          ${isFocused ? 'shadow-sm' : ''}
          ${error ? 'border-red-500 focus-within:border-red-500' : ''}
          ${inputWrapperClassName}
        `}
      >
        {/* Leading icon */}
        {icon && (
          <div 
            className={`flex-shrink-0 mr-2 text-brown ${onIconClick ? 'cursor-pointer' : ''}`}
            onClick={onIconClick}
          >
            {icon}
          </div>
        )}

        {/* Input element */}
        <input
          ref={inputRef}
          className={`
            w-full bg-transparent outline-none
            text-brown-dark placeholder-brown/50
            ${icon ? 'pl-0' : ''} 
            ${trailingIcon ? 'pr-0' : ''}
            ${variant === 'filled' && showFloatingLabel ? 'pt-3' : ''}
            ${inputClassName}
          `}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Trailing icon */}
        {trailingIcon && (
          <div 
            className={`flex-shrink-0 ml-2 text-brown ${onTrailingIconClick ? 'cursor-pointer' : ''}`}
            onClick={onTrailingIconClick}
          >
            {trailingIcon}
          </div>
        )}

        {/* Animated floating label for filled variant */}
        {label && variant === 'filled' && showFloatingLabel && (
          <motion.span
            className={`
              absolute top-2 left-3 text-xs pointer-events-none
              ${isFocused ? 'text-brown' : 'text-brown/60'}
              ${error ? 'text-red-500' : ''}
            `}
            initial={false}
            animate={{
              opacity: isLabelFloating ? 1 : 0,
              y: isLabelFloating ? 0 : 8
            }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.span>
        )}
      </div>

      {/* Error message with animation */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`mt-1 text-xs text-red-500 ${errorClassName}`}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text */}
      {helperText && !error && (
        <div className={`mt-1 text-xs text-brown/70 ${helperClassName}`}>
          {helperText}
        </div>
      )}
    </div>
  );
}

/**
 * Premium iOS/Android-like textarea with advanced animation
 */
export function MobileTextarea({
  label,
  error,
  helperText,
  icon,
  trailingIcon,
  onIconClick,
  onTrailingIconClick,
  containerClassName = '',
  labelClassName = '',
  inputWrapperClassName = '',
  inputClassName = '',
  errorClassName = '',
  helperClassName = '',
  showFloatingLabel = true,
  variant = 'outlined',
  autoExpand = false,
  maxRows = 5,
  ...props
}: TextareaInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isLabelFloating, setIsLabelFloating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const device = useDeviceDetection();

  // Determine if the label should float
  useEffect(() => {
    if (textareaRef.current) {
      setIsLabelFloating(
        isFocused || !!textareaRef.current.value || !!props.value
      );
    }
  }, [isFocused, props.value]);

  // Handle auto-expanding textarea
  useEffect(() => {
    if (autoExpand && textareaRef.current) {
      // Calculate line height based on the element's computed style
      const lineHeight = parseInt(
        window.getComputedStyle(textareaRef.current).lineHeight || '20'
      );
      
      // Reset height to auto to correctly calculate the new height
      textareaRef.current.style.height = 'auto';
      
      // Calculate new height based on scrollHeight
      const newHeight = Math.min(
        textareaRef.current.scrollHeight,
        lineHeight * maxRows
      );
      
      // Set the new height
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [props.value, autoExpand, maxRows]);

  // Variant-specific styles
  const getVariantClasses = () => {
    switch (variant) {
      case 'filled':
        return 'bg-paper rounded-t-lg border-b-2 border-brown/30 focus-within:border-brown px-3 pt-5 pb-2';
      case 'minimal':
        return 'bg-transparent border-b border-brown/30 focus-within:border-brown px-1 pb-1';
      case 'outlined':
      default:
        return 'bg-white border border-brown/30 focus-within:border-brown rounded-lg px-3 py-2.5';
    }
  };

  // Handle focus with haptic feedback
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
    
    // Subtle haptic feedback on focus
    if (device.isMobile) {
      haptics.subtle();
    }
  };

  // Handle blur
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={props.id}
          className={`
            block 
            ${isLabelFloating && showFloatingLabel ? 'text-xs text-brown transform -translate-y-0.5' : 'text-sm text-brown-dark'} 
            transition-all duration-200
            ${variant === 'filled' || variant === 'outlined' ? 'ml-0.5 mb-1' : ''}
            ${labelClassName}
          `}
        >
          {label}
        </label>
      )}

      {/* Textarea wrapper */}
      <div 
        className={`
          relative
          ${getVariantClasses()}
          transition-all duration-200
          ${isFocused ? 'shadow-sm' : ''}
          ${error ? 'border-red-500 focus-within:border-red-500' : ''}
          ${inputWrapperClassName}
        `}
      >
        {/* Icon if present */}
        {icon && (
          <div 
            className={`absolute left-3 top-3 text-brown ${onIconClick ? 'cursor-pointer' : ''}`}
            onClick={onIconClick}
          >
            {icon}
          </div>
        )}

        {/* Textarea element */}
        <textarea
          ref={textareaRef}
          className={`
            w-full bg-transparent outline-none resize-none
            text-brown-dark placeholder-brown/50
            ${icon ? 'pl-8' : ''} 
            ${trailingIcon ? 'pr-8' : ''}
            ${variant === 'filled' && showFloatingLabel ? 'pt-3' : ''}
            ${inputClassName}
          `}
          onFocus={handleFocus}
          onBlur={handleBlur}
          rows={props.rows || 3}
          style={{
            ...(autoExpand ? { overflow: 'hidden' } : {}),
          }}
          {...props}
        />

        {/* Trailing icon if present */}
        {trailingIcon && (
          <div 
            className={`absolute right-3 top-3 text-brown ${onTrailingIconClick ? 'cursor-pointer' : ''}`}
            onClick={onTrailingIconClick}
          >
            {trailingIcon}
          </div>
        )}

        {/* Animated floating label for filled variant */}
        {label && variant === 'filled' && showFloatingLabel && (
          <motion.span
            className={`
              absolute top-2 left-3 text-xs pointer-events-none
              ${isFocused ? 'text-brown' : 'text-brown/60'}
              ${error ? 'text-red-500' : ''}
            `}
            initial={false}
            animate={{
              opacity: isLabelFloating ? 1 : 0,
              y: isLabelFloating ? 0 : 8
            }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.span>
        )}
      </div>

      {/* Error message with animation */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`mt-1 text-xs text-red-500 ${errorClassName}`}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text */}
      {helperText && !error && (
        <div className={`mt-1 text-xs text-brown/70 ${helperClassName}`}>
          {helperText}
        </div>
      )}
    </div>
  );
}