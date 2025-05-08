// OpenAI integration for CV optimization
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractKeywords(jobDescription: string): Promise<string[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to local keyword extraction if no API key
      return extractKeywordsLocally(jobDescription);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an ATS (Applicant Tracking System) expert who specializes in identifying high-priority keywords from job descriptions that hiring systems scan for.\n\n" +
            "TASK:\n" +
            "Extract 15-20 important keywords from the provided job description, prioritizing:\n" +
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
            "- Format: { \"keywords\": [\"keyword1\", \"keyword2\", ...] }",
        },
        {
          role: "user",
          content: jobDescription,
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      return [];
    }
    
    try {
      const result = JSON.parse(response.choices[0].message.content);
      console.log("Extracted keywords:", result.keywords);
      
      // Extract keywords from the response
      if (Array.isArray(result.keywords)) {
        return result.keywords;
      }
      
      // Fallback for compatibility with the old format
      const keywords: string[] = [];
      
      // Extract from the Keywords_Ranked array if present
      if (Array.isArray(result.Keywords_Ranked)) {
        result.Keywords_Ranked.forEach((item: any) => {
          if (item && typeof item.keyword === 'string') {
            keywords.push(item.keyword);
          }
        });
      }
      
      // Add from Core_Hard_Skills if present
      if (Array.isArray(result.Core_Hard_Skills)) {
        keywords.push(...result.Core_Hard_Skills);
      }
      
      // Add from Domain_Knowledge if present
      if (Array.isArray(result.Domain_Knowledge)) {
        keywords.push(...result.Domain_Knowledge);
      }
      
      // Filter to unique keywords 
      return Array.from(new Set(keywords));
    } catch (parseError) {
      console.error("Error parsing JSON from OpenAI response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Error using OpenAI for keyword extraction:", error);
    // Fallback to local extraction
    return extractKeywordsLocally(jobDescription);
  }
}

export async function optimizeResume(originalCV: string, keywords: string[] | null): Promise<{
  optimizedContent: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Return the original CV if no API key
      return fallbackOptimization(originalCV, keywords);
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a senior résumé strategist who specializes in applicant-tracking-system (ATS) optimization.\n\n" +
            "CRITICAL INSTRUCTION: PRESERVE THE ORIGINAL RESUME EXACTLY AS PROVIDED. Your task is to enhance it with keywords, NOT restructure or rewrite it completely.\n\n" +
            "OBJECTIVES\n" +
            "1. PRESERVE ALL ORIGINAL CONTENT - every section, title, company name, date, and bullet point must remain intact\n" +
            "2. Only enhance existing content by inserting relevant keywords within it\n" +
            "3. Match keywords from the job description naturally within existing text\n" +
            "4. Highlight the keywords you've added or that already exist\n" +
            "5. DO NOT add new sections, positions, or fabricate any experience\n\n" +
            "IMPORTANT GUIDELINES:\n" +
            "1. DO NOT change the resume structure or rewrite content extensively\n" +
            "2. DO NOT remove any original content or sections\n" +
            "3. DO NOT change job titles, company names, dates, or education details\n" +
            "4. DO NOT add new bullet points or paragraphs that weren't in the original\n" +
            "5. When highlighting existing keywords, don't change any surrounding text\n\n" +
            "OUTPUT FORMAT:\n" +
            "Return the optimized CV in HTML format preserving the exact structure of the original resume, with keywords highlighted.\n\n" +
            "Use these specific HTML elements:\n" +
            "- For section titles (exactly as in original): <h2 class=\"font-display text-lg border-b border-brown/30 pb-2 mb-3\">Title</h2>\n" +
            "- For job titles/positions (exactly as in original): <h3 class=\"font-display text-md font-semibold mt-4 mb-1\">Position | Company</h3>\n" +
            "- For dates/locations (exactly as in original): <p class=\"text-xs text-gray-600 mb-2\">Date range | Location</p>\n" +
            "- For paragraphs (preserving all original text): <p class=\"mb-4 text-sm\">Content</p>\n" +
            "- For lists (preserving all original bullet points): <ul class=\"text-sm list-disc pl-4 space-y-1\"><li>Item</li></ul>\n" +
            "- For keywords: <span class=\"bg-green-100 px-1\">keyword</span>\n\n" +
            "Do NOT include ```html tags or markdown formatting in your response - ONLY return pure HTML",
        },
        {
          role: "user",
          content: `JOB_DESCRIPTION: I've analyzed this job description and extracted keywords.\n\nORIGINAL_RESUME:\n${originalCV}\n\nKEYWORD_JSON:\n{\n  "keywords": [${keywordsArray.map(k => `"${k}"`).join(", ")}],\n  "matching_keywords": [${matchingKeywords.map(k => `"${k}"`).join(", ")}],\n  "missing_keywords": [${missingKeywords.map(k => `"${k}"`).join(", ")}]\n}\n\nPlease optimize my resume to incorporate these keywords naturally where appropriate, especially the missing ones, while maintaining factual accuracy.`,
        },
      ],
    });

    // Get the optimized content and clean it up
    let optimizedContent = response.choices[0].message.content || originalCV;
    
    // Clean up any markdown formatting that might have been added
    optimizedContent = optimizedContent
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();
      
    // Remove any full HTML document structure if present
    optimizedContent = optimizedContent
      .replace(/<!DOCTYPE.*?>/i, '')
      .replace(/<html.*?>[\s\S]*?<head>[\s\S]*?<\/head>[\s\S]*?<body>/i, '')
      .replace(/<\/body>[\s\S]*?<\/html>/i, '');
      
    // Ensure proper section headings
    if (!optimizedContent.includes('<h')) {
      // If no headings at all, add some basic structure
      const parts = optimizedContent.split('\n\n').filter(p => p.trim());
      
      // Reset content and build structured version
      optimizedContent = '';
      
      // Look for potential sections
      const sectionKeywords = ['experience', 'education', 'skills', 'profile', 'summary', 'objective', 'projects'];
      let inSection = false;
      
      parts.forEach(part => {
        const partLower = part.toLowerCase();
        const isSectionHeader = sectionKeywords.some(keyword => partLower.includes(keyword)) && 
                              part.length < 50;
        
        if (isSectionHeader) {
          optimizedContent += `<h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">${part}</h2>\n\n`;
          inSection = true;
        } else if (part.includes('•') || part.includes('-')) {
          // Convert bullet point text to list
          const items = part.split(/\n[•-]\s+/).filter(item => item.trim());
          const listItems = items.map(item => `<li>${item.trim()}</li>`).join('\n');
          optimizedContent += `<ul class="text-sm list-disc pl-4 space-y-1">${listItems}</ul>\n\n`;
        } else {
          optimizedContent += `<p class="mb-4 text-sm">${part}</p>\n\n`;
        }
      });
    }

    return {
      optimizedContent,
      matchingKeywords,
      missingKeywords,
      matchRate
    };
  } catch (error) {
    console.error("Error using OpenAI for CV optimization:", error);
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