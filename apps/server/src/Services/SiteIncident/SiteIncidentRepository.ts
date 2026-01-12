import {type PrismaClient, type SiteIncident} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type CreateIncidentData,
  type UpdateIncidentData,
  type ResolveResult,
  type IncidentMetrics,
} from '../../Interfaces/SiteIncident';

/**
 * Repository for SiteIncident data access operations
 * Handles all database interactions for incident management
 */
export class SiteIncidentRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
          reviewStatus: 'to_review',
        },
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
          ...data,
          updatedAt: new Date(),
        },
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
          isProcessed: false,
          startedAt: {
            lt: cutoffTime,
          },
        },
        orderBy: {
          startedAt: 'asc',
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
