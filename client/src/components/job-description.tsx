import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { analyzeJobDescription } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { KeywordAnalysisResult } from "@/lib/cv-analyzer";

interface JobDescriptionProps {
  cvId: number | null;
  onAnalysisComplete: (result: KeywordAnalysisResult) => void;
}

export function JobDescription({ cvId, onAnalysisComplete }: JobDescriptionProps) {
  const [value, setValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  
  // Debounce the analysis to avoid too many API calls
  useEffect(() => {
    if (value.length < 50) return;
    
    const timeout = setTimeout(async () => {
      if (!value) return;
      
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
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [value, cvId, onAnalysisComplete, toast]);
  
  return (
    <div className="bg-white rounded-lg p-6 paper-shadow">
      <h2 className="font-display text-lg mb-3">Job Description</h2>
      <p className="text-sm text-brown mb-4">
        Paste the job posting to analyze and optimize your CV
      </p>
      
      <div className="relative">
        <Textarea 
          id="job-description" 
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-64 p-4 bg-cream font-mono text-sm border border-brown/30 rounded focus:ring-1 focus:ring-brown focus:outline-none typewriter-cursor" 
          placeholder="Paste job description here..."
        />
        {isAnalyzing && (
          <div className="absolute right-2 bottom-2 text-xs text-brown animate-pulse">
            Analyzing...
          </div>
        )}
      </div>
    </div>
  );
}
