import { 
  users, type User, type InsertUser,
  cvDocuments, type CVDocument, type InsertCVDocument,
  jobDescriptions, type JobDescription, type InsertJobDescription,
  optimizedCVs, type OptimizedCV, type InsertOptimizedCV
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // CV Document methods
  createCVDocument(document: InsertCVDocument): Promise<CVDocument>;
  getCVDocument(id: number): Promise<CVDocument | undefined>;
  
  // Job Description methods
  createJobDescription(jobDescription: InsertJobDescription): Promise<JobDescription>;
  getJobDescription(id: number): Promise<JobDescription | undefined>;
  
  // Optimized CV methods
  createOptimizedCV(optimizedCV: InsertOptimizedCV): Promise<OptimizedCV>;
  getOptimizedCV(id: number): Promise<OptimizedCV | undefined>;
  getOptimizedCVByJobAndDocument(jobId: number, cvId: number): Promise<OptimizedCV | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cvDocs: Map<number, CVDocument>;
  private jobDescs: Map<number, JobDescription>;
  private optimizedCVs: Map<number, OptimizedCV>;
  private currentUserId: number;
  private currentCVDocId: number;
  private currentJobDescId: number;
  private currentOptimizedCVId: number;

  constructor() {
    this.users = new Map();
    this.cvDocs = new Map();
    this.jobDescs = new Map();
    this.optimizedCVs = new Map();
    this.currentUserId = 1;
    this.currentCVDocId = 1;
    this.currentJobDescId = 1;
    this.currentOptimizedCVId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // CV Document methods
  async createCVDocument(document: InsertCVDocument): Promise<CVDocument> {
    const id = this.currentCVDocId++;
    const cvDocument: CVDocument = { 
      fileName: document.fileName,
      fileContent: document.fileContent,
      fileType: document.fileType,
      extractedText: document.extractedText || null,
      userId: document.userId || null,
      id,
      createdAt: new Date().toISOString()
    };
    this.cvDocs.set(id, cvDocument);
    return cvDocument;
  }
  
  async getCVDocument(id: number): Promise<CVDocument | undefined> {
    return this.cvDocs.get(id);
  }
  
  // Job Description methods
  async createJobDescription(jobDescription: InsertJobDescription): Promise<JobDescription> {
    const id = this.currentJobDescId++;
    const jobDesc: JobDescription = { 
      content: jobDescription.content,
      id,
      createdAt: new Date().toISOString(),
      userId: jobDescription.userId || null,
      cvId: jobDescription.cvId || null,
      // Handle any[] type and convert to string[] explicitly
      keywords: jobDescription.keywords ? (jobDescription.keywords as unknown as string[]) : null
    };
    this.jobDescs.set(id, jobDesc);
    return jobDesc;
  }
  
  async getJobDescription(id: number): Promise<JobDescription | undefined> {
    return this.jobDescs.get(id);
  }
  
  // Optimized CV methods
  async createOptimizedCV(optimizedCV: InsertOptimizedCV): Promise<OptimizedCV> {
    const id = this.currentOptimizedCVId++;
    const optCV: OptimizedCV = { 
      ...optimizedCV, 
      id,
      createdAt: new Date().toISOString(),
      userId: optimizedCV.userId || null,
      cvId: optimizedCV.cvId || null,
      jobDescriptionId: optimizedCV.jobDescriptionId || null
    };
    this.optimizedCVs.set(id, optCV);
    return optCV;
  }
  
  async getOptimizedCV(id: number): Promise<OptimizedCV | undefined> {
    return this.optimizedCVs.get(id);
  }
  
  async getOptimizedCVByJobAndDocument(jobId: number, cvId: number): Promise<OptimizedCV | undefined> {
    return Array.from(this.optimizedCVs.values()).find(
      (cv) => cv.jobDescriptionId === jobId && cv.cvId === cvId
    );
  }
}

export const storage = new MemStorage();
