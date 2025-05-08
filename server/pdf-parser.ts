// Custom PDF text extraction with multiple methods
import { spawnSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PDFDocument } from 'pdf-lib';
// We'll use dynamic import for pdf-parse
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: any = null;

export interface PDFData {
  text: string;
  // Add other properties if needed in the future
}

/**
 * Extract text from a PDF buffer using multiple approaches
 * @param buffer PDF file as buffer
 * @returns Object with extracted text
 */
export default async function parsePdf(buffer: Buffer): Promise<PDFData> {
  try {
    // Save buffer to a temporary file
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `temp-pdf-${Date.now()}.pdf`);
    
    try {
      // Write the buffer to a temp file
      fs.writeFileSync(tempFilePath, buffer);
      console.log(`Temporary PDF saved at: ${tempFilePath}`);
      
      // Try to extract text using multiple approaches
      let extractedText = '';
      
      // Try initial approach with pdf-parse (works well with LaTeX-generated PDFs)
      try {
        // Dynamically import pdf-parse
        if (!pdfParse) {
          const pdfParseModule = await import('pdf-parse');
          pdfParse = pdfParseModule.default;
        }
        
        const data = await pdfParse(buffer, {
          // Simply use default PDF.js extraction for better LaTeX compatibility
          max: 0 // Process all pages
        });
        
        if (data && data.text && data.text.trim()) {
          extractedText = data.text;
          console.log("Extracted with pdf-parse library");
        }
      } catch (error) {
        console.error("Error using pdf-parse:", error);
      }
      
      // Try approach 1: Use the pdftotext utility if available (commonly found on Linux)
      if (!extractedText.trim()) {
        try {
          const result = spawnSync('pdftotext', [tempFilePath, '-']);
          if (result.status === 0 && result.stdout) {
            extractedText = result.stdout.toString();
            console.log("Extracted with pdftotext utility");
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log("pdftotext not available:", errorMessage);
        }
      }
      
      // If empty, try approach 2: Read PDF as string and use LaTeX-focused extraction
      if (!extractedText.trim()) {
        const pdfContent = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
        
        // Special patterns for LaTeX-generated PDFs
        const latexPatterns = [
          // Text pattern in LaTeX PDFs - more generous pattern
          /\(([^)]{2,})\)/g,
          // Tj pattern in PDF content
          /\([^)]+\)\s*Tj/g,
          // BT...ET text blocks (Beginning/End Text)
          /BT\s*([\s\S]*?)\s*ET/g,
          // Look for CMR font entries (common in LaTeX)
          /\/([CT]m[rbi]\d+)\s+\d+\s+Tf/g,
          // Text inside square brackets with LaTeX commands
          /\\text\{([^}]+)\}/g,
          // LaTeX title, author, section patterns
          /\\(?:title|author|section|subsection)\{([^}]+)\}/g,
          // Look for sequences that appear to be sentences (starts with capital, has spaces, ends with period)
          /[A-Z][a-z]+(?:\s+[a-z]+){2,}\.?/g
        ];
        
        let extractedParts: string[] = [];
        
        for (const pattern of latexPatterns) {
          const matches = pdfContent.match(pattern) || [];
          const parts = matches
            .map(match => match.replace(/\(|\)|Tj|BT|ET/g, ''))
            .filter(part => part.trim().length > 0 && /[a-zA-Z0-9]/.test(part));
          
          extractedParts = [...extractedParts, ...parts];
        }
        
        if (extractedParts.length > 0) {
          extractedText = extractedParts.join(' ');
          console.log("Extracted with LaTeX-focused pattern matching");
        }
      }
      
      // Try approach 3: Use pdf-lib to extract text
      if (!extractedText.trim()) {
        try {
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          
          const numPages = pdfDoc.getPageCount();
          console.log(`PDF has ${numPages} pages`);
          
          // We can't directly extract text with pdf-lib, but we can get metadata
          const title = pdfDoc.getTitle() || '';
          const author = pdfDoc.getAuthor() || '';
          const subject = pdfDoc.getSubject() || '';
          const keywords = pdfDoc.getKeywords() || '';
          
          // Combine metadata to at least get some information
          const metadataText = [
            title ? `Title: ${title}` : '',
            author ? `Author: ${author}` : '',
            subject ? `Subject: ${subject}` : '',
            keywords ? `Keywords: ${keywords}` : '',
          ].filter(Boolean).join('\n');
          
          if (metadataText.trim()) {
            extractedText = metadataText;
            console.log("Extracted PDF metadata");
          }
        } catch (error) {
          console.error("Error using pdf-lib:", error);
        }
      }
      
      // If still empty, use a fallback approach
      if (!extractedText.trim()) {
        // Attempt to extract any strings of printable ASCII characters from the buffer
        const ascii = buffer.toString('ascii');
        const printableChars = ascii.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        const words = printableChars.split(/\s+/).filter(w => w.length > 3);
        extractedText = words.join(' ');
        console.log("Used fallback ASCII extraction");
      }
      
      // Clean up the text
      extractedText = extractedText
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        // Remove multiple consecutive line breaks
        .replace(/\n{3,}/g, '\n\n')
        // Remove PDF-specific markers and LaTeX commands
        .replace(/\\?[\\(]|\\\)/g, '')
        .replace(/\\[a-zA-Z]+\{|\}/g, '')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/endobj|obj|\d+ \d+ obj/g, '')
        .replace(/stream|endstream/g, '')
        .replace(/xref|trailer/g, '')
        .replace(/\/(?:Title|Author|Subject|Keywords|Producer|Creator|CreationDate|ModDate|BaseFont|Encoding|FontDescriptor|Font|Page|Contents|Resources|MediaBox)/g, '')
        // Remove non-printable characters
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();
      
      // Further cleanup - remove gibberish that often appears in PDF extractions
      extractedText = extractedText
        // Remove weird character sequences that are often artifacts
        .replace(/[^\w\s.,;:?!()"'-]{3,}/g, ' ')
        // If we see lots of endobj patterns, it's probably just PDF structure, not content
        .replace(/endobj\s*\d+\s*\d+\s*obj/g, ' ')
        // Remove common PDF dictionary entries that get mistakenly included
        .replace(/\/Length \d+ >>|\/Filter \/FlateDecode/g, ' ')
        .trim();
      
      console.log("Extracted text from PDF (sample):", extractedText.substring(0, 200));
      
      // If we couldn't extract any meaningful text, provide a detailed error message
      if (!extractedText || extractedText.trim().length < 100 || !/[a-zA-Z]{5,}/.test(extractedText)) {
        console.error("Failed to extract meaningful text from PDF");
        return {
          text: "ERROR: Unable to extract text content from your PDF. This might be because:\n\n" +
                "1. The PDF contains scanned images without embedded text\n" +
                "2. The PDF has security restrictions or is password-protected\n" +
                "3. The PDF uses custom fonts or encoding\n\n" +
                "Please try uploading a different PDF where you can select and copy text content."
        };
      }

      return {
        text: extractedText
      };
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        console.error("Error deleting temp file:", e);
      }
    }
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return {
      text: "Error extracting text from PDF. The file may be corrupted or in an unsupported format."
    };
  }
}