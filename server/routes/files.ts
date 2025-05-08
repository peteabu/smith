import express, { Request, Response } from 'express';
import multer from 'multer';
import { getFile, saveFile } from '../file-storage';
import { extractTextFromPDF } from './utils';
import { storage } from '../storage';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Extend the Request type for multer
interface MulterRequest extends Request {
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}

// Route to upload a CV document
router.post('/upload', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, buffer } = req.file;
    
    // Save the file to storage
    const storedFile = await saveFile(buffer, originalname, mimetype);
    
    // Extract text if it's a PDF
    let extractedText = '';
    if (mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer);
    } else {
      // For simplicity, we'll just use a placeholder for Word docs
      // In a real app, you'd use a Word document parser
      extractedText = `Sample extracted text from ${originalname}`;
    }
    
    // Store in database
    const cvDocument = await storage.createCVDocument({
      fileName: originalname,
      fileUrl: storedFile.url,
      fileType: mimetype,
      extractedText,
      userId: null // Anonymous for now
    });
    
    res.status(201).json({ 
      id: cvDocument.id,
      fileName: cvDocument.fileName,
      url: cvDocument.fileUrl
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Route to get a stored file
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const file = await getFile(filename);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.setHeader('Content-Type', file.contentType);
    res.send(file.buffer);
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

export default router;