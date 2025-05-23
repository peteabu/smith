import { CvOptimizationResult, downloadOptimizedCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, FileCode, FileText, Code, File, FileClock, Copy, Check } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";

interface ResumePreviewProps {
  optimizedCV: CvOptimizationResult | null;
}

export function ResumePreview({ optimizedCV }: ResumePreviewProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<'text' | 'markdown' | 'docx' | 'pdf' | null>(null);
  const [isCopying, setIsCopying] = useState<string | null>(null);

  const handleExport = async (format: 'text' | 'markdown' | 'docx' | 'pdf', useOriginal: boolean = false) => {
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
      if (format === 'markdown') formatName = 'Markdown';
      if (format === 'docx') formatName = 'Word-compatible HTML';
      if (format === 'pdf') formatName = 'PDF';
      
      const cvType = useOriginal ? 'original' : 'optimized';
      
      toast({
        title: "Export started",
        description: `Your ${cvType} resume is exporting as ${formatName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsExporting(null);
      }, 1500); // Slight delay to show loading status
    }
  };
  
  // Function to fetch and copy content to clipboard
  const handleCopy = async (format: 'text' | 'markdown' | 'docx', useOriginal: boolean = false) => {
    if (!optimizedCV?.id) return;
    
    const copyId = `${format}-${useOriginal ? 'original' : 'optimized'}`;
    setIsCopying(copyId);
    
    try {
      let content = '';
      
      // When copying the text currently displayed on screen
      if (format === 'text' && !useOriginal && optimizedCV.optimizedContent) {
        // Extract plain text from the HTML content that's currently displayed
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = optimizedCV.optimizedContent;
        
        // Remove summary and keywords sections that shouldn't be part of the resume
        const summaryElement = tempDiv.querySelector('.resume-optimization-summary');
        if (summaryElement) {
          summaryElement.remove();
        }
        
        const keywordsElement = tempDiv.querySelector('.keywords-section');
        if (keywordsElement) {
          keywordsElement.remove();
        }
        
        content = tempDiv.textContent || tempDiv.innerText || '';
        console.log("Using current displayed content for copying (with summary/keywords removed)");
      }
      // If format is markdown and we have the markdownContent directly, use it
      else if (format === 'markdown' && optimizedCV.markdownContent && !useOriginal) {
        content = optimizedCV.markdownContent;
        console.log("Using direct markdown content for copying");
      } else {
        // Otherwise fetch from the export endpoint
        const response = await fetch(`/api/cv/export/${optimizedCV.id}?format=${format}${useOriginal ? '&original=true' : ''}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }
        
        content = await response.text();
        console.log("Content fetched for copying from API:", content.substring(0, 100) + "...");
      }
      
      // Log the content to make sure we're getting it
      if (content.length > 100) {
        console.log("Content ready for clipboard:", content.substring(0, 100) + "...[truncated]");
      } else {
        console.log("Content ready for clipboard (EMPTY OR SHORT):", content);
      }
      
      try {
        // Copy to clipboard - using a more reliable method
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (clipboardError) {
        console.error("Clipboard copy error:", clipboardError);
        // Fallback to the original method
        await navigator.clipboard.writeText(content);
      }
      
      let formatName = 'Plain Text';
      if (format === 'markdown') formatName = 'Markdown';
      if (format === 'docx') formatName = 'Word-compatible HTML';
      
      const cvType = useOriginal ? 'original' : 'optimized';
      
      toast({
        title: "Copied to clipboard",
        description: `Your ${cvType} resume has been copied as ${formatName}`,
      });
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy content. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Reset copy state after a short delay
      setTimeout(() => {
        setIsCopying(null);
      }, 1500);
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
        <h2 className="font-display text-lg">Optimized Resume Preview</h2>
        
        {optimizedCV && !hasError && (
          <div id="export-dropdown" className="flex space-x-2">
            {/* Add Full Copy Button */}
            <Button
              className="bg-green-600 px-3 py-1 rounded text-white text-xs flex items-center hover:bg-green-700 transition-colors duration-200"
              size="sm"
              onClick={() => handleCopy('text')}
            >
              {isCopying === 'text-optimized' ? (
                <Check className="mr-1 h-3 w-3" />
              ) : (
                <Copy className="mr-1 h-3 w-3" />
              )}
              Copy Full Resume
            </Button>
            
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
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Resume Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="pl-2 pt-2 pb-1 text-xs text-brown-400">Optimized Resume</DropdownMenuLabel>
                  
                  {/* Download options */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Download className="h-4 w-4 mr-2" />
                      <span>Download as...</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleExport('text')}>
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Text (.txt)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('markdown')}>
                        <Code className="h-4 w-4 mr-2" />
                        <span>Markdown (.md)</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  
                  {/* Copy options */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Copy className="h-4 w-4 mr-2" />
                      <span>Copy as...</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleCopy('text')}>
                        {isCopying === 'text-optimized' ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        <span>Plain Text</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy('markdown')}>
                        {isCopying === 'markdown-optimized' ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <Code className="h-4 w-4 mr-2" />
                        )}
                        <span>Markdown</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy('docx')}>
                        {isCopying === 'docx-optimized' ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <File className="h-4 w-4 mr-2" />
                        )}
                        <span>HTML</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuSeparator className="my-2" />
                
                {/* JUST COPY THE FULL TEXT - prominent option */}
                <DropdownMenuItem 
                  onClick={() => handleCopy('text')} 
                  className="bg-green-50 font-semibold text-green-900"
                >
                  {isCopying === 'text-optimized' ? (
                    <Check className="h-5 w-5 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 mr-2 text-green-600" />
                  )}
                  <span>Copy Complete Mimic Resume as Text</span>
                </DropdownMenuItem>
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
            <h3 className="font-display text-lg mb-2">No Resume Optimized Yet</h3>
            <p className="text-sm max-w-xs">
              Upload your base resume and paste a job description to generate an optimized version
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
