/**
 * API Versioning utilities for FireAlert app
 * Handles date-based version parameters and version management
 */

/**
 * Generates a date-based version string in YYYY-MM-DD format
 * @param date - Optional date to format (defaults to today)
 * @returns Version string in format "YYYY-MM-DD"
 */
export function generateVersionString(date?: Date): string {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Validates a version string format
 * @param version - Version string to validate
 * @returns True if version is in valid YYYY-MM-DD format
 */
export function isValidVersionString(version: string): boolean {
  const versionRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!versionRegex.test(version)) {
    return false;
  }
  
  // Additional validation: check if it's a valid date
  const parts = version.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Compares two version strings
 * @param version1 - First version string
 * @param version2 - Second version string
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
  if (!isValidVersionString(version1) || !isValidVersionString(version2)) {
    throw new Error('Invalid version string format');
  }
  
  const date1 = new Date(version1);
  const date2 = new Date(version2);
  
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

/**
 * Gets the current version string for today
 * @returns Today's version string
 */
export function getCurrentVersion(): string {
  return generateVersionString();
}

/**
 * Gets a version string for a specific number of days ago
 * @param daysAgo - Number of days to go back
 * @returns Version string for the specified date
 */
export function getVersionDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return generateVersionString(date);
}

/**
 * Converts version string to URL query parameter format
 * @param version - Version string
 * @returns Query parameter string (e.g., "v=2026-03-20")
 */
export function versionToQueryParam(version?: string): string {
  const versionString = version || getCurrentVersion();
  if (!isValidVersionString(versionString)) {
    console.warn('[apiVersioning] Invalid version string, using current date');
    return `v=${getCurrentVersion()}`;
  }
  
  return `v=${versionString}`;
}

/**
 * Extracts version from URL query parameters
 * @param queryParams - URL query parameters string or object
 * @returns Version string or null if not found
 */
export function extractVersionFromQuery(queryParams: string | Record<string, string>): string | null {
  let params: Record<string, string>;
  
  if (typeof queryParams === 'string') {
    // Parse query string
    params = {};
    const urlParams = new URLSearchParams(queryParams);
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
  } else {
    params = queryParams;
  }
  
  const version = params['v'] || params['version'];
  if (version && isValidVersionString(version)) {
    return version;
  }
  
  return null;
}

/**
 * Adds version parameter to a URL or query string
 * @param urlOrQuery - Base URL or query string
 * @param version - Optional version string (defaults to current)
 * @returns URL or query string with version parameter added
 */
export function addVersionToUrl(urlOrQuery: string, version?: string): string {
  const versionString = version || getCurrentVersion();
  const versionParam = versionToQueryParam(versionString);
  
  // Check if it's a full URL or just a query string
  const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(urlOrQuery);
  
  if (hasProtocol) {
    // Full URL
    const separator = urlOrQuery.includes('?') ? '&' : '?';
    return `${urlOrQuery}${separator}${versionParam}`;
  } else {
    // Query string or path
    const separator = urlOrQuery.includes('?') ? '&' : '?';
    return `${urlOrQuery}${separator}${versionParam}`;
  }
}

/**
 * Determines if a version is supported (within a compatibility window)
 * @param version - Version to check
 * @param maxDaysOld - Maximum age in days for compatibility (default: 30)
 * @returns True if version is supported
 */
export function isVersionSupported(version: string, maxDaysOld: number = 30): boolean {
  if (!isValidVersionString(version)) {
    return false;
  }
  
  const versionDate = new Date(version);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - versionDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= maxDaysOld;
}

/**
 * Gets the recommended version for API calls
 * @param useLatest - Whether to use the latest version (default: true)
 * @param daysBack - If not latest, how many days back to go
 * @returns Recommended version string
 */
export function getRecommendedVersion(useLatest: boolean = true, daysBack: number = 0): string {
  if (useLatest) {
    return getCurrentVersion();
  } else {
    return getVersionDaysAgo(daysBack);
  }
}

// Default export with commonly used functions
export const apiVersioning = {
  generateVersionString,
  getCurrentVersion,
  versionToQueryParam,
  addVersionToUrl,
  isVersionSupported,
  getRecommendedVersion,
};
