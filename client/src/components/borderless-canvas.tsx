import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';
import { Edit } from 'lucide-react';

interface BorderlessCanvasProps {
  children: ReactNode;
}

/**
 * A new paradigm for mobile interaction based on borderless design principles.
 * This component serves as the foundation for a truly content-first experience
 * where the interface fades away and lets users interact directly with their content.
 */
export function BorderlessCanvas({ children }: BorderlessCanvasProps) {
  const device = useDeviceDetection();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  
  // Detect and handle pinch gestures for zooming
  useEffect(() => {
    if (!device.isMobile || !canvasRef.current) return;
    
    let startDist = 0;
    let initialScale = 1;
    
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Calculate initial distance between touch points
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        startDist = Math.hypot(dx, dy);
        initialScale = scale;
        setIsPinching(true);
        haptics.subtle();
      }
    };
    
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Calculate new distance between touch points
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        
        // Calculate new scale based on the change in distance
        const newScale = initialScale * (dist / startDist);
        
        // Clamp scale to reasonable bounds
        if (newScale >= 0.5 && newScale <= 2) {
          setScale(newScale);
        }
      }
    };
    
    const onTouchEnd = () => {
      if (isPinching) {
        setIsPinching(false);
        haptics.subtle();
        
        // Animate scale back to a standard value after pinch
        if (scale < 0.8) {
          setScale(0.7);
        } else if (scale > 1.2) {
          setScale(1.3);
        } else {
          setScale(1);
        }
      }
    };
    
    // Add event listeners to the canvas element
    const element = canvasRef.current;
    element.addEventListener('touchstart', onTouchStart);
    element.addEventListener('touchmove', onTouchMove);
    element.addEventListener('touchend', onTouchEnd);
    
    // Clean up event listeners
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [device.isMobile, isPinching, scale]);
  
  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden touch-manipulation bg-white"
    >
      <motion.div
        className="w-full min-h-full"
        style={{
          scale,
          transformOrigin: 'center center'
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 300,
          mass: 0.5
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Represents an editable content block within the borderless canvas.
 * Content is directly editable in place with no visible containers.
 */
interface BorderlessContentProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  contentType?: 'text' | 'title' | 'paragraph';
  isEditing?: boolean;
  onStartEdit?: () => void;
  onFinishEdit?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}

export function BorderlessContent({
  content,
  onContentChange,
  placeholder = 'Tap to edit...',
  contentType = 'paragraph',
  isEditing = false,
  onStartEdit,
  onFinishEdit,
  actionLabel,
  onAction,
  disabled = false
}: BorderlessContentProps) {
  const [isEditingLocal, setIsEditingLocal] = useState(isEditing);
  const [localContent, setLocalContent] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const device = useDeviceDetection();
  
  // Sync with parent isEditing state if provided
  useEffect(() => {
    setIsEditingLocal(isEditing);
  }, [isEditing]);
  
  // Sync with parent content
  useEffect(() => {
    setLocalContent(content);
  }, [content]);
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditingLocal && inputRef.current) {
      inputRef.current.focus();
      
      // Show guide tooltip when first editing
      if (!content && contentType === 'paragraph') {
        setShowGuide(true);
        // Auto-hide after 3 seconds
        const timer = setTimeout(() => setShowGuide(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isEditingLocal, content, contentType]);
  
  // Handle click to start editing
  const handleStartEdit = () => {
    if (disabled) return;
    haptics.subtle();
    setIsEditingLocal(true);
    if (onStartEdit) onStartEdit();
  };
  
  // Handle blur to finish editing
  const handleBlur = () => {
    setIsEditingLocal(false);
    onContentChange(localContent);
    if (onFinishEdit) onFinishEdit();
    setShowGuide(false);
  };
  
  // Handle keyboard submit (for mobile)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (contentType !== 'paragraph') {
        e.preventDefault();
        handleBlur();
      }
    }
  };
  
  // Get appropriate styles based on content type
  const getContentStyles = () => {
    switch (contentType) {
      case 'title':
        return 'text-2xl font-semibold text-gray-900 mb-2';
      case 'paragraph':
        return 'text-base text-gray-800 mb-4 leading-relaxed';
      default:
        return 'text-base text-gray-800';
    }
  };
  
  // Handle action
  const handleAction = () => {
    if (onAction) {
      haptics.impact();
      onAction();
    }
  };
  
  return (
    <div className="relative w-full transition-colors duration-200 group">
      <div 
        className={`relative ${disabled ? 'opacity-70' : ''}`}
        onClick={!isEditingLocal ? handleStartEdit : undefined}
      >
        {isEditingLocal ? (
          <>
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full bg-transparent border-0 resize-none min-h-[24px] focus:outline-none focus:ring-0 px-0 py-1 ${getContentStyles()}`}
              style={{ 
                minHeight: contentType === 'paragraph' ? '5rem' : contentType === 'title' ? '2.5rem' : '1.5rem'
              }}
              autoComplete="off"
              autoCorrect="on"
              spellCheck="true"
            />
            
            {/* Guidance tooltip for editing */}
            <AnimatePresence>
              {showGuide && (
                <motion.div
                  className="absolute -bottom-10 left-0 right-0 flex justify-center z-10"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <div className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md">
                    {contentType === 'paragraph' ? 'Type or paste content here' : 'Enter a title'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className={`
            ${getContentStyles()} 
            ${!content ? 'text-gray-400' : ''} 
            px-0 py-1
            ${!disabled && 'hover:bg-gray-50 active:bg-gray-100 rounded-md transition-colors cursor-text'}
          `}>
            {content || placeholder}
            
            {/* Edit indicator on the right side - only shown on hover/active */}
            {!disabled && !isEditingLocal && contentType !== 'title' && (
              <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-gray-100 rounded-full p-1">
                  <Edit size={14} className="text-gray-500" />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Subtle editing indicator */}
        <AnimatePresence>
          {isEditingLocal && (
            <motion.div 
              className="absolute left-0 top-0 w-full h-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Action button - appears when content is filled and not editing */}
      {actionLabel && onAction && content && !isEditingLocal && !disabled && (
        <motion.div 
          className="mt-2 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center justify-center gap-2 w-full transition-colors"
            onClick={handleAction}
          >
            <span>{actionLabel}</span>
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                repeatType: "loop", 
                ease: "easeInOut" 
              }}
            >
              →
            </motion.div>
          </button>
        </motion.div>
      )}
    </div>
  );
}