import { CvOptimizationResult, downloadOptimizedCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, FileCode, FileText, Code, File, FileClock } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

interface ResumePreviewProps {
  optimizedCV: CvOptimizationResult | null;
}

export function ResumePreview({ optimizedCV }: ResumePreviewProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<'text' | 'latex' | 'docx' | null>(null);

  const handleExport = async (format: 'text' | 'latex' | 'docx', useOriginal: boolean = false) => {
    if (!optimizedCV?.id) return;
    
    setIsExporting(format);
    
    try {
      // Use iframe to avoid browser blocking the download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Set the source to the export endpoint with original flag if needed
      iframe.src = `/api/cv/export/${optimizedCV.id}?format=${format}${useOriginal ? '&original=true' : ''}`;
      
      // Remove iframe after a timeout
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
      
      let formatName = 'Plain Text';
      if (format === 'latex') formatName = 'LaTeX';
      if (format === 'docx') formatName = 'Word-compatible HTML';
      
      const cvType = useOriginal ? 'original' : 'optimized';
      
      toast({
        title: "Export started",
        description: `Your ${cvType} CV is exporting as ${formatName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export CV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsExporting(null);
      }, 1500); // Slight delay to show loading status
    }
  };

  // Check if optimization has an error
  const hasError = optimizedCV?.optimizedContent && (
    optimizedCV.optimizedContent.includes('Error Processing Your Resume') || 
    optimizedCV.optimizedContent.includes('error-message')
  );

  return (
    <div className="bg-paper-texture bg-cover rounded-lg overflow-hidden paper-shadow">
      <div className="bg-moss/10 backdrop-blur-sm p-4 flex justify-between items-center border-b border-brown/20">
        <h2 className="font-display text-lg">Optimized CV Preview</h2>
        
        {optimizedCV && !hasError && (
          <div id="export-dropdown" className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-brown px-3 py-1 rounded text-white text-xs flex items-center hover:bg-brown-dark transition-colors duration-200"
                  disabled={isExporting !== null}
                  size="sm"
                >
                  {isExporting ? (
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  Export Resume
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="pl-2 pt-2 pb-1 text-xs text-brown-400">Optimized Resume</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExport('text')}>
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Text (.txt)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('latex')}>
                    <Code className="h-4 w-4 mr-2" />
                    <span>LaTeX (.tex)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('docx')}>
                    <File className="h-4 w-4 mr-2" />
                    <span>Word-compatible (.html)</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="pl-2 pt-2 pb-1 text-xs text-brown-400">Original Resume</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExport('text', true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Text (.txt)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('latex', true)}>
                    <Code className="h-4 w-4 mr-2" />
                    <span>LaTeX (.tex)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('docx', true)}>
                    <File className="h-4 w-4 mr-2" />
                    <span>Word-compatible (.html)</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
              optimizedCV.optimizedContent.includes('Error Processing Your Resume') || 
              optimizedCV.optimizedContent.includes('error-message') ? (
                // If the content contains an error message, display it as is
                <div dangerouslySetInnerHTML={{ __html: optimizedCV.optimizedContent }} />
              ) : (
                // Otherwise show the regular optimized content
                <div dangerouslySetInnerHTML={{ __html: optimizedCV.optimizedContent }} />
              )
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
