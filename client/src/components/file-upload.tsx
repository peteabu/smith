import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText, Eye, CheckCircle, AlertTriangle, Clipboard, Type } from "lucide-react";
import { isValidFileType } from "@/lib/utils";
import { uploadCV, previewCVText } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TextResumeInputProps {
  onCvUploaded: (cvId: number, fileName: string) => void;
}

export function FileUpload({ onCvUploaded }: TextResumeInputProps) {
  const [resumeText, setResumeText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();

  // Create a placeholder file with the text content for the API
  const createPlaceholderFile = (text: string): File => {
    const blob = new Blob([text], { type: "text/plain" });
    return new File([blob], "resume.txt", { type: "text/plain" });
  };
  
  const handleSaveResume = async () => {
    if (!resumeText.trim()) {
      toast({
        title: "Resume content required",
        description: "Please paste your resume text before continuing",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Convert text to File object for the API
      const file = createPlaceholderFile(resumeText);
      
      // Upload the resume text
      const result = await uploadCV(file, resumeText);
      
      onCvUploaded(result.id, "resume.txt");
      
      toast({
        title: "Resume saved",
        description: "Your resume text has been saved successfully",
      });
      
      // Toggle back to edit mode
      setIsPreviewMode(false);
    } catch (error) {
      toast({
        title: "Failed to save resume",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleTogglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };
  
  const handlePasteResume = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setResumeText(text);
        toast({
          title: "Text pasted",
          description: "Resume text pasted from clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Clipboard access denied",
        description: "Please paste your resume manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white border border-brown/30 rounded-lg p-6 paper-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg">Enter your resume text</h2>
          <p className="text-sm text-brown">Paste your resume content to optimize for job descriptions</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handlePasteResume}
            className="font-mono text-xs py-1 px-3 border border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 flex items-center gap-1"
          >
            <Clipboard className="h-4 w-4 text-brown-dark" />
            <span className="text-brown-dark">Paste</span>
          </button>
          
          <button
            onClick={handleTogglePreview}
            className="font-mono text-xs py-1 px-3 border border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!resumeText.trim()}
          >
            <Eye className="h-4 w-4 text-brown-dark" />
            <span className="text-brown-dark">{isPreviewMode ? "Edit" : "Preview"}</span>
          </button>
        </div>
      </div>
      
      <div className="relative border rounded-md bg-paper shadow-inner p-4 min-h-[40vh] font-mono">
        {isPreviewMode ? (
          <div className="whitespace-pre-wrap overflow-y-auto max-h-[40vh] p-2 text-sm">
            {resumeText || (
              <span className="text-brown-light italic">No resume content to preview</span>
            )}
          </div>
        ) : (
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full min-h-[40vh] border-none focus:outline-none resize-none font-mono bg-paper text-sm"
          />
        )}
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div className="text-xs text-brown">
          <div className="flex items-center">
            <Type className="h-3 w-3 mr-1" />
            <span>Plain text format preserves important content for ATS optimization</span>
          </div>
        </div>
        
        <button
          onClick={handleSaveResume}
          disabled={isUploading || !resumeText.trim()}
          className="font-mono text-md py-2 px-5 border border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isUploading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-brown-dark border-b-transparent"></span>
              <span className="text-brown-dark font-bold">Saving...</span>
            </>
          ) : (
            <span className="text-brown-dark font-bold">
              Save Resume
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
