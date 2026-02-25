/**
 * Version validation and comparison utilities for the API Versioning System
 *
 * This module provides functions for validating CalVer and SemVer formats,
 * comparing versions, and matching version patterns with wildcard support.
 */

/**
 * Validates if a string matches the CalVer format (YYYY-MM-DD) and represents a valid date
 *
 * @param version - The version string to validate
 * @returns true if the version is a valid CalVer format and represents a real date, false otherwise
 *
 * @example
 * isValidCalVer("2026-02-18") // true
 * isValidCalVer("2026-13-01") // false (invalid month)
 * isValidCalVer("2026-02-30") // false (invalid day)
 * isValidCalVer("not-a-date") // false
 */
export function isValidCalVer(version: string): boolean {
  // Check format matches YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(version)) {
    return false;
  }

  // Validate it's a real date
  const date = new Date(version);

  // Check if date is valid and matches the input
  // This catches cases like "2026-02-30" which would be parsed as "2026-03-02"
  if (isNaN(date.getTime())) {
    return false;
  }

  // Verify the date string matches what we parsed
  const isoDate = date.toISOString().split('T')[0];
  return isoDate === version;
}

/**
 * Validates if a string matches the SemVer format (MAJOR.MINOR.PATCH)
 *
 * @param version - The version string to validate
 * @returns true if the version is a valid SemVer format, false otherwise
 *
 * @example
 * isValidSemVer("1.9.0") // true
 * isValidSemVer("10.20.30") // true
 * isValidSemVer("1.9") // false (missing patch)
 * isValidSemVer("v1.9.0") // false (has prefix)
 */
export function isValidSemVer(version: string): boolean {
  const regex = /^\d+\.\d+\.\d+$/;
  return regex.test(version);
}

/**
 * Compares two CalVer version strings lexicographically
 *
 * @param v1 - First version string in YYYY-MM-DD format
 * @param v2 - Second version string in YYYY-MM-DD format
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 *
 * @example
 * compareVersions("2026-01-15", "2026-02-18") // -1
 * compareVersions("2026-02-18", "2026-02-18") // 0
 * compareVersions("2026-03-01", "2026-02-18") // 1
 */
export function compareVersions(v1: string, v2: string): number {
  if (v1 === v2) {
    return 0;
  }
  return v1 < v2 ? -1 : 1;
}

/**
 * Checks if a version string matches a wildcard pattern
 *
 * Supports wildcards at different levels:
 * - "*" matches any version
 * - "2026-*" matches any version in 2026
 * - "2026-02-*" matches any version in February 2026
 * - "2026-02-18" matches exactly that version
 *
 * @param version - The version string to check
 * @param pattern - The pattern to match against (supports "*" wildcards)
 * @returns true if the version matches the pattern, false otherwise
 *
 * @example
 * matchesPattern("2026-02-18", "*") // true
 * matchesPattern("2026-02-18", "2026-*") // true
 * matchesPattern("2026-02-18", "2026-02-*") // true
 * matchesPattern("2026-02-18", "2026-02-18") // true
 * matchesPattern("2026-02-18", "2026-03-*") // false
 */
export function matchesPattern(version: string, pattern: string): boolean {
  // Universal wildcard matches everything
  if (pattern === '*') {
    return true;
  }

  // Convert pattern to regex by escaping special chars and replacing * with .*
  const regexPattern =
    '^' +
    pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
    '$';
  const regex = new RegExp(regexPattern);

  return regex.test(version);
}
