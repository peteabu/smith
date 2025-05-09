import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import haptics from '@/lib/haptics';

interface AnalysisStep {
  step: string;
  status: 'completed' | 'in-progress' | 'pending';
  result?: string;
  sources?: string[];
}

interface FloatingReasoningTimelineProps {
  steps: AnalysisStep[];
  isAnalyzing: boolean;
}

export function FloatingReasoningTimeline({ steps, isAnalyzing }: FloatingReasoningTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lastActiveStepIndex, setLastActiveStepIndex] = useState(-1);

  // Track the steps that are in progress or completed
  useEffect(() => {
    if (steps.length === 0) return;

    const inProgressIndex = steps.findIndex(step => step.status === 'in-progress');
    const completedCount = steps.filter(step => step.status === 'completed').length;
    
    // If there's a step in progress, focus on it
    if (inProgressIndex >= 0) {
      setCurrentStepIndex(inProgressIndex);
      setLastActiveStepIndex(inProgressIndex);
    } 
    // Otherwise focus on the last completed step
    else if (completedCount > 0 && completedCount > lastActiveStepIndex + 1) {
      setCurrentStepIndex(completedCount - 1);
      setLastActiveStepIndex(completedCount - 1);
    }
  }, [steps, lastActiveStepIndex]);

  // Auto-expand when analyzing starts
  useEffect(() => {
    if (isAnalyzing && steps.length > 0) {
      setExpanded(true);
      haptics.subtle();
    }
  }, [isAnalyzing, steps.length]);

  // Nothing to show if no steps
  if (steps.length === 0) return null;

  // Handle toggle expansion
  const toggleExpanded = () => {
    setExpanded(!expanded);
    haptics.subtle();
  };

  // Get current step for collapsed view
  const currentStep = steps[currentStepIndex] || steps[steps.length - 1];

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[90%] max-w-[300px]">
      <motion.div 
        className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          height: expanded ? 'auto' : 'auto',
        }}
        transition={{ 
          type: "spring", 
          damping: 20, 
          stiffness: 300 
        }}
      >
        {/* Header: Always visible */}
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer"
          onClick={toggleExpanded}
        >
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-full p-1">
              {isAnalyzing ? (
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Analysis Progress</h3>
              <p className="text-xs text-gray-500">
                {isAnalyzing ? 'Processing...' : 'Complete'}
                {' - '}
                {steps.filter(s => s.status === 'completed').length}/{steps.length} steps
              </p>
            </div>
          </div>
          <button onClick={toggleExpanded} className="text-gray-400 hover:text-gray-500">
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>

        {/* Current step (when collapsed) */}
        {!expanded && currentStep && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1">
              {currentStep.status === 'completed' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : currentStep.status === 'in-progress' ? (
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">{currentStep.step}</span>
            </div>
            {currentStep.result && (
              <div className="text-xs text-gray-600 ml-6 line-clamp-2">
                {currentStep.result}
              </div>
            )}
          </div>
        )}

        {/* Timeline view (when expanded) */}
        <AnimatePresence>
          {expanded && (
            <motion.div 
              className="overflow-y-auto"
              style={{ maxHeight: '50vh' }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="p-3 space-y-3">
                {steps.map((step, index) => (
                  <motion.div 
                    key={index} 
                    className="relative"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Timeline connector */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                    )}
                    
                    <div className="flex gap-3 relative z-10">
                      <div className={`rounded-full p-1 mt-0.5 ${
                        step.status === 'completed' 
                          ? 'bg-green-100' 
                          : step.status === 'in-progress' 
                            ? 'bg-blue-100' 
                            : 'bg-gray-100'
                      }`}>
                        {step.status === 'completed' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : step.status === 'in-progress' ? (
                          <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Clock className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-medium ${
                            step.status === 'completed' 
                              ? 'text-gray-700' 
                              : step.status === 'in-progress' 
                                ? 'text-blue-700' 
                                : 'text-gray-400'
                          }`}>
                            {step.step}
                          </h4>
                          {step.sources && step.sources.length > 0 && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">
                              {step.sources.length} sources
                            </span>
                          )}
                        </div>
                        
                        {step.result && (step.status === 'completed' || step.status === 'in-progress') && (
                          <div className="mt-1 text-[11px] text-gray-600 line-clamp-3 hover:line-clamp-none">
                            {step.result}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close button */}
        <div className="p-2 border-t border-gray-100 text-center">
          <button 
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={() => {
              haptics.subtle();
              setExpanded(false);
            }}
          >
            {expanded ? 'Minimize' : 'Tap to expand'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}