import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText } from "lucide-react";
import { fileToBase64, isValidFileType } from "@/lib/utils";
import { uploadCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onCvUploaded: (cvId: number, fileName: string) => void;
}

export function FileUpload({ onCvUploaded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback(async (selectedFile: File) => {
    if (!isValidFileType(selectedFile)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);

    try {
      const base64Content = await fileToBase64(selectedFile);
      const result = await uploadCV(selectedFile, base64Content);
      onCvUploaded(result.id, result.fileName);
      toast({
        title: "CV uploaded",
        description: `Successfully uploaded ${selectedFile.name}`,
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
  }, [onCvUploaded, toast]);

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
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Select File"}
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
  );
}
