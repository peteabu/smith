import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { JobDescription } from "@/components/job-description";
import { KeywordAnalysis } from "@/components/keyword-analysis";
import { ResumePreview } from "@/components/resume-preview";
import { OptimizeButton } from "@/components/optimize-button";
import { NotificationToast } from "@/components/notification-toast";
import { Helmet } from "react-helmet-async";
import { KeywordAnalysisResult, CvOptimizationResult, optimizeCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [cvId, setCvId] = useState<number | null>(null);
  const [cvFilename, setCvFilename] = useState<string>("");
  const [jobAnalysis, setJobAnalysis] = useState<KeywordAnalysisResult | null>(null);
  const [optimizedCV, setOptimizedCV] = useState<CvOptimizationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const handleCvUploaded = (id: number, filename: string) => {
    setCvId(id);
    setCvFilename(filename);
    // Reset optimization when CV changes
    setOptimizedCV(null);
  };
  
  const handleAnalysisComplete = (result: KeywordAnalysisResult) => {
    setJobAnalysis(result);
    // Reset optimization when job description changes
    setOptimizedCV(null);
  };
  
  const handleOptimizeCv = async () => {
    if (!cvId || !jobAnalysis?.id) {
      toast({
        title: "Cannot optimize",
        description: "Please upload a CV and analyze a job description first",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await optimizeCV(cvId, jobAnalysis.id);
      setOptimizedCV(result);
      toast({
        title: "CV optimized",
        description: `Your CV has been optimized with a ${result.matchRate}% keyword match`,
      });
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : "Failed to optimize CV",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>CV Optimizer - ATS-friendly resume builder</title>
        <meta name="description" content="Optimize your resume for ATS systems by analyzing job descriptions and highlighting key skills and keywords." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Playfair+Display:wght@400;700&family=Source+Serif+Pro:wght@400;600&display=swap" rel="stylesheet" />
      </Helmet>
      
      <div className="bg-cream min-h-screen font-serif text-moss-dark">
        <header className="py-6 px-4 text-center">
          <h1 className="font-display text-3xl md:text-4xl text-brown-dark tracking-wide">CV Optimizer</h1>
          <p className="font-mono text-sm mt-2 text-brown opacity-80">ATS-friendly resume tailoring</p>
        </header>
        
        <main className="container mx-auto px-4 pb-12 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Input Panel */}
            <section className="space-y-6">
              <FileUpload onCvUploaded={handleCvUploaded} />
              <JobDescription 
                cvId={cvId} 
                onAnalysisComplete={handleAnalysisComplete} 
              />
              <OptimizeButton 
                disabled={!cvId || !jobAnalysis?.id} 
                isProcessing={isProcessing}
                onClick={handleOptimizeCv}
              />
            </section>
            
            {/* Right Column - Preview Panel */}
            <section className="space-y-6">
              <KeywordAnalysis 
                analysis={jobAnalysis} 
                optimization={optimizedCV} 
              />
              <ResumePreview optimizedCV={optimizedCV} />
            </section>
            
          </div>
        </main>
        
        <footer className="text-center py-6 text-brown text-xs">
          <p>CV Optimizer &copy; {new Date().getFullYear()} | A minimal ATS-friendly resume builder</p>
        </footer>
        
        <NotificationToast />
      </div>
    </>
  );
}
