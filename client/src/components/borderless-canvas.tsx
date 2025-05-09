import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import haptics from '@/lib/haptics';

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
}

export function BorderlessContent({
  content,
  onContentChange,
  placeholder = 'Tap to edit...',
  contentType = 'paragraph',
  isEditing = false,
  onStartEdit,
  onFinishEdit
}: BorderlessContentProps) {
  const [isEditingLocal, setIsEditingLocal] = useState(isEditing);
  const [localContent, setLocalContent] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  
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
    }
  }, [isEditingLocal]);
  
  // Handle click to start editing
  const handleStartEdit = () => {
    haptics.subtle();
    setIsEditingLocal(true);
    if (onStartEdit) onStartEdit();
  };
  
  // Handle blur to finish editing
  const handleBlur = () => {
    setIsEditingLocal(false);
    onContentChange(localContent);
    if (onFinishEdit) onFinishEdit();
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
  
  return (
    <div 
      className="relative w-full transition-colors duration-200"
      onClick={!isEditingLocal ? handleStartEdit : undefined}
    >
      {isEditingLocal ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full bg-transparent border-0 resize-none min-h-[24px] focus:outline-none focus:ring-0 p-0 ${getContentStyles()}`}
          style={{ 
            minHeight: contentType === 'paragraph' ? '5rem' : contentType === 'title' ? '2.5rem' : '1.5rem'
          }}
        />
      ) : (
        <div className={`${getContentStyles()} ${!content ? 'text-gray-400' : ''}`}>
          {content || placeholder}
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
  );
}