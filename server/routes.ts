import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
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
  // Process the HTML content to extract structured information
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const listItems: string[] = [];
  
  // Extract headings
  const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  let headingMatch;
  while ((headingMatch = headingRegex.exec(content)) !== null) {
    const heading = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    if (heading) headings.push(heading);
  }
  
  // Extract paragraphs
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gis;
  let paragraphMatch;
  while ((paragraphMatch = paragraphRegex.exec(content)) !== null) {
    let paragraph = paragraphMatch[1]
      .replace(/<span class="bg-green-100 px-1">(.*?)<\/span>/gi, '$1')
      .replace(/<span class="font-semibold">(.*?)<\/span>/gi, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
    
    if (paragraph) paragraphs.push(paragraph);
  }
  
  // Extract list items
  const listItemRegex = /<li[^>]*>(.*?)<\/li>/gis;
  let listItemMatch;
  while ((listItemMatch = listItemRegex.exec(content)) !== null) {
    let listItem = listItemMatch[1]
      .replace(/<span class="bg-green-100 px-1">(.*?)<\/span>/gi, '$1')
      .replace(/<span class="font-semibold">(.*?)<\/span>/gi, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
    
    if (listItem) listItems.push(listItem);
  }
  
  // If no structured content was found, fall back to plain text
  if (headings.length === 0 && paragraphs.length === 0 && listItems.length === 0) {
    const plainText = content
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .trim();
      
    if (plainText) {
      paragraphs.push(plainText);
    }
  }
  
  if (format === 'latex') {
    // LaTeX-style PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {});
    
    // Add a professional header
    doc.font('Helvetica-Bold').fontSize(16).text('Optimized Resume', { align: 'center' });
    doc.moveDown(1);
    
    // Add sections with proper formatting
    headings.forEach((heading, index) => {
      if (index > 0) doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(14).text(heading);
      doc.moveDown(0.5);
    });
    
    // Add paragraphs
    paragraphs.forEach(paragraph => {
      doc.font('Helvetica').fontSize(11).text(paragraph, { align: 'left' });
      doc.moveDown(1);
    });
    
    // Add list items
    listItems.forEach(item => {
      doc.font('Helvetica').fontSize(11).text(`• ${item}`, { align: 'left' });
      doc.moveDown(0.5);
    });
    
    doc.end();
    return Buffer.concat(buffers);
  } else {
    // Standard PDF
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4'
    });
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {});
    
    // Title
    doc.font('Helvetica-Bold').fontSize(16).text('Optimized Resume', { align: 'center' });
    doc.moveDown(1);
    
    // Add headings and content with nice formatting
    let currentSection = '';
    
    headings.forEach((heading, index) => {
      currentSection = heading;
      doc.font('Helvetica-Bold').fontSize(13).text(heading);
      doc.moveDown(0.5);
      
      // Draw a simple line instead of using moveTo/lineTo
      doc.fontSize(1).text('_'.repeat(80), { align: 'center' });
      doc.moveDown(0.5);
    });
    
    // Add paragraphs
    paragraphs.forEach(paragraph => {
      doc.font('Helvetica').fontSize(11).text(paragraph, { align: 'left' });
      doc.moveDown(0.5);
    });
    
    // Add list items
    listItems.forEach(item => {
      doc.font('Helvetica').fontSize(11).text(`   • ${item}`);
      doc.moveDown(0.5);
    });
    
    doc.end();
    return Buffer.concat(buffers);
  }
}

// Helper function to optimize CV based on job description keywords
function optimizeCV(cvText: string, keywords: string[]): {
  optimizedContent: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
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
  
  // Generate a simple HTML representation of the CV with highlighted keywords
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
    matchRate
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register the files router
  app.use('/api/files', filesRouter);
  
  // API Routes
  app.post('/api/cv/upload', async (req: Request, res: Response) => {
    try {
      const { fileName, fileContent, fileType } = req.body;
      
      // Validate the request
      const validatedData = insertCVDocumentSchema.parse({
        fileName,
        fileContent,
        fileType,
        extractedText: '', // Will be populated below
        userId: null  // Anonymous for now
      });
      
      // Decode the base64 content
      const fileBuffer = base64ToBuffer(fileContent);
      
      // Extract text from the document
      let extractedText = '';
      if (fileType === 'application/pdf') {
        extractedText = await extractTextFromPDF(fileBuffer);
      } else {
        // For simplicity, we'll just use a placeholder for Word docs
        // In a real app, you'd use a Word document parser
        extractedText = `Sample extracted text from ${fileName}`;
      }
      
      // Store the CV document
      const cvDocument = await storage.createCVDocument({
        ...validatedData,
        extractedText
      });
      
      res.status(201).json({ 
        id: cvDocument.id,
        fileName: cvDocument.fileName
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
  
  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const validatedData = analyzeJobDescriptionSchema.parse(req.body);
      const { jobDescription, cvId } = validatedData;
      
      // Extract keywords from job description using OpenAI if API key available
      let keywords: string[] = [];
      try {
        // Try to use OpenAI for more accurate keyword extraction
        keywords = await openaiService.extractKeywords(jobDescription);
      } catch (aiError) {
        console.warn('Using fallback keyword extraction:', aiError);
        // Fallback to local extraction method
        keywords = extractKeywords(jobDescription);
      }
      
      // Store the job description
      const jobDescriptionData = await storage.createJobDescription({
        content: jobDescription,
        keywords,
        cvId: cvId || null,
        userId: null // Anonymous for now
      });
      
      res.status(200).json({
        id: jobDescriptionData.id,
        keywords,
        content: jobDescription
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
      
      // Get CV and job description
      const cv = await storage.getCVDocument(cvId);
      const jobDescription = await storage.getJobDescription(jobDescriptionId);
      
      if (!cv || !jobDescription) {
        return res.status(404).json({ error: 'CV or job description not found' });
      }
      
      // Check if we already have an optimized version
      const existingOptimizedCV = await storage.getOptimizedCVByJobAndDocument(
        jobDescriptionId,
        cvId
      );
      
      if (existingOptimizedCV) {
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
          missingKeywords
        });
      }
      
      // Optimize the CV using OpenAI if API key available
      let optimization;
      try {
        // Try to use OpenAI for more sophisticated optimization
        optimization = await openaiService.optimizeResume(
          cv.extractedText || '',
          jobDescription.keywords || []
        );
      } catch (aiError) {
        console.warn('Using fallback CV optimization:', aiError);
        // Fallback to local optimization method
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
        missingKeywords: optimization.missingKeywords
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
  
  app.get('/api/cv/download/:id', async (req: Request, res: Response) => {
    try {
      const optimizedCvId = parseInt(req.params.id);
      const format = (req.query.format as 'pdf' | 'latex') || 'pdf';
      
      // Get the optimized CV
      const optimizedCV = await storage.getOptimizedCV(optimizedCvId);
      
      if (!optimizedCV) {
        return res.status(404).json({ error: 'Optimized CV not found' });
      }
      
      // Get the original CV if available
      let cv = null;
      if (optimizedCV.cvId !== null) {
        cv = await storage.getCVDocument(optimizedCV.cvId);
      }
      
      // Get the job description if available
      let jobDescription = null;
      if (optimizedCV.jobDescriptionId !== null) {
        jobDescription = await storage.getJobDescription(optimizedCV.jobDescriptionId);
      }
      
      // Generate PDF from the optimized content
      const filename = `optimized-cv-${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfBuffer = createPDF(optimizedCV.content, format);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error downloading CV:', error);
      res.status(500).json({ error: 'Failed to download CV' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
