import {describe, it, expect} from 'vitest';
import {
  validateVersionConfig,
  validateMetadata,
  versionConfigSchema,
  versionMetadataSchema,
} from '../schema';
import {z} from 'zod';

describe('Version Schema Validation', () => {
  describe('validateVersionConfig', () => {
    it('should validate a valid version config', () => {
      const validConfig = {
        calver: '2026-02-18',
        semver: '1.9.0',
        buildNumbers: {
          android: 24,
          ios: 24,
        },
        versionMappings: {
          '2026-02-18': {
            semver: '1.9.0',
            releaseDate: '2026-02-18T00:00:00Z',
            releaseNotes: 'Test release',
          },
        },
      };

      expect(() => validateVersionConfig(validConfig)).not.toThrow();
      const result = validateVersionConfig(validConfig);
      expect(result.calver).toBe('2026-02-18');
      expect(result.semver).toBe('1.9.0');
    });

    it('should reject invalid CalVer format', () => {
      const invalidConfig = {
        calver: '2026-2-18', // Missing leading zero
        semver: '1.9.0',
        buildNumbers: {android: 24, ios: 24},
        versionMappings: {},
      };

      expect(() => validateVersionConfig(invalidConfig)).toThrow(z.ZodError);
    });

    it('should reject invalid SemVer format', () => {
      const invalidConfig = {
        calver: '2026-02-18',
        semver: '1.9', // Missing patch version
        buildNumbers: {android: 24, ios: 24},
        versionMappings: {},
      };

      expect(() => validateVersionConfig(invalidConfig)).toThrow(z.ZodError);
    });

    it('should reject negative build numbers', () => {
      const invalidConfig = {
        calver: '2026-02-18',
        semver: '1.9.0',
        buildNumbers: {android: -1, ios: 24},
        versionMappings: {},
      };

      expect(() => validateVersionConfig(invalidConfig)).toThrow(z.ZodError);
    });

    it('should reject missing required fields', () => {
      const invalidConfig = {
        calver: '2026-02-18',
        semver: '1.9.0',
        // Missing buildNumbers
        versionMappings: {},
      };

      expect(() => validateVersionConfig(invalidConfig)).toThrow(z.ZodError);
    });
  });

  describe('validateMetadata', () => {
    it('should validate valid version metadata', () => {
      const validMetadata = {
        apiVersion: '2026-02-18',
        minimumVersions: {
          ios: '2026-01-01',
          android: '2026-01-01',
          web: '2026-01-15',
        },
        recommendedVersions: {
          ios: '2026-02-18',
          android: '2026-02-18',
          web: '2026-02-18',
        },
        compatibilityMatrix: [
          {
            clientVersionPattern: '2026-02-*',
            minApiVersion: '2026-02-01',
            maxApiVersion: '2026-12-31',
            platforms: ['ios', 'android', 'web'],
          },
        ],
        forceUpdateMessages: {
          ios: 'Update required',
          android: 'Update required',
          web: 'Update required',
        },
        softUpdateMessages: {
          ios: 'Update available',
          android: 'Update available',
          web: 'Update available',
        },
        gracePeriod: {
          enabled: false,
          endDate: '2026-03-01T00:00:00Z',
        },
        bypassEndpoints: ['version.check', 'version.info'],
      };

      expect(() => validateMetadata(validMetadata)).not.toThrow();
      const result = validateMetadata(validMetadata);
      expect(result.apiVersion).toBe('2026-02-18');
    });

    it('should reject invalid platform in compatibility matrix', () => {
      const invalidMetadata = {
        apiVersion: '2026-02-18',
        minimumVersions: {
          ios: '2026-01-01',
          android: '2026-01-01',
          web: '2026-01-15',
        },
        recommendedVersions: {
          ios: '2026-02-18',
          android: '2026-02-18',
          web: '2026-02-18',
        },
        compatibilityMatrix: [
          {
            clientVersionPattern: '2026-02-*',
            minApiVersion: '2026-02-01',
            maxApiVersion: '2026-12-31',
            platforms: ['ios', 'invalid'], // Invalid platform
          },
        ],
        forceUpdateMessages: {ios: 'Update', android: 'Update', web: 'Update'},
        softUpdateMessages: {ios: 'Update', android: 'Update', web: 'Update'},
        gracePeriod: {enabled: false, endDate: '2026-03-01T00:00:00Z'},
        bypassEndpoints: [],
      };

      expect(() => validateMetadata(invalidMetadata)).toThrow(z.ZodError);
    });

    it('should reject missing required platform versions', () => {
      const invalidMetadata = {
        apiVersion: '2026-02-18',
        minimumVersions: {ios: '2026-01-01', android: '2026-01-01'}, // Missing web
        recommendedVersions: {
          ios: '2026-02-18',
          android: '2026-02-18',
          web: '2026-02-18',
        },
        compatibilityMatrix: [],
        forceUpdateMessages: {ios: 'Update', android: 'Update', web: 'Update'},
        softUpdateMessages: {ios: 'Update', android: 'Update', web: 'Update'},
        gracePeriod: {enabled: false, endDate: '2026-03-01T00:00:00Z'},
        bypassEndpoints: [],
      };

      expect(() => validateMetadata(invalidMetadata)).toThrow(z.ZodError);
    });

    it('should reject invalid date format in grace period', () => {
      const invalidMetadata = {
        apiVersion: '2026-02-18',
        minimumVersions: {
          ios: '2026-01-01',
          android: '2026-01-01',
          web: '2026-01-15',
        },
        recommendedVersions: {
          ios: '2026-02-18',
          android: '2026-02-18',
          web: '2026-02-18',
        },
        compatibilityMatrix: [],
        forceUpdateMessages: {ios: 'Update', android: 'Update', web: 'Update'},
        softUpdateMessages: {ios: 'Update', android: 'Update', web: 'Update'},
        gracePeriod: {enabled: false, endDate: '2026-03-01'}, // Missing time component
        bypassEndpoints: [],
      };

      expect(() => validateMetadata(invalidMetadata)).toThrow(z.ZodError);
    });
  });

  describe('Schema type exports', () => {
    it('should export correct types', () => {
      // This is a compile-time check, but we can verify the schemas exist
      expect(versionConfigSchema).toBeDefined();
      expect(versionMetadataSchema).toBeDefined();
    });
  });
});
