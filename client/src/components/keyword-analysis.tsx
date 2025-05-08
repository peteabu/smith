import { useState } from "react";
import { KeywordAnalysisResult, CvOptimizationResult } from "@/lib/cv-analyzer";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CheckCircle2, Clock, Target } from "lucide-react";

interface WebSearchResult {
  title?: string;
  url: string;
  snippet?: string;
}

interface KeywordAnalysisProps {
  analysis: KeywordAnalysisResult | null;
  optimization: CvOptimizationResult | null;
  showFull?: boolean;
}

export function KeywordAnalysis({ analysis, optimization, showFull = false }: KeywordAnalysisProps) {
  const [activeTab, setActiveTab] = useState("keywords");
  
  // If no analysis has been done yet
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg p-6 paper-shadow">
        <h2 className="font-display text-lg mb-3">Keyword Analysis</h2>
        <p className="text-sm text-brown mb-4">No job description analyzed yet</p>
      </div>
    );
  }

  const { 
    keywords, 
    analysisSteps, 
    roleResearch, 
    industryKeywords, 
    recruitmentInsights, 
    atsFindings,
    webSearchResults
  } = analysis;

  // Helper to render the status badge for each step
  const getStepStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      case 'pending':
      default:
        return <AlertCircle className="h-5 w-5 text-gray-300" />;
    }
  };

  // Full display mode (used in the results step)
  if (showFull) {
    return (
      <div>
        <h2 className="font-display text-lg mb-3">Keyword Analysis</h2>
        <p className="text-sm text-brown mb-4">
          {keywords.length} key terms identified through multi-step analysis
        </p>

        // Full display shows a summary view with key metrics
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-block bg-paper py-1 px-3 rounded-full text-xs font-mono"
              >
                {keyword}
              </span>
            ))}
          </div>
          
          {optimization && (
            <div className="space-y-3">
              <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                Resume Match Score
              </h3>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-paper flex items-center justify-center border-4 border-green-100">
                  <span className="text-lg font-bold">{optimization.matchRate}%</span>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs">Present in your CV</span>
                      <span className="text-green-600 text-xs">
                        {optimization.matchingKeywords.length}/{keywords.length} keywords
                      </span>
                    </div>
                    <Progress 
                      value={(optimization.matchingKeywords.length / keywords.length) * 100} 
                      className="h-2 bg-cream overflow-hidden rounded" 
                    />
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs">Missing from your CV</span>
                      <span className="text-red-600 text-xs">
                        {optimization.missingKeywords.length}/{keywords.length} keywords
                      </span>
                    </div>
                    <Progress 
                      value={(optimization.missingKeywords.length / keywords.length) * 100} 
                      className="h-2 bg-cream overflow-hidden rounded" 
                      indicatorClassName="bg-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Regular tabbed display (used in the analysis step)
  return (
    <div className="bg-white rounded-lg p-6 paper-shadow">
      <h2 className="font-display text-lg mb-3">Keyword Analysis</h2>
      <p className="text-sm text-brown mb-4">
        {keywords.length} key terms identified through multi-step analysis
      </p>
        <Tabs defaultValue="keywords" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="ats">ATS Insights</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
          </TabsList>
        
        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-block bg-paper py-1 px-3 rounded-full text-xs font-mono"
              >
                {keyword}
              </span>
            ))}
          </div>

          {industryKeywords && industryKeywords.length > 0 && (
            <div className="mt-4">
              <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                Industry-Specific Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {industryKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-block bg-amber-50 py-1 px-3 rounded-full text-xs font-mono border border-amber-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {optimization && (
            <div className="mt-6">
              <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                Keyword Match Analysis
              </h3>

              <div className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs">Present in your CV</span>
                    <span className="text-green-600 text-xs">
                      {optimization.matchingKeywords.length}/{keywords.length} keywords
                    </span>
                  </div>
                  <Progress 
                    value={(optimization.matchingKeywords.length / keywords.length) * 100} 
                    className="h-2 bg-cream overflow-hidden rounded" 
                  />
                </div>

                <div className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs">Missing from your CV</span>
                    <span className="text-red-600 text-xs">
                      {optimization.missingKeywords.length}/{keywords.length} keywords
                    </span>
                  </div>
                  <Progress 
                    value={(optimization.missingKeywords.length / keywords.length) * 100} 
                    className="h-2 bg-cream overflow-hidden rounded" 
                    indicatorClassName="bg-red-500"
                  />
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* Research Tab */}
        <TabsContent value="research" className="space-y-4">
          {roleResearch ? (
            <div className="prose prose-sm max-w-none">
              <div className="bg-cream p-4 rounded text-sm whitespace-pre-line">
                {roleResearch}
              </div>
            </div>
          ) : (
            <div className="bg-cream p-4 rounded text-sm">
              <p>No detailed role research available for this analysis.</p>
            </div>
          )}
        </TabsContent>
        
        {/* ATS Insights Tab */}
        <TabsContent value="ats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Recruitment Insights
                </div>
              </h3>
              {recruitmentInsights ? (
                <div className="bg-cream p-4 rounded text-sm whitespace-pre-line h-[250px] overflow-y-auto">
                  {recruitmentInsights}
                </div>
              ) : (
                <div className="bg-cream p-4 rounded text-sm">
                  <p>No recruitment insights available.</p>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  ATS Findings
                </div>
              </h3>
              {atsFindings ? (
                <div className="bg-cream p-4 rounded text-sm whitespace-pre-line h-[250px] overflow-y-auto">
                  {atsFindings}
                </div>
              ) : (
                <div className="bg-cream p-4 rounded text-sm">
                  <p>No ATS findings available.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          {webSearchResults ? (
            <div className="space-y-6">
              {webSearchResults.role && webSearchResults.role.length > 0 && (
                <div>
                  <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Role Research Sources
                    </div>
                  </h3>
                  <div className="space-y-3">
                    {webSearchResults.role.map((source, index) => (
                      <div key={index} className="bg-cream p-3 rounded-md border border-cream-dark">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline mb-1 block"
                        >
                          {source.title || source.url}
                        </a>
                        <p className="text-xs text-gray-600 mb-2 truncate">{source.url}</p>
                        {source.snippet && (
                          <p className="text-sm">{source.snippet}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {webSearchResults.industry && webSearchResults.industry.length > 0 && (
                <div>
                  <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Industry Keyword Sources
                    </div>
                  </h3>
                  <div className="space-y-3">
                    {webSearchResults.industry.map((source, index) => (
                      <div key={index} className="bg-cream p-3 rounded-md border border-cream-dark">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline mb-1 block"
                        >
                          {source.title || source.url}
                        </a>
                        <p className="text-xs text-gray-600 mb-2 truncate">{source.url}</p>
                        {source.snippet && (
                          <p className="text-sm">{source.snippet}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {webSearchResults.recruitment && webSearchResults.recruitment.length > 0 && (
                <div>
                  <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-500" />
                      Recruitment Practice Sources
                    </div>
                  </h3>
                  <div className="space-y-3">
                    {webSearchResults.recruitment.map((source, index) => (
                      <div key={index} className="bg-cream p-3 rounded-md border border-cream-dark">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline mb-1 block"
                        >
                          {source.title || source.url}
                        </a>
                        <p className="text-xs text-gray-600 mb-2 truncate">{source.url}</p>
                        {source.snippet && (
                          <p className="text-sm">{source.snippet}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {webSearchResults.ats && webSearchResults.ats.length > 0 && (
                <div>
                  <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      ATS Optimization Sources
                    </div>
                  </h3>
                  <div className="space-y-3">
                    {webSearchResults.ats.map((source, index) => (
                      <div key={index} className="bg-cream p-3 rounded-md border border-cream-dark">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline mb-1 block"
                        >
                          {source.title || source.url}
                        </a>
                        <p className="text-xs text-gray-600 mb-2 truncate">{source.url}</p>
                        {source.snippet && (
                          <p className="text-sm">{source.snippet}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!webSearchResults.role || webSearchResults.role.length === 0) &&
               (!webSearchResults.industry || webSearchResults.industry.length === 0) &&
               (!webSearchResults.recruitment || webSearchResults.recruitment.length === 0) &&
               (!webSearchResults.ats || webSearchResults.ats.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No web search sources were used in this analysis.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No web search results available for this analysis.</p>
            </div>
          )}
        </TabsContent>
        
        {/* Process Tab */}
        <TabsContent value="process" className="space-y-4">
          {analysisSteps && analysisSteps.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {analysisSteps.map((step, index) => (
                <AccordionItem value={`step-${index}`} key={index}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      {getStepStatusBadge(step.status)}
                      <span>{step.step}</span>
                      {step.sources && step.sources.length > 0 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                          {step.sources.length} sources
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-cream p-3 rounded text-sm whitespace-pre-line">
                      {step.result || "No details available for this step."}
                      
                      {step.sources && step.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-brown/10">
                          <p className="font-medium text-xs mb-2">Sources:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            {step.sources.map((source, idx) => (
                              <li key={idx}>
                                <a 
                                  href={source} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline break-all"
                                >
                                  {source}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-sm text-gray-500">
              <p>No process information available.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
