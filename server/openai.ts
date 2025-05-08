// OpenAI integration for CV optimization
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface JobAnalysisResult {
  keywords: string[];
  roleResearch?: string;
  industryKeywords?: string[];
  recruitmentInsights?: string;
  atsFindings?: string;
  analysisSteps?: {
    step: string;
    status: 'completed' | 'in-progress' | 'pending';
    result?: string;
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
    analysisSteps: [
      { step: "Initial Text Analysis", status: "pending" },
      { step: "Role Research", status: "pending" },
      { step: "Industry Research", status: "pending" },
      { step: "Recruitment Insights", status: "pending" },
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
    
    // Step 2: Role Research
    result.analysisSteps![1].status = "in-progress";
    
    const roleResearchResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a career research expert who specializes in identifying key skills, trends, and qualifications for specific roles. " +
            "Based on the job description analysis, provide detailed research on this role including:\n" +
            "1. Current industry trends for this position\n" +
            "2. Common career paths for this role\n" +
            "3. Emerging skills that are becoming important\n" +
            "4. How this role typically fits into organizational structures\n\n" +
            "Format as a concise research briefing focused on helping job seekers."
        },
        {
          role: "user",
          content: `Job Description Analysis: ${initialAnalysis}\n\nProvide role research for this position.`
        }
      ]
    });

    const roleResearch = roleResearchResponse.choices[0].message.content || "";
    result.roleResearch = roleResearch;
    result.analysisSteps![1].status = "completed";
    result.analysisSteps![1].result = roleResearch;
    
    // Step 3: Industry Research
    result.analysisSteps![2].status = "in-progress";
    
    const industryResearchResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an industry analyst who specializes in identifying high-value keywords and terms specific to industries and sectors. " +
            "Based on the job description and role research, provide:\n" +
            "1. A list of 15-20 industry-specific keywords that are most valuable on resumes in this field\n" +
            "2. Brief explanation of why these keywords matter\n\n" +
            "Return as a JSON object with an 'industryKeywords' array and 'explanation' string.\n" +
            "Format: { \"industryKeywords\": [\"keyword1\", \"keyword2\", ...], \"explanation\": \"text here\" }"
        },
        {
          role: "user",
          content: `Job Description Analysis: ${initialAnalysis}\n\nRole Research: ${roleResearch}\n\nWhat industry-specific keywords would be most valuable for this role?`
        }
      ],
      response_format: { type: "json_object" }
    });

    const industryResearchContent = industryResearchResponse.choices[0].message.content || "{}";
    try {
      const industryData = JSON.parse(industryResearchContent);
      result.industryKeywords = industryData.industryKeywords || [];
      result.analysisSteps![2].status = "completed";
      result.analysisSteps![2].result = industryData.explanation || "";
    } catch (error) {
      console.error("Error parsing industry research JSON:", error);
      result.analysisSteps![2].status = "completed";
      result.analysisSteps![2].result = "Error extracting industry keywords.";
    }
    
    // Step 4: Recruitment Insights
    result.analysisSteps![3].status = "in-progress";
    
    const recruitmentInsightsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a recruitment specialist with deep knowledge of hiring practices. " +
            "Based on the job description, role research, and industry analysis, provide insights on:\n" +
            "1. What recruiters in this industry typically look for in candidates\n" +
            "2. Common screening practices for this role\n" +
            "3. How candidates can stand out in the application process\n" +
            "4. Red flags that may disqualify candidates\n\n" +
            "Format as concise, actionable advice for job seekers."
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription.substring(0, 500)}...\n\nRole Research: ${roleResearch.substring(0, 300)}...\n\nWhat recruitment insights can you provide for candidates applying to this role?`
        }
      ]
    });

    const recruitmentInsights = recruitmentInsightsResponse.choices[0].message.content || "";
    result.recruitmentInsights = recruitmentInsights;
    result.analysisSteps![3].status = "completed";
    result.analysisSteps![3].result = recruitmentInsights;
    
    // Step 5: ATS Optimization
    result.analysisSteps![4].status = "in-progress";
    
    const atsOptimizationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an ATS (Applicant Tracking System) expert who specializes in helping candidates optimize their resumes. " +
            "Based on all previous analysis, provide specific advice on:\n" +
            "1. How ATS systems likely process applications for this role\n" +
            "2. Formatting recommendations for maximum ATS compatibility\n" +
            "3. Keyword density and placement suggestions\n" +
            "4. Common ATS pitfalls to avoid for this specific role\n\n" +
            "Format as clear, actionable recommendations."
        },
        {
          role: "user",
          content: `Job Analysis: ${initialAnalysis.substring(0, 300)}...\n\nRecruitment Insights: ${recruitmentInsights.substring(0, 300)}...\n\nProvide ATS optimization advice for this role.`
        }
      ]
    });

    const atsFindings = atsOptimizationResponse.choices[0].message.content || "";
    result.atsFindings = atsFindings;
    result.analysisSteps![4].status = "completed";
    result.analysisSteps![4].result = atsFindings;
    
    // Step 6: Final Keyword Extraction
    result.analysisSteps![5].status = "in-progress";
    
    const keywordExtractionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an ATS expert who synthesizes all aspects of job analysis to extract the most high-value keywords. " +
            "Based on all previous analysis steps, extract 15-20 important keywords, prioritizing:\n" +
            "1. Hard skills and technical competencies\n" +
            "2. Domain-specific knowledge areas\n" +
            "3. Software/tools/platforms mentioned\n" +
            "4. Certifications or qualifications\n" +
            "5. Industry-specific terminology\n\n" +
            "FORMATTING RULES:\n" +
            "- Extract standalone keywords and key phrases only (typically 1-3 words)\n" +
            "- Maintain original capitalization for proper nouns, acronyms and product names\n" +
            "- Exclude generic soft skills unless heavily emphasized\n" +
            "- Sort by priority (most important first)\n" +
            "- Return as a JSON object with a 'keywords' array\n" +
            "- Format: { \"keywords\": [\"keyword1\", \"keyword2\", ...] }"
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription.substring(0, 300)}...\n\nRole Research: ${roleResearch.substring(0, 200)}...\n\nIndustry Keywords: ${result.industryKeywords?.join(', ')}\n\nATS Findings: ${atsFindings.substring(0, 200)}...\n\nExtract the most valuable keywords for resume optimization.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const keywordExtractionContent = keywordExtractionResponse.choices[0].message.content || "{}";
    try {
      const keywordData = JSON.parse(keywordExtractionContent);
      result.keywords = keywordData.keywords || [];
      result.analysisSteps![5].status = "completed";
      result.analysisSteps![5].result = `Extracted ${result.keywords.length} high-value keywords.`;
    } catch (error) {
      console.error("Error parsing keyword extraction JSON:", error);
      // Fallback to local extraction
      result.keywords = extractKeywordsLocally(jobDescription);
      result.analysisSteps![5].status = "completed";
      result.analysisSteps![5].result = "Error in final keyword extraction, used fallback method.";
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

    // Find which keywords are present in the CV
    const cvLower = originalCV.toLowerCase();
    const matchingKeywords: string[] = [];
    const missingKeywords: string[] = [];
    
    // Handle null keywords
    const keywordsArray = keywords || [];
    
    keywordsArray.forEach(keyword => {
      if (cvLower.includes(keyword.toLowerCase())) {
        matchingKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    });
    
    // Calculate match rate
    const matchRate = keywordsArray.length > 0 
      ? Math.round((matchingKeywords.length / keywordsArray.length) * 100)
      : 0;

    // Convert the resume text to HTML with minimal formatting
    // First, split the resume into meaningful sections
    const htmlParts: string[] = [];
    const lines = originalCV.split('\n');
    
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
      if (line.startsWith('•') || line.startsWith('-')) {
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
    
    // Now wrap everything in a container
    const optimizedContent = `<div class="resume-content">${formattedHtml}</div>`;

    return {
      optimizedContent,
      matchingKeywords,
      missingKeywords,
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
  // Find which keywords are present in the CV
  const cvLower = originalCV.toLowerCase();
  const matchingKeywords: string[] = [];
  const missingKeywords: string[] = [];
  
  // Handle null keywords
  const keywordsArray = keywords || [];
  
  keywordsArray.forEach(keyword => {
    if (cvLower.includes(keyword.toLowerCase())) {
      matchingKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });
  
  // Calculate match rate
  const matchRate = keywordsArray.length > 0 
    ? Math.round((matchingKeywords.length / keywordsArray.length) * 100)
    : 0;
  
  // Generate HTML content from original CV
  const paragraphs = originalCV.split('\n\n');
  let optimizedContent = '';
  
  // Create a simple HTML representation of the CV
  paragraphs.forEach(paragraph => {
    if (paragraph.trim()) {
      // Check if it might be a heading (short, ends with colon, or all caps)
      if (paragraph.length < 30 || paragraph.endsWith(':') || paragraph === paragraph.toUpperCase()) {
        optimizedContent += `<h3 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">${paragraph}</h3>`;
      } else {
        optimizedContent += `<p class="mb-4 text-sm">${paragraph}</p>`;
      }
    }
  });
  
  return {
    optimizedContent,
    matchingKeywords,
    missingKeywords,
    matchRate
  };
}