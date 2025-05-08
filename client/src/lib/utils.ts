import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

export function isValidFileType(file: File): boolean {
  const acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  return acceptedTypes.includes(file.type);
}

export function highlightMatchedKeywords(text: string, keywords: string[]): string {
  if (!keywords || keywords.length === 0 || !text) return text;
  
  let highlightedText = text;
  const lowerText = text.toLowerCase();
  
  // Sort keywords by length (longest first) to avoid highlighting substrings
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
  
  // Create a map to track which portions of text have been highlighted
  const highlightedRanges: [number, number][] = [];
  
  for (const keyword of sortedKeywords) {
    const lowerKeyword = keyword.toLowerCase();
    let index = 0;
    
    while ((index = lowerText.indexOf(lowerKeyword, index)) !== -1) {
      const endIndex = index + keyword.length;
      
      // Check if this range overlaps with any already highlighted range
      const overlaps = highlightedRanges.some(
        ([start, end]) => (index >= start && index < end) || (endIndex > start && endIndex <= end)
      );
      
      if (!overlaps) {
        highlightedRanges.push([index, endIndex]);
      }
      
      index = endIndex;
    }
  }
  
  // Sort ranges in descending order of start position to avoid index shifting
  highlightedRanges.sort((a, b) => b[0] - a[0]);
  
  // Apply highlighting
  for (const [start, end] of highlightedRanges) {
    const originalWord = text.substring(start, end);
    highlightedText = 
      highlightedText.substring(0, start) + 
      `<span class="bg-green-100 px-1">${originalWord}</span>` + 
      highlightedText.substring(end);
  }
  
  return highlightedText;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
