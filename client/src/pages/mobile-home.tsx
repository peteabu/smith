import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload } from '@/components/file-upload';
import { JobDescription } from '@/components/job-description';
import { KeywordAnalysis } from '@/components/keyword-analysis-new';
import { OptimizeButton } from '@/components/optimize-button';
import { ResumePreview } from '@/components/resume-preview';
import { optimizeCV } from '@/lib/cv-analyzer';
import { NotificationToast } from '@/components/notification-toast';
import { KeywordAnalysisResult, CvOptimizationResult } from '@/lib/cv-analyzer';
import { useToast } from '@/hooks/use-toast';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { PageTransition } from '@/components/page-transition';
import { TouchButton } from '@/components/mobile-optimizer';
import { FloatingActionButton } from '@/components/floating-action-button';
import { Wand2, ChevronUp, RefreshCcw, Copy, Download, Share2 } from 'lucide-react';
import haptics from '@/lib/haptics';

export function MobileHome() {
  const [cvId, setCvId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(null);
  const [optimizedCV, setOptimizedCV] = useState<CvOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'analyze' | 'optimize' | 'result'>('upload');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const { toast } = useToast();
  const device = useDeviceDetection();
  
  // Handle CV upload completion
  const handleCvUploaded = (id: number, name: string) => {
    setCvId(id);
    setFileName(name);
    setActiveStep('analyze');
    
    // Add haptic feedback for step completion
    if (device.isMobile) {
      haptics.success();
    }
    
    // Scroll to analyze section with animation
    setTimeout(() => {
      const analyzeSection = document.getElementById('analyze-section');
      if (analyzeSection) {
        analyzeSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };
  
  // Handle analysis completion
  const handleAnalysisComplete = (result: KeywordAnalysisResult) => {
    setAnalysisResult(result);
    setActiveStep('optimize');
    
    // Add haptic feedback for step completion
    if (device.isMobile) {
      haptics.success();
    }
    
    // Scroll to optimize section with animation
    setTimeout(() => {
      document.getElementById('optimize-section')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
  
  // Handle CV optimization
  const handleOptimize = async () => {
    if (!cvId || !analysisResult) return;
    
    setIsOptimizing(true);
    
    try {
      // Add intense haptic feedback for optimization start
      if (device.isMobile) {
        haptics.heavyImpact();
      }
      
      // Use the job description ID from the analysis result
      const jobDescriptionId = analysisResult.id || 0;
      const result = await optimizeCV(cvId, jobDescriptionId);
      setOptimizedCV(result);
      setActiveStep('result');
      
      toast({
        title: 'Resume Optimized',
        description: 'Your resume has been optimized successfully.',
      });
      
      // Add success haptic feedback
      if (device.isMobile) {
        haptics.success();
      }
      
      // Scroll to results with animation
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 200);
      
    } catch (error) {
      toast({
        title: 'Optimization Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      
      // Add error haptic feedback
      if (device.isMobile) {
        haptics.error();
      }
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // Refresh all the data
  const handleRefresh = async () => {
    setCvId(null);
    setFileName(null);
    setAnalysisResult(null);
    setOptimizedCV(null);
    setActiveStep('upload');
    
    toast({
      title: 'Reset Complete',
      description: 'Start a new resume optimization',
    });
    
    // Scroll to top with animation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    return Promise.resolve();
  };
  
  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    haptics.tap();
  };
  
  // Get numeric scroll position for window scrollTo
  const getScrollTopPosition = () => {
    return 0;
  };
  
  // Create menu items for FAB
  const menuItems = [
    {
      icon: <RefreshCcw size={18} />,
      label: 'Reset',
      onClick: handleRefresh
    },
    {
      icon: <Copy size={18} />,
      label: 'Copy',
      onClick: () => {
        if (optimizedCV) {
          navigator.clipboard.writeText(optimizedCV.optimizedContent || '');
          toast({
            title: 'Copied',
            description: 'Optimized resume copied to clipboard',
          });
          haptics.success();
        }
      }
    },
    {
      icon: <Download size={18} />,
      label: 'Download',
      onClick: () => {
        if (optimizedCV && cvId) {
          window.open(`/api/cv/download/${cvId}`, '_blank');
          haptics.success();
        }
      }
    },
    {
      icon: <Share2 size={18} />,
      label: 'Share',
      onClick: () => {
        if (optimizedCV && navigator.share) {
          navigator.share({
            title: 'My Optimized CV',
            text: 'Check out my optimized CV',
          }).then(() => {
            haptics.success();
          }).catch((error) => {
            console.error('Error sharing:', error);
          });
        } else {
          toast({
            title: 'Sharing not supported',
            description: 'Your browser does not support sharing',
          });
        }
      }
    }
  ];
  
  return (
    <PullToRefresh onRefresh={handleRefresh} className="bg-cream min-h-screen">
      <PageTransition>
        <div className="flex flex-col min-h-screen px-5 py-6">
          {/* Header */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-2xl mb-2 text-brown-dark text-center">Mimic</h1>
            <p className="text-brown text-center text-sm">Optimize your resume for ATS systems</p>
          </motion.div>
          
          {/* Upload Section */}
          <motion.section 
            id="upload-section"
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <FileUpload onCvUploaded={handleCvUploaded} />
          </motion.section>
          
          {/* Analyze Section - Only visible after CV upload */}
          <AnimatePresence>
            {cvId !== null && (
              <motion.section 
                id="analyze-section"
                className="mb-6"
                initial={{ opacity: 0, height: 0, y: 20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              >
                <JobDescription cvId={cvId} onAnalysisComplete={handleAnalysisComplete} />
              </motion.section>
            )}
          </AnimatePresence>
          
          {/* Optimize Section - Only visible after analysis */}
          <AnimatePresence>
            {analysisResult !== null && (
              <motion.section 
                id="optimize-section"
                className="mb-6"
                initial={{ opacity: 0, height: 0, y: 20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="paper-shadow p-5 rounded-lg bg-white">
                  <KeywordAnalysis 
                    analysis={analysisResult} 
                    optimization={optimizedCV}
                    showFull={activeStep === 'optimize'} 
                  />
                </div>
                
                {/* Only show optimize button if we haven't optimized yet */}
                {!optimizedCV && (
                  <motion.div 
                    className="mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <OptimizeButton 
                      disabled={!analysisResult || isOptimizing} 
                      isProcessing={isOptimizing}
                      onClick={handleOptimize}
                    />
                  </motion.div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
          
          {/* Result Section - Only visible after optimization */}
          <AnimatePresence>
            {optimizedCV !== null && (
              <motion.section 
                id="result-section"
                initial={{ opacity: 0, height: 0, y: 20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ResumePreview optimizedCV={optimizedCV} />
              </motion.section>
            )}
          </AnimatePresence>
          
          {/* Notifications */}
          <NotificationToast />
          
          {/* Scroll to top button */}
          <AnimatePresence>
            {showScrollToTop && (
              <motion.button
                className="fixed bottom-20 right-5 w-10 h-10 rounded-full bg-brown-dark text-white flex items-center justify-center shadow-lg z-40"
                onClick={scrollToTop}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronUp size={20} />
              </motion.button>
            )}
          </AnimatePresence>
          
          {/* Floating Action Button with menu */}
          {activeStep === 'result' && (
            <FloatingActionButton
              icon={<Wand2 size={24} />}
              position="bottom-right"
              color="primary"
              hasMenu={true}
              menuItems={menuItems}
            />
          )}
        </div>
      </PageTransition>
    </PullToRefresh>
  );
}