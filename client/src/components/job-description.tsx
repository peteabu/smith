import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { analyzeJobDescription } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { KeywordAnalysisResult } from "@/lib/cv-analyzer";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface JobDescriptionProps {
  cvId: number | null;
  onAnalysisComplete: (result: KeywordAnalysisResult) => void;
}

export function JobDescription({ cvId, onAnalysisComplete }: JobDescriptionProps) {
  const [value, setValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
        
        <Button 
          onClick={handleAnalyze}
          disabled={isAnalyzing || value.length < 50}
          className="bg-brown hover:bg-brown-dark text-white flex items-center gap-2 w-full justify-center"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Analyze Keywords
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
