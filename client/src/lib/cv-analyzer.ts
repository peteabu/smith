import { apiRequest } from "./queryClient";
import { fileToBase64 } from "./utils";

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
 * Preview extracted text from CV before uploading
 */
export async function previewCVText(
  file: File
): Promise<{ 
  extractedText: string; 
  isValid: boolean; 
  errorMessage: string | null;
}> {
  try {
    // Convert file to base64
    const fileContent = await fileToBase64(file);
    
    // Make request to preview endpoint
    const response = await fetch('/api/cv/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileContent,
        fileType: file.type,
      }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errorMessage || 'Failed to preview CV text');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to preview CV:', error);
    return {
      extractedText: '',
      isValid: false,
      errorMessage: error instanceof Error ? error.message : 'Failed to preview CV text'
    };
  }
}

/**
 * Uploads a CV file to the server
 */
export async function uploadCV(
  file: File,
  extractedText: string = ''
): Promise<{ id: number; fileName: string }> {
  try {
    if (extractedText) {
      // If we have pre-extracted text, use the JSON endpoint with base64 file
      const fileContent = await fileToBase64(file);
      
      const response = await fetch('/api/cv/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileContent,
          fileType: file.type,
          extractedText
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CV');
      }
      
      return await response.json();
    } else {
      // Use existing FormData approach as fallback
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload CV: ${response.statusText}`);
      }
      
      return await response.json();
    }
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
