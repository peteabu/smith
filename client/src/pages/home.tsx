import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { JobDescription } from "@/components/job-description";
import { KeywordAnalysis } from "@/components/keyword-analysis-new";
import { ResumePreview } from "@/components/resume-preview";
import { OptimizeButton } from "@/components/optimize-button";
import { NotificationToast } from "@/components/notification-toast";
import { Helmet } from "react-helmet-async";
import { KeywordAnalysisResult, CvOptimizationResult, optimizeCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FileText, Edit, LineChart, Download } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Define workflow steps
enum WorkflowStep {
  UPLOAD_CV = "upload",
  ANALYZE_JOB = "analyze",
  OPTIMIZE = "optimize",
  RESULTS = "results"
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
    switch (activeStep) {
      case WorkflowStep.UPLOAD_CV:
        return 25;
      case WorkflowStep.ANALYZE_JOB:
        return cvId ? 50 : 25;
      case WorkflowStep.OPTIMIZE:
        return jobAnalysis ? 75 : 50;
      case WorkflowStep.RESULTS:
        return 100;
      default:
        return 25;
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
          {/* Workflow Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-display text-xl text-brown-dark">Your Progress</h2>
              <span className="text-sm text-brown">{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
          
          {/* Tabbed Workflow Interface */}
          <Tabs 
            value={activeStep} 
            onValueChange={(value) => setActiveStep(value as WorkflowStep)}
            className="space-y-6"
          >
            <TabsList className="w-full bg-paper-texture justify-between mb-6 h-auto p-1 flex-wrap">
              <TabsTrigger 
                value={WorkflowStep.UPLOAD_CV}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white flex-grow"
              >
                <FileText className="h-4 w-4" />
                <span className={isMobile ? "hidden" : "block"}>Resume</span>
                <span className="text-xs bg-brown text-white rounded-full h-5 w-5 flex items-center justify-center">1</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={WorkflowStep.ANALYZE_JOB}
                disabled={!cvId}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white flex-grow"
              >
                <Edit className="h-4 w-4" />
                <span className={isMobile ? "hidden" : "block"}>Job Description</span>
                <span className="text-xs bg-brown text-white rounded-full h-5 w-5 flex items-center justify-center">2</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={WorkflowStep.OPTIMIZE}
                disabled={!jobAnalysis}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white flex-grow"
              >
                <LineChart className="h-4 w-4" />
                <span className={isMobile ? "hidden" : "block"}>Analysis</span>
                <span className="text-xs bg-brown text-white rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value={WorkflowStep.RESULTS}
                disabled={!optimizedCV}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white flex-grow"
              >
                <Download className="h-4 w-4" />
                <span className={isMobile ? "hidden" : "block"}>Results</span>
                <span className="text-xs bg-brown text-white rounded-full h-5 w-5 flex items-center justify-center">4</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Step 1: Upload CV */}
            <TabsContent value={WorkflowStep.UPLOAD_CV} className="space-y-6 mt-0">
              <div className="bg-white rounded-lg p-6 paper-shadow">
                <FileUpload onCvUploaded={handleCvUploaded} />
              </div>
            </TabsContent>
            
            {/* Step 2: Job Description Analysis */}
            <TabsContent value={WorkflowStep.ANALYZE_JOB} className="space-y-6 mt-0">
              <div className="bg-white rounded-lg p-6 paper-shadow">
                <JobDescription 
                  cvId={cvId} 
                  onAnalysisComplete={handleAnalysisComplete} 
                />
              </div>
            </TabsContent>
            
            {/* Step 3: Keyword Analysis and Optimization */}
            <TabsContent value={WorkflowStep.OPTIMIZE} className="space-y-6 mt-0">
              <div className="bg-white rounded-lg p-6 paper-shadow">
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
              </div>
            </TabsContent>
            
            {/* Step 4: Final Results */}
            <TabsContent value={WorkflowStep.RESULTS} className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 paper-shadow">
                  <KeywordAnalysis 
                    analysis={jobAnalysis} 
                    optimization={optimizedCV}
                    showFull={true}
                  />
                </div>
                <div className="bg-white rounded-lg p-6 paper-shadow">
                  <ResumePreview optimizedCV={optimizedCV} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <footer className="text-center py-6 text-brown text-xs">
          <p>CV Optimizer &copy; {new Date().getFullYear()} | A minimal ATS-friendly resume builder</p>
        </footer>
        
        <NotificationToast />
      </div>
    </>
  );
}
