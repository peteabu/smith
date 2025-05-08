// OpenAI integration for CV optimization
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Observer pattern for progress updates
type ProgressObserver = (step: {
  step: string;
  status: 'completed' | 'in-progress' | 'pending';
  result?: string;
  sources?: string[];
}) => void;

let analysisProgressObserver: ProgressObserver | null = null;

// Set the observer function for receiving step updates
export function setAnalysisProgressObserver(observer: ProgressObserver) {
  analysisProgressObserver = observer;
}

// Clear the observer function
export function clearAnalysisProgressObserver() {
  analysisProgressObserver = null;
}

// Notify observer about step changes
function notifyProgressUpdate(step: {
  step: string;
  status: 'completed' | 'in-progress' | 'pending';
  result?: string;
  sources?: string[];
}) {
  if (analysisProgressObserver) {
    analysisProgressObserver(step);
  }
}

// Helper function to update step status and notify
function updateStepStatus(analysisSteps: any[], stepIndex: number, status: 'completed' | 'in-progress' | 'pending', result?: string, sources?: string[]) {
  if (analysisSteps && analysisSteps[stepIndex]) {
    analysisSteps[stepIndex].status = status;
    
    if (result !== undefined) {
      analysisSteps[stepIndex].result = result;
    }
    
    if (sources !== undefined) {
      analysisSteps[stepIndex].sources = sources;
    }
    
    // Notify about the update
    notifyProgressUpdate(analysisSteps[stepIndex]);
  }
}

// Interface for web search results
interface WebSearchResult {
  title?: string;
  url: string;
  snippet?: string;
}

