declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string;
    info: any;
    metadata: any;
    version: string;
    numpages: number;
  }
  
  function parse(buffer: Buffer, options?: any): Promise<PDFParseResult>;
  export = parse;
}