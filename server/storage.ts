import { 
  users, type User, type InsertUser,
  cvDocuments, type CVDocument, type InsertCVDocument,
  jobDescriptions, type JobDescription, type InsertJobDescription,
  optimizedCVs, type OptimizedCV, type InsertOptimizedCV
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Storage interface with CRUD methods
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

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // CV Document methods
  async createCVDocument(document: InsertCVDocument): Promise<CVDocument> {
    // Create a record with current timestamp
    const [cvDocument] = await db
      .insert(cvDocuments)
      .values({
        fileName: document.fileName,
        fileContent: document.fileContent || null,
        fileUrl: document.fileUrl || null,
        fileType: document.fileType,
        extractedText: document.extractedText || null,
        userId: document.userId || null,
        createdAt: new Date().toISOString()
      })
      .returning();
    return cvDocument;
  }
  
  async getCVDocument(id: number): Promise<CVDocument | undefined> {
    const [document] = await db
      .select()
      .from(cvDocuments)
      .where(eq(cvDocuments.id, id));
    return document || undefined;
  }
  
  // Job Description methods
  async createJobDescription(jobDescription: InsertJobDescription): Promise<JobDescription> {
    // Ensure keywords is properly formatted for PostgreSQL
    const [jobDesc] = await db
      .insert(jobDescriptions)
      .values({
        content: jobDescription.content,
        createdAt: new Date().toISOString(),
        userId: jobDescription.userId || null,
        cvId: jobDescription.cvId || null,
        // Handle keyword arrays
        keywords: jobDescription.keywords
      })
      .returning();
    return jobDesc;
  }
  
  async getJobDescription(id: number): Promise<JobDescription | undefined> {
    const [jobDesc] = await db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, id));
    return jobDesc || undefined;
  }
  
  // Optimized CV methods
  async createOptimizedCV(optimizedCV: InsertOptimizedCV): Promise<OptimizedCV> {
    const [optCV] = await db
      .insert(optimizedCVs)
      .values({
        ...optimizedCV,
        createdAt: new Date().toISOString(),
        userId: optimizedCV.userId || null,
        cvId: optimizedCV.cvId || null,
        jobDescriptionId: optimizedCV.jobDescriptionId || null
      })
      .returning();
    return optCV;
  }
  
  async getOptimizedCV(id: number): Promise<OptimizedCV | undefined> {
    const [optCV] = await db
      .select()
      .from(optimizedCVs)
      .where(eq(optimizedCVs.id, id));
    return optCV || undefined;
  }
  
  async getOptimizedCVByJobAndDocument(jobId: number, cvId: number): Promise<OptimizedCV | undefined> {
    const [optCV] = await db
      .select()
      .from(optimizedCVs)
      .where(and(
        eq(optimizedCVs.jobDescriptionId, jobId),
        eq(optimizedCVs.cvId, cvId)
      ));
    return optCV || undefined;
  }
}

export const storage = new DatabaseStorage();
