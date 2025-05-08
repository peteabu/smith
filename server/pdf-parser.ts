// Custom PDF text extraction - no external dependencies
import { spawnSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
      
      // Try approach 1: Use the pdftotext utility if available (commonly found on Linux)
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
      
      // If empty, try approach 2: Read PDF as string and do basic extraction
      if (!extractedText.trim()) {
        const pdfContent = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
        
        // Extract text by finding patterns that look like text content
        const textMatches = pdfContent.match(/\\?[\\(]([^\\)]+)\\?[\\)]/g) || [];
        
        const extractedParts = textMatches
          .map(match => match.replace(/\\?[\\()]|TJ/g, ''))
          .filter(part => part.trim().length > 0 && /[a-zA-Z0-9]/.test(part));
          
        extractedText = extractedParts.join(' ');
        console.log("Extracted with basic pattern matching");
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
        // Remove non-printable characters
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();
      
      console.log("Extracted text from PDF (sample):", extractedText.substring(0, 200));
      
      return {
        text: extractedText || "Unable to extract text from this PDF. The file may be scan-only or contain security restrictions."
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