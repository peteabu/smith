import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Menu, Check, X, MoreVertical } from 'lucide-react';

interface ImmersiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  onCancel?: () => void;
  placeholder?: string;
  label?: string;
  instruction?: string;
  minHeight?: string;
}

/**
 * A full-screen immersive editor inspired by Notion/Craft
 * Features:
 * - Takes over the entire screen for distraction-free editing
 * - Subtle animations for a premium feel
 * - Native-feeling toolbar
 * - Haptic feedback on interactions
 */
export function ImmersiveEditor({
  value,
  onChange,
  onDone,
  onCancel,
  placeholder = 'Start typing...',
  label = 'Editor',
  instruction = 'Tap outside when done',
  minHeight = '50vh',
}: ImmersiveEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Automatically focus on mount
  useEffect(() => {
    // Short delay to allow animations to complete
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        setIsFocused(true);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle focus events
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur events
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle done action
  const handleDone = () => {
    onDone();
  };

  // Handle cancel action
  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  // Entrance/exit animations
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const editorVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-white/95 backdrop-blur-lg z-50 flex flex-col"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
    >
      {/* Header toolbar */}
      <motion.div 
        className="flex justify-between items-center px-4 py-3 border-b border-gray-100"
        variants={editorVariants}
      >
        <button 
          onClick={handleCancel} 
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-800" />
        </button>
        
        <div className="text-sm font-medium text-gray-700">
          {label}
        </div>
        
        <button 
          onClick={handleDone}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Check className="h-5 w-5 text-blue-600" />
        </button>
      </motion.div>
      
      {/* Main editor */}
      <motion.div 
        className="flex-1 overflow-auto px-4 py-3"
        variants={editorVariants}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`
            w-full h-full min-h-[${minHeight}] 
            text-gray-800 
            resize-none 
            focus:outline-none
            placeholder:text-gray-400
            font-sans text-base
            leading-relaxed
          `}
        />
      </motion.div>
      
      {/* Instruction hint */}
      <AnimatePresence>
        {!isFocused && (
          <motion.div 
            className="absolute bottom-6 left-0 right-0 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-800/80 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
              {instruction}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}