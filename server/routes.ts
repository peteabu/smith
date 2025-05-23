import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  analyzeJobDescriptionSchema,
  optimizeCVSchema,
  insertJobDescriptionSchema,
  insertCVDocumentSchema
} from "@shared/schema";
import natural from "natural";
import PDFDocument from "pdfkit";
import * as openaiService from "./openai";
import filesRouter from "./routes/files";
import { base64ToBuffer, extractTextFromPDF } from "./routes/utils";
import pdfParse from "./pdf-parser";
import { Server as SocketIOServer } from "socket.io";

// Natural language processing tokenizer
const tokenizer = new natural.WordTokenizer();
const stopwords = [
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", 
  "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", 
  "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", 
  "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "it", "it's", "its", 
  "itself", "let's", "me", "more", "most", "my", "myself", "nor", "of", "on", "once", "only", "or", "other", 
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "she'd", "she'll", "she's", 
  "should", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", 
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", 
  "through", "to", "too", "under", "until", "up", "very", "was", "we", "we'd", "we'll", "we're", "we've", 
  "were", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", 
  "why", "why's", "with", "would", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", 
  "yourselves"
];

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  // Tokenize and normalize text
  const words = tokenizer.tokenize(text.toLowerCase()) || [];
  
  // Filter out stopwords and short words
  const filteredWords = words.filter(word => 
    word.length > 2 && !stopwords.includes(word.toLowerCase())
  );
  
  // Count word frequency
  const wordCounts: Record<string, number> = {};
  filteredWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Get the top N keywords
  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return a reasonable number of keywords (up to 20)
  return sortedWords.slice(0, 20);
}

// Functions moved to routes/utils.ts

// Helper function to create a PDF from HTML content
function createPDF(content: string, format: 'pdf' | 'latex' = 'pdf'): Buffer {
  // Create a document
  const doc = new PDFDocument({ 
    margin: 50, 
    size: 'A4'
  });
  
  // Buffer to store PDF data
  const buffers: Buffer[] = [];
  
  // Collect PDF data
  doc.on('data', (chunk) => {
    buffers.push(chunk);
  });
  
  // Define font sizes
  const fontSize = {
    title: 16,
    heading: 14,
    subheading: 12,
    normal: 11,
    small: 10
  };
  
  // Add title
  doc.font('Helvetica-Bold').fontSize(fontSize.title)
    .text('Mimic Resume', { align: 'center' });
  doc.moveDown(1);
  
  // Clean HTML content
  const cleanText = (html: string): string => {
    return html
      .replace(/<span class="bg-green-100[^>]*>([\s\S]*?)<\/span>/gi, '$1')
      .replace(/<span class="font-semibold">([\s\S]*?)<\/span>/gi, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };
  
  // Add resume content
  const plainText = cleanText(content);
  console.log(`PDF Creation - Content length: ${content.length}, Cleaned text length: ${plainText.length}`);
  
  try {
    // Extract basic sections using regex
    const sectionRegex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
    let match;
    let hasSections = false;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      hasSections = true;
      const sectionTitle = cleanText(match[1]);
      const sectionContent = cleanText(match[2]);
      
      console.log(`PDF Section: "${sectionTitle}" - Content length: ${sectionContent.length}`);
      
      // Format according to PDF style
      if (format === 'latex') {
        // Academic style
        doc.font('Helvetica-Bold').fontSize(fontSize.heading)
          .text(sectionTitle.toUpperCase());
        doc.moveDown(0.5);
        
        doc.font('Helvetica').fontSize(fontSize.normal)
          .text(sectionContent, { align: 'justify' });
      } else {
        // Modern style
        doc.font('Helvetica-Bold').fontSize(fontSize.heading)
          .text(sectionTitle);
        
        doc.moveDown(0.3);
        doc.fontSize(1).text('_'.repeat(80), { align: 'center' });
        doc.moveDown(0.5);
        
        doc.font('Helvetica').fontSize(fontSize.normal)
          .text(sectionContent);
      }
      
      doc.moveDown(1);
    }
    
    // If no sections were found, add plain text content
    if (!hasSections) {
      console.log("PDF Creation - No sections found, using plain text");
      
      // Split plain text into paragraphs for better formatting
      const paragraphs = plainText.split('\n');
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim()) {
          doc.font('Helvetica').fontSize(fontSize.normal)
            .text(paragraph.trim(), { align: 'left' });
          doc.moveDown(0.5);
        }
      }
    }
  } catch (error) {
    console.error("Error generating PDF content:", error);
    
    // Fallback - just add the plain text
    doc.font('Helvetica').fontSize(fontSize.normal)
      .text("An error occurred while formatting the resume. Here is the plain content:", { align: 'left' });
    doc.moveDown(1);
    
    doc.font('Helvetica').fontSize(fontSize.normal)
      .text(plainText || "No content available", { align: 'left' });
  }
  
  // Finalize the PDF
  doc.end();
  
  // Wait for all chunks to be collected
  return Buffer.concat(buffers);
}

