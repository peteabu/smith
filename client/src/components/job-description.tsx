import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { analyzeJobDescription } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { KeywordAnalysisResult } from "@/lib/cv-analyzer";
import { Button } from "@/components/ui/button";
import { Search, Check, Clock } from "lucide-react";
import { io } from "socket.io-client";
import { Progress } from "@/components/ui/progress";

interface JobDescriptionProps {
  cvId: number | null;
  onAnalysisComplete: (result: KeywordAnalysisResult) => void;
}

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

export function JobDescription({ cvId, onAnalysisComplete }: JobDescriptionProps) {
  const [value, setValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);
  
  // Initialize Socket.IO connection
  useEffect(() => {
    // Create a socket connection
    socketRef.current = io();
    
    // Listen for analysis progress events
    socketRef.current.on('analysis-progress', (data: AnalysisProgress) => {
      console.log('Received analysis progress:', data);
      
      // If this is for our current analysis
      if (currentAnalysisId === data.analysisId || !currentAnalysisId) {
        // Save the analysis ID if we don't have it yet
        if (!currentAnalysisId) {
          setCurrentAnalysisId(data.analysisId);
        }
        
        setAnalysisSteps(prevSteps => {
          // Find if we already have this step
          const stepIndex = prevSteps.findIndex(s => s.step === data.step.step);
          
          if (stepIndex >= 0) {
            // Update existing step
            const newSteps = [...prevSteps];
            newSteps[stepIndex] = data.step;
            return newSteps;
          } else {
            // Add new step
            return [...prevSteps, data.step];
          }
        });
      }
    });
    
    // Listen for analysis completion
    socketRef.current.on('analysis-completed', (data: any) => {
      console.log('Analysis completed:', data);
      
      // If this is our current analysis
      if (currentAnalysisId === data.analysisId) {
        // Analysis is complete, update all steps to completed
        setAnalysisSteps(prevSteps => 
          prevSteps.map(step => ({...step, status: 'completed'}))
        );
      }
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentAnalysisId]);
  
  // Clear any pending analysis when unmounting
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Handle analysis with manual trigger
  const handleAnalyze = useCallback(async () => {
    if (!value || value.length < 50) {
      toast({
        title: "Job description too short",
        description: "Please enter a more detailed job description",
      });
      return;
    }
    
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeJobDescription(value, cvId || undefined);
      
      // Check if web search was used
      const hasWebSearch = result.webSearchResults && 
        (result.webSearchResults.role?.length || 
         result.webSearchResults.industry?.length || 
         result.webSearchResults.recruitment?.length || 
         result.webSearchResults.ats?.length);
      
      toast({
        title: "Analysis Complete",
        description: hasWebSearch 
          ? `Identified ${result.keywords.length} keywords with web-enhanced research.` 
          : `Identified ${result.keywords.length} keywords for your resume.`,
      });
      
      onAnalysisComplete(result);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze job description",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [value, cvId, isAnalyzing, onAnalysisComplete, toast]);
  
  // Calculate overall progress percentage
  const calculateProgress = () => {
    if (!analysisSteps.length) return 0;
    
    const completedSteps = analysisSteps.filter(step => step.status === 'completed').length;
    const inProgressSteps = analysisSteps.filter(step => step.status === 'in-progress').length;
    
    // Count in-progress steps as half complete
    return Math.floor((completedSteps + (inProgressSteps * 0.5)) / analysisSteps.length * 100);
  };
  
  // Reset analysis state
  const handleReset = () => {
    setAnalysisSteps([]);
    setCurrentAnalysisId(null);
  };
  
  useEffect(() => {
    // Reset analysis steps when starting a new analysis
    if (isAnalyzing && analysisSteps.length) {
      handleReset();
    }
  }, [isAnalyzing]);
  
  return (
    <div className="bg-white rounded-lg p-6 paper-shadow">
      <h2 className="font-display text-lg mb-3">Job Description</h2>
      <p className="text-sm text-brown mb-4">
        Paste the job posting to analyze and optimize your CV
      </p>
      
      <div className="space-y-3">
        <Textarea 
          id="job-description" 
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-64 p-4 bg-cream font-mono text-sm border border-brown/30 rounded focus:ring-1 focus:ring-brown focus:outline-none typewriter-cursor" 
          placeholder="Paste job description here..."
        />
        
        {/* Analysis progress display */}
        {isAnalyzing && analysisSteps.length > 0 && (
          <div className="space-y-3 p-3 bg-cream/50 rounded">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-medium">Analysis Progress</h3>
              <span className="text-xs text-brown">{calculateProgress()}%</span>
            </div>
            
            <div className="relative h-2 bg-paper border border-brown/30 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-brown/40 transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
              {/* Add typewriter texture dots */}
              <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="h-2 w-0.5 bg-brown/10 rounded-full"></div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {analysisSteps.map((step, index) => (
                <div key={index} className="flex gap-2 items-center text-xs">
                  {step.status === 'completed' ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : step.status === 'in-progress' ? (
                    <svg className="animate-spin h-3 w-3 text-brown" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Clock className="h-3 w-3 text-gray-400" />
                  )}
                  <span className={step.status === 'completed' ? "text-black" : step.status === 'in-progress' ? "text-brown" : "text-gray-400"}>
                    {step.step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="relative inline-block w-full">
          <div className="absolute inset-0 bg-paper rounded border border-brown/50"></div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || value.length < 50}
            className="relative font-mono text-md py-3 px-8 border-2 border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-brown-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-brown-dark font-bold tracking-wide">Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5 text-brown-dark" />
                <span className="text-brown-dark font-bold tracking-wide relative">
                  Analyze Keywords
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brown/30"></span>
                </span>
              </>
            )}
          </button>
          <div className="absolute -bottom-1 -right-1 w-full h-full bg-brown/10 rounded border border-brown/30 -z-10"></div>
        </div>
      </div>
    </div>
  );
}
