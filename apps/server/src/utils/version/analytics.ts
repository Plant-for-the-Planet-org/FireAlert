/**
 * Version Analytics Utilities
 *
 * Provides logging and analytics for version check events, including:
 * - Version check logging
 * - Version distribution aggregation
 * - Update metrics calculation
 */

interface VersionCheckLog {
  id: string;
  timestamp: Date;
  clientVersion: string;
  platform: 'ios' | 'android' | 'web';
  buildNumber?: number;
  appVersion?: string;
  result: 'force_update' | 'soft_update' | 'success';
  userId?: string;
}

interface VersionDistribution {
  platform: 'ios' | 'android' | 'web';
  version: string;
  count: number;
  percentage: number;
  lastSeen: Date;
}

interface UpdateMetrics {
  forceUpdateRate: number; // Percentage of users requiring force update
  softUpdateRate: number; // Percentage of users with soft update available
  adoptionRate: number; // Percentage of users on latest version
  averageUpdateTime: number; // Average time to update (in days)
}

interface VersionCheckInput {
  clientVersion: string;
  platform: 'ios' | 'android' | 'web';
  buildNumber?: number;
  appVersion?: string;
  result: 'force_update' | 'soft_update' | 'success';
  userId?: string;
  timestamp: Date;
}

// In-memory storage for version check logs
// In production, this should be replaced with database storage
const versionCheckLogs: VersionCheckLog[] = [];

// Maximum number of logs to keep in memory
const MAX_LOGS = 10000;

/**
 * Generate a unique ID for a version check log entry
 */
function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log a version check event
 *
 * @param input - Version check information to log
 * @returns The created log entry
 *
 * Requirements: 13.1
 */
export function logVersionCheck(input: VersionCheckInput): VersionCheckLog {
  const logEntry: VersionCheckLog = {
    id: generateLogId(),
    timestamp: input.timestamp,
    clientVersion: input.clientVersion,
    platform: input.platform,
    buildNumber: input.buildNumber,
    appVersion: input.appVersion,
    result: input.result,
    userId: input.userId,
  };

  // Add to in-memory storage
  versionCheckLogs.push(logEntry);

  // Trim logs if exceeding maximum
  if (versionCheckLogs.length > MAX_LOGS) {
    versionCheckLogs.shift();
  }

  return logEntry;
}

/**
 * Get version distribution statistics aggregated by platform
 *
 * @param platform - Optional platform filter
 * @param since - Optional date to filter logs from
 * @returns Array of version distribution statistics
 *
 * Requirements: 13.2
 */
export function getVersionDistribution(
  platform?: 'ios' | 'android' | 'web',
  since?: Date,
): VersionDistribution[] {
  // Filter logs by platform and date if specified
  let filteredLogs = versionCheckLogs;

  if (platform) {
    filteredLogs = filteredLogs.filter(log => log.platform === platform);
  }

  if (since) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= since);
  }

  // Group by platform and version
  const distributionMap = new Map<
    string,
    {
      platform: 'ios' | 'android' | 'web';
      version: string;
      count: number;
      lastSeen: Date;
    }
  >();

  for (const log of filteredLogs) {
    const key = `${log.platform}-${log.clientVersion}`;
    const existing = distributionMap.get(key);

    if (existing) {
      existing.count++;
      if (log.timestamp > existing.lastSeen) {
        existing.lastSeen = log.timestamp;
      }
    } else {
      distributionMap.set(key, {
        platform: log.platform,
        version: log.clientVersion,
        count: 1,
        lastSeen: log.timestamp,
      });
    }
  }

  // Calculate total for percentage
  const total = filteredLogs.length;

  // Convert to array and add percentages
  const distribution: VersionDistribution[] = Array.from(
    distributionMap.values(),
  ).map(item => ({
    ...item,
    percentage: total > 0 ? (item.count / total) * 100 : 0,
  }));

  // Sort by count descending
  distribution.sort((a, b) => b.count - a.count);

  return distribution;
}

