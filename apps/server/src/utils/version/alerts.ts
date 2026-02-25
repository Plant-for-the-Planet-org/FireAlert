/**
 * Version Monitoring Alerts
 *
 * Provides alert logic for monitoring version-related issues:
 * - Unsupported client versions exceeding threshold
 * - Grace period expiration warnings
 * - Version distribution anomalies
 */

import {getVersionDistribution, getUpdateMetrics} from './analytics';
import {loadVersionMetadata} from './metadataLoader';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert types
 */
export type AlertType =
  | 'unsupported_versions_threshold'
  | 'grace_period_expiring'
  | 'grace_period_expired'
  | 'high_force_update_rate'
  | 'low_adoption_rate';

/**
 * Alert structure
 */
export interface VersionAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  unsupportedVersionsThreshold: number; // Percentage threshold for unsupported versions
  gracePeriodWarningDays: number; // Days before grace period expiration to warn
  forceUpdateRateThreshold: number; // Percentage threshold for force update rate
  adoptionRateThreshold: number; // Minimum percentage for adoption rate
}

/**
 * Default alert configuration
 */
const DEFAULT_ALERT_CONFIG: AlertConfig = {
  unsupportedVersionsThreshold: 10, // Alert if >10% of users on unsupported versions
  gracePeriodWarningDays: 3, // Warn 3 days before grace period expires
  forceUpdateRateThreshold: 20, // Alert if >20% of users need force update
  adoptionRateThreshold: 50, // Alert if <50% of users on latest version
};

/**
 * Check for unsupported client versions exceeding threshold
 *
 * @param platform - Platform to check (optional)
 * @param config - Alert configuration
 * @returns Alert if threshold exceeded, null otherwise
 *
 * Requirements: 13.6
 */
