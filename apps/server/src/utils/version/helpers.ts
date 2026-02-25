/**
 * Version helper utilities for the API Versioning System
 *
 * This module provides helper functions for platform-specific app store URLs
 * and extracting new features from version changelogs.
 */

import fs from 'fs/promises';
import path from 'path';
import {compareVersions} from './validator';

/**
 * Platform type for app store URLs
 */
type Platform = 'ios' | 'android' | 'web';

/**
 * Version configuration structure
 */
interface VersionConfig {
  calver: string;
  semver: string;
  buildNumbers: {
    android: number;
    ios: number;
  };
  versionMappings: {
    [calver: string]: {
      semver: string;
      releaseDate: string;
      releaseNotes: string;
    };
  };
}

/**
 * Returns the platform-specific app store download URL
 *
 * @param platform - The platform to get the download URL for
 * @returns The app store URL for iOS/Android, or undefined for web
 *
 * @example
 * getDownloadUrl('ios') // "https://apps.apple.com/app/firealert/id[APP_ID]"
 * getDownloadUrl('android') // "https://play.google.com/store/apps/details?id=eco.pp.firealert"
 * getDownloadUrl('web') // undefined
 */
export function getDownloadUrl(platform: Platform): string | undefined {
  const urls: Record<Platform, string | undefined> = {
    ios: 'https://apps.apple.com/app/firealert/id[APP_ID]',
    android: 'https://play.google.com/store/apps/details?id=eco.pp.firealert',
    web: undefined,
  };

  return urls[platform];
}

/**
 * Extracts new features between two versions from the version configuration
 *
 * Loads the version-config.json file and extracts release notes for all versions
 * between the current version and the target version (exclusive of current, inclusive of target).
 *
 * @param currentVersion - The current CalVer version (YYYY-MM-DD)
 * @param targetVersion - The target CalVer version (YYYY-MM-DD)
 * @returns Array of release notes for versions between current and target
 *
 * @example
 * // If version-config.json has versions 2026-01-15 and 2026-02-18
 * await getNewFeatures('2026-01-15', '2026-02-18')
 * // Returns: ["Added API versioning system with force update support"]
 *
 * @throws {Error} If version-config.json cannot be read or parsed
 */
export async function getNewFeatures(
  currentVersion: string,
  targetVersion: string,
): Promise<string[]> {
  try {
    // Load version configuration from monorepo root
    // When server runs, process.cwd() is apps/server, so go up two levels
    const configPath = path.join(
      process.cwd(),
      '..',
      '..',
      'version-config.json',
    );
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: VersionConfig = JSON.parse(configContent);

    // Extract all versions from the mappings
    const versions = Object.keys(config.versionMappings).sort();

    // Filter versions between current (exclusive) and target (inclusive)
    const relevantVersions = versions.filter(version => {
      return (
        compareVersions(version, currentVersion) > 0 &&
        compareVersions(version, targetVersion) <= 0
      );
    });

    // Extract release notes for relevant versions
    const features = relevantVersions.map(
      version => config.versionMappings[version].releaseNotes,
    );

    return features;
  } catch (error) {
    // Log error and return empty array as fallback
    console.error('Failed to load version features:', error);
    return [];
  }
}
