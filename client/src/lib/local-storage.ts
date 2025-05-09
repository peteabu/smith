// Constants for storage keys
const STORAGE_KEYS = {
  BASE_CV: 'cv-optimizer-base-cv',
  BASE_CV_NAME: 'cv-optimizer-base-cv-name',
  BASE_CV_ID: 'cv-optimizer-base-cv-id',
  LAST_UPDATED: 'cv-optimizer-last-updated'
};

/**
 * Saves the base CV content to local storage
 */
export function saveBaseCV(content: string, fileName: string = 'resume.txt', cvId?: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BASE_CV, content);
    localStorage.setItem(STORAGE_KEYS.BASE_CV_NAME, fileName);
    if (cvId) {
      localStorage.setItem(STORAGE_KEYS.BASE_CV_ID, cvId.toString());
    }
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
  } catch (error) {
    console.error('Failed to save CV to local storage:', error);
  }
}

/**
 * Retrieves the base CV content from local storage
 */
export function getBaseCV(): { content: string; fileName: string; cvId: number | null; lastUpdated: string | null } {
  try {
    const content = localStorage.getItem(STORAGE_KEYS.BASE_CV) || '';
    const fileName = localStorage.getItem(STORAGE_KEYS.BASE_CV_NAME) || 'resume.txt';
    const cvIdString = localStorage.getItem(STORAGE_KEYS.BASE_CV_ID);
    const cvId = cvIdString ? parseInt(cvIdString, 10) : null;
    const lastUpdated = localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
    
    return { content, fileName, cvId, lastUpdated };
  } catch (error) {
    console.error('Failed to retrieve CV from local storage:', error);
    return { content: '', fileName: 'resume.txt', cvId: null, lastUpdated: null };
  }
}

/**
 * Checks if a base CV exists in local storage
 */
export function hasStoredCV(): boolean {
  try {
    const content = localStorage.getItem(STORAGE_KEYS.BASE_CV);
    return !!content && content.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Clears the base CV from local storage
 */
export function clearStoredCV(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.BASE_CV);
    localStorage.removeItem(STORAGE_KEYS.BASE_CV_NAME);
    localStorage.removeItem(STORAGE_KEYS.BASE_CV_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED);
  } catch (error) {
    console.error('Failed to clear CV from local storage:', error);
  }
}

/**
 * Gets when the base CV was last updated
 */
export function getLastUpdated(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
  } catch (error) {
    return null;
  }
}

/**
 * Formats the "last updated" timestamp into a readable format
 */
export function formatLastUpdated(isoString: string | null): string {
  if (!isoString) return 'Never';
  
  try {
    const date = new Date(isoString);
    
    // If it's today, show time
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If it's yesterday, show "Yesterday"
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, show date
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Unknown date';
  }
}