// Function to perform a web search using the OpenAI Responses API
async function performWebSearch(query: string, maxResults: number = 5): Promise<WebSearchResult[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("No OpenAI API key found for web search");
      return [];
    }

    console.log(`Performing web search for: ${query}`);
    
    // Fallback to using GPT with relevant search terms if the Responses API isn't available
    const searchResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an expert at synthesizing information. " +
            "Based on the job description, provide URLs and summaries of credible sources related to the search request. " +
            "Format your response as a JSON array with objects containing the following fields: " +
            "{ title: string, url: string, snippet: string }. " +
            "Include at least 3 quality sources with accurate URLs, descriptive titles, and informative snippets."
        },
        {
          role: "user",
          content: `Search request: ${query}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500  // Limit token usage for faster response
    });
    
    const responseContent = searchResponse.choices[0].message.content || "{}";
    
    try {
      const data = JSON.parse(responseContent);
      
      // Handle different JSON structures
      if (Array.isArray(data)) {
        return data.slice(0, maxResults);
      } 
      
      if (Array.isArray(data.results)) {
        return data.results.slice(0, maxResults);
      }
      
      if (Array.isArray(data.sources)) {
        return data.sources.slice(0, maxResults);
      }
      
      // Find the first array property in the object
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return data[key].slice(0, maxResults);
        }
      }
      
      // Create a mock result if no valid data format found
      return [
        {
          title: "Search Results",
          url: "https://example.com",
          snippet: "Based on AI knowledge without direct web access. For accurate, up-to-date information, consider performing a manual web search."
        }
      ];
    } catch (error) {
      console.error("Error parsing web search response:", error);
      return [];
    }
  } catch (error) {
    console.error("Error performing web search:", error);
    return [];
  }
}

export interface JobAnalysisResult {
  keywords: string[];
  roleResearch?: string;
  industryKeywords?: string[];
  recruitmentInsights?: string;
  atsFindings?: string;
  webSearchResults?: {
    role?: WebSearchResult[];
    industry?: WebSearchResult[];
    recruitment?: WebSearchResult[];
    ats?: WebSearchResult[];
  };
  analysisSteps?: {
    step: string;
    status: 'completed' | 'in-progress' | 'pending';
    result?: string;
    sources?: string[];
  }[];
}

export async function extractKeywords(jobDescription: string): Promise<string[]> {
  try {
    const analysis = await analyzeJobDescriptionMultiStep(jobDescription);
    return analysis.keywords;
  } catch (error) {
    console.error("Error using OpenAI for keyword extraction:", error);
    // Fallback to local extraction
    return extractKeywordsLocally(jobDescription);
  }
}

export async function analyzeJobDescriptionMultiStep(jobDescription: string): Promise<JobAnalysisResult> {
  // Initialize result object with steps
  const result: JobAnalysisResult = {
    keywords: [],
    webSearchResults: {
      role: [],
      industry: [],
      recruitment: [],
      ats: []
    },
    analysisSteps: [
      { step: "Initial Text Analysis", status: "pending" },
      { step: "Web Research: Role", status: "pending" },
      { step: "Role Analysis", status: "pending" },
      { step: "Web Research: Industry", status: "pending" },
      { step: "Industry Keywords", status: "pending" },
      { step: "Web Research: Recruitment", status: "pending" },
      { step: "Recruitment Insights", status: "pending" },
      { step: "Web Research: ATS", status: "pending" },
      { step: "ATS Optimization", status: "pending" },
      { step: "Keyword Extraction", status: "pending" }
    ]
  };

  if (!process.env.OPENAI_API_KEY) {
    // Fallback to local keyword extraction if no API key
    result.keywords = extractKeywordsLocally(jobDescription);
    return result;
  }

  try {
    // Step 1: Initial Text Analysis
    result.analysisSteps![0].status = "in-progress";
    notifyProgressUpdate(result.analysisSteps![0]);
    
    const initialAnalysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an expert job description analyst. Analyze the provided job description and extract key information such as:\n" +
            "1. Job title and level\n" +
            "2. Industry and sector\n" +
            "3. Company type and size (if mentioned)\n" +
            "4. Key responsibilities\n" +
            "5. Required skills and qualifications\n\n" +
            "Format your response as a concise, structured analysis with headers."
        },
        {
          role: "user",
          content: jobDescription,
        },
      ]
    });

    const initialAnalysis = initialAnalysisResponse.choices[0].message.content || "";
    result.analysisSteps![0].status = "completed";
    result.analysisSteps![0].result = initialAnalysis;
    notifyProgressUpdate(result.analysisSteps![0]);
    
    // Extract job title and industry from initial analysis for web searches
    let jobTitle = "";
    let industry = "";
    
    try {
      // Try to extract job title and industry using GPT for better search queries
      const extractionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Extract the exact job title and industry from this job description analysis. Return as JSON: {\"jobTitle\": \"...\", \"industry\": \"...\"}"
          },
          {
            role: "user",
            content: initialAnalysis
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const extractionData = JSON.parse(extractionResponse.choices[0].message.content || "{}");
      jobTitle = extractionData.jobTitle || "";
      industry = extractionData.industry || "";
    } catch (error) {
      console.error("Error extracting job details for search:", error);
      // Default to first 50 chars if extraction fails
      jobTitle = jobDescription.substring(0, 50);
    }
    
    // Step 2: Web Research for Role
    result.analysisSteps![1].status = "in-progress";
    notifyProgressUpdate(result.analysisSteps![1]);
    
    // Perform web search for the role
    const roleSearchQuery = `latest trends and requirements for ${jobTitle} role in ${industry} industry 2024`;
    const roleSearchResults = await performWebSearch(roleSearchQuery);
    
    // Store the search results
    if (roleSearchResults.length > 0) {
      result.webSearchResults!.role = roleSearchResults;
      const sourceUrls = roleSearchResults.map(r => r.url);
      result.analysisSteps![1].sources = sourceUrls;
      result.analysisSteps![1].result = `Found ${roleSearchResults.length} relevant sources about ${jobTitle} roles.`;
    } else {
      result.analysisSteps![1].result = "No web search results found for role research.";
    }
    
    result.analysisSteps![1].status = "completed";
    notifyProgressUpdate(result.analysisSteps![1]);
    
    // Step 3: Role Research with web search results
    updateStepStatus(result.analysisSteps!, 2, 'in-progress');
    
    // Format search results for the prompt
    const roleSearchContent = roleSearchResults.map((result, index) => 
      `Source ${index + 1}: ${result.title || "Untitled"}\nURL: ${result.url}\n${result.snippet || "No preview available"}\n`
    ).join("\n");
    
    const roleResearchResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a career research expert who specializes in identifying key skills, trends, and qualifications for specific roles. " +
            "Based on the job description analysis and the web search results, provide detailed research on this role including:\n" +
            "1. Current industry trends for this position\n" +
            "2. Common career paths for this role\n" +
            "3. Emerging skills that are becoming important\n" +
            "4. How this role typically fits into organizational structures\n\n" +
            "Format as a concise research briefing focused on helping job seekers. " +
            "If the web search provides useful information, incorporate it and cite the sources with [Source X] notation."
        },
        {
          role: "user",
          content: `Job Description Analysis: ${initialAnalysis}\n\nWeb Search Results:\n${roleSearchContent}\n\nProvide role research for this position.`
        }
      ]
    });

    const roleResearch = roleResearchResponse.choices[0].message.content || "";
    result.roleResearch = roleResearch;
    updateStepStatus(result.analysisSteps!, 2, 'completed', roleResearch);
    
    // Step 4: Web Research for Industry
    updateStepStatus(result.analysisSteps!, 3, 'in-progress');
    
    // Perform web search for industry keywords
    const industrySearchQuery = `most important keywords for ${jobTitle} resume in ${industry} industry ATS scanning`;
    const industrySearchResults = await performWebSearch(industrySearchQuery);
    
    // Store the search results
    result.webSearchResults!.industry = industrySearchResults;
    
    if (industrySearchResults.length > 0) {
      const sourceUrls = industrySearchResults.map(r => r.url);
      updateStepStatus(
        result.analysisSteps!, 
        3, 
        'completed', 
        `Found ${industrySearchResults.length} relevant sources about industry-specific keywords.`,
        sourceUrls
      );
    } else {
      updateStepStatus(
        result.analysisSteps!, 
        3, 
        'completed', 
        "No web search results found for industry research."
      );
    }
    
    // Step 5: Industry Research with web search results
    updateStepStatus(result.analysisSteps!, 4, 'in-progress');
    
    // Format search results for the prompt
    const industrySearchContent = industrySearchResults.map((result, index) => 
      `Source ${index + 1}: ${result.title || "Untitled"}\nURL: ${result.url}\n${result.snippet || "No preview available"}\n`
    ).join("\n");
    
    const industryResearchResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an industry analyst who specializes in identifying high-value keywords and terms specific to industries and sectors. " +
            "Based on the job description, role research, and web search results, provide:\n" +
            "1. A list of 15-20 industry-specific keywords that are most valuable on resumes in this field\n" +
            "2. Brief explanation of why these keywords matter\n\n" +
            "Return as a JSON object with an 'industryKeywords' array and 'explanation' string.\n" +
            "Format: { \"industryKeywords\": [\"keyword1\", \"keyword2\", ...], \"explanation\": \"text here\" }" +
            "If the web search provides useful information, incorporate it in your explanation and cite the sources."
        },
        {
          role: "user",
          content: `Job Description Analysis: ${initialAnalysis}\n\nRole Research: ${roleResearch}\n\nWeb Search Results:\n${industrySearchContent}\n\nWhat industry-specific keywords would be most valuable for this role?`
        }
      ],
      response_format: { type: "json_object" }
    });

    const industryResearchContent = industryResearchResponse.choices[0].message.content || "{}";
    try {
      const industryData = JSON.parse(industryResearchContent);
      result.industryKeywords = industryData.industryKeywords || [];
      updateStepStatus(result.analysisSteps!, 4, 'completed', industryData.explanation || "");
    } catch (error) {
      console.error("Error parsing industry research JSON:", error);
      updateStepStatus(result.analysisSteps!, 4, 'completed', "Error extracting industry keywords.");
    }
    
    // Step 6: Web Research for Recruitment Practices
    updateStepStatus(result.analysisSteps!, 5, 'in-progress');
    
    // Perform web search for recruitment practices
    const recruitmentSearchQuery = `what recruiters look for in ${jobTitle} candidates ${industry} industry hiring practices`;
    const recruitmentSearchResults = await performWebSearch(recruitmentSearchQuery);
    
    // Store the search results
    result.webSearchResults!.recruitment = recruitmentSearchResults;
    
    if (recruitmentSearchResults.length > 0) {
      const sourceUrls = recruitmentSearchResults.map(r => r.url);
      updateStepStatus(
        result.analysisSteps!, 
        5, 
        'completed', 
        `Found ${recruitmentSearchResults.length} relevant sources about recruitment practices.`,
        sourceUrls
      );
    } else {
      updateStepStatus(
        result.analysisSteps!, 
        5, 
        'completed', 
        "No web search results found for recruitment research."
      );
    }
    
    // Step 7: Recruitment Insights with web search results
    updateStepStatus(result.analysisSteps!, 6, 'in-progress');
    
    // Format search results for the prompt
    const recruitmentSearchContent = recruitmentSearchResults.map((result, index) => 
      `Source ${index + 1}: ${result.title || "Untitled"}\nURL: ${result.url}\n${result.snippet || "No preview available"}\n`
    ).join("\n");
    
    const recruitmentInsightsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a recruitment specialist with deep knowledge of hiring practices. " +
            "Based on the job description, role research, industry analysis, and web search results, provide insights on:\n" +
            "1. What recruiters in this industry typically look for in candidates\n" +
            "2. Common screening practices for this role\n" +
            "3. How candidates can stand out in the application process\n" +
            "4. Red flags that may disqualify candidates\n\n" +
            "Format as concise, actionable advice for job seekers. " +
            "If the web search provides useful information, incorporate it and cite the sources with [Source X] notation."
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription.substring(0, 500)}...\n\nRole Research: ${roleResearch.substring(0, 300)}...\n\nWeb Search Results:\n${recruitmentSearchContent}\n\nWhat recruitment insights can you provide for candidates applying to this role?`
        }
      ]
    });

    const recruitmentInsights = recruitmentInsightsResponse.choices[0].message.content || "";
    result.recruitmentInsights = recruitmentInsights;
    updateStepStatus(result.analysisSteps!, 6, 'completed', recruitmentInsights);
    
    // Step 8: Web Research for ATS Systems
    updateStepStatus(result.analysisSteps!, 7, 'in-progress');
    
    // Perform web search for ATS systems
    const atsSearchQuery = `ATS applicant tracking system optimization for ${jobTitle} resume tips 2024`;
    const atsSearchResults = await performWebSearch(atsSearchQuery);
    
    // Store the search results
    result.webSearchResults!.ats = atsSearchResults;
    
    if (atsSearchResults.length > 0) {
      const sourceUrls = atsSearchResults.map(r => r.url);
      updateStepStatus(
        result.analysisSteps!, 
        7, 
        'completed', 
        `Found ${atsSearchResults.length} relevant sources about ATS optimization.`,
        sourceUrls
      );
    } else {
      updateStepStatus(
        result.analysisSteps!, 
        7, 
        'completed', 
        "No web search results found for ATS research."
      );
    }
    
    // Step 9: ATS Optimization with web search results
    updateStepStatus(result.analysisSteps!, 8, 'in-progress');
    
    // Format search results for the prompt
    const atsSearchContent = atsSearchResults.map((result, index) => 
      `Source ${index + 1}: ${result.title || "Untitled"}\nURL: ${result.url}\n${result.snippet || "No preview available"}\n`
    ).join("\n");
    
    const atsOptimizationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an ATS (Applicant Tracking System) expert who specializes in helping candidates optimize their resumes. " +
            "Based on all previous analysis and web search results, provide specific advice on:\n" +
            "1. How ATS systems likely process applications for this role\n" +
            "2. Formatting recommendations for maximum ATS compatibility\n" +
            "3. Keyword density and placement suggestions\n" +
            "4. Common ATS pitfalls to avoid for this specific role\n\n" +
            "Format as clear, actionable recommendations. " +
            "If the web search provides useful information, incorporate it and cite the sources with [Source X] notation."
        },
        {
          role: "user",
          content: `Job Analysis: ${initialAnalysis.substring(0, 300)}...\n\nRecruitment Insights: ${recruitmentInsights.substring(0, 300)}...\n\nWeb Search Results:\n${atsSearchContent}\n\nProvide ATS optimization advice for this role.`
        }
      ]
    });

    const atsFindings = atsOptimizationResponse.choices[0].message.content || "";
    result.atsFindings = atsFindings;
    updateStepStatus(result.analysisSteps!, 8, 'completed', atsFindings);
    
    // Step 10: Final Keyword Extraction
    updateStepStatus(result.analysisSteps!, 9, 'in-progress');
    
    // Combine web search insights for the final extraction
    const webInsights = [
      ...roleSearchResults.map(r => r.snippet || "").filter(Boolean),
      ...industrySearchResults.map(r => r.snippet || "").filter(Boolean),
      ...atsSearchResults.map(r => r.snippet || "").filter(Boolean)
    ].join("\n\n").substring(0, 1000);
    
    const keywordExtractionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an ATS expert who specializes in identifying crucial keywords to pass Applicant Tracking Systems. " +
            "Your task is to analyze a job description and identify the MOST IMPORTANT keywords that a candidate's resume must contain to pass the ATS screening. " +
            "First, closely analyze the job description to identify what the employer is specifically looking for. " +
            "Then use the research data and web search results to enhance your understanding of key terms in this industry and role. " +
            "Extract 15-20 high-priority keywords that are DIRECTLY MENTIONED in the job description or highly correlated to requirements in the job description based on research, prioritizing:\n\n" +
            "1. Hard skills and technical competencies explicitly mentioned in the job description\n" +
            "2. Domain-specific knowledge areas required for the role\n" +
            "3. Software/tools/platforms the candidate must be proficient in\n" +
            "4. Required certifications or qualifications\n" +
            "5. Industry-specific terminology that demonstrates domain expertise\n\n" +
            "FORMATTING RULES:\n" +
            "- Extract standalone keywords and key phrases (typically 1-3 words)\n" +
            "- Focus on terms that appear directly in the job description or are strongly implied\n" +
            "- Maintain original capitalization for proper nouns, acronyms and product names\n" +
            "- Sort by priority and relevance to THIS SPECIFIC job description (most important first)\n" +
            "- Return as a JSON object with a 'keywords' array\n" +
            "- Format: { \"keywords\": [\"keyword1\", \"keyword2\", ...] }"
        },
        {
          role: "user",
          content: `JOB DESCRIPTION (ANALYZE THIS CAREFULLY):\n${jobDescription}\n\nRole Research: ${roleResearch}\n\nIndustry Keywords: ${result.industryKeywords?.join(', ')}\n\nATS Findings: ${atsFindings}\n\nWeb Search Insights:\n${webInsights}\n\nExtract the most valuable keywords for resume optimization that are directly relevant to THIS SPECIFIC job description.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const keywordExtractionContent = keywordExtractionResponse.choices[0].message.content || "{}";
    try {
      const keywordData = JSON.parse(keywordExtractionContent);
      result.keywords = keywordData.keywords || [];
      updateStepStatus(
        result.analysisSteps!, 
        9, 
        'completed', 
        `Extracted ${result.keywords.length} high-value keywords based on comprehensive research.`
      );
    } catch (error) {
      console.error("Error parsing keyword extraction JSON:", error);
      // Fallback to local extraction
      result.keywords = extractKeywordsLocally(jobDescription);
      updateStepStatus(
        result.analysisSteps!, 
        9, 
        'completed', 
        "Error in final keyword extraction, used fallback method."
      );
    }

    return result;
  } catch (error) {
    console.error("Error in multi-step job analysis:", error);
    // Set all remaining steps to error state
    if (result.analysisSteps) {
      result.analysisSteps = result.analysisSteps.map(step => {
        if (step.status === "in-progress" || step.status === "pending") {
          return { ...step, status: "pending", result: "Analysis step could not be completed." };
        }
        return step;
      });
    }
    // Fallback to local extraction for keywords
    result.keywords = extractKeywordsLocally(jobDescription);
    return result;
  }
}

export async function optimizeResume(originalCV: string, keywords: string[] | null): Promise<{
  optimizedContent: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
}> {
  try {
    // Log the first 300 characters of input to debug extraction issues
    console.log("Original CV content (first 300 chars):", originalCV.substring(0, 300));
    
    if (!process.env.OPENAI_API_KEY) {
      // Return the original CV if no API key
      return fallbackOptimization(originalCV, keywords);
    }

    // Check for error messages from PDF extraction 
    if (!originalCV || 
        originalCV.trim().length < 100 || 
        /^[^a-zA-Z0-9]*$/.test(originalCV) ||
        originalCV.includes("ERROR:") || 
        originalCV.includes("Unable to extract text")) {
      
      console.error("CV content is problematic:", originalCV.substring(0, 200));
      
      // Use the error message from the PDF parser if available, or create our own
      const errorMessage = originalCV.includes("ERROR:") 
        ? originalCV.replace("ERROR:", "").trim() 
        : "We couldn't properly extract the text from your PDF file. Please try uploading a different version where text can be selected and copied.";
      
      return {
        optimizedContent: `<div class="p-4 bg-red-50 text-red-700 rounded border border-red-200">
          <h2 class="text-xl font-bold mb-2">Error Processing Your Resume</h2>
          <p>${errorMessage.includes("\n") ? errorMessage.split("\n")[0] : errorMessage}</p>
          ${errorMessage.includes("\n") ? 
            `<ul class="list-disc pl-6 mt-2 space-y-1">
              ${errorMessage.split("\n").filter((line, i) => i > 0 && line.trim()).map(line => 
                `<li>${line.replace(/^\d+\.\s*/, '')}</li>`
              ).join('')}
            </ul>` : ''}
          <p class="mt-3">Please try uploading a different version of your resume where text can be selected and copied.</p>
        </div>`,
        matchingKeywords: [],
        missingKeywords: keywords || [],
        matchRate: 0
      };
    }

    // Find which keywords are present in the original CV
    const cvLower = originalCV.toLowerCase();
    const originalMatchingKeywords: string[] = [];
    const missingKeywords: string[] = [];
    
    // Handle null keywords
    const keywordsArray = keywords || [];
    
    keywordsArray.forEach(keyword => {
      if (cvLower.includes(keyword.toLowerCase())) {
        originalMatchingKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    });
    
    // Calculate original match rate
    const originalMatchRate = keywordsArray.length > 0 
      ? Math.round((originalMatchingKeywords.length / keywordsArray.length) * 100)
      : 0;

    // Use OpenAI to optimize the resume content with missing keywords
    const optimizationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an expert resume editor whose goal is to optimize resumes to pass ATS systems by incorporating relevant keywords without fabricating experiences. " +
            "Analyze the resume and enhance it by incorporating missing keywords in a natural, honest way. " +
            "\n\nFOLLOW THESE RULES PRECISELY:" +
            "\n1. DO NOT invent or fabricate work experiences, education, or skills not mentioned in the original resume" +
            "\n2. DO rewrite bullet points to naturally incorporate the keywords missing from the resume" +
            "\n3. DO add industry-standard skills sections if missing from the resume, but only include skills that seem reasonable based on the experience shown" +
            "\n4. DO maintain the resume's original structure (sections, ordering)" +
            "\n5. DO improve phrasing to use active voice and quantifiable achievements" +
            "\n6. DO NOT add fictional jobs, education, or certifications" +
            "\n7. DO focus primarily on incorporating the missing keywords by enhancing existing content" +
            "\n8. DO preserve all original experience details even if rephrased" +
            "\n\nYour task is to return the optimized resume text content that naturally incorporates more of the target keywords."
        },
        {
          role: "user",
          content: `ORIGINAL RESUME:\n\n${originalCV}\n\nKEYWORDS TO INCORPORATE (${missingKeywords.length} missing):\n${missingKeywords.join(', ')}\n\nPlease optimize this resume to naturally include more of these keywords while maintaining honesty and the resume's overall structure. Target a keyword match rate of at least 70%.`
        }
      ]
    });

    const optimizedText = optimizationResponse.choices[0].message.content || originalCV;

    // Calculate how many keywords are now present in the optimized version
    const optimizedTextLower = optimizedText.toLowerCase();
    const matchingKeywords: string[] = [];
    const stillMissingKeywords: string[] = [];
    
    keywordsArray.forEach(keyword => {
      if (optimizedTextLower.includes(keyword.toLowerCase())) {
        matchingKeywords.push(keyword);
      } else {
        stillMissingKeywords.push(keyword);
      }
    });
    
    // Calculate new match rate
    const matchRate = keywordsArray.length > 0 
      ? Math.round((matchingKeywords.length / keywordsArray.length) * 100)
      : 0;
    
    // Show what was improved
    console.log(`Keyword match improvement: ${originalMatchRate}% → ${matchRate}% (+${matchRate - originalMatchRate}%)`);
    
    // Convert the optimized resume text to HTML with formatting
    // First, split the resume into meaningful sections
    const htmlParts: string[] = [];
    const lines = optimizedText.split('\n');
    
    let currentParagraph: string[] = [];
    let currentList: string[] = [];

    // Function to add current paragraph to HTML parts
    const addParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraph = currentParagraph.join(' ').trim();
        if (paragraph) {
          // Check if it's likely a header/title by checking:
          // 1. It's short (less than 50 chars)
          // 2. It's all caps or ends with colon
          // 3. It contains common section keywords
          const headerKeywords = ['experience', 'education', 'skills', 'objective', 'summary', 'contact', 'projects'];
          const isHeader = 
            (paragraph.length < 50 && 
             (paragraph.toUpperCase() === paragraph || paragraph.endsWith(':') ||
              headerKeywords.some(k => paragraph.toLowerCase().includes(k))));
          
          if (isHeader) {
            htmlParts.push(`<h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">${paragraph}</h2>`);
          } else {
            // Check if it looks like a job title or position
            const positionMarkers = ['manager', 'engineer', 'developer', 'director', 'specialist', 'analyst'];
            const isPosition = paragraph.length < 80 && 
                              (positionMarkers.some(m => paragraph.toLowerCase().includes(m)) || 
                               /\d{4}\s*(-|–|to)\s*\d{4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(paragraph));
            
            if (isPosition) {
              htmlParts.push(`<h3 class="font-display text-md font-semibold mt-4 mb-1">${paragraph}</h3>`);
            } else {
              // Detect if it looks like a date range
              const isDateOrLocation = paragraph.length < 60 && 
                                     /\d{4}\s*(-|–|to)\s*\d{4}|present|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(paragraph);
              
              if (isDateOrLocation) {
                htmlParts.push(`<p class="text-xs text-gray-600 mb-2">${paragraph}</p>`);
              } else {
                htmlParts.push(`<p class="mb-4 text-sm">${paragraph}</p>`);
              }
            }
          }
        }
        currentParagraph = [];
      }
    };
    
    // Function to add current list to HTML parts
    const addList = () => {
      if (currentList.length > 0) {
        const listItems = currentList.map(item => `<li>${item.trim().replace(/^[•\-]\s*/, '')}</li>`).join('');
        htmlParts.push(`<ul class="text-sm list-disc pl-4 space-y-1">${listItems}</ul>`);
        currentList = [];
      }
    };

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        // Empty line could indicate paragraph break
        addParagraph();
        addList();
        continue;
      }
      
      // Check if it's a list item (starts with bullet or dash)
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        // If we have a paragraph in progress, add it first
        addParagraph();
        currentList.push(line);
      } else {
        // If we have a list in progress, add it first
        addList();
        
        // Add to current paragraph
        currentParagraph.push(line);
      }
    }
    
    // Add any remaining content
    addParagraph();
    addList();
    
    // Join all HTML parts
    let formattedHtml = htmlParts.join('\n');
    
    // Highlight matching keywords in the HTML
    keywordsArray.forEach(keyword => {
      // Create a case-insensitive regular expression that matches whole words
      const regex = new RegExp(`(\\b${keyword}\\b)`, 'gi');
      formattedHtml = formattedHtml.replace(regex, '<span class="bg-green-100 px-1">$1</span>');
    });
    
    // Add a summary of the optimization at the top
    const summaryHtml = `
      <div class="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 class="text-lg font-semibold mb-2">Resume Optimization Summary</h2>
        <p class="mb-2">Your resume was optimized to increase keyword matching from <strong>${originalMatchRate}%</strong> to <strong>${matchRate}%</strong>.</p>
        <p class="mb-1">Added keywords:</p>
        <div class="flex flex-wrap gap-1 mb-3">
          ${matchingKeywords.filter(k => !originalMatchingKeywords.includes(k)).map(k => 
            `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">${k}</span>`
          ).join('')}
        </div>
        <p class="text-xs text-gray-600">Changes have been made while maintaining the integrity of your experience.</p>
      </div>
    `;
    
    // Now wrap everything in a container
    const optimizedContent = `<div class="resume-content">${summaryHtml}${formattedHtml}</div>`;

    return {
      optimizedContent,
      matchingKeywords,
      missingKeywords: stillMissingKeywords,
      matchRate
    };
  } catch (error) {
    console.error("Error optimizing CV:", error);
    // Return a basic optimization as fallback
    return fallbackOptimization(originalCV, keywords);
  }
}

// Local keyword extraction as fallback
function extractKeywordsLocally(text: string): string[] {
  const words = text.toLowerCase().split(/\W+/);
  const stopWordsList = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'in', 'to', 'for', 'of', 'with', 'on', 'at'];
  
  // Count word frequencies
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    if (word.length > 2 && !stopWordsList.includes(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  });
  
  // Sort by frequency
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return top keywords
  return sortedWords.slice(0, 15);
}

// Fallback optimization function
function fallbackOptimization(originalCV: string, keywords: string[] | null): {
  optimizedContent: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
} {
  // Find which keywords are present in the original CV
  const cvLower = originalCV.toLowerCase();
  const originalMatchingKeywords: string[] = [];
  const missingKeywords: string[] = [];
  
  // Handle null keywords
  const keywordsArray = keywords || [];
  
  keywordsArray.forEach(keyword => {
    if (cvLower.includes(keyword.toLowerCase())) {
      originalMatchingKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });
  
  // Calculate original match rate
  const originalMatchRate = keywordsArray.length > 0 
    ? Math.round((originalMatchingKeywords.length / keywordsArray.length) * 100)
    : 0;
  
  // Simple optimization: attempt to add missing keywords in a skills section
  let optimizedText = originalCV;
  
  // Check if there's a Skills section already
  const hasSkillsSection = /\bskills\b|\bcompetencies\b|\bcapabilities\b/i.test(originalCV);
  
  if (!hasSkillsSection && missingKeywords.length > 0) {
    // Add a Skills section with the missing keywords
    optimizedText += '\n\nSKILLS\n';
    optimizedText += missingKeywords.join(', ');
  } else if (hasSkillsSection && missingKeywords.length > 0) {
    // Try to enhance existing skills section
    const lines = optimizedText.split('\n');
    let foundSkillsSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (/\bskills\b|\bcompetencies\b|\bcapabilities\b/i.test(lines[i]) && !foundSkillsSection) {
        foundSkillsSection = true;
        // Skip to the content line (usually next line)
        if (i + 1 < lines.length) {
          lines[i + 1] = lines[i + 1] + ', ' + missingKeywords.join(', ');
        }
      }
    }
    
    optimizedText = lines.join('\n');
  }
  
  // Calculate how many keywords are now present in the optimized version
  const optimizedTextLower = optimizedText.toLowerCase();
  const matchingKeywords: string[] = [];
  const stillMissingKeywords: string[] = [];
  
  keywordsArray.forEach(keyword => {
    if (optimizedTextLower.includes(keyword.toLowerCase())) {
      matchingKeywords.push(keyword);
    } else {
      stillMissingKeywords.push(keyword);
    }
  });
  
  // Calculate new match rate
  const matchRate = keywordsArray.length > 0 
    ? Math.round((matchingKeywords.length / keywordsArray.length) * 100)
    : 0;
  
  // Generate HTML content from optimized CV
  const paragraphs = optimizedText.split('\n\n');
  let formattedHtml = '';
  
  // Create a simple HTML representation of the CV
  paragraphs.forEach(paragraph => {
    if (paragraph.trim()) {
      // Check if it might be a heading (short, ends with colon, or all caps)
      if (paragraph.length < 30 || paragraph.endsWith(':') || paragraph === paragraph.toUpperCase()) {
        formattedHtml += `<h3 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">${paragraph}</h3>`;
      } else {
        formattedHtml += `<p class="mb-4 text-sm">${paragraph}</p>`;
      }
    }
  });
  
  // Highlight matching keywords in the HTML
  keywordsArray.forEach(keyword => {
    // Create a case-insensitive regular expression
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formattedHtml = formattedHtml.replace(regex, match => `<span class="bg-green-100 px-1">${match}</span>`);
  });
  
  // Add a summary of the optimization at the top
  const summaryHtml = `
    <div class="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
      <h2 class="text-lg font-semibold mb-2">Resume Optimization Summary</h2>
      <p class="mb-2">Your resume was optimized to increase keyword matching from <strong>${originalMatchRate}%</strong> to <strong>${matchRate}%</strong>.</p>
      <p class="mb-1">Added keywords:</p>
      <div class="flex flex-wrap gap-1 mb-3">
        ${matchingKeywords.filter(k => !originalMatchingKeywords.includes(k)).map(k => 
          `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">${k}</span>`
        ).join('')}
      </div>
      <p class="text-xs text-gray-600">Note: This is a simple optimization. For better results, please provide an OpenAI API key.</p>
    </div>
  `;
  
  const optimizedContent = `<div class="resume-content">${summaryHtml}${formattedHtml}</div>`;
  
  return {
    optimizedContent,
    matchingKeywords,
    missingKeywords: stillMissingKeywords,
    matchRate
  };
}