/**
 * Calculate update metrics including force update rate, soft update rate, and adoption rate
 *
 * @param platform - Optional platform filter
 * @param since - Optional date to filter logs from
 * @returns Update metrics
 *
 * Requirements: 13.2, 13.4, 13.5
 */
export function getUpdateMetrics(
  platform?: 'ios' | 'android' | 'web',
  since?: Date,
): UpdateMetrics {
  // Filter logs by platform and date if specified
  let filteredLogs = versionCheckLogs;

  if (platform) {
    filteredLogs = filteredLogs.filter(log => log.platform === platform);
  }

  if (since) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= since);
  }

  const total = filteredLogs.length;

  if (total === 0) {
    return {
      forceUpdateRate: 0,
      softUpdateRate: 0,
      adoptionRate: 0,
      averageUpdateTime: 0,
    };
  }

  // Count results
  const forceUpdateCount = filteredLogs.filter(
    log => log.result === 'force_update',
  ).length;
  const softUpdateCount = filteredLogs.filter(
    log => log.result === 'soft_update',
  ).length;
  const successCount = filteredLogs.filter(
    log => log.result === 'success',
  ).length;

  // Calculate rates
  const forceUpdateRate = (forceUpdateCount / total) * 100;
  const softUpdateRate = (softUpdateCount / total) * 100;
  const adoptionRate = (successCount / total) * 100;

  // Calculate average update time
  // Group by userId and track version changes
  const userVersionHistory = new Map<
    string,
    {version: string; timestamp: Date}[]
  >();

  for (const log of filteredLogs) {
    if (!log.userId) continue;

    const history = userVersionHistory.get(log.userId) || [];
    history.push({version: log.clientVersion, timestamp: log.timestamp});
    userVersionHistory.set(log.userId, history);
  }

  // Calculate time between version changes
  const updateTimes: number[] = [];

  for (const history of Array.from(userVersionHistory.values())) {
    // Sort by timestamp
    history.sort(
      (
        a: {version: string; timestamp: Date},
        b: {version: string; timestamp: Date},
      ) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // Find version changes
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      if (current && previous && current.version !== previous.version) {
        const timeDiff =
          current.timestamp.getTime() - previous.timestamp.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        updateTimes.push(daysDiff);
      }
    }
  }

  const averageUpdateTime =
    updateTimes.length > 0
      ? updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length
      : 0;

  return {
    forceUpdateRate,
    softUpdateRate,
    adoptionRate,
    averageUpdateTime,
  };
}

/**
 * Get all version check logs with optional filtering
 *
 * @param options - Filter options
 * @returns Filtered version check logs
 */
export function getVersionCheckLogs(options?: {
  platform?: 'ios' | 'android' | 'web';
  since?: Date;
  until?: Date;
  result?: 'force_update' | 'soft_update' | 'success';
  limit?: number;
}): VersionCheckLog[] {
  let filteredLogs = [...versionCheckLogs];

  if (options?.platform) {
    filteredLogs = filteredLogs.filter(
      log => log.platform === options.platform,
    );
  }

  if (options?.since) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= options.since!);
  }

  if (options?.until) {
    filteredLogs = filteredLogs.filter(log => log.timestamp <= options.until!);
  }

  if (options?.result) {
    filteredLogs = filteredLogs.filter(log => log.result === options.result);
  }

  // Sort by timestamp descending (most recent first)
  filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply limit if specified
  if (options?.limit) {
    filteredLogs = filteredLogs.slice(0, options.limit);
  }

  return filteredLogs;
}

/**
 * Clear all version check logs
 * Useful for testing or manual cleanup
 */
export function clearVersionCheckLogs(): void {
  versionCheckLogs.length = 0;
}

/**
 * Get the total number of version check logs in memory
 */
export function getLogCount(): number {
  return versionCheckLogs.length;
}

/**
 * Export types for use in other modules
 */
export type {
  VersionCheckLog,
  VersionDistribution,
  UpdateMetrics,
  VersionCheckInput,
};