export function checkUnsupportedVersionsThreshold(
  platform?: 'ios' | 'android' | 'web',
  config: AlertConfig = DEFAULT_ALERT_CONFIG,
): VersionAlert | null {
  const metadata = loadVersionMetadata();
  const distribution = getVersionDistribution(platform);

  // Get minimum version for platform
  const minimumVersions = platform
    ? {[platform]: metadata.minimumVersions[platform]}
    : metadata.minimumVersions;

  // Calculate percentage of users on unsupported versions
  let totalUsers = 0;
  let unsupportedUsers = 0;

  for (const dist of distribution) {
    totalUsers += dist.count;

    const minVersion = minimumVersions[dist.platform];
    if (minVersion && compareVersions(dist.version, minVersion) < 0) {
      unsupportedUsers += dist.count;
    }
  }

  const unsupportedPercentage =
    totalUsers > 0 ? (unsupportedUsers / totalUsers) * 100 : 0;

  if (unsupportedPercentage > config.unsupportedVersionsThreshold) {
    return {
      type: 'unsupported_versions_threshold',
      severity: 'critical',
      message: `${unsupportedPercentage.toFixed(
        1,
      )}% of users are on unsupported versions (threshold: ${
        config.unsupportedVersionsThreshold
      }%)`,
      details: {
        unsupportedPercentage: unsupportedPercentage.toFixed(2),
        unsupportedUsers,
        totalUsers,
        threshold: config.unsupportedVersionsThreshold,
        platform: platform || 'all',
        distribution: distribution.filter(
          d =>
            minimumVersions[d.platform] &&
            compareVersions(d.version, minimumVersions[d.platform]!) < 0,
        ),
      },
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Check for grace period expiration
 *
 * @param config - Alert configuration
 * @returns Alert if grace period is expiring or expired, null otherwise
 *
 * Requirements: 13.6
 */
export function checkGracePeriodExpiration(
  config: AlertConfig = DEFAULT_ALERT_CONFIG,
): VersionAlert | null {
  const metadata = loadVersionMetadata();

  if (!metadata.gracePeriod?.enabled) {
    return null;
  }

  const endDate = new Date(metadata.gracePeriod.endDate);
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Check if grace period has expired
  if (daysUntilExpiration < 0) {
    return {
      type: 'grace_period_expired',
      severity: 'critical',
      message: `Grace period expired ${Math.abs(daysUntilExpiration)} days ago`,
      details: {
        endDate: metadata.gracePeriod.endDate,
        daysExpired: Math.abs(daysUntilExpiration),
        reason: metadata.gracePeriod.reason,
      },
      timestamp: now,
    };
  }

  // Check if grace period is expiring soon
  if (daysUntilExpiration <= config.gracePeriodWarningDays) {
    return {
      type: 'grace_period_expiring',
      severity: 'warning',
      message: `Grace period expiring in ${daysUntilExpiration} days`,
      details: {
        endDate: metadata.gracePeriod.endDate,
        daysRemaining: daysUntilExpiration,
        reason: metadata.gracePeriod.reason,
        warningThreshold: config.gracePeriodWarningDays,
      },
      timestamp: now,
    };
  }

  return null;
}

/**
 * Check for high force update rate
 *
 * @param platform - Platform to check (optional)
 * @param config - Alert configuration
 * @returns Alert if force update rate exceeds threshold, null otherwise
 *
 * Requirements: 13.6
 */
export function checkForceUpdateRate(
  platform?: 'ios' | 'android' | 'web',
  config: AlertConfig = DEFAULT_ALERT_CONFIG,
): VersionAlert | null {
  const metrics = getUpdateMetrics(platform);

  if (metrics.forceUpdateRate > config.forceUpdateRateThreshold) {
    return {
      type: 'high_force_update_rate',
      severity: 'warning',
      message: `${metrics.forceUpdateRate.toFixed(
        1,
      )}% of users require force update (threshold: ${
        config.forceUpdateRateThreshold
      }%)`,
      details: {
        forceUpdateRate: metrics.forceUpdateRate.toFixed(2),
        threshold: config.forceUpdateRateThreshold,
        platform: platform || 'all',
        metrics,
      },
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Check for low adoption rate
 *
 * @param platform - Platform to check (optional)
 * @param config - Alert configuration
 * @returns Alert if adoption rate is below threshold, null otherwise
 *
 * Requirements: 13.6
 */
export function checkAdoptionRate(
  platform?: 'ios' | 'android' | 'web',
  config: AlertConfig = DEFAULT_ALERT_CONFIG,
): VersionAlert | null {
  const metrics = getUpdateMetrics(platform);

  if (metrics.adoptionRate < config.adoptionRateThreshold) {
    return {
      type: 'low_adoption_rate',
      severity: 'info',
      message: `Only ${metrics.adoptionRate.toFixed(
        1,
      )}% of users are on the latest version (threshold: ${
        config.adoptionRateThreshold
      }%)`,
      details: {
        adoptionRate: metrics.adoptionRate.toFixed(2),
        threshold: config.adoptionRateThreshold,
        platform: platform || 'all',
        metrics,
      },
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Run all version monitoring checks and return any alerts
 *
 * @param platform - Platform to check (optional)
 * @param config - Alert configuration
 * @returns Array of alerts
 *
 * Requirements: 13.6
 */
export function runVersionMonitoring(
  platform?: 'ios' | 'android' | 'web',
  config: AlertConfig = DEFAULT_ALERT_CONFIG,
): VersionAlert[] {
  const alerts: VersionAlert[] = [];

  // Check unsupported versions threshold
  const unsupportedAlert = checkUnsupportedVersionsThreshold(platform, config);
  if (unsupportedAlert) {
    alerts.push(unsupportedAlert);
  }

  // Check grace period expiration
  const gracePeriodAlert = checkGracePeriodExpiration(config);
  if (gracePeriodAlert) {
    alerts.push(gracePeriodAlert);
  }

  // Check force update rate
  const forceUpdateAlert = checkForceUpdateRate(platform, config);
  if (forceUpdateAlert) {
    alerts.push(forceUpdateAlert);
  }

  // Check adoption rate
  const adoptionAlert = checkAdoptionRate(platform, config);
  if (adoptionAlert) {
    alerts.push(adoptionAlert);
  }

  return alerts;
}

/**
 * Simple version comparison helper
 * (duplicated from validator.ts to avoid circular dependency)
 */
function compareVersions(v1: string, v2: string): number {
  // CalVer format: YYYY-MM-DD
  if (v1.match(/^\d{4}-\d{2}-\d{2}$/) && v2.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const d1 = new Date(v1);
    const d2 = new Date(v2);
    return d1.getTime() - d2.getTime();
  }

  // SemVer format: MAJOR.MINOR.PATCH
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) {
      return p1 - p2;
    }
  }

  return 0;
}

/**
 * Export types and default config
 */
export {DEFAULT_ALERT_CONFIG};
export type {AlertConfig};
