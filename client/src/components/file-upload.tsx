import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText, Eye, CheckCircle, AlertTriangle, Clipboard, Type, RefreshCw, Save, Clock } from "lucide-react";
import { isValidFileType } from "@/lib/utils";
import { uploadCV, previewCVText } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import haptics from "@/lib/haptics";
import { 
  saveBaseCV, 
  getBaseCV, 
  hasStoredCV, 
  clearStoredCV, 
  formatLastUpdated 
} from "@/lib/local-storage";

interface TextResumeInputProps {
  onCvUploaded: (cvId: number, fileName: string) => void;
}

export function FileUpload({ onCvUploaded }: TextResumeInputProps) {
  const [resumeText, setResumeText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Load saved CV from local storage on component mount
  useEffect(() => {
    const hasCV = hasStoredCV();
    setHasSavedResume(hasCV);
    
    if (hasCV) {
      const { content, fileName, cvId, lastUpdated } = getBaseCV();
      
      // If both content and cvId exist, we can restore the state
      if (content && cvId) {
        setResumeText(content);
        setLastUpdated(lastUpdated);
        
        // Tell the parent we already have a resume
        onCvUploaded(cvId, fileName);
      }
    }
  }, []);

  // Create a placeholder file with the text content for the API
  const createPlaceholderFile = (text: string): File => {
    const blob = new Blob([text], { type: "text/plain" });
    return new File([blob], "resume.txt", { type: "text/plain" });
  };
  
  const handleSaveResume = async () => {
    // Provide strong haptic feedback for primary action
    haptics.impact();
    
    if (!resumeText.trim()) {
      toast({
        title: "Resume content required",
        description: "Please paste your resume text before continuing",
        variant: "destructive",
      });
      haptics.error();
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Convert text to File object for the API
      const file = createPlaceholderFile(resumeText);
      
      // Upload the resume text
      const result = await uploadCV(file, resumeText);
      
      // Save to local storage for future use
      saveBaseCV(resumeText, "resume.txt", result.id);
      setHasSavedResume(true);
      setLastUpdated(new Date().toISOString());
      
      onCvUploaded(result.id, "resume.txt");
      
      toast({
        title: "Resume saved",
        description: "Your resume text has been saved successfully",
      });
      
      // Strong success haptic feedback
      haptics.success();
      
      // Toggle back to edit mode
      setIsPreviewMode(false);
    } catch (error) {
      toast({
        title: "Failed to save resume",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      
      // Error haptic feedback
      haptics.error();
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleTogglePreview = () => {
    // Toggle preview mode with haptic feedback
    haptics.tap();
    setIsPreviewMode(!isPreviewMode);
  };
  
  const handlePasteResume = async () => {
    // Provide tactile feedback
    haptics.tap();
    
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setResumeText(text);
        toast({
          title: "Text pasted",
          description: "Resume text pasted from clipboard",
        });
        // Success haptic feedback
        haptics.success();
      }
    } catch (error) {
      toast({
        title: "Clipboard access denied",
        description: "Please paste your resume manually",
        variant: "destructive",
      });
      // Error haptic feedback
      haptics.error();
    }
  };
  
  const handleClearResume = () => {
    haptics.impact();
    setShowConfirmDialog(true);
  };
  
  const confirmClearResume = () => {
    setResumeText("");
    clearStoredCV();
    setHasSavedResume(false);
    setLastUpdated(null);
    setShowConfirmDialog(false);
    
    toast({
      title: "Resume cleared",
      description: "Your saved resume has been cleared",
    });
    
    haptics.impact();
  };

  return (
    <>
      <div className="bg-white border border-brown/30 rounded-lg p-6 paper-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="font-display text-lg">{hasSavedResume ? "Your saved resume" : "Welcome to Mimic"}</h2>
            <p className="text-sm text-brown">
              {hasSavedResume 
                ? (
                  <>
                    Your base resume is already saved and will be used for all optimizations
                    {lastUpdated && (
                      <span className="flex items-center mt-1 text-xs text-green-700">
                        <Clock className="h-3 w-3 mr-1" />
                        Last saved: {formatLastUpdated(lastUpdated)}
                      </span>
                    )}
                  </>
                ) 
                : "To get started, please paste your base resume below - this will be used for all job optimizations"
              }
            </p>
          </div>
          
          <div className="flex gap-2 self-end sm:self-center">
            {hasSavedResume && (
              <button
                onClick={handleClearResume}
                className="font-mono text-xs py-2 sm:py-1 px-3 border border-brown/70 rounded bg-white hover:bg-red-50 transition-colors duration-200 flex items-center gap-1 mobile-button touch-feedback"
              >
                <RefreshCw className="h-4 w-4 text-brown-dark" />
                <span className="text-brown-dark">New</span>
              </button>
            )}
            
            <button
              onClick={handlePasteResume}
              className="font-mono text-xs py-2 sm:py-1 px-3 border border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 flex items-center gap-1 mobile-button touch-feedback"
            >
              <Clipboard className="h-4 w-4 text-brown-dark" />
              <span className="text-brown-dark">Paste</span>
            </button>
            
            <button
              onClick={handleTogglePreview}
              className="font-mono text-xs py-2 sm:py-1 px-3 border border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed mobile-button touch-feedback"
              disabled={!resumeText.trim()}
            >
              <Eye className="h-4 w-4 text-brown-dark" />
              <span className="text-brown-dark">{isPreviewMode ? "Edit" : "Preview"}</span>
            </button>
          </div>
        </div>
        
        {isPreviewMode ? (
          <div className="whitespace-pre-wrap overflow-y-auto h-64 sm:h-72 p-4 bg-cream font-mono text-sm border border-brown/30 rounded mobile-scroll">
            {resumeText || (
              <span className="text-brown-light italic">No resume content to preview</span>
            )}
          </div>
        ) : (
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full h-64 sm:h-72 p-4 font-mono text-sm"
          />
        )}
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-4">
          <div className="text-xs text-brown">
            <div className="flex items-center">
              <Type className="h-3 w-3 mr-1" />
              <span>Plain text format preserves important content for ATS optimization</span>
            </div>
            {hasSavedResume && (
              <div className="flex items-center mt-1 text-green-700">
                <Save className="h-3 w-3 mr-1" />
                <span>Your resume is saved locally on this device</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSaveResume}
            disabled={isUploading || !resumeText.trim()}
            className="font-mono text-md py-3.5 sm:py-3 px-6 border border-brown/70 rounded primary-action-button hover:bg-[#DFCFB1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mobile-button haptic-button"
          >
            {isUploading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-brown-dark border-b-transparent"></span>
                <span className="text-brown-dark font-bold">Saving...</span>
              </>
            ) : (
              <span className="text-brown-dark font-bold">
                {hasSavedResume ? "Update Resume" : "Save Resume"}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Confirmation dialog for clearing resume */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear saved resume?</DialogTitle>
            <DialogDescription>
              This will remove your saved resume from this device. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              className="border-brown text-brown hover:bg-paper"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmClearResume}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear Resume
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
