/**
 * Version Testing Utilities
 *
 * Provides utilities for testing version checks with spoofed client versions
 * and simulating different update scenarios.
 */

import type {VersionCheckResponse} from '../../Interfaces/version';

/**
 * Version spoofing configuration for testing
 */
export interface VersionSpoofConfig {
  clientVersion: string;
  platform: 'ios' | 'android' | 'web';
  buildNumber?: number;
  appVersion?: string;
}

/**
 * Test scenario types
 */
export type TestScenario =
  | 'force-update'
  | 'soft-update'
  | 'up-to-date'
  | 'incompatible';

/**
 * Creates a mock version check response for testing
 *
 * @param scenario - The test scenario to simulate
 * @param config - Optional configuration for the response
 * @returns Mock version check response
 */
export function createMockVersionResponse(
  scenario: TestScenario,
  config?: Partial<VersionCheckResponse>,
): VersionCheckResponse {
  const baseResponse = {
    serverVersion: '2026-02-25',
    ...config,
  };

  switch (scenario) {
    case 'force-update':
      return {
        ...baseResponse,
        status: 'force-update',
        message: 'A critical update is required to continue using the app.',
        minimumVersion: '1.5.0',
        downloadUrl: 'https://example.com/download',
      } as VersionCheckResponse;

    case 'soft-update':
      return {
        ...baseResponse,
        status: 'soft-update',
        message: 'A new version is available with exciting features!',
        recommendedVersion: '1.6.0',
        downloadUrl: 'https://example.com/download',
        features: ['New dashboard', 'Performance improvements', 'Bug fixes'],
      } as VersionCheckResponse;

    case 'up-to-date':
      return {
        ...baseResponse,
        status: 'up-to-date',
        currentVersion: '1.6.0',
        compatibilityMatrix: [],
        nextCheckIn: 86400000, // 24 hours
      } as VersionCheckResponse;

    case 'incompatible':
      return {
        ...baseResponse,
        status: 'incompatible',
        message: 'Your app version is no longer supported.',
        minimumVersion: '1.5.0',
        downloadUrl: 'https://example.com/download',
      } as VersionCheckResponse;

    default:
      throw new Error(`Unknown test scenario: ${scenario}`);
  }
}

/**
 * Creates mock request headers for version spoofing
 *
 * @param config - Version spoofing configuration
 * @returns Headers object for testing
 */
export function createMockVersionHeaders(
  config: VersionSpoofConfig,
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-client-version': config.clientVersion,
    'x-client-platform': config.platform,
  };

  if (config.buildNumber !== undefined) {
    headers['x-client-build'] = config.buildNumber.toString();
  }

  if (config.appVersion) {
    headers['x-app-version'] = config.appVersion;
  }

  return headers;
}

/**
 * Simulates a version check with spoofed client information
 *
 * This is useful for testing different client versions without
 * actually building and deploying different app versions.
 *
 * @param config - Version spoofing configuration
 * @returns Promise that resolves to the version check response
 */
export async function simulateVersionCheck(
  config: VersionSpoofConfig,
  checkFn: (headers: Record<string, string>) => Promise<VersionCheckResponse>,
): Promise<VersionCheckResponse> {
  const headers = createMockVersionHeaders(config);
  return checkFn(headers);
}

/**
 * Test data generator for version strings
 */
export const testVersions = {
  /**
   * Generates a CalVer version string for testing
   */
  calver: (year: number, month: number, day: number): string => {
    const m = month.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  },

  /**
   * Generates a SemVer version string for testing
   */
  semver: (major: number, minor: number, patch: number): string => {
    return `${major}.${minor}.${patch}`;
  },

  /**
   * Common test versions
   */
  common: {
    veryOld: '1.0.0',
    old: '1.3.0',
    minimum: '1.5.0',
    current: '1.6.0',
    recommended: '1.7.0',
    future: '2.0.0',
  },
};

/**
 * Validates that a version check response has the expected structure
 *
 * @param response - The response to validate
 * @param expectedStatus - The expected status
 * @returns True if valid, throws error otherwise
 */
export function validateVersionResponse(
  response: VersionCheckResponse,
  expectedStatus?: VersionCheckResponse['status'],
): boolean {
  if (!response.serverVersion) {
    throw new Error('Response missing serverVersion');
  }

  if (!response.status) {
    throw new Error('Response missing status');
  }

  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`,
    );
  }

  // Validate status-specific fields
  switch (response.status) {
    case 'force-update':
    case 'incompatible':
      if (!response.minimumVersion) {
        throw new Error(
          'force-update/incompatible response missing minimumVersion',
        );
      }
      if (!response.downloadUrl) {
        throw new Error(
          'force-update/incompatible response missing downloadUrl',
        );
      }
      break;

    case 'soft-update':
      if (!response.recommendedVersion) {
        throw new Error('soft-update response missing recommendedVersion');
      }
      if (!response.downloadUrl) {
        throw new Error('soft-update response missing downloadUrl');
      }
      break;

    case 'up-to-date':
      if (!response.currentVersion) {
        throw new Error('up-to-date response missing currentVersion');
      }
      if (response.nextCheckIn === undefined) {
        throw new Error('up-to-date response missing nextCheckIn');
      }
      break;
  }

  return true;
}

/**
 * Helper to create a test context with version information
 */
export function createTestVersionContext(
  config: Partial<VersionSpoofConfig> = {},
) {
  return {
    clientVersion: config.clientVersion || '1.6.0',
    platform: config.platform || 'ios',
    buildNumber: config.buildNumber || 100,
    appVersion: config.appVersion || '2026-02-25',
    isCompatible: true,
    bypassEnabled: false,
    gracePeriodActive: false,
  };
}
