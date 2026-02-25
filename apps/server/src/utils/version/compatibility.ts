/**
 * Compatibility evaluation utilities for the API Versioning System
 *
 * This module provides functions for evaluating version compatibility between
 * clients and the API server using the compatibility matrix rules.
 */

import {compareVersions, matchesPattern} from './validator';
import type {CompatibilityRule, Platform} from './schema';

/**
 * Result of a compatibility evaluation
 */
export interface CompatibilityEvaluation {
  /** Whether the client and API versions are compatible */
  isCompatible: boolean;
  /** The compatibility rule that was matched (if any) */
  matchedRule?: CompatibilityRule;
  /** Human-readable reason for the compatibility result */
  reason?: string;
}

/**
 * Evaluates compatibility between a client version and API version
 *
 * This function checks if the API version falls within the allowed range
 * defined by the compatibility matrix for the given client version and platform.
 *
 * Algorithm:
 * 1. Find a matching rule for the client version and platform
 * 2. If a rule is found, check if API version is within [minApiVersion, maxApiVersion]
 * 3. If no rule is found, apply default policy (allow versions within 3 months)
 *
 * @param clientVersion - The client's CalVer version (YYYY-MM-DD)
 * @param apiVersion - The API server's CalVer version (YYYY-MM-DD)
 * @param platform - The client platform (ios, android, or web)
 * @param matrix - Array of compatibility rules to evaluate against
 * @returns CompatibilityEvaluation with isCompatible flag, matched rule, and reason
 *
 * @example
 * // Client version matches a rule and API is within bounds
 * evaluateCompatibility(
 *   "2026-02-18",
 *   "2026-02-20",
 *   "ios",
 *   [{
 *     clientVersionPattern: "2026-02-*",
 *     minApiVersion: "2026-02-01",
 *     maxApiVersion: "2026-12-31",
 *     platforms: ["ios", "android", "web"]
 *   }]
 * )
 * // Returns: { isCompatible: true, matchedRule: {...}, reason: "..." }
 *
 * @example
 * // No matching rule, default policy applies
 * evaluateCompatibility("2026-02-18", "2026-02-20", "ios", [])
 * // Returns: { isCompatible: true, reason: "No explicit rule, default policy allows recent versions" }
 */
export function evaluateCompatibility(
  clientVersion: string,
  apiVersion: string,
  platform: Platform,
  matrix: CompatibilityRule[],
): CompatibilityEvaluation {
  // Find matching rule for client version and platform
  const matchedRule = matrix.find(
    rule =>
      rule.platforms.includes(platform) &&
      matchesPattern(clientVersion, rule.clientVersionPattern),
  );

  if (!matchedRule) {
    // No explicit rule found, apply default policy
    // Default: allow if client version is not too old (within 3 months)
    const threeMonthsAgo = getDateMonthsAgo(3);
    const isCompatible = compareVersions(clientVersion, threeMonthsAgo) >= 0;

    return {
      isCompatible,
      reason: isCompatible
        ? 'No explicit rule, default policy allows recent versions'
        : 'No explicit rule, default policy blocks old versions',
    };
  }

  // Check if API version is within the allowed range
  const isWithinMinBound =
    compareVersions(apiVersion, matchedRule.minApiVersion) >= 0;
  const isWithinMaxBound =
    compareVersions(apiVersion, matchedRule.maxApiVersion) <= 0;
  const isCompatible = isWithinMinBound && isWithinMaxBound;

  return {
    isCompatible,
    matchedRule,
    reason: isCompatible
      ? `API version ${apiVersion} is within allowed range [${matchedRule.minApiVersion}, ${matchedRule.maxApiVersion}]`
      : `API version ${apiVersion} is outside allowed range [${matchedRule.minApiVersion}, ${matchedRule.maxApiVersion}]`,
  };
}

/**
 * Helper function to get a date string N months ago from today
 *
 * @param months - Number of months to subtract from current date
 * @returns CalVer date string (YYYY-MM-DD) for the date N months ago
 *
 * @example
 * // If today is 2026-05-15
 * getDateMonthsAgo(3) // Returns "2026-02-15"
 */
function getDateMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);

  // Format as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
