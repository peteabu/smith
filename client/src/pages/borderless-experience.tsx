import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BorderlessCanvas, BorderlessContent } from '@/components/borderless-canvas';
import { Search, Check, Plus, ChevronDown, ChevronRight, Edit } from 'lucide-react';
import haptics from '@/lib/haptics';
import { analyzeJobDescription } from '@/lib/cv-analyzer';
import { useToast } from '@/hooks/use-toast';
import { KeywordAnalysisResult } from '@/lib/cv-analyzer';

/**
 * A completely reimagined mobile experience based on borderless design principles.
 * This is not a traditional app with forms and inputs, but a fluid canvas
 * where content is directly manipulated.
 */
export function BorderlessExperience() {
  // App state
  const [activeSection, setActiveSection] = useState<'job' | 'resume' | 'analysis'>('job');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(null);
  const { toast } = useToast();
  
  // UI state
  const [showIntroGuide, setShowIntroGuide] = useState(true);
  const [didFirstEdit, setDidFirstEdit] = useState(false);
  
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

  // Handle section change with improved feedback
  const handleSectionChange = (section: 'job' | 'resume' | 'analysis') => {
    // Don't allow navigation to Analysis if no result
    if (section === 'analysis' && !analysisResult) {
      toast({
        title: "Analysis required",
        description: "Please analyze a job description first"
      });
      haptics.warning();
      return;
    }
    
    // Don't allow navigation to Resume if no job description
    if (section === 'resume' && !jobDescription) {
      toast({
        title: "Job description needed",
        description: "Please enter a job description first"
      });
      haptics.warning();
      return;
    }
    
    haptics.impact();
    setActiveSection(section);
    
    // Provide contextual guidance based on section changes
    if (section === 'resume' && !resumeText && jobDescription) {
      toast({
        title: "Ready for your resume",
        description: "Tap below to enter your resume content"
      });
    }
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
  
  // Handle analysis with improved feedback
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
    
    haptics.impact();
    setIsAnalyzing(true);
    
    // Provide feedback that analysis is starting
    toast({
      title: "Starting analysis",
      description: "This will take a few moments..."
    });
    
    try {
      const result = await analyzeJobDescription(jobDescription);
      setAnalysisResult(result);
      
      toast({
        title: "Analysis Complete",
        description: `Identified ${result.keywords.length} keywords for your resume.`,
        duration: 5000, // Show longer
      });
      
      haptics.success();
      handleSectionChange('analysis');
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze job description",
        variant: "destructive"
      });
      
      haptics.error();
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 w-full h-full bg-gray-50 overflow-hidden">
      <BorderlessCanvas>
        <div className="px-5 pt-12 pb-24 min-h-screen">
          {/* Top navigation */}
          <div className="flex items-center mb-8 space-x-4">
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
              disabled={!analysisResult}
            >
              Analysis
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
                
                <BorderlessContent
                  content=""
                  onContentChange={() => {}}
                  contentType="title"
                  placeholder="Job Description"
                  isEditing={false}
                />
                
                <div className="mt-3 mb-4">
                  <BorderlessContent
                    content={jobDescription}
                    onContentChange={handleJobDescriptionChange}
                    onStartEdit={handleJobDescriptionEditStart}
                    onFinishEdit={handleJobDescriptionEditFinish}
                    contentType="paragraph"
                    placeholder="Tap to enter or paste the job description..."
                    actionLabel={jobDescription.length >= 50 ? "Analyze Keywords" : undefined}
                    onAction={jobDescription.length >= 50 ? handleAnalyze : undefined}
                  />
                </div>
                
                {/* Analysis button - shown only when not already triggered by content action */}
                {(jobDescription.length >= 50 && !isAnalyzing && !didFirstEdit) && (
                  <motion.button
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full w-full mt-6 shadow-sm"
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAnalyze}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Search className="h-5 w-5" />
                    <span>Analyze Job Description</span>
                  </motion.button>
                )}
                
                {/* Loading indicator */}
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
                    <p className="text-sm text-gray-700">Analyzing your job description...</p>
                    <p className="text-xs text-gray-500 mt-1">Finding key skills and requirements</p>
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
                
                <BorderlessContent
                  content=""
                  onContentChange={() => {}}
                  contentType="title"
                  placeholder="Your Resume"
                  isEditing={false}
                />
                
                <div className="mt-3 mb-4">
                  <BorderlessContent
                    content={resumeText}
                    onContentChange={handleResumeTextChange}
                    contentType="paragraph"
                    placeholder="Tap to enter or paste your resume..."
                    actionLabel={resumeText && analysisResult ? "Optimize Resume" : undefined}
                    onAction={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Resume optimization will be available soon!"
                      });
                      haptics.impact();
                    }}
                  />
                </div>
                
                <div className="flex justify-center my-6">
                  <motion.button
                    className="flex items-center justify-center gap-2 bg-white shadow-sm border border-gray-200 text-gray-800 px-6 py-3 rounded-full"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      toast({
                        title: "Upload Option",
                        description: "Resume upload feature will be available soon!"
                      });
                      haptics.impact();
                    }}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Upload Resume</span>
                  </motion.button>
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
                className="space-y-5"
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
                
                <BorderlessContent
                  content="Analysis Results"
                  onContentChange={() => {}}
                  contentType="title"
                  isEditing={false}
                />
                
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
                        toast({
                          title: "Keywords copied",
                          description: "All keywords copied to clipboard"
                        });
                        haptics.impact();
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
                
                {/* Next step action buttons */}
                <div className="pt-2 space-y-3">
                  <motion.button
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full w-full shadow-sm"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSectionChange('resume')}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Edit className="h-5 w-5" />
                    <span>Optimize My Resume</span>
                  </motion.button>
                  
                  <motion.button
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full w-full shadow-sm"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSectionChange('job')}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <span>Edit Job Description</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BorderlessCanvas>
    </div>
  );
}