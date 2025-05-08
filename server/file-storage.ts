import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure the upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw error;
  }
}

// Generate a safe filename with a random component to avoid collisions
function generateSafeFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]/g, '-') // Replace non-alphanumeric chars with hyphens
    .toLowerCase();
  
  return `${basename}-${timestamp}-${randomString}${ext}`;
}

export interface StoredFile {
  url: string;
  fileName: string;
  contentType: string;
  filePath: string;
}

/**
 * Save a file to local blob storage
 */
export async function saveFile(
  fileBuffer: Buffer, 
  originalName: string, 
  contentType: string
): Promise<StoredFile> {
  await ensureUploadDir();
  
  const safeFilename = generateSafeFilename(originalName);
  const filePath = path.join(UPLOAD_DIR, safeFilename);
  
  try {
    await fs.writeFile(filePath, fileBuffer);
    
    // In production, you'd return a CDN URL or signed URL
    // For development, we'll just use a local path
    const url = `/api/files/${safeFilename}`;
    
    return {
      url,
      fileName: safeFilename,
      contentType,
      filePath
    };
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
}

/**
 * Get a file from local blob storage
 */
export async function getFile(fileName: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const filePath = path.join(UPLOAD_DIR, fileName);
  
  try {
    const buffer = await fs.readFile(filePath);
    
    // In a real application, you'd store metadata including content type
    // Here we're just guessing it from the file extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream'; // Default
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.doc') {
      contentType = 'application/msword';
    }
    
    return { buffer, contentType };
  } catch (error) {
    console.error('Error retrieving file:', error);
    return null;
  }
}

/**
 * Delete a file from local blob storage
 */
export async function deleteFile(fileName: string): Promise<boolean> {
  const filePath = path.join(UPLOAD_DIR, fileName);
  
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}