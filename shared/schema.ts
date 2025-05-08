import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cvDocuments = pgTable("cv_documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileContent: text("file_content"), // Base64 encoded file content (optional if fileUrl is provided)
  fileUrl: text("file_url"), // URL to stored file in blob storage
  fileType: text("file_type").notNull(), // mime type
  extractedText: text("extracted_text"), // Extracted text from CV
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const jobDescriptions = pgTable("job_descriptions", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  keywords: jsonb("keywords").$type<string[]>(),
  roleResearch: text("role_research"), // Additional research about the role
  industryKeywords: jsonb("industry_keywords").$type<string[]>(), // Industry-specific keywords
  recruitmentInsights: text("recruitment_insights"), // Insights about recruitment in the industry
  atsFindings: text("ats_findings"), // Findings about ATS systems for this role
  webSearchResults: jsonb("web_search_results"), // Web search results used for analysis
  cvId: integer("cv_id").references(() => cvDocuments.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const optimizedCVs = pgTable("optimized_cvs", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(), // Optimized content in HTML format
  matchRate: integer("match_rate").notNull(), // Percentage match
  cvId: integer("cv_id").references(() => cvDocuments.id),
  jobDescriptionId: integer("job_description_id").references(() => jobDescriptions.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCVDocumentSchema = createInsertSchema(cvDocuments).pick({
  fileName: true,
  fileContent: true,
  fileUrl: true,
  fileType: true,
  extractedText: true,
  userId: true,
});

export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).pick({
  content: true,
  keywords: true,
  roleResearch: true,
  industryKeywords: true,
  recruitmentInsights: true,
  atsFindings: true,
  webSearchResults: true,
  cvId: true,
  userId: true,
});

export const insertOptimizedCVSchema = createInsertSchema(optimizedCVs).pick({
  content: true,
  matchRate: true,
  cvId: true,
  jobDescriptionId: true,
  userId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCVDocument = z.infer<typeof insertCVDocumentSchema>;
export type CVDocument = typeof cvDocuments.$inferSelect;

export type InsertJobDescription = z.infer<typeof insertJobDescriptionSchema>;
export type JobDescription = typeof jobDescriptions.$inferSelect;

export type InsertOptimizedCV = z.infer<typeof insertOptimizedCVSchema>;
export type OptimizedCV = typeof optimizedCVs.$inferSelect;

// API Schema for frontend requests
export const analyzeJobDescriptionSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required"),
  cvId: z.number().optional()
});

export const optimizeCVSchema = z.object({
  cvId: z.number(),
  jobDescriptionId: z.number()
});
