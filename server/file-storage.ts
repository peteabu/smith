import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Directory where we'll store the files
const STORAGE_DIR = path.join(process.cwd(), 'storage');

// Ensure the storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

interface StoredFile {
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
  originalFilename: string, 
  contentType: string
): Promise<StoredFile> {
  // Generate a unique filename to avoid collisions
  const fileId = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(originalFilename);
  const fileName = `${fileId}${extension}`;
  const filePath = path.join(STORAGE_DIR, fileName);
  
  // Save the file
  await fs.promises.writeFile(filePath, fileBuffer);
  
  // Return the file metadata
  return {
    url: `/api/files/${fileName}`,
    fileName: originalFilename,
    contentType,
    filePath
  };
}

/**
 * Get a file from local blob storage
 */
export async function getFile(fileName: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const filePath = path.join(STORAGE_DIR, fileName);
  
  try {
    // Check if file exists
    await fs.promises.access(filePath);
    
    // Read the file
    const buffer = await fs.promises.readFile(filePath);
    
    // Determine content type based on extension
    const extension = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type
    
    // Map common extensions to content types
    const contentTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    
    if (extension in contentTypeMap) {
      contentType = contentTypeMap[extension];
    }
    
    return { buffer, contentType };
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Delete a file from local blob storage
 */
export async function deleteFile(fileName: string): Promise<boolean> {
  const filePath = path.join(STORAGE_DIR, fileName);
  
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}