import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  analyzeJobDescriptionSchema,
  optimizeCVSchema,
  insertCVDocumentSchema,
  insertJobDescriptionSchema
} from "@shared/schema";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import natural from "natural";
import PDFDocument from "pdfkit";
import pdfParse from "./pdf-parser";

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

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

// Helper function to extract text from PDF Buffer
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

// Helper function to decode base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

// Helper function to create a PDF from HTML content
function createPDF(content: string, format: 'pdf' | 'latex' = 'pdf'): Buffer {
  if (format === 'latex') {
    // This is a simplified version - in a real app, you'd use a LaTeX library
    // Here we're just styling the PDF differently to simulate LaTeX
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {});
    
    // Add a LaTeX-like styling
    doc.font('Helvetica');
    doc.fontSize(18).text('LaTeX-Style CV', { align: 'center' });
    doc.moveDown();
    
    // Parse the HTML content and add to PDF (simplified)
    // In a real implementation, you'd use a proper HTML-to-PDF library
    const cleanContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' '); // Replace HTML entities
    
    doc.fontSize(12).text(cleanContent, { align: 'left' });
    
    doc.end();
    
    // Concatenate all chunks into a single buffer
    return Buffer.concat(buffers);
  } else {
    // Standard PDF
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {});
    
    // Parse the HTML content and add to PDF (simplified)
    // In a real implementation, you'd use a proper HTML-to-PDF library
    const cleanContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' '); // Replace HTML entities
    
    doc.fontSize(12).text(cleanContent);
    
    doc.end();
    
    // Concatenate all chunks into a single buffer
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
  const matchRate = Math.round((matchingKeywords.length / keywords.length) * 100);
  
  // Generate a simple HTML representation of the CV with highlighted keywords
  // In a real application, this would be more sophisticated
  const sections = cvText.split('\n\n');
  let optimizedContent = '';
  
  // Create a sample CV with highlighted keywords
  // This is a placeholder - in a real application this would use the actual CV content
  optimizedContent = `
    <div class="font-display text-2xl text-center mb-6">John Smith</div>
    <div class="text-center mb-6 text-sm">
      <div>john.smith@example.com | (555) 123-4567</div>
      <div>San Francisco, CA | linkedin.com/in/johnsmith</div>
    </div>
    
    <div class="mb-6">
      <h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">Professional Summary</h2>
      <p class="text-sm">
        Experienced Front-End Developer with a passion for creating responsive and user-friendly web applications.
        ${matchingKeywords.slice(0, 3).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(' ')} 
        with a strong focus on technical excellence. Skilled in optimizing web applications for maximum speed and scalability.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">Skills</h2>
      <div class="text-sm grid grid-cols-2 gap-2">
        <div><span class="font-semibold">Languages:</span> ${matchingKeywords.slice(0, 2).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(', ')}, HTML5, CSS3</div>
        <div><span class="font-semibold">Frameworks:</span> ${matchingKeywords.slice(2, 4).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(', ')}, Angular, Vue.js</div>
        <div><span class="font-semibold">Design:</span> ${matchingKeywords.slice(4, 6).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(', ')}</div>
        <div><span class="font-semibold">Tools:</span> Git, Webpack, Jest, CI/CD</div>
      </div>
    </div>
    
    <div class="mb-6">
      <h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">Experience</h2>
      
      <div class="mb-4">
        <div class="flex justify-between items-center">
          <h3 class="font-semibold text-sm">Senior Developer</h3>
          <span class="text-xs text-brown">2020 - Present</span>
        </div>
        <div class="italic text-sm mb-2">TechCorp, San Francisco, CA</div>
        <ul class="text-sm list-disc pl-4 space-y-1">
          <li>Led the development team in creating ${matchingKeywords.slice(6, 7).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(' ')} web applications</li>
          <li>Implemented ${matchingKeywords.slice(7, 8).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(' ')} improvements resulting in 30% increase in user engagement</li>
          <li>Developed reusable components using ${matchingKeywords.slice(8, 10).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(' and ')}</li>
        </ul>
      </div>
      
      <div>
        <div class="flex justify-between items-center">
          <h3 class="font-semibold text-sm">Developer</h3>
          <span class="text-xs text-brown">2017 - 2020</span>
        </div>
        <div class="italic text-sm mb-2">WebSolutions Inc., Boston, MA</div>
        <ul class="text-sm list-disc pl-4 space-y-1">
          <li>Built and maintained multiple client websites using ${matchingKeywords.slice(10, 12).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(' and ')}</li>
          <li>Collaborated with designers to implement responsive designs</li>
          <li>Participated in ${matchingKeywords.slice(12, 13).map(kw => `<span class="bg-green-100 px-1">${kw}</span>`).join(' ')} development processes</li>
        </ul>
      </div>
    </div>
    
    <div>
      <h2 class="font-display text-lg border-b border-brown/30 pb-2 mb-3">Education</h2>
      <div class="flex justify-between items-center">
        <h3 class="font-semibold text-sm">Bachelor of Science in Computer Science</h3>
        <span class="text-xs text-brown">2013 - 2017</span>
      </div>
      <div class="text-sm italic">University of California, Berkeley</div>
    </div>
  `;
  
  return {
    optimizedContent,
    matchingKeywords,
    missingKeywords,
    matchRate
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      // Extract keywords from job description
      const keywords = extractKeywords(jobDescription);
      
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
        return res.status(200).json({
          id: existingOptimizedCV.id,
          optimizedContent: existingOptimizedCV.content,
          matchRate: existingOptimizedCV.matchRate,
          matchingKeywords: [], // These would be stored in a real app
          missingKeywords: []  // These would be stored in a real app
        });
      }
      
      // Optimize the CV
      const optimization = optimizeCV(
        cv.extractedText || '',
        jobDescription.keywords || []
      );
      
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
      const format = req.query.format as 'pdf' | 'latex' || 'pdf';
      
      // Get the optimized CV
      const optimizedCV = await storage.getOptimizedCV(optimizedCvId);
      
      if (!optimizedCV) {
        return res.status(404).json({ error: 'Optimized CV not found' });
      }
      
      // Generate PDF from the optimized content
      const pdfBuffer = createPDF(optimizedCV.content, format);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=optimized-cv.pdf`);
      
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
