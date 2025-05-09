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
  const [activeSection, setActiveSection] = useState<'job' | 'resume' | 'analysis'>('job');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(null);
  const { toast } = useToast();
  
  // Handle section change
  const handleSectionChange = (section: 'job' | 'resume' | 'analysis') => {
    haptics.impact();
    setActiveSection(section);
  };
  
  // Handle job description change
  const handleJobDescriptionChange = (text: string) => {
    setJobDescription(text);
  };
  
  // Handle resume text change
  const handleResumeTextChange = (text: string) => {
    setResumeText(text);
  };
  
  // Handle analysis
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
    try {
      const result = await analyzeJobDescription(jobDescription);
      setAnalysisResult(result);
      
      toast({
        title: "Analysis Complete",
        description: `Identified ${result.keywords.length} keywords for your resume.`
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
                <BorderlessContent
                  content=""
                  onContentChange={() => {}}
                  contentType="title"
                  placeholder="Job Description"
                  isEditing={false}
                />
                
                <div className="mt-6 mb-8">
                  <BorderlessContent
                    content={jobDescription}
                    onContentChange={handleJobDescriptionChange}
                    contentType="paragraph"
                    placeholder="Tap to enter or paste the job description..."
                  />
                </div>
                
                <motion.button
                  className="flex items-center justify-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-full w-full mt-6"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || jobDescription.length < 50}
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>Analyze Job Description</span>
                    </>
                  )}
                </motion.button>
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
                <BorderlessContent
                  content=""
                  onContentChange={() => {}}
                  contentType="title"
                  placeholder="Your Resume"
                  isEditing={false}
                />
                
                <div className="mt-6 mb-8">
                  <BorderlessContent
                    content={resumeText}
                    onContentChange={handleResumeTextChange}
                    contentType="paragraph"
                    placeholder="Tap to enter or paste your resume..."
                  />
                </div>
                
                <div className="flex justify-center my-6">
                  <motion.button
                    className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-800 px-6 py-3 rounded-full"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Upload Resume</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
            
            {activeSection === 'analysis' && analysisResult && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <BorderlessContent
                  content=""
                  onContentChange={() => {}}
                  contentType="title"
                  placeholder="Analysis Results"
                  isEditing={false}
                />
                
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Keywords</h3>
                    <span className="text-sm text-gray-500">{analysisResult.keywords.length} found</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keywords.map((keyword, i) => (
                      <div 
                        key={i} 
                        className="bg-gray-100 px-3 py-1 rounded-full text-sm"
                      >
                        {keyword}
                      </div>
                    ))}
                  </div>
                </div>
                
                {analysisResult.roleResearch && (
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Role Research</h3>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-700">{analysisResult.roleResearch}</p>
                  </div>
                )}
                
                {analysisResult.industryKeywords && (
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Industry Context</h3>
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                )}
                
                <motion.button
                  className="flex items-center justify-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-full w-full mt-6"
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit className="h-5 w-5" />
                  <span>Optimize Resume</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BorderlessCanvas>
    </div>
  );
}