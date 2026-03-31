import {
  type SiteAlert,
  type SiteIncident,
  SiteIncidentReviewStatus,
} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type SiteIncidentInterface,
  type IncidentMetrics,
} from '../../Interfaces/SiteIncident';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {type SiteIncidentRepository} from './SiteIncidentRepository';
import {type IncidentResolver} from './IncidentResolver';
import {SiteIncidentProximityService} from './SiteIncidentProximityService';
import {type RelatedSiteIncident} from './types';

/**
 * SiteIncidentService orchestrates the incident lifecycle
 * Handles creation, association, and resolution of fire incidents
 */
export class SiteIncidentService {
  private metrics: PerformanceMetrics;
  private proximityService: SiteIncidentProximityService;

  constructor(
    private readonly repository: SiteIncidentRepository,
    private readonly resolver: IncidentResolver,
    private readonly inactiveHours: number = 6,
  ) {
    this.metrics = new PerformanceMetrics();
    this.proximityService = new SiteIncidentProximityService(repository);
  }

  /**
   * Processes a new SiteAlert for incident creation or association
   * Uses proximity-based detection to find the best matching incident
   * @param alert - The new SiteAlert
   * @returns Associated or created SiteIncident
   */
  async processNewSiteAlert(alert: SiteAlert): Promise<SiteIncidentInterface> {
    // Validate input
    if (!alert || !alert.id || !alert.siteId) {
      const error = new Error(
        'Invalid SiteAlert: missing required fields (id, siteId)',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    this.metrics.startTimer('process_alert_total');

    try {
      logger(
        `Processing new SiteAlert ${alert.id} for site ${alert.siteId}`,
        'debug',
      );

      // Use proximity-based detection to find best matching incident
      this.metrics.startTimer('proximity_detection');
      const detectionResult =
        await this.proximityService.findBestMatchingIncident(alert);
      this.metrics.endTimer('proximity_detection');

      let incident: SiteIncident;

      if (detectionResult.shouldCreateNew) {
        const mergeParents = detectionResult.mergeParentIncidents || [];

        if (mergeParents.length > 1) {
          logger(
            `Creating merged child incident for alert ${alert.id} from ${mergeParents.length} parent incidents`,
            'info',
          );

          const shouldStopAlerts = mergeParents.some(
            parent =>
              parent.reviewStatus === SiteIncidentReviewStatus.STOP_ALERTS,
          );

          this.metrics.startTimer('create_incident');
          incident = await this.proximityService.createIncidentWithMetadata(
            alert,
            {
              reviewStatus: shouldStopAlerts
                ? SiteIncidentReviewStatus.STOP_ALERTS
                : undefined,
            },
          );

          await this.repository.linkIncidentsToChild(
            mergeParents.map(parent => parent.id),
            incident.id,
            alert.siteId,
          );
          this.metrics.endTimer('create_incident');

          logger(
            `Created merged child incident ${incident.id} for alert ${alert.id}`,
            'info',
          );
        } else {
          logger(
            `Creating new incident for alert ${alert.id} on site ${alert.siteId}`,
            'debug',
          );

          this.metrics.startTimer('create_incident');
          incident = await this.proximityService.createIncidentWithMetadata(
            alert,
          );
          this.metrics.endTimer('create_incident');

          logger(
            `Created new incident ${incident.id} for site ${alert.siteId}`,
            'debug',
          );
        }
      } else if (detectionResult.incident) {
        // Associate with existing incident
        logger(
          `Associating alert ${alert.id} with existing incident ${
            detectionResult.incident.id
          } at ${detectionResult.distance?.toFixed(3)}km`,
          'debug',
        );

        this.metrics.startTimer('associate_alert');
        incident = await this.proximityService.updateIncidentCentre(
          detectionResult.incident,
          alert,
        );
        this.metrics.endTimer('associate_alert');

        logger(
          `Associated alert ${alert.id} with incident ${incident.id}`,
          'debug',
        );
      } else {
        // Fallback: should not happen but handle gracefully
        const error = new Error('Invalid detection result: no incident found');
        logger(`Detection result error: ${error.message}`, 'error');
        throw error;
      }

      const totalDuration = this.metrics.endTimer('process_alert_total');
      this.recordMetrics('process_alert', totalDuration);

      return incident as SiteIncidentInterface;
    } catch (error) {
      logger(
        `Error processing alert ${alert.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Resolves all inactive incidents
   * @returns Number of resolved incidents
   */
  async resolveInactiveIncidents(): Promise<number> {
    this.metrics.startTimer('resolve_inactive_total');

    try {
      logger(
        `Starting resolution of inactive incidents (>${this.inactiveHours}h)`,
        'debug',
      );

      // Find all active incidents and resolve stale related chains only when
      // the entire connected component is stale.
      this.metrics.startTimer('find_inactive');
      const activeIncidents = await this.repository.findAllActiveIncidents();
      this.metrics.endTimer('find_inactive');

      if (activeIncidents.length === 0) {
        logger('No active incidents to evaluate for resolution', 'debug');
        return 0;
      }

      const cutoffTime = new Date(
        Date.now() - this.inactiveHours * 60 * 60 * 1000,
      );
      const relatedComponents =
        this.buildActiveRelatedComponents(activeIncidents);

      const inactiveIncidents = relatedComponents
        .filter(component =>
          component.every(incident => incident.updatedAt < cutoffTime),
        )
        .flat();

      if (inactiveIncidents.length === 0) {
        logger(
          'No fully-stale related incident components to resolve',
          'debug',
        );
        return 0;
      }

      logger(
        `Found ${inactiveIncidents.length} incidents in stale related components to resolve`,
        'debug',
      );

      // Validate incidents
      const validIncidents = inactiveIncidents.filter(incident =>
        this.resolver.validateIncident(incident),
      );

      if (validIncidents.length === 0) {
        logger('No valid incidents to resolve', 'warn');
        return 0;
      }

      // Batch resolve
      this.metrics.startTimer('batch_resolve');
      const result = await this.resolver.batchResolveIncidents(validIncidents);
      this.metrics.endTimer('batch_resolve');

      const totalDuration = this.metrics.endTimer('resolve_inactive_total');
      this.recordMetrics('resolve_inactive', totalDuration, {
        resolvedCount: result.resolvedCount,
        errorCount: result.errors.length,
      });

      logger(
        `Resolution complete: ${result.resolvedCount}/${validIncidents.length} resolved in ${totalDuration}ms`,
        'info',
      );

      return result.resolvedCount;
    } catch (error) {
      logger(
        `Error resolving inactive incidents: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Associates an alert with an incident
   * @param alert - The SiteAlert to associate
   * @param incident - The SiteIncident to associate with
   */
  async associateAlertWithIncident(
    alert: SiteAlert,
    incident: SiteIncidentInterface,
  ): Promise<void> {
    // Validate inputs
    if (!alert || !alert.id) {
      const error = new Error('Invalid SiteAlert: missing id');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!incident || !incident.id) {
      const error = new Error('Invalid SiteIncident: missing id');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      logger(
        `Associating alert ${alert.id} with incident ${incident.id}`,
        'debug',
      );

      await this.repository.associateAlert(incident.id, alert.id);

      logger(
        `Successfully associated alert ${alert.id} with incident ${incident.id}`,
        'debug',
      );
    } catch (error) {
      logger(
        `Error associating alert ${alert.id} with incident ${incident.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Gets an incident by ID
   * @param id - Incident ID
   * @returns Incident or null
   */
  async getIncidentById(id: string): Promise<SiteIncidentInterface | null> {
    // Validate input
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      const error = new Error(
        'Invalid incident ID: must be a non-empty string',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      return (await this.repository.getIncidentById(
        id,
      )) as SiteIncidentInterface | null;
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
   * Records performance metrics
   * @param operation - Operation name
   * @param duration - Duration in milliseconds
   * @param additionalMetrics - Additional metrics to record
   */
  private recordMetrics(
    operation: string,
    duration: number,
    additionalMetrics?: Record<string, number>,
  ): void {
    this.metrics.recordMetric(`${operation}_duration_ms`, duration);

    if (additionalMetrics) {
      Object.entries(additionalMetrics).forEach(([key, value]) => {
        this.metrics.recordMetric(`${operation}_${key}`, value);
      });
    }

    logger(`${operation} completed in ${duration}ms`, 'debug');
  }

  /**
   * Gets current metrics
   * @returns Performance metrics
   */
  getMetrics(): IncidentMetrics {
    return {
      totalDurationMs: 0,
      operationCount: 0,
    };
  }

  /**
   * Resets metrics
   */
  resetMetrics(): void {
    this.metrics = new PerformanceMetrics();
  }

  /**
   * Gets the active incident for a site
   * @param siteId - Site ID
   * @returns Active incident or null
   */
  async getActiveIncidentForSite(siteId: string): Promise<SiteIncident | null> {
    // Validate input
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      return await this.repository.findActiveBySiteId(siteId);
    } catch (error) {
      logger(
        `Error getting active incident for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Gets incidents for a site within a date range
   * @param siteId - Site ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of incidents
   */
  async getIncidentsByDateRange(
    siteId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SiteIncident[]> {
    // Validate inputs
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!startDate || !(startDate instanceof Date)) {
      const error = new Error('Invalid startDate: must be a valid Date');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (!endDate || !(endDate instanceof Date)) {
      const error = new Error('Invalid endDate: must be a valid Date');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    if (startDate > endDate) {
      const error = new Error(
        'Invalid date range: startDate must be before endDate',
      );
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      logger(
        `Getting incidents for site ${siteId} between ${startDate.toISOString()} and ${endDate.toISOString()}`,
        'debug',
      );

      const incidents = await this.repository.prisma.siteIncident.findMany({
        where: {
          siteId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      logger(
        `Found ${incidents.length} incidents for site ${siteId} in date range`,
        'debug',
      );

      return incidents;
    } catch (error) {
      logger(
        `Error getting incidents by date range for site ${siteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Updates the review status of an incident
   * @param incidentId - Incident ID
   * @param status - New review status
   * @returns Updated incident
   */
  async updateReviewStatus(
    incidentId: string,
    status: SiteIncidentReviewStatus,
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

    if (!status || typeof status !== 'string' || status.trim().length === 0) {
      const error = new Error('Invalid status: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      logger(
        `Updating review status for incident ${incidentId} to ${status}`,
        'debug',
      );

      const updatedIncident = await this.repository.updateIncident(incidentId, {
        reviewStatus: status,
      });

      if (status === SiteIncidentReviewStatus.STOP_ALERTS) {
        const descendantIncidentIds = await this.findDescendantIncidentIds(
          updatedIncident.id,
          updatedIncident.siteId,
        );

        if (descendantIncidentIds.length > 0) {
          await this.repository.prisma.siteIncident.updateMany({
            where: {
              id: {
                in: descendantIncidentIds,
              },
              siteId: updatedIncident.siteId,
            } as any,
            data: {
              reviewStatus: SiteIncidentReviewStatus.STOP_ALERTS,
              updatedAt: new Date(),
            } as any,
          });

          logger(
            `Cascaded STOP_ALERTS from incident ${incidentId} to ${descendantIncidentIds.length} descendants`,
            'info',
          );
        }
      }

      logger(`Updated review status for incident ${incidentId}`, 'debug');

      return updatedIncident;
    } catch (error) {
      logger(
        `Error updating review status for incident ${incidentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  private buildActiveRelatedComponents(
    incidents: RelatedSiteIncident[],
  ): RelatedSiteIncident[][] {
    const incidentsById = new Map<string, RelatedSiteIncident>(
      incidents.map(incident => [incident.id, incident]),
    );
    const incomingParents = new Map<string, string[]>();

    for (const incident of incidents) {
      const childId = this.getRelatedIncidentId(incident);
      if (!childId) {
        continue;
      }

      const childIncident = incidentsById.get(childId);
      if (!childIncident) {
        continue;
      }

      if (childIncident.siteId !== incident.siteId) {
        logger(
          `Ignoring cross-site relation while building components: ${incident.id} -> ${childId}`,
          'warn',
        );
        continue;
      }

      const existingParents = incomingParents.get(childId) || [];
      existingParents.push(incident.id);
      incomingParents.set(childId, existingParents);
    }

    const visited = new Set<string>();
    const components: RelatedSiteIncident[][] = [];

    for (const incident of incidents) {
      if (visited.has(incident.id)) {
        continue;
      }

      const queue: string[] = [incident.id];
      const component: RelatedSiteIncident[] = [];

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) {
          continue;
        }

        const currentIncident = incidentsById.get(currentId);
        if (!currentIncident) {
          continue;
        }

        visited.add(currentId);
        component.push(currentIncident);

        const childId = this.getRelatedIncidentId(currentIncident);
        if (childId && incidentsById.has(childId)) {
          queue.push(childId);
        }

        const parentIds = incomingParents.get(currentId) || [];
        queue.push(...parentIds);
      }

      if (component.length > 0) {
        components.push(component);
      }
    }

    return components;
  }

  private async findDescendantIncidentIds(
    incidentId: string,
    siteId: string,
  ): Promise<string[]> {
    const descendants: string[] = [];
    const visited = new Set<string>([incidentId]);
    let currentId = incidentId;

    while (true) {
      const currentIncident = (await this.repository.prisma.siteIncident.findUnique(
        {
          where: {
            id: currentId,
          },
          select: {
            id: true,
            siteId: true,
            relatedIncidentId: true,
          } as any,
        },
      )) as unknown as {
        id: string;
        siteId: string;
        relatedIncidentId: string | null;
      } | null;

      if (!currentIncident || currentIncident.siteId !== siteId) {
        return descendants;
      }

      const childId = currentIncident.relatedIncidentId;
      if (!childId || visited.has(childId)) {
        return descendants;
      }

      const childIncident = (await this.repository.prisma.siteIncident.findUnique(
        {
          where: {
            id: childId,
          },
          select: {
            id: true,
            siteId: true,
            relatedIncidentId: true,
          } as any,
        },
      )) as unknown as {
        id: string;
        siteId: string;
        relatedIncidentId: string | null;
      } | null;

      if (!childIncident || childIncident.siteId !== siteId) {
        return descendants;
      }

      descendants.push(childIncident.id);
      visited.add(childIncident.id);
      currentId = childIncident.id;
    }
  }

  private getRelatedIncidentId(incident: SiteIncident): string | null {
    return ((incident as unknown as {relatedIncidentId?: string | null})
      .relatedIncidentId || null);
  }
}
