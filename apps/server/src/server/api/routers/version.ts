import {z} from 'zod';
import {createTRPCRouter, publicProcedure} from '../trpc';
import {loadVersionMetadata} from '../../../utils/version/metadataLoader';
import {VERSION_CONFIG} from '../../../config/version';
import {compareVersions} from '../../../utils/version/validator';
import {
  logVersionCheck,
  getVersionDistribution,
  getUpdateMetrics,
} from '../../../utils/version/analytics';
import {getDownloadUrl, getNewFeatures} from '../../../utils/version/helpers';
import {readFileSync} from 'fs';
import {join} from 'path';

const versionCheckSchema = z.object({
  clientVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.enum(['ios', 'android', 'web']),
  buildNumber: z.number().optional(),
  appVersion: z.string().optional(),
});

export const versionRouter = createTRPCRouter({
  check: publicProcedure.input(versionCheckSchema).mutation(async ({input}) => {
    const metadata = loadVersionMetadata();
    const {clientVersion, platform, buildNumber, appVersion} = input;

    const minimumVersion = metadata.minimumVersions[platform];
    const recommendedVersion = metadata.recommendedVersions[platform];

    // Check if force update required
    if (compareVersions(clientVersion, minimumVersion) < 0) {
      // Log version check for analytics
      logVersionCheck({
        clientVersion,
        platform,
        buildNumber,
        appVersion,
        result: 'force_update',
        timestamp: new Date(),
      });

      return {
        status: 'force_update' as const,
        message: metadata.forceUpdateMessages[platform],
        minimumVersion,
        currentVersion: clientVersion,
        downloadUrl: getDownloadUrl(platform),
        serverVersion: VERSION_CONFIG.CALVER,
      };
    }

    // Check if soft update recommended
    if (compareVersions(clientVersion, recommendedVersion) < 0) {
      // Log version check for analytics
      logVersionCheck({
        clientVersion,
        platform,
        buildNumber,
        appVersion,
        result: 'soft_update',
        timestamp: new Date(),
      });

      return {
        status: 'soft_update' as const,
        message: metadata.softUpdateMessages[platform],
        recommendedVersion,
        currentVersion: clientVersion,
        downloadUrl: getDownloadUrl(platform),
        serverVersion: VERSION_CONFIG.CALVER,
        features: await getNewFeatures(clientVersion, recommendedVersion),
      };
    }

    // Client is up to date
    logVersionCheck({
      clientVersion,
      platform,
      buildNumber,
      appVersion,
      result: 'success',
      timestamp: new Date(),
    });

    return {
      status: 'success' as const,
      currentVersion: clientVersion,
      serverVersion: VERSION_CONFIG.CALVER,
      compatibilityMatrix: metadata.compatibilityMatrix,
      nextCheckIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }),

  info: publicProcedure.query(() => {
    return {
      calver: VERSION_CONFIG.CALVER,
      apiVersion: VERSION_CONFIG.API_VERSION,
      bypassEnabled: process.env.BYPASS_VERSION_CHECK === 'true',
    };
  }),

  changelog: publicProcedure
    .input(
      z.object({
        since: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(({input}) => {
      const {since, limit} = input;

      // Load version-config.json from monorepo root
      const configPath = join(process.cwd(), '..', '..', 'version-config.json');
      const configContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Extract version mappings
      const versionMappings = config.versionMappings || {};

      // Convert to array and sort by date (newest first)
      let entries = Object.entries(versionMappings)
        .map(([calver, data]: [string, any]) => ({
          calver,
          semver: data.semver,
          releaseDate: data.releaseDate,
          releaseNotes: data.releaseNotes,
        }))
        .sort((a, b) => compareVersions(b.calver, a.calver));

      // Filter by 'since' if provided
      if (since) {
        entries = entries.filter(
          entry => compareVersions(entry.calver, since) >= 0,
        );
      }

      // Apply limit
      entries = entries.slice(0, limit);

      return {
        entries,
        total: entries.length,
      };
    }),

  metrics: publicProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android', 'web']).optional(),
        since: z.date().optional(),
      }),
    )
    .query(({input}) => {
      const {platform, since} = input;

      // Get version distribution statistics
      const distribution = getVersionDistribution(platform, since);

      // Get update metrics
      const metrics = getUpdateMetrics(platform, since);

      // Calculate force update completion rate
      // (percentage of users who were on force update and have now updated)
      const forceUpdateCompletionRate =
        metrics.forceUpdateRate > 0
          ? ((1 - metrics.forceUpdateRate / 100) * 100).toFixed(2)
          : '100.00';

      // Calculate soft update adoption rate
      // (percentage of users who were on soft update and have now updated)
      const softUpdateAdoptionRate =
        metrics.softUpdateRate > 0
          ? ((1 - metrics.softUpdateRate / 100) * 100).toFixed(2)
          : '100.00';

      return {
        distribution: {
          byPlatform: distribution,
          summary: {
            totalVersions: distribution.length,
            mostCommonVersion:
              distribution.length > 0 ? distribution[0]?.version : null,
            mostCommonVersionPercentage:
              distribution.length > 0 ? distribution[0]?.percentage : 0,
          },
        },
        metrics: {
          forceUpdateRate: metrics.forceUpdateRate.toFixed(2),
          softUpdateRate: metrics.softUpdateRate.toFixed(2),
          adoptionRate: metrics.adoptionRate.toFixed(2),
          averageUpdateTime: metrics.averageUpdateTime.toFixed(2),
          forceUpdateCompletionRate,
          softUpdateAdoptionRate,
        },
        timestamp: new Date(),
      };
    }),

  health: publicProcedure.query(() => {
    const metadata = loadVersionMetadata();

    return {
      status: 'healthy',
      timestamp: new Date(),
      version: {
        calver: VERSION_CONFIG.CALVER,
        semver: VERSION_CONFIG.SEMVER,
        apiVersion: VERSION_CONFIG.API_VERSION,
        buildNumber: VERSION_CONFIG.BUILD_NUMBER,
      },
      metadata: {
        gracePeriodActive: metadata.gracePeriod?.enabled || false,
        bypassEnabled: process.env.BYPASS_VERSION_CHECK === 'true',
      },
    };
  }),
});
