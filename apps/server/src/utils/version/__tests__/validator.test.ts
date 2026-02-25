/**
 * Unit tests for version validation and comparison utilities
 */

import {describe, it, expect} from 'vitest';
import {
  isValidCalVer,
  isValidSemVer,
  compareVersions,
  matchesPattern,
} from '../validator';

describe('Version Validator', () => {
  describe('isValidCalVer', () => {
    it('should validate correct CalVer format', () => {
      expect(isValidCalVer('2026-02-18')).toBe(true);
      expect(isValidCalVer('2020-01-01')).toBe(true);
      expect(isValidCalVer('2030-12-31')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidCalVer('2026-2-18')).toBe(false); // Missing leading zero
      expect(isValidCalVer('26-02-18')).toBe(false); // Two-digit year
      expect(isValidCalVer('2026/02/18')).toBe(false); // Wrong separator
      expect(isValidCalVer('not-a-date')).toBe(false);
      expect(isValidCalVer('2026-02')).toBe(false); // Missing day
      expect(isValidCalVer('')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(isValidCalVer('2026-13-01')).toBe(false); // Invalid month
      expect(isValidCalVer('2026-00-01')).toBe(false); // Invalid month
      expect(isValidCalVer('2026-02-30')).toBe(false); // Invalid day for February
      expect(isValidCalVer('2026-02-00')).toBe(false); // Invalid day
      expect(isValidCalVer('2026-04-31')).toBe(false); // Invalid day for April
    });

    it('should handle leap years correctly', () => {
      expect(isValidCalVer('2024-02-29')).toBe(true); // Leap year
      expect(isValidCalVer('2023-02-29')).toBe(false); // Not a leap year
    });
  });

  describe('isValidSemVer', () => {
    it('should validate correct SemVer format', () => {
      expect(isValidSemVer('1.9.0')).toBe(true);
      expect(isValidSemVer('0.0.1')).toBe(true);
      expect(isValidSemVer('10.20.30')).toBe(true);
      expect(isValidSemVer('999.999.999')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidSemVer('1.9')).toBe(false); // Missing patch
      expect(isValidSemVer('1')).toBe(false); // Missing minor and patch
      expect(isValidSemVer('v1.9.0')).toBe(false); // Has prefix
      expect(isValidSemVer('1.9.0-beta')).toBe(false); // Has suffix
      expect(isValidSemVer('1.9.0.1')).toBe(false); // Too many parts
      expect(isValidSemVer('a.b.c')).toBe(false); // Non-numeric
      expect(isValidSemVer('')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('2026-02-18', '2026-02-18')).toBe(0);
      expect(compareVersions('2020-01-01', '2020-01-01')).toBe(0);
    });

    it('should return -1 when v1 < v2', () => {
      expect(compareVersions('2026-01-15', '2026-02-18')).toBe(-1);
      expect(compareVersions('2025-12-31', '2026-01-01')).toBe(-1);
      expect(compareVersions('2026-02-17', '2026-02-18')).toBe(-1);
    });

    it('should return 1 when v1 > v2', () => {
      expect(compareVersions('2026-03-01', '2026-02-18')).toBe(1);
      expect(compareVersions('2027-01-01', '2026-12-31')).toBe(1);
      expect(compareVersions('2026-02-19', '2026-02-18')).toBe(1);
    });

    it('should handle lexicographic comparison correctly', () => {
      // Ensure proper string comparison
      expect(compareVersions('2026-02-09', '2026-02-10')).toBe(-1);
      expect(compareVersions('2026-09-01', '2026-10-01')).toBe(-1);
    });
  });

  describe('matchesPattern', () => {
    const version = '2026-02-18';

    it('should match universal wildcard', () => {
      expect(matchesPattern(version, '*')).toBe(true);
      expect(matchesPattern('2020-01-01', '*')).toBe(true);
    });

    it('should match exact version', () => {
      expect(matchesPattern(version, '2026-02-18')).toBe(true);
      expect(matchesPattern(version, '2026-02-19')).toBe(false);
    });

    it('should match year wildcard', () => {
      expect(matchesPattern(version, '2026-*')).toBe(true);
      expect(matchesPattern(version, '2025-*')).toBe(false);
      expect(matchesPattern('2026-01-01', '2026-*')).toBe(true);
      expect(matchesPattern('2026-12-31', '2026-*')).toBe(true);
    });

    it('should match month wildcard', () => {
      expect(matchesPattern(version, '2026-02-*')).toBe(true);
      expect(matchesPattern(version, '2026-03-*')).toBe(false);
      expect(matchesPattern('2026-02-01', '2026-02-*')).toBe(true);
      expect(matchesPattern('2026-02-28', '2026-02-*')).toBe(true);
    });

    it('should not match different patterns', () => {
      expect(matchesPattern(version, '2025-*')).toBe(false);
      expect(matchesPattern(version, '2026-01-*')).toBe(false);
      expect(matchesPattern(version, '2027-02-18')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(matchesPattern('', '*')).toBe(true);
      expect(matchesPattern('', '2026-*')).toBe(false);
      expect(matchesPattern('2026-02-18', '')).toBe(false);
    });
  });
});
