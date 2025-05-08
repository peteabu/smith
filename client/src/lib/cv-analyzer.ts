import { apiRequest } from "./queryClient";

export interface KeywordAnalysisResult {
  keywords: string[];
  content: string;
  id?: number;
}

export interface CvOptimizationResult {
  optimizedContent: string;
  matchRate: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  id?: number;
}

/**
 * Extracts keywords from a job description
 */
export async function analyzeJobDescription(
  jobDescription: string,
  cvId?: number
): Promise<KeywordAnalysisResult> {
  try {
    const payload = {
      jobDescription,
      ...(cvId ? { cvId } : {})
    };
    
    const response = await apiRequest('POST', '/api/analyze', payload);
    return await response.json();
  } catch (error) {
    console.error('Failed to analyze job description:', error);
    throw error;
  }
}

/**
 * Optimizes a CV based on a job description
 */
export async function optimizeCV(
  cvId: number,
  jobDescriptionId: number
): Promise<CvOptimizationResult> {
  try {
    const response = await apiRequest('POST', '/api/optimize', {
      cvId,
      jobDescriptionId
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to optimize CV:', error);
    throw error;
  }
}

/**
 * Uploads a CV file to the server
 */
export async function uploadCV(
  file: File,
  fileContent: string
): Promise<{ id: number; fileName: string }> {
  try {
    const response = await apiRequest('POST', '/api/cv/upload', {
      fileName: file.name,
      fileContent,
      fileType: file.type
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to upload CV:', error);
    throw error;
  }
}

/**
 * Downloads an optimized CV in the specified format
 */
export async function downloadOptimizedCV(
  optimizedCvId: number,
  format: 'pdf' | 'latex'
): Promise<string> {
  try {
    const response = await fetch(`/api/cv/download/${optimizedCvId}?format=${format}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download CV: ${response.statusText}`);
    }
    
    // Get the download URL from the response
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to download CV:', error);
    throw error;
  }
}
