/**
 * Unit tests for compatibility evaluation logic
 */

import {evaluateCompatibility} from '../compatibility';
import type {CompatibilityRule} from '../schema';

describe('evaluateCompatibility', () => {
  describe('with matching rules', () => {
    const testMatrix: CompatibilityRule[] = [
      {
        clientVersionPattern: '2026-02-*',
        minApiVersion: '2026-02-01',
        maxApiVersion: '2026-12-31',
        platforms: ['ios', 'android', 'web'],
      },
      {
        clientVersionPattern: '2026-01-*',
        minApiVersion: '2026-01-01',
        maxApiVersion: '2026-02-28',
        platforms: ['ios', 'android', 'web'],
      },
    ];

    it('should return compatible when API version is within bounds', () => {
      const result = evaluateCompatibility(
        '2026-02-18',
        '2026-02-20',
        'ios',
        testMatrix,
      );

      expect(result.isCompatible).toBe(true);
      expect(result.matchedRule).toBeDefined();
      expect(result.matchedRule?.clientVersionPattern).toBe('2026-02-*');
      expect(result.reason).toContain('within allowed range');
    });

    it('should return incompatible when API version is below minimum', () => {
      const result = evaluateCompatibility(
        '2026-02-18',
        '2026-01-15',
        'ios',
        testMatrix,
      );

      expect(result.isCompatible).toBe(false);
      expect(result.matchedRule).toBeDefined();
      expect(result.reason).toContain('outside allowed range');
    });

    it('should return incompatible when API version is above maximum', () => {
      const result = evaluateCompatibility(
        '2026-02-18',
        '2027-01-01',
        'ios',
        testMatrix,
      );

      expect(result.isCompatible).toBe(false);
      expect(result.matchedRule).toBeDefined();
      expect(result.reason).toContain('outside allowed range');
    });

    it('should match the correct rule based on client version pattern', () => {
      const result = evaluateCompatibility(
        '2026-01-15',
        '2026-01-20',
        'android',
        testMatrix,
      );

      expect(result.isCompatible).toBe(true);
      expect(result.matchedRule?.clientVersionPattern).toBe('2026-01-*');
    });

    it('should respect platform filtering', () => {
      const platformSpecificMatrix: CompatibilityRule[] = [
        {
          clientVersionPattern: '2026-02-*',
          minApiVersion: '2026-02-01',
          maxApiVersion: '2026-12-31',
          platforms: ['ios'],
        },
      ];

      const iosResult = evaluateCompatibility(
        '2026-02-18',
        '2026-02-20',
        'ios',
        platformSpecificMatrix,
      );
      expect(iosResult.isCompatible).toBe(true);
      expect(iosResult.matchedRule).toBeDefined();

      const androidResult = evaluateCompatibility(
        '2026-02-18',
        '2026-02-20',
        'android',
        platformSpecificMatrix,
      );
      expect(androidResult.matchedRule).toBeUndefined();
    });

    it('should handle exact version match at boundaries', () => {
      const minBoundary = evaluateCompatibility(
        '2026-02-18',
        '2026-02-01',
        'ios',
        testMatrix,
      );
      expect(minBoundary.isCompatible).toBe(true);

      const maxBoundary = evaluateCompatibility(
        '2026-02-18',
        '2026-12-31',
        'ios',
        testMatrix,
      );
      expect(maxBoundary.isCompatible).toBe(true);
    });
  });

  describe('with wildcard patterns', () => {
    const wildcardMatrix: CompatibilityRule[] = [
      {
        clientVersionPattern: '2026-*',
        minApiVersion: '2026-01-01',
        maxApiVersion: '2026-12-31',
        platforms: ['ios', 'android', 'web'],
      },
      {
        clientVersionPattern: '*',
        minApiVersion: '2020-01-01',
        maxApiVersion: '2030-12-31',
        platforms: ['ios', 'android', 'web'],
      },
    ];

    it('should match year-level wildcard', () => {
      const result = evaluateCompatibility(
        '2026-05-15',
        '2026-06-01',
        'web',
        wildcardMatrix,
      );

      expect(result.isCompatible).toBe(true);
      expect(result.matchedRule?.clientVersionPattern).toBe('2026-*');
    });

    it('should match universal wildcard', () => {
      const result = evaluateCompatibility(
        '2025-01-01',
        '2025-06-01',
        'ios',
        wildcardMatrix,
      );

      expect(result.isCompatible).toBe(true);
      expect(result.matchedRule?.clientVersionPattern).toBe('*');
    });

    it('should prefer more specific pattern over wildcard', () => {
      const result = evaluateCompatibility(
        '2026-03-15',
        '2026-04-01',
        'android',
        wildcardMatrix,
      );

      // Should match the more specific "2026-*" rule first
      expect(result.matchedRule?.clientVersionPattern).toBe('2026-*');
    });
  });

  describe('with no matching rules (default policy)', () => {
    const emptyMatrix: CompatibilityRule[] = [];

    it('should allow recent versions (within 3 months)', () => {
      const today = new Date();
      const twoMonthsAgo = new Date(today);
      twoMonthsAgo.setMonth(today.getMonth() - 2);

      const clientVersion = twoMonthsAgo.toISOString().split('T')[0];
      const apiVersion = today.toISOString().split('T')[0];

      const result = evaluateCompatibility(
        clientVersion,
        apiVersion,
        'ios',
        emptyMatrix,
      );

      expect(result.isCompatible).toBe(true);
      expect(result.matchedRule).toBeUndefined();
      expect(result.reason).toContain('default policy allows recent versions');
    });

    it('should block old versions (older than 3 months)', () => {
      const today = new Date();
      const fourMonthsAgo = new Date(today);
      fourMonthsAgo.setMonth(today.getMonth() - 4);

      const clientVersion = fourMonthsAgo.toISOString().split('T')[0];
      const apiVersion = today.toISOString().split('T')[0];

      const result = evaluateCompatibility(
        clientVersion,
        apiVersion,
        'android',
        emptyMatrix,
      );

      expect(result.isCompatible).toBe(false);
      expect(result.matchedRule).toBeUndefined();
      expect(result.reason).toContain('default policy blocks old versions');
    });

    it('should handle edge case at exactly 3 months', () => {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);

      const clientVersion = threeMonthsAgo.toISOString().split('T')[0];
      const apiVersion = today.toISOString().split('T')[0];

      const result = evaluateCompatibility(
        clientVersion,
        apiVersion,
        'web',
        emptyMatrix,
      );

      // At exactly 3 months, should be allowed (>= comparison)
      expect(result.isCompatible).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty compatibility matrix', () => {
      const result = evaluateCompatibility(
        '2026-02-18',
        '2026-02-20',
        'ios',
        [],
      );

      expect(result.matchedRule).toBeUndefined();
      expect(result.reason).toBeDefined();
    });

    it('should handle multiple rules for same pattern', () => {
      const duplicateMatrix: CompatibilityRule[] = [
        {
          clientVersionPattern: '2026-02-*',
          minApiVersion: '2026-02-01',
          maxApiVersion: '2026-06-30',
          platforms: ['ios'],
        },
        {
          clientVersionPattern: '2026-02-*',
          minApiVersion: '2026-02-01',
          maxApiVersion: '2026-12-31',
          platforms: ['android'],
        },
      ];

      const iosResult = evaluateCompatibility(
        '2026-02-18',
        '2026-07-01',
        'ios',
        duplicateMatrix,
      );
      expect(iosResult.isCompatible).toBe(false);

      const androidResult = evaluateCompatibility(
        '2026-02-18',
        '2026-07-01',
        'android',
        duplicateMatrix,
      );
      expect(androidResult.isCompatible).toBe(true);
    });

    it('should handle same client and API version', () => {
      const matrix: CompatibilityRule[] = [
        {
          clientVersionPattern: '2026-02-*',
          minApiVersion: '2026-02-01',
          maxApiVersion: '2026-12-31',
          platforms: ['ios', 'android', 'web'],
        },
      ];

      const result = evaluateCompatibility(
        '2026-02-18',
        '2026-02-18',
        'ios',
        matrix,
      );

      expect(result.isCompatible).toBe(true);
    });
  });
});