// Helper function to optimize CV based on job description keywords
function optimizeCV(cvText: string, keywords: string[]): {
  optimizedContent: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
  markdownContent?: string;
} {
  // Find which keywords are present in the CV
  const cvLower = cvText.toLowerCase();
  const matchingKeywords: string[] = [];
  const missingKeywords: string[] = [];
  
  keywords.forEach(keyword => {
    if (cvLower.includes(keyword.toLowerCase())) {
      matchingKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });
  
  // Calculate match rate
  const matchRate = keywords.length > 0 
    ? Math.round((matchingKeywords.length / keywords.length) * 100)
    : 0;
  
  // Generate a simple HTML representation of the resume with highlighted keywords
  const htmlParts: string[] = [];
  const paragraphs = cvText.split('\n\n');
  
  // Process each paragraph of the original CV
  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) return;
    
    // Check if it might be a heading (short, ends with colon, or all caps)
    if (paragraph.length < 50 || paragraph.endsWith(':') || paragraph === paragraph.toUpperCase()) {
      htmlParts.push(`<h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">${paragraph}</h2>`);
    } else {
      // For regular paragraphs, highlight any matching keywords
      let highlightedParagraph = paragraph;
      
      // Sort keywords by length (longest first) to avoid partial replacements
      const sortedKeywords = [...matchingKeywords].sort((a, b) => b.length - a.length);
      
      // Replace each keyword with a highlighted version, being careful not to replace substrings of already replaced text
      sortedKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        highlightedParagraph = highlightedParagraph.replace(regex, 
          `<span class="bg-green-100 px-1">$&</span>`);
      });
      
      htmlParts.push(`<p class="mb-4 text-sm">${highlightedParagraph}</p>`);
    }
  });
  
  const optimizedContent = htmlParts.join('');
  
  return {
    optimizedContent,
    matchingKeywords,
    missingKeywords,
    matchRate,
    markdownContent: cvText // Use the original CV text as markdown content
  };
}

