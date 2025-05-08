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
            "You are a career and resume expert. Extract 10-15 important keywords from the job description that would be relevant for an ATS system. Focus on hard skills, technologies, and qualifications. Return a JSON object with a 'keywords' array. Format: { \"keywords\": [\"keyword1\", \"keyword2\", ...] }",
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
      return Array.isArray(result.keywords) ? result.keywords : [];
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
            "You are a professional resume writer who helps optimize resumes to pass ATS systems. Review the provided CV and optimize it based on the keywords listed. Your task is to produce a clear, professional version that will pass ATS systems.\n\n" +
            "IMPORTANT GUIDELINES:\n" +
            "1. Maintain a professional tone - avoid hyperbolic or overly enthusiastic language\n" +
            "2. DO NOT use em dashes (—) - use regular hyphens (-) instead\n" +
            "3. DO NOT add bubbly or unnecessarily flowery descriptors\n" +
            "4. DO NOT use overly boastful language\n" +
            "5. Structure should be clean and minimal\n" +
            "6. Preserve the essential information and style of the original\n" +
            "7. Naturally incorporate missing keywords where relevant without forcing them\n" +
            "8. Return the optimized CV in HTML format with basic formatting. Use these specific HTML elements:\n" +
            "   - For section titles: <h2 class=\"font-display text-lg border-b border-brown/30 pb-2 mb-3\">Title</h2>\n" +
            "   - For paragraphs: <p class=\"mb-4 text-sm\">Content</p>\n" +
            "   - For lists: <ul class=\"text-sm list-disc pl-4 space-y-1\"><li>Item</li></ul>\n" +
            "   - Do NOT include ```html tags or markdown formatting in your response - ONLY return pure HTML",
        },
        {
          role: "user",
          content: `Here is my original CV:\n\n${originalCV}\n\nHere are the keywords to incorporate (some may already be present):\n${keywordsArray.join(", ")}\n\nMatching keywords already in CV: ${matchingKeywords.join(", ")}\nMissing keywords to add where appropriate: ${missingKeywords.join(", ")}`,
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
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'in', 'to', 'for', 'of', 'with', 'on', 'at']);
  
  // Count word frequencies
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word)) {
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