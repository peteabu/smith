import { CvOptimizationResult, downloadOptimizedCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, FileCode } from "lucide-react";
import { useState } from "react";

interface ResumePreviewProps {
  optimizedCV: CvOptimizationResult | null;
}

export function ResumePreview({ optimizedCV }: ResumePreviewProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState<'standard' | 'latex' | null>(null);

  const handleDownload = async (format: 'pdf' | 'latex') => {
    if (!optimizedCV?.id) return;
    
    setIsDownloading(format === 'pdf' ? 'standard' : 'latex');
    
    try {
      // Use iframe to avoid browser blocking the download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Set the source to the download endpoint
      iframe.src = `/api/cv/download/${optimizedCV.id}?format=${format}`;
      
      // Remove iframe after a timeout
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
      
      toast({
        title: "Download started",
        description: `Your optimized CV is downloading in ${format === 'latex' ? 'LaTeX' : 'standard'} format`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download CV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsDownloading(null);
      }, 1500); // Slight delay to show loading status
    }
  };

  return (
    <div className="bg-paper-texture bg-cover rounded-lg overflow-hidden paper-shadow">
      <div className="bg-moss/10 backdrop-blur-sm p-4 flex justify-between items-center border-b border-brown/20">
        <h2 className="font-display text-lg">Optimized CV Preview</h2>
        
        <div id="download-buttons" className="flex space-x-2">
          <Button
            className="bg-brown px-3 py-1 rounded text-white text-xs flex items-center hover:bg-brown-dark transition-colors duration-200"
            onClick={() => handleDownload('pdf')}
            disabled={!optimizedCV || isDownloading !== null}
            size="sm"
          >
            {isDownloading === 'standard' ? (
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Download className="mr-1 h-3 w-3" />
            )}
            PDF
          </Button>
          <Button
            className="bg-moss px-3 py-1 rounded text-white text-xs flex items-center hover:bg-moss-dark transition-colors duration-200"
            onClick={() => handleDownload('latex')}
            disabled={!optimizedCV || isDownloading !== null}
            size="sm"
          >
            {isDownloading === 'latex' ? (
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FileCode className="mr-1 h-3 w-3" />
            )}
            LaTeX PDF
          </Button>
        </div>
      </div>
      
      <div className="p-6 bg-white/90 min-h-[500px]" id="resume-preview">
        {!optimizedCV ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-brown">
            <div className="w-24 h-24 flex items-center justify-center mb-4 border-2 border-dashed border-brown/30 rounded-lg">
              <FileCode className="w-10 h-10 text-brown/40" />
            </div>
            <h3 className="font-display text-lg mb-2">No CV Optimized Yet</h3>
            <p className="text-sm max-w-xs">
              Upload your base CV and paste a job description to generate an optimized resume
            </p>
          </div>
        ) : (
          <div className="optimized-resume prose prose-headings:my-4 prose-p:my-2 prose-p:leading-relaxed prose-li:my-1 max-w-none">
            {optimizedCV.optimizedContent ? (
              <div dangerouslySetInnerHTML={{ __html: optimizedCV.optimizedContent }} />
            ) : (
              <div className="p-4 text-center text-brown-dark">
                <p>No optimized content available. Please try again with a different CV or job description.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
