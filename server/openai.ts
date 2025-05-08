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
    // Log the first 300 characters of input to debug extraction issues
    console.log("Original CV content (first 300 chars):", originalCV.substring(0, 300));
    
    if (!process.env.OPENAI_API_KEY) {
      // Return the original CV if no API key
      return fallbackOptimization(originalCV, keywords);
    }

    // If the original CV is empty or illegible garbage, return error content
    if (!originalCV || originalCV.trim().length < 100 || /^[^a-zA-Z0-9]*$/.test(originalCV)) {
      console.error("CV content is empty, too short, or contains no alphanumeric characters");
      return {
        optimizedContent: `<div class="p-4 bg-red-50 text-red-700 rounded border border-red-200">
          <h2 class="text-xl font-bold mb-2">Error Processing Your Resume</h2>
          <p>We couldn't properly extract the text from your PDF file. This can happen when:</p>
          <ul class="list-disc pl-6 mt-2 space-y-1">
            <li>The PDF contains only scanned images without text</li>
            <li>The PDF has security restrictions that prevent text extraction</li>
            <li>The PDF uses unusual fonts or encoding</li>
          </ul>
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