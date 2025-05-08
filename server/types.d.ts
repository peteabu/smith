// Type declarations for modules without TypeScript definitions

declare module 'multer' {
  import { Request } from 'express';
  
  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface MulterRequest extends Request {
    file: File;
    files: {
      [fieldname: string]: File[];
    } | File[];
  }
  
  interface Options {
    dest?: string;
    storage?: any;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?(req: Request, file: File, callback: (error: Error | null, acceptFile: boolean) => void): void;
    preservePath?: boolean;
  }
  
  interface Instance {
    (fieldname: string): any;
    single(fieldname: string): (req: Request, res: Response, next: NextFunction) => void;
    array(fieldname: string, maxCount?: number): (req: Request, res: Response, next: NextFunction) => void;
    fields(fields: { name: string; maxCount?: number; }[]): (req: Request, res: Response, next: NextFunction) => void;
    none(): (req: Request, res: Response, next: NextFunction) => void;
    any(): (req: Request, res: Response, next: NextFunction) => void;
  }
  
  interface Multer {
    (options?: Options): Instance;
    diskStorage(options: { destination?: (req: Request, file: File, callback: (error: Error | null, destination: string) => void) => void; filename?: (req: Request, file: File, callback: (error: Error | null, filename: string) => void) => void; }): any;
    memoryStorage(): any;
  }
  
  const multer: Multer;
  export default multer;
}

declare module 'pdfkit' {
  import { Writable } from 'stream';
  
  interface PDFDocumentOptions {
    bufferPages?: boolean;
    autoFirstPage?: boolean;
    size?: string | [number, number];
    margin?: number | { top: number; left: number; bottom: number; right: number };
    margins?: { top: number; left: number; bottom: number; right: number };
    layout?: 'portrait' | 'landscape';
    info?: { Title: string; Author: string; Subject: string; Keywords: string };
    pdfVersion?: string;
    compress?: boolean;
    userPassword?: string;
    ownerPassword?: string;
    permissions?: {
      printing?: 'lowResolution' | 'highResolution';
      modifying?: boolean;
      copying?: boolean;
      annotating?: boolean;
      fillingForms?: boolean;
      contentAccessibility?: boolean;
      documentAssembly?: boolean;
    };
  }
  
  class PDFDocument extends Writable {
    constructor(options?: PDFDocumentOptions);
    
    addPage(options?: { size?: string | [number, number]; margin?: number | { top: number; left: number; bottom: number; right: number }; layout?: 'portrait' | 'landscape' }): this;
    
    font(src: string, family?: string): this;
    fontSize(size: number): this;
    text(text: string, options?: { align?: 'left' | 'center' | 'right' | 'justify'; lineBreak?: boolean }): this;
    moveDown(lines?: number): this;
    
    on(event: 'data', callback: (chunk: Buffer) => void): this;
    on(event: 'end', callback: () => void): this;
    end(): this;
  }
  
  export default PDFDocument;
}