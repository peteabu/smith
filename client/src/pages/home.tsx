import { useState, useEffect } from "react";
import { FileUpload } from "@/components/file-upload";
import { JobDescription } from "@/components/job-description";
import { KeywordAnalysis } from "@/components/keyword-analysis-new";
import { ResumePreview } from "@/components/resume-preview";
import { OptimizeButton } from "@/components/optimize-button";
import { NotificationToast } from "@/components/notification-toast";
import { ProfileMenu } from "@/components/profile-menu";
import { Helmet } from "react-helmet-async";
import { KeywordAnalysisResult, CvOptimizationResult, optimizeCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FileText, Edit, LineChart, Download, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasStoredCV, getBaseCV } from "@/lib/local-storage";

// Define workflow steps
enum WorkflowStep {
  UPLOAD_CV = "upload",
  ANALYZE_JOB = "analyze",
  OPTIMIZE = "optimize",
  RESULTS = "results",
  SETTINGS = "settings"
}

export default function Home() {
  const [cvId, setCvId] = useState<number | null>(null);
  const [cvFilename, setCvFilename] = useState<string>("");
  const [jobAnalysis, setJobAnalysis] = useState<KeywordAnalysisResult | null>(null);
  const [optimizedCV, setOptimizedCV] = useState<CvOptimizationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<WorkflowStep>(WorkflowStep.UPLOAD_CV);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Check for existing CV on app load
  useEffect(() => {
    if (hasStoredCV()) {
      const { cvId, fileName } = getBaseCV();
      if (cvId) {
        setCvId(cvId);
        setCvFilename(fileName);
        // Skip to job description step since we already have a CV
        setActiveStep(WorkflowStep.ANALYZE_JOB);
      }
    }
  }, []);
  
  const handleCvUploaded = (id: number, filename: string) => {
    setCvId(id);
    setCvFilename(filename);
    // Reset optimization when CV changes
    setOptimizedCV(null);
    // Auto-advance to next step
    setActiveStep(WorkflowStep.ANALYZE_JOB);
  };
  
  const handleAnalysisComplete = (result: KeywordAnalysisResult) => {
    setJobAnalysis(result);
    // Reset optimization when job description changes
    setOptimizedCV(null);
    // Auto-advance to next step
    setActiveStep(WorkflowStep.OPTIMIZE);
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
      // Auto-advance to results step
      setActiveStep(WorkflowStep.RESULTS);
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

  // Calculate the current progress percentage
  const calculateProgress = () => {
    // If CV is stored, we have different step progression
    const hasCV = hasStoredCV();
    
    switch (activeStep) {
      case WorkflowStep.UPLOAD_CV:
        return 25; // This will only show for first-time users
      case WorkflowStep.ANALYZE_JOB:
        return hasCV ? 33 : 50; // First step for returning users, second for new users
      case WorkflowStep.OPTIMIZE:
        return hasCV ? 66 : 75; // Second step for returning users, third for new users
      case WorkflowStep.RESULTS:
        return 100;
      default:
        return hasCV ? 33 : 25;
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Mimic - ATS-friendly resume builder</title>
        <meta name="description" content="Optimize your resume for ATS systems by analyzing job descriptions and highlighting key skills and keywords." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Playfair+Display:wght@400;700&family=Source+Serif+Pro:wght@400;600&display=swap" rel="stylesheet" />
      </Helmet>
      
      <div className="bg-cream min-h-screen font-serif text-moss-dark mobile-safe-area">
        <header className="py-4 sm:py-6 px-4 sticky top-0 z-30 bg-cream border-b border-brown/20 flex flex-col items-center relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <ProfileMenu onResumeUpdated={handleCvUploaded} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-brown-dark tracking-wide">CV Optimizer</h1>
          <p className="font-mono text-xs sm:text-sm mt-1 sm:mt-2 text-brown opacity-80">ATS-friendly resume tailoring</p>
        </header>
        
        <main className="container mx-auto px-3 sm:px-4 pb-8 safe-bottom max-w-6xl overflow-x-hidden">
          {/* Workflow Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-display text-xl text-brown-dark">Your Progress</h2>
              <span className="text-sm font-mono text-brown bg-paper px-2 py-1 border border-brown/30">{calculateProgress()}%</span>
            </div>
            <div className="relative h-2 w-full bg-paper-texture border border-brown/30 overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-brown/40 transition-all duration-500 ease-in-out"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
          
          {/* Tabbed Workflow Interface */}
          <Tabs 
            value={activeStep} 
            onValueChange={(value) => setActiveStep(value as WorkflowStep)}
            className="space-y-6"
          >
            <div className="mb-6 relative">
              <div className="absolute top-0 left-0 w-full h-full bg-paper -z-10 paper-shadow"></div>
              <div className="flex overflow-x-auto mobile-scroll w-full font-mono text-xs sm:text-sm border-b border-brown/30">
                {/* Only show Resume step if no CV is saved yet */}
                {!hasStoredCV() && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(WorkflowStep.UPLOAD_CV)}
                    className={`flex items-center gap-2 py-3 px-4 flex-grow border-r border-brown/30 mobile-button touch-feedback ${
                      activeStep === WorkflowStep.UPLOAD_CV 
                        ? 'bg-white text-brown-dark font-bold' 
                        : 'text-brown hover:bg-white/50'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span className={isMobile ? "hidden" : "block"}>Resume</span>
                    <span className="ml-1 text-xs border border-brown text-brown h-5 w-5 flex items-center justify-center">1</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => cvId && setActiveStep(WorkflowStep.ANALYZE_JOB)}
                  disabled={!cvId}
                  className={`flex items-center gap-2 py-3 px-4 flex-grow border-r border-brown/30 mobile-button touch-feedback ${
                    activeStep === WorkflowStep.ANALYZE_JOB 
                      ? 'bg-white text-brown-dark font-bold' 
                      : 'text-brown hover:bg-white/50'
                  } ${!cvId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Edit className="h-4 w-4" />
                  <span className={isMobile ? "hidden" : "block"}>Job Description</span>
                  <span className="ml-1 text-xs border border-brown text-brown h-5 w-5 flex items-center justify-center">{hasStoredCV() ? "1" : "2"}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => jobAnalysis && setActiveStep(WorkflowStep.OPTIMIZE)}
                  disabled={!jobAnalysis}
                  className={`flex items-center gap-2 py-3 px-4 flex-grow border-r border-brown/30 mobile-button touch-feedback ${
                    activeStep === WorkflowStep.OPTIMIZE 
                      ? 'bg-white text-brown-dark font-bold' 
                      : 'text-brown hover:bg-white/50'
                  } ${!jobAnalysis ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <LineChart className="h-4 w-4" />
                  <span className={isMobile ? "hidden" : "block"}>Analysis</span>
                  <span className="ml-1 text-xs border border-brown text-brown h-5 w-5 flex items-center justify-center">{hasStoredCV() ? "2" : "3"}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => optimizedCV && setActiveStep(WorkflowStep.RESULTS)}
                  disabled={!optimizedCV}
                  className={`flex items-center gap-2 py-3 px-4 flex-grow mobile-button touch-feedback ${
                    activeStep === WorkflowStep.RESULTS 
                      ? 'bg-white text-brown-dark font-bold' 
                      : 'text-brown hover:bg-white/50'
                  } ${!optimizedCV ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Download className="h-4 w-4" />
                  <span className={isMobile ? "hidden" : "block"}>Results</span>
                  <span className="ml-1 text-xs border border-brown text-brown h-5 w-5 flex items-center justify-center">{hasStoredCV() ? "3" : "4"}</span>
                </button>
              </div>
            </div>
            
            {/* Step 1: Upload CV - Only show if no CV is saved */}
            {!hasStoredCV() && (
              <TabsContent value={WorkflowStep.UPLOAD_CV} className="space-y-6 mt-0">
                <FileUpload onCvUploaded={handleCvUploaded} />
              </TabsContent>
            )}
            
            {/* Job Description Analysis - Step 1 or 2 depending on if CV exists */}
            <TabsContent value={WorkflowStep.ANALYZE_JOB} className="space-y-6 mt-0">
              <JobDescription 
                cvId={cvId} 
                onAnalysisComplete={handleAnalysisComplete} 
              />
            </TabsContent>
            
            {/* Analysis and Optimization - Step 2 or 3 depending on if CV exists */}
            <TabsContent value={WorkflowStep.OPTIMIZE} className="space-y-6 mt-0">
              <KeywordAnalysis 
                analysis={jobAnalysis} 
                optimization={optimizedCV} 
              />
              <div className="mt-6">
                <OptimizeButton 
                  disabled={!cvId || !jobAnalysis?.id} 
                  isProcessing={isProcessing}
                  onClick={handleOptimizeCv}
                />
              </div>
            </TabsContent>
            
            {/* Final Results - Step 3 or 4 depending on if CV exists */}
            <TabsContent value={WorkflowStep.RESULTS} className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <KeywordAnalysis 
                  analysis={jobAnalysis} 
                  optimization={optimizedCV}
                  showFull={true}
                />
                <ResumePreview optimizedCV={optimizedCV} />
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <footer className="text-center py-4 sm:py-6 text-brown text-xs safe-bottom mt-4">
          <p>Mimic &copy; {new Date().getFullYear()} | A minimal ATS-friendly resume builder</p>
        </footer>
        
        <NotificationToast />
      </div>
    </>
  );
}
