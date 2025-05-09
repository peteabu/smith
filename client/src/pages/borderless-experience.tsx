import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BorderlessCanvas, BorderlessContent } from '@/components/borderless-canvas';
import { Search, Check, Plus, ChevronDown, ChevronRight, Edit, ArrowRight, Clock, PlusCircle, Download } from 'lucide-react';
import haptics from '@/lib/haptics';
import { analyzeJobDescription } from '@/lib/cv-analyzer';
import { useToast } from '@/hooks/use-toast';
import { KeywordAnalysisResult } from '@/lib/cv-analyzer';
import { FloatingActionButton } from '@/components/floating-action-button';
import { FloatingReasoningTimeline } from '@/components/floating-reasoning-timeline';
import { io, Socket } from 'socket.io-client';

/**
 * A completely reimagined mobile experience based on borderless design principles.
 * This is not a traditional app with forms and inputs, but a fluid canvas
 * where content is directly manipulated.
 */
interface AnalysisStep {
  step: string;
  status: 'completed' | 'in-progress' | 'pending';
  result?: string;
  sources?: string[];
}

interface AnalysisProgress {
  analysisId: string;
  step: AnalysisStep;
}

export function BorderlessExperience() {
  // App state
  const [activeSection, setActiveSection] = useState<'job' | 'resume' | 'analysis' | 'result'>('job');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Socket reference for real-time updates
  const socketRef = useRef<Socket | null>(null);
  
  // UI state
  const [showIntroGuide, setShowIntroGuide] = useState(true);
  const [didFirstEdit, setDidFirstEdit] = useState(false);
  
  // Setup socket connection for real-time analysis progress
  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io();
    
    // Listen for analysis progress updates
    socketRef.current.on('analysis-progress', (data: AnalysisProgress) => {
      // Only update if this is for our current analysis
      if (currentAnalysisId && data.analysisId === currentAnalysisId) {
        setAnalysisSteps(prevSteps => {
          const stepIndex = prevSteps.findIndex(s => s.step === data.step.step);
          if (stepIndex >= 0) {
            // Update existing step
            const updatedSteps = [...prevSteps];
            updatedSteps[stepIndex] = data.step;
            return updatedSteps;
          } else {
            // Add new step
            return [...prevSteps, data.step];
          }
        });
      }
    });
    
    // Cleanup socket on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentAnalysisId]);
  
  // Show first-time user guide
  useEffect(() => {
    // Auto-hide the intro guide after 5 seconds
    if (showIntroGuide) {
      const timer = setTimeout(() => {
        setShowIntroGuide(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showIntroGuide]);

  // Handle section change with guided experience
  const handleSectionChange = (section: 'job' | 'resume' | 'analysis' | 'result') => {
    // PROPER STEP-BY-STEP FLOW:
    // Job (enter job description) -> Analyze -> Analysis (view results) -> Resume (enter resume) -> Optimize -> Result

    // Prevent skipping steps with clear guidance
    if (section === 'analysis' && !analysisResult) {
      // Can't go to analysis without analyzing the job description first
      // Instead, guide them to complete the job description
      if (jobDescription.length < 50) {
        toast({
          title: "Complete the job description",
          description: "Enter a job description and tap 'Analyze' to continue",
          duration: 3000
        });
        haptics.warning();
        // Force them to job section to complete this step
        setActiveSection('job');
      } else {
        // They have a job description but haven't analyzed it
        // Keep them on job section but highlight the analyze button
        toast({
          title: "Tap 'Analyze'",
          description: "Analyze the job description to continue to the next step",
          duration: 3000
        });
        setActiveSection('job');
        // Add visual highlight to the analyze button
        const analyzeButton = document.querySelector('.analyze-button');
        if (analyzeButton) {
          analyzeButton.classList.add('animate-pulse');
          setTimeout(() => {
            analyzeButton.classList.remove('animate-pulse');
          }, 2000);
        }
      }
      return;
    } 
    else if (section === 'resume' && !jobDescription) {
      // Can't go to resume without a job description
      toast({
        title: "First step: Job Description",
        description: "Enter a job description before continuing",
        duration: 3000
      });
      haptics.warning();
      setActiveSection('job');
      return;
    } 
    else if (section === 'resume' && !analysisResult) {
      // Can't go to resume without analyzing the job
      toast({
        title: "Analyze job first",
        description: "Please analyze the job description before continuing",
        duration: 3000
      });
      haptics.warning();
      setActiveSection('job');
      return;
    } 
    else if (section === 'result' && !optimizationResult) {
      // Can't go to results without optimizing
      if (!resumeText) {
        // If they don't have resume text, send them to resume section
        toast({
          title: "Enter your resume",
          description: "Please enter your resume text before optimizing",
          duration: 3000
        });
        haptics.warning();
        setActiveSection('resume');
      } else if (!analysisResult) {
        // If they don't have analysis, send them back to start
        toast({
          title: "Complete previous steps",
          description: "Please analyze the job description first",
          duration: 3000
        });
        haptics.warning();
        setActiveSection('job');
      } else {
        // They have resume and analysis but haven't optimized
        toast({
          title: "Optimize your resume",
          description: "Tap 'Optimize Resume' to see results",
          duration: 3000
        });
        haptics.warning();
        setActiveSection('resume');
        
        // Add visual highlight to the optimize button
        setTimeout(() => {
          const optimizeButton = document.querySelector('.optimize-button');
          if (optimizeButton) {
            optimizeButton.classList.add('animate-pulse');
            setTimeout(() => {
              optimizeButton.classList.remove('animate-pulse');
            }, 2000);
          }
        }, 500); // Short delay to ensure the button exists after section change
      }
      return;
    }
    
    // If we got here, the navigation is valid
    haptics.impact();
    
    // Provide helpful contextual guidance
    if (section === 'resume' && !resumeText && jobDescription && analysisResult) {
      toast({
        title: "Ready for your resume",
        description: "Enter your resume text to continue",
        duration: 3000
      });
    }
    
    // Proceed with navigation
    setActiveSection(section);
  };
  
  // Handle job description change
  const handleJobDescriptionChange = (text: string) => {
    const wasEmpty = !jobDescription;
    setJobDescription(text);
    
    // Track first edit for improved user guidance
    if (wasEmpty && text && !didFirstEdit) {
      setDidFirstEdit(true);
    }
  };
  
  // Handle when job description editing starts
  const handleJobDescriptionEditStart = () => {
    // Dismiss intro guide when editing starts
    setShowIntroGuide(false);
  };
  
  // Handle when job description editing finishes
  const handleJobDescriptionEditFinish = () => {
    // If job description has reasonable content, suggest next steps
    if (jobDescription.length > 100) {
      toast({
        title: "Job description added",
        description: "Tap 'Analyze' when ready to extract keywords"
      });
    }
  };
  
  // Handle resume text change
  const handleResumeTextChange = (text: string) => {
    setResumeText(text);
  };
  
  // Handle resume optimization
  const handleOptimizeResume = async () => {
    if (!resumeText || !analysisResult || !analysisResult.id) {
      toast({
        title: "Missing information",
        description: "Please ensure you have both resume text and job analysis"
      });
      haptics.warning();
      return;
    }
    
    // Set optimizing state to show loading UI
    setIsOptimizing(true);
    
    // Add feedback for user
    toast({
      title: "Starting optimization",
      description: "Optimizing your resume for the job..."
    });
    haptics.impact();
    
    try {
      // Create a temporary CV document with the resume text
      const cvResponse = await fetch('/api/cv/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: 'resume.txt',
          fileType: 'text/plain',
          extractedText: resumeText
        }),
      });
      
      if (!cvResponse.ok) {
        throw new Error('Failed to upload resume text');
      }
      
      const cvData = await cvResponse.json();
      const cvId = cvData.id;
      
      // Use the CV ID and job description ID to optimize
      const optimizeResponse = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvId,
          jobDescriptionId: analysisResult.id
        }),
      });
      
      if (!optimizeResponse.ok) {
        throw new Error('Failed to optimize resume');
      }
      
      const optimizedResult = await optimizeResponse.json();
      
      // Success notification
      toast({
        title: "Resume Optimized",
        description: `Match rate: ${optimizedResult.matchRate}%`,
        duration: 5000
      });
      haptics.success();
      
      // Set the optimization result in state
      setOptimizationResult(optimizedResult);
      
      // IMPORTANT: Force navigate to result section to show the optimized resume
      // This bypasses the handleSectionChange function which might block navigation
      setActiveSection('result');
      
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      haptics.error();
    } finally {
      // Reset optimizing state
      setIsOptimizing(false);
    }
  };
  
  // Handle analysis with improved feedback and socket integration
  const handleAnalyze = async () => {
    if (jobDescription.length < 50) {
      toast({
        title: "Job description too short",
        description: "Please enter a more detailed job description"
      });
      haptics.warning();
      return;
    }
    
    if (isAnalyzing) return;
    
    // Reset analysis steps and set analyzing state
    setAnalysisSteps([]);
    setCurrentAnalysisId(null);
    setIsAnalyzing(true);
    haptics.impact();
    
    // Provide feedback that analysis is starting
    toast({
      title: "Starting analysis",
      description: "This will take a few moments..."
    });
    
    try {
      // Generate a unique ID for this analysis session
      const analysisId = `analysis-${Date.now()}`;
      setCurrentAnalysisId(analysisId);
      
      // Initialize socket for tracking progress
      if (socketRef.current) {
        socketRef.current.emit('start-analysis', { 
          analysisId, 
          jobDescription 
        });
      }
      
      // Perform the analysis
      const result = await analyzeJobDescription(jobDescription);
      
      // Save the analysis result
      setAnalysisResult(result);
      
      // Show success feedback
      const hasWebSearch = !!(
        result.webSearchResults?.role?.length || 
        result.webSearchResults?.industry?.length || 
        result.webSearchResults?.recruitment?.length || 
        result.webSearchResults?.ats?.length
      );
      
      toast({
        title: "Analysis Complete",
        description: hasWebSearch 
          ? `Identified ${result.keywords.length} keywords with web-enhanced research.` 
          : `Identified ${result.keywords.length} keywords for your resume.`,
        duration: 5000, // Show longer
      });
      
      // If we already have analysis steps from the socket, use those
      if (result.analysisSteps && result.analysisSteps.length > 0) {
        setAnalysisSteps(result.analysisSteps);
      }
      
      // Provide success haptic feedback
      haptics.success();
      
      // IMPORTANT: Force navigate to analysis view, bypassing the handleSectionChange validation
      setActiveSection('analysis');
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze job description",
        variant: "destructive"
      });
      
      // Provide error haptic feedback
      haptics.error();
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 w-full h-full bg-gray-50 overflow-hidden">
      {/* Floating reasoning timeline - shown during analysis */}
      {(isAnalyzing || analysisSteps.length > 0) && (
        <FloatingReasoningTimeline 
          steps={analysisSteps} 
          isAnalyzing={isAnalyzing}
        />
      )}
      
      <BorderlessCanvas>
        <div className="px-5 pt-12 pb-24 min-h-screen">
          {/* Top navigation */}
          <div className="flex items-center mb-8 space-x-4 overflow-x-auto no-scrollbar">
            <motion.button
              className={`px-4 py-2 rounded-full text-sm ${activeSection === 'job' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSectionChange('job')}
            >
              Job
            </motion.button>
            <motion.button
              className={`px-4 py-2 rounded-full text-sm ${activeSection === 'resume' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSectionChange('resume')}
            >
              Resume
            </motion.button>
            <motion.button
              className={`px-4 py-2 rounded-full text-sm ${activeSection === 'analysis' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSectionChange('analysis')}
            >
              Analysis
            </motion.button>
            <motion.button
              className={`px-4 py-2 rounded-full text-sm ${activeSection === 'result' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSectionChange('result')}
            >
              Result
            </motion.button>
          </div>
          
          {/* Main content area */}
          <AnimatePresence mode="wait">
            {activeSection === 'job' && (
              <motion.div
                key="job"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="pb-32" // Added padding to prevent content from being hidden behind sticky button
              >
                {/* Intro guide - only shown initially */}
                <AnimatePresence>
                  {showIntroGuide && (
                    <motion.div
                      className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h3 className="text-blue-700 text-sm font-medium mb-2">How to use this interface</h3>
                      <ul className="text-xs text-blue-600 space-y-1.5">
                        <li className="flex items-start">
                          <span className="bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] mr-1.5 mt-0.5">1</span>
                          <span>Tap on the job description area to start editing</span>
                        </li>
                        <li className="flex items-start">
                          <span className="bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] mr-1.5 mt-0.5">2</span>
                          <span>Paste or type the job description content</span>
                        </li>
                        <li className="flex items-start">
                          <span className="bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] mr-1.5 mt-0.5">3</span>
                          <span>Tap "Analyze" when ready to extract keywords</span>
                        </li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                  Job Description
                </h1>
                
                <div className="mt-3 mb-4">
                  <BorderlessContent
                    content={jobDescription}
                    onContentChange={handleJobDescriptionChange}
                    onStartEdit={handleJobDescriptionEditStart}
                    onFinishEdit={handleJobDescriptionEditFinish}
                    contentType="paragraph"
                    placeholder="Tap to enter or paste the job description..."
                  />
                </div>
                
                {/* Sticky action bar - ALWAYS VISIBLE */}
                {!isAnalyzing && jobDescription.length >= 50 && (
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                    <button
                      className="analyze-button w-full bg-blue-600 text-white py-4 px-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
                      onClick={handleAnalyze}
                    >
                      <span>Analyze Job Description</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
                
                {/* Loading indicator with detailed step progress */}
                {isAnalyzing && (
                  <motion.div 
                    className="flex flex-col items-center justify-center mt-6 py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm text-gray-700 mb-2">Analyzing your job description...</p>
                    
                    {/* Progress bar */}
                    {analysisSteps.length > 0 && (
                      <div className="w-full max-w-md mb-3">
                        <div className="relative h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-500 ease-in-out"
                            style={{ 
                              width: `${Math.floor(
                                (analysisSteps.filter(step => step.status === 'completed').length + 
                                (analysisSteps.filter(step => step.status === 'in-progress').length * 0.5)) / 
                                analysisSteps.length * 100
                              )}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Analysis steps */}
                    <div className="w-full max-w-md space-y-2.5 border border-blue-100 rounded-lg p-3 bg-blue-50 max-h-[60vh] overflow-y-auto">
                      {analysisSteps.map((step, index) => (
                        <div key={index} className="flex flex-col gap-1">
                          <div className="flex gap-2 items-center text-xs py-1">
                            {step.status === 'completed' ? (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : step.status === 'in-progress' ? (
                              <svg className="animate-spin h-4 w-4 text-blue-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span className={`${step.status === 'completed' ? 'font-medium text-gray-700' : step.status === 'in-progress' ? 'font-medium text-blue-700' : 'text-gray-400'}`}>
                              {step.step}
                            </span>
                            {step.sources && step.sources.length > 0 && (
                              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                {step.sources.length} sources
                              </span>
                            )}
                          </div>
                          
                          {/* Show detailed reasoning for completed steps */}
                          {step.status === 'completed' && step.result && (
                            <div className="ml-6 mt-1 text-xs bg-white rounded p-2 border border-gray-100 text-gray-700 max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                              {step.result}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Fallback when no steps are available yet */}
                      {analysisSteps.length === 0 && (
                        <p className="text-xs text-blue-600">Initializing analysis...</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
            
            {activeSection === 'resume' && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="pb-32" // Added padding to prevent content from being hidden behind sticky button
              >
                {/* Resume stage guide */}
                {!resumeText && (
                  <motion.div
                    className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-blue-700 text-sm font-medium mb-2">Resume Optimization</h3>
                    <p className="text-xs text-blue-600 mb-1">
                      Paste your resume to optimize it based on the job description keywords.
                    </p>
                  </motion.div>
                )}
                
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                  Your Resume
                </h1>
                
                <div className="mt-3 mb-4">
                  <BorderlessContent
                    content={resumeText}
                    onContentChange={handleResumeTextChange}
                    contentType="paragraph"
                    placeholder="Tap to enter or paste your resume..."
                  />
                </div>
                
                {/* Sticky action bar for resume section - ALWAYS VISIBLE */}
                {resumeText && analysisResult && (
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                    <button
                      className="optimize-button w-full bg-blue-600 text-white py-4 px-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
                      onClick={handleOptimizeResume}
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Optimizing...</span>
                        </>
                      ) : (
                        <>
                          <Edit className="h-5 w-5" />
                          <span>Optimize Resume</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                <div className="flex justify-center my-6">
                  <motion.label
                    className="flex items-center justify-center gap-2 bg-white shadow-sm border border-gray-200 text-gray-800 px-6 py-3 rounded-full cursor-pointer"
                    whileTap={{ scale: 0.95 }}
                    htmlFor="resume-file-upload"
                  >
                    <input 
                      type="file" 
                      id="resume-file-upload" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.txt" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        haptics.impact();
                        toast({
                          title: "File selected",
                          description: "Reading resume content..."
                        });
                        
                        try {
                          // Use existing API to extract text
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            const base64Content = event.target?.result?.toString().split(',')[1];
                            if (!base64Content) return;
                            
                            const response = await fetch('/api/cv/preview', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                fileContent: base64Content,
                                fileType: file.type
                              })
                            });
                            
                            if (!response.ok) {
                              throw new Error('Failed to extract text from file');
                            }
                            
                            const data = await response.json();
                            
                            if (data.extractedText) {
                              setResumeText(data.extractedText);
                              toast({
                                title: "Resume Imported",
                                description: `Successfully read '${file.name}'`
                              });
                              haptics.success();
                            } else {
                              throw new Error('Could not extract text from file');
                            }
                          };
                          
                          reader.readAsDataURL(file);
                        } catch (error) {
                          toast({
                            title: "Import Failed",
                            description: error instanceof Error ? error.message : "Failed to read resume file",
                            variant: "destructive"
                          });
                          haptics.error();
                        }
                      }}
                    />
                    <Plus className="h-5 w-5" />
                    <span>Upload Resume</span>
                  </motion.label>
                </div>
                
                {/* Keywords reminder */}
                {analysisResult && (
                  <motion.div
                    className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-amber-700 text-sm font-medium mb-2">Keywords to Include</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.keywords.slice(0, 8).map((keyword, i) => (
                        <div 
                          key={i} 
                          className="bg-amber-100 px-2 py-0.5 rounded-md text-xs text-amber-800"
                        >
                          {keyword}
                        </div>
                      ))}
                      {analysisResult.keywords.length > 8 && (
                        <div className="text-xs text-amber-600">
                          +{analysisResult.keywords.length - 8} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
            
            {activeSection === 'analysis' && analysisResult && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 pb-32" // Added padding to prevent content from being hidden
              >
                {/* Analysis success message */}
                <motion.div
                  className="bg-green-50 border border-green-100 rounded-xl p-4 mb-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-green-700 text-sm font-medium mb-1">Analysis Complete</h3>
                      <p className="text-xs text-green-600">
                        We've identified {analysisResult.keywords.length} keywords that will help optimize your resume.
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                  Analysis Results
                </h1>
                
                {/* Keywords card with improved interaction */}
                <motion.div 
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-100 rounded-full p-1">
                          <Search className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="font-medium text-gray-900">Key Skills</h3>
                      </div>
                      <span className="text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {analysisResult.keywords.length}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-1">
                      {analysisResult.keywords.map((keyword, i) => (
                        <motion.div 
                          key={i} 
                          className="bg-blue-50 px-3 py-1.5 rounded-full text-sm text-blue-700 border border-blue-100"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + (i * 0.01) }}
                        >
                          {keyword}
                        </motion.div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                      Include these keywords in your resume to increase ATS matching score
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
                    <span>Based on the job description analysis</span>
                    <button 
                      className="text-blue-600"
                      onClick={() => {
                        // Copy keywords to clipboard
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(analysisResult.keywords.join(', '));
                          toast({
                            title: "Keywords copied",
                            description: "All keywords copied to clipboard"
                          });
                          haptics.impact();
                        }
                      }}
                    >
                      Copy All
                    </button>
                  </div>
                </motion.div>
                
                {/* Role insights collapsible card */}
                {analysisResult.roleResearch && (
                  <motion.div
                    className="bg-white rounded-xl overflow-hidden shadow-sm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="bg-purple-100 rounded-full p-1">
                            <Search className="h-4 w-4 text-purple-600" />
                          </div>
                          <h3 className="font-medium text-gray-900">Role Insights</h3>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {analysisResult.roleResearch}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Industry insights card */}
                {analysisResult.industryKeywords && (
                  <motion.div
                    className="bg-white rounded-xl overflow-hidden shadow-sm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-100 rounded-full p-1">
                            <Search className="h-4 w-4 text-amber-600" />
                          </div>
                          <h3 className="font-medium text-gray-900">Industry Context</h3>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Sticky action bar for analysis section - ALWAYS VISIBLE */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                  <button
                    className="w-full bg-blue-600 text-white py-4 px-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
                    onClick={() => {
                      // Force navigation to resume section
                      setActiveSection('resume');
                      haptics.success();
                      toast({
                        title: "Ready for optimization",
                        description: "Now optimize your resume with the keywords"
                      });
                    }}
                  >
                    <Edit className="h-5 w-5" />
                    <span>Continue to Resume Optimization</span>
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Optimization Results Section */}
            {activeSection === 'result' && optimizationResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 pb-32" // Added padding to prevent content from being hidden
              >
                {/* Optimization success message */}
                <motion.div
                  className="bg-green-50 border border-green-100 rounded-xl p-4 mb-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-green-700 text-sm font-medium mb-1">Resume Optimized</h3>
                      <p className="text-xs text-green-600">
                        Your resume has been optimized with a match rate of {optimizationResult.matchRate}%
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                  Optimized Resume
                </h1>
                
                {/* Before and After comparison */}
                <motion.div 
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Comparison</h3>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-blue-400 mr-2"></div>
                        <span className="text-sm text-gray-600">Before: {optimizationResult.beforeMatchRate || 0}%</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-green-400 mr-2"></div>
                        <span className="text-sm text-gray-600">After: {optimizationResult.matchRate}%</span>
                      </div>
                    </div>
                    
                    {/* Progress bar comparison */}
                    <div className="space-y-2 mb-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-400"
                          style={{ width: `${optimizationResult.beforeMatchRate || 0}%` }}
                        ></div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-400"
                          style={{ width: `${optimizationResult.matchRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Optimized resume content */}
                <motion.div 
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900">Optimized Content</h3>
                      <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                        AI Improved
                      </div>
                    </div>
                    
                    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed max-h-[300px] overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50">
                      {optimizationResult.optimizedText}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
                    <span>Enhanced with AI to match job requirements</span>
                    <button 
                      className="text-blue-600"
                      onClick={() => {
                        // Copy optimized text to clipboard
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(optimizationResult.optimizedText);
                          toast({
                            title: "Content copied",
                            description: "Optimized resume copied to clipboard"
                          });
                          haptics.impact();
                        }
                      }}
                    >
                      Copy All
                    </button>
                  </div>
                </motion.div>
                
                {/* Additions and improvements */}
                <motion.div 
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Improvements Made</h3>
                    <ul className="space-y-2">
                      {optimizationResult.improvements && optimizationResult.improvements.map((improvement: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <div className="text-green-500 mt-0.5">
                            <PlusCircle className="h-4 w-4" />
                          </div>
                          <div className="text-sm text-gray-700">{improvement}</div>
                        </li>
                      ))}
                      {!optimizationResult.improvements && (
                        <li className="text-sm text-gray-700">Your resume has been optimized to better match the job requirements.</li>
                      )}
                    </ul>
                  </div>
                </motion.div>
                
                {/* Sticky action bar for results section - ALWAYS VISIBLE */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                  <button
                    className="w-full bg-green-600 text-white py-4 px-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(optimizationResult.optimizedText);
                        toast({
                          title: "Resume copied",
                          description: "Your optimized resume has been copied to clipboard",
                          duration: 5000
                        });
                        haptics.success();
                      }
                    }}
                  >
                    <Download className="h-5 w-5" />
                    <span>Save Optimized Resume</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BorderlessCanvas>
    </div>
  );
}