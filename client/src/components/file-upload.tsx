import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText, Eye, CheckCircle, AlertTriangle } from "lucide-react";
import { isValidFileType } from "@/lib/utils";
import { uploadCV, previewCVText } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface FileUploadProps {
  onCvUploaded: (cvId: number, fileName: string) => void;
}

export function FileUpload({ onCvUploaded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePreviewCV = useCallback(async (selectedFile: File) => {
    if (!isValidFileType(selectedFile)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsPreviewLoading(true);
    setPreviewOpen(true);
    
    try {
      const result = await previewCVText(selectedFile);
      
      if (result.isValid) {
        setExtractedText(result.extractedText);
        setEditedText(result.extractedText);
        setPreviewError(null);
      } else {
        setPreviewError(result.errorMessage || "Failed to extract text from your CV. Please try another file or format.");
        setExtractedText("");
        setEditedText("");
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Failed to preview CV");
      setExtractedText("");
      setEditedText("");
    } finally {
      setIsPreviewLoading(false);
    }
  }, [toast]);

  const handleFileChange = useCallback(async (selectedFile: File) => {
    if (!isValidFileType(selectedFile)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    // First preview the CV text
    await handlePreviewCV(selectedFile);
  }, [handlePreviewCV, toast]);
  
  const handleUploadWithText = useCallback(async () => {
    if (!file) return;
    
    setIsUploading(true);
    setPreviewOpen(false);
    
    try {
      // Pass the extracted and possibly edited text to the upload function
      const result = await uploadCV(file, editedText);
      onCvUploaded(result.id, result.fileName);
      toast({
        title: "CV uploaded",
        description: `Successfully uploaded ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload CV",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, editedText, onCvUploaded, toast]);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onCvUploaded(0, "");
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  return (
    <>
      <div
        className={`relative bg-white border-2 border-dashed ${
          isDragActive ? "file-drop-active" : "border-brown"
        } rounded-lg p-8 text-center transition-all duration-200 hover:bg-paper/30 paper-shadow`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <h2 className="font-display text-lg mb-2">Upload your base CV</h2>
        <p className="text-sm text-brown mb-4">This will serve as your template</p>
  
        <div className="relative inline-block">
          <Button
            variant="outline"
            onClick={handleSelectFile}
            className="bg-brown text-white px-4 py-2 rounded font-mono text-sm hover:bg-brown-dark transition-colors duration-200"
            disabled={isUploading || isPreviewLoading}
          >
            {isUploading ? "Uploading..." : isPreviewLoading ? "Extracting text..." : "Select File"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.doc,.docx"
            onChange={handleInputChange}
          />
        </div>
  
        <p className="mt-3 text-xs text-brown-dark">
          PDF or Word Document (.pdf, .doc, .docx)
        </p>
  
        {file && (
          <div className="mt-4 py-2 px-3 bg-paper rounded text-sm font-mono">
            <span className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              <span>{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-600 hover:text-red-800 p-0 h-4"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </span>
          </div>
        )}
      </div>
      
      {/* Content Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-paper">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {previewError ? "Extraction Error" : "CV Content Preview"}
            </DialogTitle>
            <DialogDescription className="text-brown-dark">
              {previewError 
                ? "There was an issue extracting text from your file." 
                : "Review the extracted content from your CV. You can edit if needed."}
            </DialogDescription>
          </DialogHeader>
          
          {isPreviewLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brown"></div>
              <p className="mt-4 text-brown font-mono">Extracting text from your CV...</p>
            </div>
          ) : previewError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <h3 className="font-medium text-red-800">Extraction failed</h3>
                  <div className="mt-1 text-sm text-red-700">
                    <p>{previewError}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-red-700">Try uploading your CV in a different format, or ensure it contains extractable text.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="border rounded bg-white shadow-inner p-4 h-[40vh] overflow-y-auto font-mono text-sm">
                <textarea 
                  value={editedText} 
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-full focus:outline-none resize-none font-mono"
                />
              </div>
              
              <div className="flex items-center mt-2 mb-4 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-brown-dark">You can edit this text if needed before continuing</span>
              </div>
            </>
          )}
          
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-brown text-brown hover:bg-brown/10"
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              onClick={handleUploadWithText}
              disabled={isUploading || isPreviewLoading || !extractedText || !!previewError}
              className="bg-brown text-white hover:bg-brown-dark"
            >
              {isUploading ? "Uploading..." : "Confirm & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
