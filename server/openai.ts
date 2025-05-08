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
      
      // Return unique keywords
      return [...new Set(keywords)];
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
            "OBJECTIVES\n" +
            "1. Match ≥ 90% of high-priority keywords while staying fact-based.\n" +
            "2. Strengthen each bullet using the A-R-T pattern (Action verb → Result metric → Tool/Technique).\n" +
            "3. Keep total résumé length ≤ 2 pages, no graphics or tables.\n" +
            "4. Maintain the candidate's original chronology and voice.\n" +
            "5. DO NOT fabricate experience, dates, or credentials.\n\n" +
            "IMPORTANT GUIDELINES:\n" +
            "1. Maintain a professional tone - avoid hyperbolic or overly enthusiastic language\n" +
            "2. DO NOT use em dashes (—) - use regular hyphens (-) instead\n" +
            "3. DO NOT add bubbly or unnecessarily flowery descriptors\n" +
            "4. DO NOT use overly boastful language\n" +
            "5. Use original spelling/casing for company names and titles\n" +
            "6. Keep bullets ≤ 22 words; use numerals for all numbers\n" +
            "7. Jobs ≥ 10 years old: trim to 1-2 bullets\n\n" +
            "OUTPUT FORMAT:\n" +
            "Return the optimized CV in HTML format with proper structure, keyword highlighting, and improved content. Use these specific HTML elements:\n" +
            "- For section titles: <h2 class=\"font-display text-lg border-b border-brown/30 pb-2 mb-3\">Title</h2>\n" +
            "- For paragraphs: <p class=\"mb-4 text-sm\">Content</p>\n" +
            "- For lists: <ul class=\"text-sm list-disc pl-4 space-y-1\"><li>Item</li></ul>\n" +
            "- For metrics and improvements: <span class=\"font-semibold\">30% increase</span>\n" +
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