export async function registerRoutes(app: Express): Promise<void> {
  // Register the files router
  app.use('/api/files', filesRouter);
  
  // API Routes
  // Preview extracted text endpoint
  app.post('/api/cv/preview', async (req: Request, res: Response) => {
    try {
      const { fileContent, fileType } = req.body;
      
      // Decode the base64 content
      const fileBuffer = base64ToBuffer(fileContent);
      
      // Extract text from the document
      let extractedText = '';
      if (fileType === 'application/pdf') {
        extractedText = await extractTextFromPDF(fileBuffer);
      } else {
        // For simplicity, we'll just use a placeholder for Word docs
        // In a real app, you'd use a Word document parser
        extractedText = `Sample extracted text from document`;
      }
      
      // Check if extracted text looks like an error message
      const isError = extractedText.includes('ERROR:') || 
                     !extractedText || 
                     extractedText.length < 100 || 
                     !/[a-zA-Z]{5,}/.test(extractedText);
      
      res.status(200).json({
        extractedText,
        isValid: !isError,
        errorMessage: isError ? extractedText : null
      });
    } catch (error) {
      console.error('Error previewing CV text:', error);
      res.status(500).json({ 
        isValid: false, 
        errorMessage: 'Failed to extract text from document'
      });
    }
  });

  app.post('/api/cv/upload', async (req: Request, res: Response) => {
    try {
      const { fileName, fileContent, fileType, extractedText } = req.body;
      
      // Validate the request
      const validatedData = insertCVDocumentSchema.parse({
        fileName: fileName || 'resume.txt',
        fileContent: fileContent || '',
        fileType: fileType || 'text/plain',
        extractedText: extractedText || '', // Use provided extracted text or empty string
        userId: null  // Anonymous for now
      });
      
      // If text content is provided directly, use it as is
      let finalExtractedText = extractedText;
      
      // Only try to extract text if we don't already have it and have file content
      if (!finalExtractedText && fileContent) {
        try {
          // Decode the base64 content
          const fileBuffer = base64ToBuffer(fileContent);
          
          // Extract text from the document
          if (fileType === 'application/pdf') {
            finalExtractedText = await extractTextFromPDF(fileBuffer);
          } else if (fileType === 'text/plain') {
            // For plain text, just use the content directly (decoded from base64)
            finalExtractedText = fileBuffer.toString('utf8');
          } else {
            // For Word docs or other types
            finalExtractedText = `Sample extracted text from ${fileName}`;
          }
        } catch (err) {
          console.error('Error extracting text:', err);
          // If extraction fails, at least use an empty string
          finalExtractedText = '';
        }
      }
      
      // Store the CV document - if no text could be extracted at all, log an error
      if (!finalExtractedText) {
        console.warn('No text content available for document');
      }
      
      const cvDocument = await storage.createCVDocument({
        ...validatedData,
        extractedText: finalExtractedText
      });
      
      res.status(201).json({ 
        id: cvDocument.id,
        fileName: cvDocument.fileName,
        extractedText: finalExtractedText.substring(0, 200) + (finalExtractedText.length > 200 ? '...' : '')
      });
    } catch (error) {
      console.error('Error uploading CV:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(500).json({ error: 'Failed to upload CV' });
      }
    }
  });
  
  app.post('/api/analyze', async (req: any, res: Response) => {
    try {
      const validatedData = analyzeJobDescriptionSchema.parse(req.body);
      const { jobDescription, cvId } = validatedData;
      
      console.log("Starting job description analysis...");
      
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set. Using fallback analysis.");
      } else {
        console.log("OPENAI_API_KEY is set and available for use");
      }
      
      // Create a unique analysis ID for this session (client can subscribe to this)
      const analysisId = Date.now().toString();
      
      // Set up event listeners for step updates
      const progressHandler = (step: {
        step: string;
        status: 'completed' | 'in-progress' | 'pending';
        result?: string;
        sources?: string[];
      }) => {
        try {
          // Emit events to all clients
          req.io.emit('analysis-progress', { 
            analysisId, 
            step 
          });
          
          // Log progress to console as well
          console.log(`Analysis step: "${step.step}" - Status: ${step.status}`);
        } catch (err) {
          console.error('Error emitting progress event:', err);
        }
      };
      
      // Assign the observer
      openaiService.setAnalysisProgressObserver(progressHandler);
      
      // Use the multi-step analysis approach
      let analysisResult: openaiService.JobAnalysisResult;
      try {
        console.log("Starting multi-step analysis with OpenAI...");
        analysisResult = await openaiService.analyzeJobDescriptionMultiStep(jobDescription);
        console.log("Multi-step analysis completed successfully");
      } catch (aiError) {
        console.error('Error in multi-step analysis, using fallback extraction:', aiError);
        // Fallback to basic extraction
        const keywords = extractKeywords(jobDescription);
        analysisResult = {
          keywords,
          analysisSteps: [
            { 
              step: "Keyword Extraction", 
              status: "completed", 
              result: `Extracted ${keywords.length} keywords using fallback method.` 
            }
          ]
        };
      }
      
      // Store the job description with all the analysis data
      const jobDescriptionData = await storage.createJobDescription({
        content: jobDescription,
        keywords: analysisResult.keywords,
        roleResearch: analysisResult.roleResearch,
        industryKeywords: analysisResult.industryKeywords,
        recruitmentInsights: analysisResult.recruitmentInsights,
        atsFindings: analysisResult.atsFindings,
        webSearchResults: analysisResult.webSearchResults,
        cvId: cvId || null,
        userId: null // Anonymous for now
      });
      
      // Clear the observer to avoid memory leaks
      openaiService.clearAnalysisProgressObserver();
      
      // Emit a final completed event
      req.io.emit('analysis-completed', {
        analysisId,
        result: {
          id: jobDescriptionData.id,
          keywords: analysisResult.keywords,
          content: jobDescription,
          roleResearch: analysisResult.roleResearch,
          industryKeywords: analysisResult.industryKeywords,
          recruitmentInsights: analysisResult.recruitmentInsights,
          atsFindings: analysisResult.atsFindings,
          webSearchResults: analysisResult.webSearchResults,
          analysisSteps: analysisResult.analysisSteps
        }
      });
      
      res.status(200).json({
        id: jobDescriptionData.id,
        keywords: analysisResult.keywords,
        content: jobDescription,
        roleResearch: analysisResult.roleResearch,
        industryKeywords: analysisResult.industryKeywords,
        recruitmentInsights: analysisResult.recruitmentInsights,
        atsFindings: analysisResult.atsFindings,
        webSearchResults: analysisResult.webSearchResults,
        analysisSteps: analysisResult.analysisSteps
      });
    } catch (error) {
      console.error('Error analyzing job description:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(500).json({ error: 'Failed to analyze job description' });
      }
    }
  });
  
  app.post('/api/optimize', async (req: Request, res: Response) => {
    try {
      const validatedData = optimizeCVSchema.parse(req.body);
      const { cvId, jobDescriptionId } = validatedData;
      
      console.log(`Starting resume optimization for CV ID ${cvId} and Job Description ID ${jobDescriptionId}...`);
      
      // Get CV and job description
      const cv = await storage.getCVDocument(cvId);
      const jobDescription = await storage.getJobDescription(jobDescriptionId);
      
      if (!cv || !jobDescription) {
        console.error(`CV (${cvId}) or job description (${jobDescriptionId}) not found`);
        return res.status(404).json({ error: 'CV or job description not found' });
      }
      
      console.log(`Found CV and job description. CV text length: ${cv.extractedText?.length || 0}, Keywords count: ${jobDescription.keywords?.length || 0}`);
      
      // Check if we already have an optimized version
      const existingOptimizedCV = await storage.getOptimizedCVByJobAndDocument(
        jobDescriptionId,
        cvId
      );
      
      if (existingOptimizedCV) {
        console.log(`Found existing optimized CV (ID: ${existingOptimizedCV.id}), returning it`);
        
        // Generate matching and missing keywords on the fly
        const cvLower = cv.extractedText?.toLowerCase() || "";
        const matchingKeywords: string[] = [];
        const missingKeywords: string[] = [];
        
        (jobDescription.keywords || []).forEach(keyword => {
          if (cvLower.includes(keyword.toLowerCase())) {
            matchingKeywords.push(keyword);
          } else {
            missingKeywords.push(keyword);
          }
        });
        
        return res.status(200).json({
          id: existingOptimizedCV.id,
          optimizedContent: existingOptimizedCV.content,
          matchRate: existingOptimizedCV.matchRate,
          matchingKeywords,
          missingKeywords,
          markdownContent: cv.extractedText || '' // Use original CV text as markdown content
        });
      }
      
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set for resume optimization");
      } else {
        console.log("OPENAI_API_KEY is set and available for resume optimization");
      }
      
      // Optimize the CV using OpenAI if API key available
      let optimization;
      try {
        console.log("Starting resume optimization with OpenAI...");
        // Try to use OpenAI for more sophisticated optimization
        optimization = await openaiService.optimizeResume(
          cv.extractedText || '',
          jobDescription.keywords || []
        );
        console.log(`Resume optimization complete. Match rate: ${optimization.matchRate}%`);
      } catch (aiError) {
        console.error('Error using OpenAI for resume optimization:', aiError);
        // Fallback to local optimization method
        console.log("Using fallback CV optimization method");
        optimization = optimizeCV(
          cv.extractedText || '',
          jobDescription.keywords || []
        );
      }
      
      // Store the optimized CV
      const optimizedCV = await storage.createOptimizedCV({
        content: optimization.optimizedContent,
        matchRate: optimization.matchRate,
        cvId,
        jobDescriptionId,
        userId: null // Anonymous for now
      });
      
      res.status(201).json({
        id: optimizedCV.id,
        optimizedContent: optimization.optimizedContent,
        matchRate: optimization.matchRate,
        matchingKeywords: optimization.matchingKeywords,
        missingKeywords: optimization.missingKeywords,
        markdownContent: optimization.markdownContent || ''
      });
    } catch (error) {
      console.error('Error optimizing CV:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        res.status(500).json({ error: 'Failed to optimize CV' });
      }
    }
  });
  
  app.get('/api/cv/export/:id', async (req: Request, res: Response) => {
    try {
      const optimizedCvId = parseInt(req.params.id);
      let format = (req.query.format as 'text' | 'markdown' | 'docx' | 'pdf') || 'text';
      const useOriginal = req.query.original === 'true'; // Option to get original CV content
      const pdfFormat = req.query.pdfFormat as 'pdf' | 'latex' || 'pdf';
      
      console.log(`CV Export requested - ID: ${optimizedCvId}, Format: ${format}, Use Original: ${useOriginal}`);
      
      // Get the optimized CV
      const optimizedCV = await storage.getOptimizedCV(optimizedCvId);
      
      if (!optimizedCV) {
        console.error(`Optimized CV not found for ID: ${optimizedCvId}`);
        return res.status(404).json({ error: 'Optimized CV not found' });
      }
      
      console.log(`Found optimized CV - Content length: ${optimizedCV.content?.length || 0} characters`);
      
      // Get the original CV and job description if available
      let cv = null;
      let jobDescription = null;
      let contentToUse = optimizedCV.content || '';
      
      if (optimizedCV.cvId !== null) {
        cv = await storage.getCVDocument(optimizedCV.cvId);
        console.log(`Found original CV - ID: ${cv?.id}, Text length: ${cv?.extractedText?.length || 0} characters`);
      }
      
      if (optimizedCV.jobDescriptionId !== null) {
        jobDescription = await storage.getJobDescription(optimizedCV.jobDescriptionId);
      }
      
      if (useOriginal && cv && cv.extractedText) {
        // If useOriginal flag is true and we have the original text, use it instead
        contentToUse = `<div>${cv.extractedText.replace(/\n/g, '</p><p>')}</div>`;
        console.log(`Using original CV content for export - Length: ${cv.extractedText.length} characters`);
      } else if (cv && cv.extractedText && jobDescription && jobDescription.keywords) {
        // For the optimized content, use the full original CV but with keyword highlighting
        // This ensures we're exporting the complete CV content with optimizations
        
        // Convert the raw CV text to properly formatted HTML
        const fullText = cv.extractedText;
        const paragraphs = fullText.split('\n\n');
        const htmlParts: string[] = [];
        
        // Get keywords
        const keywords = jobDescription.keywords || [];
        
        // Process each paragraph
        paragraphs.forEach((paragraph) => {
          if (!paragraph.trim()) return;
          
          // Check if it might be a heading (short, ends with colon, or all caps)
          if (paragraph.length < 50 || paragraph.endsWith(':') || paragraph === paragraph.toUpperCase()) {
            htmlParts.push(`<h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">${paragraph}</h2>`);
          } else {
            // For regular paragraphs, highlight any matching keywords
            let highlightedParagraph = paragraph;
            
            // Sort keywords by length (longest first) to avoid partial replacements
            const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
            
            // Replace each keyword with a highlighted version
            sortedKeywords.forEach(keyword => {
              const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
              highlightedParagraph = highlightedParagraph.replace(regex, 
                `<span class="bg-green-100 px-1">$&</span>`);
            });
            
            htmlParts.push(`<p class="mb-4 text-sm">${highlightedParagraph}</p>`);
          }
        });
        
        contentToUse = htmlParts.join('');
        console.log(`Using fully optimized CV content for export - Length: ${contentToUse.length} characters`);
      }
      
      // Make sure we have content to generate the export
      if (!contentToUse || contentToUse.trim().length === 0) {
        console.error("CV content is empty, generating fallback content");
        
        // Generate a minimal fallback content
        let fallbackContent = '<h2>Resume Content</h2>';
        if (cv && cv.extractedText) {
          fallbackContent += `<p>${cv.extractedText.replace(/\n/g, '</p><p>')}</p>`;
        } else {
          fallbackContent += '<p>No content available for this resume.</p>';
        }
        
        contentToUse = fallbackContent;
      }
      
      // Clean HTML content - this preserves ALL the text content
      const cleanText = (html: string): string => {
        // First find the summary box by looking for the keyword "Resume Optimization Summary"
        const summaryIndex = html.indexOf("Resume Optimization Summary");
        let contentHtml = html;
        
        // If we found the summary box, remove it
        if (summaryIndex > -1) {
          // Find the containing div by looking for the last div before the summary
          const divStart = html.lastIndexOf("<div", summaryIndex);
          if (divStart > -1) {
            // Find the end of this div
            let divNestCount = 1;
            let divEnd = divStart;
            const htmlLength = html.length;
            
            // Look for matching closing div tag
            while (divNestCount > 0 && divEnd < htmlLength) {
              const nextOpenDiv = html.indexOf("<div", divEnd + 1);
              const nextCloseDiv = html.indexOf("</div>", divEnd + 1);
              
              if (nextCloseDiv === -1) break; // Shouldn't happen with valid HTML
              
              if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
                divNestCount++;
                divEnd = nextOpenDiv;
              } else {
                divNestCount--;
                divEnd = nextCloseDiv;
              }
            }
            
            // If we found the closing div, remove the entire summary div
            if (divEnd > divStart && divNestCount === 0) {
              contentHtml = html.substring(0, divStart) + html.substring(divEnd + 6); // 6 = "</div>".length
            }
          }
        }
        
        // Now extract the actual textual content, preserving ALL content including formatting
        const plainText = contentHtml
          .replace(/<span class="bg-green-100[^>]*>([\s\S]*?)<\/span>/gi, '$1')
          .replace(/<span class="font-semibold">([\s\S]*?)<\/span>/gi, '$1')
          .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n$1\n')
          .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n$1\n')
          .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
          .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
          .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n')
          .replace(/<div[^>]*>/gi, '')
          .replace(/<\/div>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        return plainText;
      };
      
      // Handle PDF export format
      if (format === 'pdf') {
        try {
          console.log(`Creating PDF resume with format: ${pdfFormat}`);
          
          // Convert HTML content to clean text for PDF creation
          const cleanedText = cleanText(contentToUse);
          
          // Generate PDF using our createPDF function
          const pdfBuffer = createPDF(contentToUse, pdfFormat);
          
          // Set headers for PDF download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${useOriginal ? 'original' : 'optimized'}-cv-${new Date().toISOString().slice(0, 10)}.pdf"`);
          res.setHeader('Cache-Control', 'no-cache');
          
          // Send the PDF buffer
          res.send(pdfBuffer);
          console.log('PDF resume exported successfully');
          return;
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          // If PDF generation fails, fall back to text format
          format = 'text';
        }
      }
      
      let exportContent = '';
      let mimeType = 'text/plain';
      const filePrefix = useOriginal ? 'original' : 'optimized';
      let filename = `${filePrefix}-cv-${new Date().toISOString().slice(0, 10)}`;
      
      if (format === 'markdown') {
        // Extract sections and create Markdown formatted text
        const plainText = cleanText(contentToUse);
        
        // Convert the plain text to Markdown format
        let markdownContent = '';
        
        // Process each paragraph into Markdown
        const paragraphs = plainText.split('\n\n');
        paragraphs.forEach(paragraph => {
          if (!paragraph.trim()) return;
          
          // Check if it's likely a heading
          if (paragraph.length < 50 || paragraph.toUpperCase() === paragraph) {
            markdownContent += `\n## ${paragraph.trim()}\n\n`;
          } else if (paragraph.startsWith('•')) {
            // It's a list item - make sure it's properly formatted
            markdownContent += paragraph.replace(/^•\s*/gm, '- ') + '\n\n';
          } else {
            // Regular paragraph
            markdownContent += paragraph.trim() + '\n\n';
          }
        });
        
        exportContent = markdownContent;
        mimeType = 'text/markdown';
        filename += '.md';
      } else if (format === 'docx') {
        // Extract content as simple HTML that Word can import
        // Strip out complex formatting but keep basic structure
        exportContent = `<html>
<head>
  <meta charset="UTF-8">
  <title>Mimic Resume</title>
  <style>
    body { font-family: Arial, sans-serif; }
    h1, h2, h3 { font-weight: bold; }
    .highlight { background-color: #e6ffe6; }
  </style>
</head>
<body>
  <h1>Mimic Resume</h1>
  ${contentToUse
    .replace(/<span class="bg-green-100[^>]*>([\s\S]*?)<\/span>/gi, '<span class="highlight">$1</span>')
    .replace(/<div class="[^"]*">/gi, '<div>')
  }
</body>
</html>`;
        
        mimeType = 'text/html';
        filename += '.html'; // Word can open HTML files
      } else {
        // Default to plain text
        exportContent = cleanText(contentToUse);
        filename += '.txt';
      }
      
      // Set headers for file download
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the exported content
      res.send(exportContent);
      console.log(`CV exported to client as ${format} - ${filename}`);
    } catch (error) {
      console.error('Error exporting CV:', error);
      res.status(500).json({ error: 'Failed to export CV' });
    }
  });
  
  // Keep the old endpoint for backward compatibility but make it use the export endpoint
  app.get('/api/cv/download/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const format = req.query.format === 'markdown' ? 'markdown' : 'text';
      
      // Redirect to the export endpoint
      res.redirect(`/api/cv/export/${id}?format=${format}`);
    } catch (error) {
      console.error('Error redirecting download request:', error);
      res.status(500).json({ error: 'Failed to download CV' });
    }
  });

  // Routes have been registered successfully
}
