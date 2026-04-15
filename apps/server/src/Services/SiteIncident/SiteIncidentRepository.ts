import {
  type PrismaClient,
  type SiteIncident,
  SiteIncidentReviewStatus,
} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type CreateIncidentData,
  type UpdateIncidentData,
  type ResolveResult,
  type IncidentMetrics,
} from '../../Interfaces/SiteIncident';
import {type SiteIncidentMetadata, type RelatedSiteIncident} from './types';

/**
 * Repository for SiteIncident data access operations
 * Handles all database interactions for incident management
 */
export class SiteIncidentRepository {
  constructor(public readonly prisma: PrismaClient) {}

  /**
   * Finds an active SiteIncident for a given site
   * @param siteId - The site ID to search for
   * @returns Active incident or null if none exists
   */
  async findActiveBySiteId(siteId: string): Promise<SiteIncident | null> {
    // Validate input
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.findFirst({
        where: {
          siteId,
          isActive: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
      return incident;
    } catch (error) {
      logger(
        `Error finding active incident for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds all active SiteIncidents for a given site
   * Used for proximity-based detection with multiple concurrent incidents
   * @param siteId - The site ID to search for
   * @returns Array of all active incidents for the site
   */
  async findActiveIncidentsBySiteId(
    siteId: string,
  ): Promise<RelatedSiteIncident[]> {
    // Validate input
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incidents = (await this.prisma.siteIncident.findMany({
        where: {
          siteId,
          isActive: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      })) as unknown as RelatedSiteIncident[];

      logger(
        `Found ${incidents.length} active incidents for site ${siteId}`,
        'debug',
      );

      return incidents;
    } catch (error) {
      logger(
        `Error finding active incidents for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds all active SiteIncidents
   * @returns Array of active incidents
   */
  async findAllActiveIncidents(): Promise<RelatedSiteIncident[]> {
    try {
      const incidents = (await this.prisma.siteIncident.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{siteId: 'asc'}, {startedAt: 'asc'}],
      })) as unknown as RelatedSiteIncident[];

      logger(`Found ${incidents.length} active incidents`, 'debug');

      return incidents;
    } catch (error) {
      logger(
        `Error finding all active incidents: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Creates a new SiteIncident
   * @param data - Incident creation data
   * @returns Created incident
   */
  async createIncident(data: CreateIncidentData): Promise<SiteIncident> {
    // Validate input
    if (!data) {
      const error = new Error('Invalid data: CreateIncidentData is required');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data.siteId || typeof data.siteId !== 'string') {
      const error = new Error(
        'Invalid data: siteId must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data.startSiteAlertId || typeof data.startSiteAlertId !== 'string') {
      const error = new Error(
        'Invalid data: startSiteAlertId must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data.latestSiteAlertId || typeof data.latestSiteAlertId !== 'string') {
      const error = new Error(
        'Invalid data: latestSiteAlertId must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data.startedAt || !(data.startedAt instanceof Date)) {
      const error = new Error('Invalid data: startedAt must be a valid Date');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.create({
        data: {
          siteId: data.siteId,
          startSiteAlertId: data.startSiteAlertId,
          latestSiteAlertId: data.latestSiteAlertId,
          startedAt: data.startedAt,
          isActive: true,
          isProcessed: false,
          reviewStatus: data.reviewStatus || SiteIncidentReviewStatus.TO_REVIEW,
          relatedIncidentId: data.relatedIncidentId || null,
          siteAlerts: {
            connect: {
              id: data.startSiteAlertId,
            },
          },
        } as any,
      });

      logger(
        `Created new SiteIncident ${incident.id} for site ${data.siteId}`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error creating incident for site ${data.siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Updates an existing SiteIncident
   * @param id - Incident ID
   * @param data - Update data
   * @returns Updated incident
   */
  async updateIncident(
    id: string,
    data: UpdateIncidentData,
  ): Promise<SiteIncident> {
    // Validate input
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      const error = new Error('Invalid id: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!data || typeof data !== 'object') {
      const error = new Error('Invalid data: UpdateIncidentData is required');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.update({
        where: {id},
        data: {
          ...(data as any),
          updatedAt: new Date(),
        } as any,
      });

      logger(
        `Updated SiteIncident ${id} with fields: ${Object.keys(data).join(
          ', ',
        )}`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error updating incident ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Updates incident metadata with centre time series data
   * @param incidentId - Incident ID
   * @param metadata - New metadata structure
   * @returns Updated incident
   */
  async updateIncidentMetadata(
    incidentId: string,
    metadata: SiteIncidentMetadata,
  ): Promise<SiteIncident> {
    // Validate input
    if (
      !incidentId ||
      typeof incidentId !== 'string' ||
      incidentId.trim().length === 0
    ) {
      const error = new Error('Invalid incidentId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!metadata || typeof metadata !== 'object') {
      const error = new Error(
        'Invalid metadata: SiteIncidentMetadata is required',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!Array.isArray(metadata.centres)) {
      const error = new Error('Invalid metadata: centres must be an array');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.update({
        where: {id: incidentId},
        data: {
          metadata: JSON.parse(JSON.stringify(metadata)), // Convert to Prisma JsonValue
          updatedAt: new Date(),
        },
      });

      logger(
        `Updated metadata for incident ${incidentId} with ${metadata.centres.length} centres`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error updating metadata for incident ${incidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds inactive incidents that should be resolved
   * @param inactiveHours - Hours of inactivity threshold
   * @returns Array of inactive incidents
   */
  async findInactiveIncidents(inactiveHours: number): Promise<SiteIncident[]> {
    // Validate input
    if (typeof inactiveHours !== 'number' || inactiveHours <= 0) {
      const error = new Error(
        'Invalid inactiveHours: must be a positive number',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const cutoffTime = new Date(Date.now() - inactiveHours * 60 * 60 * 1000);

      const incidents = await this.prisma.siteIncident.findMany({
        where: {
          isActive: true,
          // Note: We don't filter by isProcessed here because:
          // - isProcessed: false means start notification not yet created/sent
          // - isProcessed: true means start notification was created/sent
          // Both cases should be resolved if inactive for 6+ hours
          // Resolution will set isProcessed: false to allow end notification creation
          updatedAt: {
            lt: cutoffTime,
          },
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      logger(
        `Found ${incidents.length} inactive incidents (>${inactiveHours}h)`,
        'debug',
      );

      return incidents;
    } catch (error) {
      logger(
        `Error finding inactive incidents: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Resolves a batch of incidents
   * @param incidents - Incidents to resolve
   * @returns Resolution result with metrics
   */
  async resolveIncidentsBatch(
    incidents: SiteIncident[],
  ): Promise<ResolveResult> {
    // Validate input
    if (!Array.isArray(incidents) || incidents.length === 0) {
      const error = new Error('Invalid incidents: must be a non-empty array');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    const metrics: IncidentMetrics = {
      totalDurationMs: 0,
      operationCount: incidents.length,
      batchSize: incidents.length,
    };

    const startTime = Date.now();
    const errors: Array<{incidentId: string; error: Error}> = [];
    let resolvedCount = 0;

    try {
      for (const incident of incidents) {
        try {
          const updateStart = Date.now();

          await this.prisma.siteIncident.update({
            where: {id: incident.id},
            data: {
              isActive: false,
              isProcessed: false,
              endedAt: new Date(),
              endSiteAlertId: incident.latestSiteAlertId,
              updatedAt: new Date(),
            },
          });

          metrics.resolutionDurationMs =
            (metrics.resolutionDurationMs || 0) + (Date.now() - updateStart);
          resolvedCount++;

          logger(
            `Resolved SiteIncident ${incident.id} for site ${incident.siteId}`,
            'debug',
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({incidentId: incident.id, error: err});
          logger(
            `Error resolving incident ${incident.id}: ${err.message}`,
            'warn',
          );
        }
      }

      metrics.totalDurationMs = Date.now() - startTime;

      logger(
        `Batch resolution complete: ${resolvedCount}/${incidents.length} resolved in ${metrics.totalDurationMs}ms`,
        'debug',
      );

      return {
        resolvedCount,
        errors,
        metrics,
      };
    } catch (error) {
      logger(
        `Error in batch resolution: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Associates a SiteAlert with an incident by updating latestSiteAlertId
   * @param incidentId - Incident ID
   * @param alertId - Alert ID to associate
   * @returns Updated incident
   */
  async associateAlert(
    incidentId: string,
    alertId: string,
  ): Promise<SiteIncident> {
    // Validate inputs
    if (
      !incidentId ||
      typeof incidentId !== 'string' ||
      incidentId.trim().length === 0
    ) {
      const error = new Error('Invalid incidentId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (
      !alertId ||
      typeof alertId !== 'string' ||
      alertId.trim().length === 0
    ) {
      const error = new Error('Invalid alertId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const incident = await this.prisma.siteIncident.update({
        where: {id: incidentId},
        data: {
          latestSiteAlertId: alertId,
          updatedAt: new Date(),
          siteAlerts: {
            connect: {
              id: alertId,
            },
          },
        },
      });

      logger(
        `Associated alert ${alertId} with incident ${incidentId}`,
        'debug',
      );

      return incident;
    } catch (error) {
      logger(
        `Error associating alert ${alertId} with incident ${incidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Links parent incidents to a child incident
   * @param parentIncidentIds - Parent incident IDs
   * @param childIncidentId - Child incident ID
   * @param siteId - Site ID (safety guard)
   * @returns Number of updated incidents
   */
  async linkIncidentsToChild(
    parentIncidentIds: string[],
    childIncidentId: string,
    siteId: string,
  ): Promise<number> {
    if (!Array.isArray(parentIncidentIds) || parentIncidentIds.length === 0) {
      return 0;
    }

    if (!childIncidentId || typeof childIncidentId !== 'string') {
      const error = new Error('Invalid childIncidentId: must be a string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!siteId || typeof siteId !== 'string') {
      const error = new Error('Invalid siteId: must be a string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      const uniqueParentIds = Array.from(new Set(parentIncidentIds)).filter(
        id => id !== childIncidentId,
      );

      if (uniqueParentIds.length === 0) {
        return 0;
      }

      const updated = await this.prisma.siteIncident.updateMany({
        where: {
          id: {
            in: uniqueParentIds,
          },
          siteId,
          isActive: true,
        } as any,
        data: {
          relatedIncidentId: childIncidentId,
          updatedAt: new Date(),
        } as any,
      });

      logger(
        `Linked ${updated.count} parent incidents to child ${childIncidentId} for site ${siteId}`,
        'info',
      );

      return updated.count;
    } catch (error) {
      logger(
        `Error linking parent incidents to child ${childIncidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Gets incident by ID
   * @param id - Incident ID
   * @returns Incident or null
   */
  async getIncidentById(id: string): Promise<SiteIncident | null> {
    // Validate input
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      const error = new Error('Invalid id: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      return await this.prisma.siteIncident.findUnique({
        where: {id},
      });
    } catch (error) {
      logger(
        `Error getting incident ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Counts active incidents for a site
   * @param siteId - Site ID
   * @returns Count of active incidents
   */
  async countActiveBysite(siteId: string): Promise<number> {
    // Validate input
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      return await this.prisma.siteIncident.count({
        where: {
          siteId,
          isActive: true,
        },
      });
    } catch (error) {
      logger(
        `Error counting active incidents for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }
}
