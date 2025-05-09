import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { FileUpload } from '@/components/file-upload';
import { JobDescription } from '@/components/job-description';
import { KeywordAnalysis } from '@/components/keyword-analysis-new';
import { ResumePreview } from '@/components/resume-preview';
import { optimizeCV } from '@/lib/cv-analyzer';
import { useToast } from '@/hooks/use-toast';
import haptics from '@/lib/haptics';
import { Wand2, ChevronUp, ArrowRight, Upload, FileText, 
         Search, CheckSquare, AlertTriangle, X, Copy, Download, Share2 } from 'lucide-react';
import { useDeviceDetection } from '@/hooks/use-device-detection';

// Define a proper type for context actions
interface ContextAction {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

// For gesture detection and physics-based interactions
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 0.5;
const SPRING_CONFIG = { stiffness: 1000, damping: 80, mass: 1 };

export function MobileExperience() {
  // Core application state
  const [stage, setStage] = useState<'intro' | 'upload' | 'analyze' | 'optimize' | 'result'>('intro');
  const [previousStage, setPreviousStage] = useState<string | null>(null);
  const [cvId, setCvId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [gestureDirection, setGestureDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const [deviceMotion, setDeviceMotion] = useState({ beta: 0, gamma: 0 });
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  
  // UI state refs and motion values
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const progressSpring = useSpring(0, SPRING_CONFIG);
  const progressPercent = useTransform(progressSpring, [0, 100], [0, 100]);
  const device = useDeviceDetection();
  const { toast } = useToast();
  
  // Navigation states for fluid transition between screens
  const [navHistory, setNavHistory] = useState<Array<'intro' | 'upload' | 'analyze' | 'optimize' | 'result'>>(['intro']);
  const [transitionType, setTransitionType] = useState<'slide' | 'fade' | 'expand'>('fade');
  
  // Screen parallax effect based on device motion
  const parallaxX = useTransform(
    useMotionValue(deviceMotion.gamma),
    [-20, 20],
    [-15, 15]
  );
  
  const parallaxY = useTransform(
    useMotionValue(deviceMotion.beta),
    [-20, 20],
    [-10, 10]
  );
  
  // Handle device motion
  useEffect(() => {
    const handleDeviceMotion = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        setDeviceMotion({
          beta: event.beta,
          gamma: event.gamma
        });
      }
    };
    
    window.addEventListener('deviceorientation', handleDeviceMotion);
    
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceMotion);
    };
  }, []);
  
  // Track stage transitions for animations
  useEffect(() => {
    if (stage !== previousStage) {
      setPreviousStage(stage as string);
      
      // Add to navigation history
      setNavHistory(prev => {
        // Don't add duplicate entries
        if (prev[prev.length - 1] !== stage) {
          return [...prev, stage];
        }
        return prev;
      });
      
      // Appropriate haptic feedback for transitions
      if (device.isMobile) {
        haptics.pageTransition();
      }
    }
  }, [stage, previousStage, device.isMobile]);
  
  // Progress indicator animation
  useEffect(() => {
    const stageProgress = {
      'intro': 0,
      'upload': 25,
      'analyze': 50,
      'optimize': 75,
      'result': 100
    };
    
    progressSpring.set(stageProgress[stage] || 0);
  }, [stage, progressSpring]);
  
  // CV upload handler
  const handleCvUploaded = (id: number, name: string) => {
    setCvId(id);
    setFileName(name);
    
    // Provide success feedback
    setFeedbackMessage('Resume uploaded successfully! Ready to analyze.');
    toast({
      title: 'Resume Uploaded',
      description: 'Your resume is ready for analysis',
    });
    
    // Trigger haptic feedback
    if (device.isMobile) {
      haptics.success();
    }
    
    // Advance to next stage with expansion transition
    setTransitionType('expand');
    setTimeout(() => {
      setStage('analyze');
    }, 300);
  };
  
  // Analysis completion handler
  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
    
    // Provide success feedback
    setFeedbackMessage(`Identified ${result.keywords.length} keywords to optimize your resume!`);
    toast({
      title: 'Analysis Complete',
      description: `Found ${result.keywords.length} relevant keywords`,
    });
    
    // Trigger haptic feedback
    if (device.isMobile) {
      haptics.success();
    }
    
    // Advance to next stage with slide transition
    setTransitionType('slide');
    setTimeout(() => {
      setStage('optimize');
    }, 300);
  };
  
  // Handle CV optimization
  const handleOptimize = async () => {
    if (!cvId || !analysisResult) return;
    
    setIsProcessing(true);
    setIsInteractionLocked(true);
    
    try {
      // Strong haptic feedback for this important action
      if (device.isMobile) {
        haptics.heavyImpact();
      }
      
      // Use the job description ID from the analysis result
      const jobDescriptionId = analysisResult.id || 0;
      const result = await optimizeCV(cvId, jobDescriptionId);
      
      // Success state
      setOptimizationResult(result);
      setFeedbackMessage('Resume optimized for job requirements!');
      toast({
        title: 'CV Optimized',
        description: 'Your resume has been enhanced',
      });
      
      // Trigger success haptic feedback
      if (device.isMobile) {
        haptics.success();
      }
      
      // Slide to results
      setTransitionType('slide');
      setTimeout(() => {
        setStage('result');
      }, 300);
      
    } catch (error) {
      // Error handling with feedback
      setFeedbackMessage('Optimization failed. Please try again.');
      toast({
        title: 'Optimization Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      
      // Error haptic pattern
      if (device.isMobile) {
        haptics.error();
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setIsInteractionLocked(false), 500);
    }
  };
  
  // Reset to start
  const handleReset = () => {
    // Reset all state
    setCvId(null);
    setFileName(null);
    setAnalysisResult(null);
    setOptimizationResult(null);
    
    // Confirmation
    setFeedbackMessage('Ready to start a fresh optimization!');
    toast({
      title: 'Reset Complete',
      description: 'Start a new resume optimization',
    });
    
    // Use fade transition for reset
    setTransitionType('fade');
    setStage('intro');
    setNavHistory(['intro']);
    
    // Reset haptic
    if (device.isMobile) {
      haptics.detent();
    }
  };
  
  // Swipe handler to navigate between stages
  const handleDragEnd = (event: any, info: any) => {
    if (isInteractionLocked) return;
    
    const { offset, velocity } = info;
    const swipeThreshold = SWIPE_THRESHOLD;
    const velocityThreshold = SWIPE_VELOCITY;
    
    // Determine swipe direction
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      // Horizontal swipe
      if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > velocityThreshold) {
        if (offset.x > 0) {
          // Right swipe - go back
          handleNavigateBack();
          setGestureDirection('right');
        } else {
          // Left swipe - go forward if possible
          handleNavigateForward();
          setGestureDirection('left');
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(offset.y) > swipeThreshold || Math.abs(velocity.y) > velocityThreshold) {
        if (offset.y > 0) {
          setGestureDirection('down');
          // Additional down-swipe actions
        } else {
          setGestureDirection('up');
          // Additional up-swipe actions
        }
      }
    }
    
    // Reset after a brief moment
    setTimeout(() => setGestureDirection(null), 300);
  };
  
  // Navigation handlers
  const handleNavigateBack = () => {
    if (navHistory.length > 1) {
      const newHistory = [...navHistory];
      newHistory.pop(); // Remove current
      const previousStage = newHistory[newHistory.length - 1];
      
      setTransitionType('fade');
      setStage(previousStage);
      setNavHistory(newHistory);
      
      // Haptic feedback for back navigation
      if (device.isMobile) {
        haptics.tap();
      }
    }
  };
  
  const handleNavigateForward = () => {
    const stageOrder = ['intro', 'upload', 'analyze', 'optimize', 'result'];
    const currentIndex = stageOrder.indexOf(stage);
    
    // Determine if we can go forward
    const canProceed = (
      (stage === 'intro') ||
      (stage === 'upload' && cvId !== null) ||
      (stage === 'analyze' && analysisResult !== null) ||
      (stage === 'optimize' && optimizationResult !== null)
    );
    
    if (canProceed && currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1] as 'intro' | 'upload' | 'analyze' | 'optimize' | 'result';
      
      setTransitionType('slide');
      setStage(nextStage);
      
      // Success haptic for forward navigation
      if (device.isMobile) {
        haptics.detent();
      }
    } else {
      // Warning haptic if can't proceed
      if (device.isMobile) {
        haptics.warning();
      }
    }
  };
  
  // Dynamic background effect based on stage
  const getBackgroundStyle = () => {
    switch (stage) {
      case 'intro':
        return 'bg-gradient-to-br from-cream to-paper';
      case 'upload':
        return 'bg-gradient-to-br from-cream to-paper';
      case 'analyze':
        return 'bg-gradient-to-tr from-cream to-paper';
      case 'optimize':
        return 'bg-gradient-to-bl from-cream to-paper';
      case 'result':
        return 'bg-gradient-to-b from-cream to-paper';
      default:
        return 'bg-gradient-to-br from-cream to-paper';
    }
  };
  
  // Generate transition variants based on transition type
  const getTransitionVariants = () => {
    switch (transitionType) {
      case 'slide':
        return {
          initial: { x: '100%', opacity: 1 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '-100%', opacity: 0.5 },
          transition: { type: 'spring', stiffness: 300, damping: 30 }
        };
      case 'expand':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 },
          transition: { type: 'spring', stiffness: 400, damping: 30 }
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.25 }
        };
    }
  };
  
  // Context-sensitive actions for floating action button
  const getContextActions = (): ContextAction[] => {
    switch (stage) {
      case 'upload':
        return [
          {
            icon: <ArrowRight size={18} />,
            label: 'Continue',
            disabled: !cvId,
            onClick: () => cvId && setStage('analyze')
          }
        ];
      case 'analyze':
        return [
          {
            icon: <Search size={18} />,
            label: 'Analyze',
            disabled: !cvId,
            onClick: () => {/* Trigger analysis */}
          }
        ];
      case 'optimize':
        return [
          {
            icon: <Wand2 size={18} />,
            label: 'Optimize',
            disabled: !analysisResult || isProcessing,
            onClick: handleOptimize
          }
        ];
      case 'result':
        return [
          {
            icon: <Copy size={18} />,
            label: 'Copy',
            disabled: !optimizationResult,
            onClick: () => {
              if (optimizationResult) {
                navigator.clipboard.writeText(optimizationResult.optimizedContent || '');
                toast({ title: 'Copied', description: 'CV copied to clipboard' });
                haptics.success();
              }
            }
          },
          {
            icon: <Download size={18} />,
            label: 'Download',
            disabled: !optimizationResult || !cvId,
            onClick: () => {
              if (optimizationResult && cvId) {
                window.open(`/api/cv/download/${cvId}`, '_blank');
                haptics.success();
              }
            }
          },
          {
            icon: <Share2 size={18} />,
            label: 'Share',
            disabled: !optimizationResult || !navigator.share,
            onClick: () => {
              if (optimizationResult && navigator.share) {
                navigator.share({
                  title: 'My Optimized CV',
                  text: 'Check out my optimized CV',
                }).then(() => haptics.success());
              }
            }
          }
        ];
      default:
        return [];
    }
  };
  
  // Render the stage content
  const renderStageContent = () => {
    switch (stage) {
      case 'intro':
        return (
          <motion.div 
            className="flex flex-col items-center justify-center h-full px-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h1 className="font-display text-3xl mb-6 text-brown-dark">CV Optimizer</h1>
            <p className="text-brown mb-10">Optimize your resume for ATS systems with AI assistance</p>
            
            <motion.button
              className="primary-action-button py-4 px-8 rounded-full font-mono text-lg font-medium shadow-lg haptic-button"
              onClick={() => {
                haptics.impact();
                setStage('upload');
              }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
            </motion.button>
            
            <motion.div 
              className="mt-12 text-brown-dark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p className="text-sm font-medium mb-2">Swipe through steps:</p>
              <div className="flex space-x-3 justify-center">
                <div className="w-3 h-3 rounded-full bg-brown-dark"></div>
                <div className="w-3 h-3 rounded-full bg-brown/30"></div>
                <div className="w-3 h-3 rounded-full bg-brown/30"></div>
                <div className="w-3 h-3 rounded-full bg-brown/30"></div>
                <div className="w-3 h-3 rounded-full bg-brown/30"></div>
              </div>
            </motion.div>
          </motion.div>
        );
        
      case 'upload':
        return (
          <motion.div 
            className="p-5 flex flex-col h-full"
            {...getTransitionVariants()}
          >
            <FileUpload onCvUploaded={handleCvUploaded} />
          </motion.div>
        );
        
      case 'analyze':
        return (
          <motion.div 
            className="p-5 flex flex-col h-full"
            {...getTransitionVariants()}
          >
            <JobDescription cvId={cvId} onAnalysisComplete={handleAnalysisComplete} />
          </motion.div>
        );
        
      case 'optimize':
        return (
          <motion.div 
            className="p-5 flex flex-col h-full"
            {...getTransitionVariants()}
          >
            {analysisResult && (
              <div className="bg-white rounded-lg p-5 shadow-lg">
                <KeywordAnalysis 
                  analysis={analysisResult} 
                  optimization={optimizationResult}
                  showFull={true} 
                />
                
                {!optimizationResult && (
                  <motion.button
                    className="primary-action-button w-full py-4 mt-6 rounded-lg font-mono flex items-center justify-center text-lg haptic-button"
                    onClick={handleOptimize}
                    disabled={isProcessing}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-brown" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-brown-dark font-bold">Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-5 w-5 text-brown-dark" />
                        <span className="text-brown-dark font-bold">Optimize My Resume</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        );
        
      case 'result':
        return (
          <motion.div 
            className="p-5 flex flex-col h-full"
            {...getTransitionVariants()}
          >
            {optimizationResult && (
              <ResumePreview optimizedCV={optimizationResult} />
            )}
          </motion.div>
        );
        
      default:
        return null;
    }
  };
  
  // Parallax effect for device motion
  const getParallaxStyle = () => {
    if (!device.isMobile) return {};
    
    return {
      transform: `perspective(1000px) rotateX(${deviceMotion.beta/10}deg) rotateY(${deviceMotion.gamma/10}deg)`
    };
  };
  
  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Progress bar */}
      <motion.div 
        className="absolute top-0 left-0 h-1 bg-brown-dark z-50"
        style={{ width: progressPercent.get() + '%' }}
      />
      
      {/* Swipe container */}
      <motion.div
        ref={containerRef}
        className={`h-full relative ${getBackgroundStyle()}`}
        drag={!isInteractionLocked ? true : false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{
          x: dragX,
          y: dragY,
          ...getParallaxStyle()
        }}
      >
        {/* Navigation indicators and instructions */}
        <div className="absolute top-4 left-0 right-0 flex flex-col items-center z-20 px-4 gap-2">
          <div className="flex space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
            {['upload', 'analyze', 'optimize', 'result'].map((s, i) => (
              <div 
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  stage === s ? 'bg-brown-dark scale-125' : 
                  navHistory.includes(s as any) ? 'bg-brown' : 'bg-brown/30'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation hint - auto-dismissed */}
          {navHistory.length === 1 && (
            <motion.div 
              className="text-xs bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full text-brown-dark font-medium shadow-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3 }}
              // Auto-dismiss after 5 seconds
              onAnimationComplete={() => {
                setTimeout(() => {
                  // The hint will only show on first stage
                }, 5000);
              }}
            >
              Swipe left or right to navigate
            </motion.div>
          )}
        </div>
        
        {/* Back button with text */}
        {navHistory.length > 1 && (
          <motion.button
            className="absolute top-4 left-4 z-30 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md px-3 h-10"
            onClick={handleNavigateBack}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <X size={16} className="text-brown-dark mr-1" />
            <span className="text-sm text-brown-dark font-medium">Back</span>
          </motion.button>
        )}
        
        {/* Reset button */}
        {stage !== 'intro' && (
          <motion.button
            className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm shadow-md"
            onClick={handleReset}
            whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <AlertTriangle size={16} className="text-brown-dark" />
          </motion.button>
        )}
        
        {/* Animated feedback message with close button */}
        <AnimatePresence>
          {feedbackMessage && (
            <motion.div
              className="absolute top-16 left-0 right-0 z-30 flex justify-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              // Auto-dismiss after 3 seconds
              onAnimationComplete={() => {
                setTimeout(() => {
                  setFeedbackMessage(null);
                }, 3000);
              }}
            >
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 pr-8 rounded-full shadow-lg relative">
                <p className="text-sm text-brown-dark font-medium">{feedbackMessage}</p>
                <button 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-brown/10 flex items-center justify-center"
                  onClick={() => setFeedbackMessage(null)}
                >
                  <X size={12} className="text-brown" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main content */}
        <div className="h-full w-full">
          <AnimatePresence mode="wait">
            <motion.div 
              key={stage}
              className="h-full"
              exit={getTransitionVariants().exit}
            >
              {renderStageContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Contextual floating action button */}
        <AnimatePresence>
          {stage !== 'intro' && getContextActions().length > 0 && (
            <motion.div
              className="absolute bottom-6 right-6 z-30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="relative">
                {/* Main action button */}
                <motion.button
                  className="px-5 h-14 rounded-full primary-action-button shadow-lg flex items-center justify-center haptic-button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    const primaryAction = getContextActions()[0];
                    if (primaryAction.onClick) {
                      // Check if the action has a disabled property and respect it
                      const isDisabled = 'disabled' in primaryAction ? primaryAction.disabled : false;
                      
                      if (!isDisabled) {
                        haptics.impact();
                        primaryAction.onClick();
                      } else {
                        haptics.warning();
                      }
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-md font-medium text-brown-dark">{getContextActions()[0]?.label || 'Next'}</span>
                    {getContextActions()[0]?.icon || <ArrowRight size={20} className="text-brown-dark" />}
                  </div>
                </motion.button>
                
                {/* Secondary actions */}
                <AnimatePresence>
                  {getContextActions().length > 1 && (
                    <div className="absolute bottom-full mb-4 right-0">
                      {getContextActions().slice(1).map((action, index) => (
                        <motion.button
                          key={index}
                          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center mb-3 haptic-button"
                          initial={{ opacity: 0, y: 20, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.8 }}
                          transition={{ delay: index * 0.05 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            haptics.tap();
                            action.onClick();
                          }}
                        >
                          {action.icon}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Swipe gesture indicator */}
        <AnimatePresence>
          {gestureDirection && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="text-white text-9xl"
                initial={{ 
                  x: gestureDirection === 'left' ? 100 : gestureDirection === 'right' ? -100 : 0,
                  y: gestureDirection === 'up' ? 100 : gestureDirection === 'down' ? -100 : 0,
                  opacity: 0,
                  scale: 0.5
                }}
                animate={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 1
                }}
                exit={{ 
                  opacity: 0,
                  scale: 2
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {gestureDirection === 'left' && '→'}
                {gestureDirection === 'right' && '←'}
                {gestureDirection === 'up' && '↑'}
                {gestureDirection === 'down' && '↓'}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}