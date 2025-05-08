import pdfParse from "../pdf-parser";

/**
 * Extract text from PDF Buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Helper function to decode base64 to buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}