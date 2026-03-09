import {type SiteAlert, type SiteIncident} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type SiteIncidentInterface,
  type IncidentMetrics,
} from '../../Interfaces/SiteIncident';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {
  type AlertProcessingResult,
  type SiteIncidentRepository,
  type SiteIncidentWithDistance,
} from './SiteIncidentRepository';
import {type IncidentResolver} from './IncidentResolver';

type IncidentLifecycleStats = {
  mergeEvents: number;
  newMergedIncidents: number;
  absorbedIncidents: number;
  descendantClosures: number;
};

/**
 * SiteIncidentService orchestrates the incident lifecycle
 * Handles creation, association, and resolution of fire incidents
 */
export class SiteIncidentService {
  private metrics: PerformanceMetrics;
  private lifecycleStats: IncidentLifecycleStats = {
    mergeEvents: 0,
    newMergedIncidents: 0,
    absorbedIncidents: 0,
    descendantClosures: 0,
  };

  constructor(
    private readonly repository: SiteIncidentRepository,
    private readonly resolver: IncidentResolver,
    private readonly inactiveHours: number = 6,
    private readonly incidentProximityKm: number = 2,
  ) {
    this.metrics = new PerformanceMetrics();
  }

  /**
   * Processes a new SiteAlert for incident creation or association
   * @param alert - The new SiteAlert
   * @returns Associated or created SiteIncident
   */
  async processNewSiteAlert(alert: SiteAlert): Promise<SiteIncidentInterface> {
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

      this.metrics.startTimer('find_active_incidents');
      let nearbyIncidents = await this.repository.findActiveIncidentsWithinProximity(
        alert.siteId,
        alert.latitude,
        alert.longitude,
        this.incidentProximityKm,
      );
      this.metrics.endTimer('find_active_incidents');

      // Defensive stale-resolution for root incidents that may have missed cleanup.
      const staleRootIncidents = nearbyIncidents.filter(
        incident => !incident.mergedIncidentId && this.isIncidentStale(incident),
      );

      if (staleRootIncidents.length > 0) {
        logger(
          `Found ${staleRootIncidents.length} stale root incidents while processing alert ${alert.id}. Resolving before merge/association.`,
          'debug',
        );

        const resolutionResult = await this.resolver.batchResolveIncidents(
          staleRootIncidents,
        );
        this.lifecycleStats.descendantClosures +=
          resolutionResult.descendantClosedCount ?? 0;

        nearbyIncidents = await this.repository.findActiveIncidentsWithinProximity(
          alert.siteId,
          alert.latitude,
          alert.longitude,
          this.incidentProximityKm,
        );
      }

      const representatives = await this.collapseCandidatesByLineage(
        nearbyIncidents,
      );

      let processingResult: AlertProcessingResult;

      if (representatives.length === 0) {
        processingResult = await this.createIncidentFromAlert(alert);
      } else if (representatives.length === 1) {
        const representative = representatives[0];
        if (!representative) {
          throw new Error('Representative incident missing during association');
        }

        processingResult = await this.repository.associateAlertAndTouchAncestors(
          representative.id,
          alert.id,
        );
      } else {
        const mergedRepresentatives = representatives.filter(
          representative => representative.isMergedIncident,
        );

        if (mergedRepresentatives.length === 1) {
          const targetMerged = mergedRepresentatives[0];
          if (!targetMerged) {
            throw new Error('Expected one merged root representative');
          }

          const absorbedRepresentativeIds = representatives
            .filter(representative => representative.id !== targetMerged.id)
            .map(representative => representative.id);

          processingResult =
            await this.repository.absorbIntoExistingMergedAndAssociate(
              targetMerged.id,
              absorbedRepresentativeIds,
              alert.id,
            );
        } else {
          processingResult =
            await this.repository.createMergedIncidentFromRepresentativesAndAssociate(
              alert.siteId,
              representatives.map(representative => representative.id),
              alert.id,
            );
        }
      }

      this.recordLifecycleStats(processingResult);

      const totalDuration = this.metrics.endTimer('process_alert_total');
      this.recordMetrics('process_alert', totalDuration);

      return processingResult.incident as SiteIncidentInterface;
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

  private async createIncidentFromAlert(
    alert: SiteAlert,
  ): Promise<AlertProcessingResult> {
    logger(
      `Creating new incident for alert ${alert.id} on site ${alert.siteId}`,
      'debug',
    );

    this.metrics.startTimer('create_incident');
    const processingResult = await this.repository.createIncidentFromAlertWithLock(
      alert.siteId,
      alert.id,
    );
    this.metrics.endTimer('create_incident');

    logger(
      `Created new incident ${processingResult.incident.id} for site ${alert.siteId}`,
      'debug',
    );

    return processingResult;
  }

  /**
   * Resolves all inactive incidents
   * @returns Number of resolved root incidents
   */
  async resolveInactiveIncidents(): Promise<number> {
    this.metrics.startTimer('resolve_inactive_total');

    try {
      logger(
        `Starting resolution of inactive incidents (>${this.inactiveHours}h)`,
        'debug',
      );

      this.metrics.startTimer('find_inactive');
      const inactiveIncidents = await this.repository.findInactiveIncidents(
        this.inactiveHours,
      );
      this.metrics.endTimer('find_inactive');

      if (inactiveIncidents.length === 0) {
        logger('No inactive incidents to resolve', 'debug');
        return 0;
      }

      logger(
        `Found ${inactiveIncidents.length} inactive root incidents to resolve`,
        'debug',
      );

      const validIncidents = inactiveIncidents.filter(incident =>
        this.resolver.validateIncident(incident),
      );

      if (validIncidents.length === 0) {
        logger('No valid incidents to resolve', 'warn');
        return 0;
      }

      this.metrics.startTimer('batch_resolve');
      const result = await this.resolver.batchResolveIncidents(validIncidents);
      this.metrics.endTimer('batch_resolve');

      this.lifecycleStats.descendantClosures +=
        result.descendantClosedCount ?? 0;

      const totalDuration = this.metrics.endTimer('resolve_inactive_total');
      this.recordMetrics('resolve_inactive', totalDuration, {
        resolvedCount: result.resolvedCount,
        descendantClosedCount: result.descendantClosedCount ?? 0,
        errorCount: result.errors.length,
      });

      logger(
        `Resolution complete: ${result.resolvedCount}/${validIncidents.length} roots resolved in ${totalDuration}ms with ${result.descendantClosedCount ?? 0} descendant closures`,
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

      await this.repository.associateAlertAndTouchAncestors(incident.id, alert.id);

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
   * Gets aggregate merge/lifecycle stats since service creation/reset.
   */
  getAndResetLifecycleStats(): IncidentLifecycleStats {
    const snapshot: IncidentLifecycleStats = {...this.lifecycleStats};
    this.lifecycleStats = {
      mergeEvents: 0,
      newMergedIncidents: 0,
      absorbedIncidents: 0,
      descendantClosures: 0,
    };
    return snapshot;
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
   * Gets all active incidents for a site
   * @param siteId - Site ID
   * @returns Active incidents ordered by newest first
   */
  async getActiveIncidentsForSite(siteId: string): Promise<SiteIncident[]> {
    if (!siteId || typeof siteId !== 'string' || siteId.trim().length === 0) {
      const error = new Error('Invalid siteId: must be a non-empty string');
      logger(`Input validation failed: ${error.message}`, 'error');
      throw error;
    }

    try {
      return await this.repository.findActiveIncidentsBySiteId(siteId);
    } catch (error) {
      logger(
        `Error getting active incidents for site ${siteId}: ${
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
    status: string,
  ): Promise<SiteIncident> {
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

  private async collapseCandidatesByLineage(
    candidates: SiteIncidentWithDistance[],
  ): Promise<SiteIncidentWithDistance[]> {
    if (candidates.length <= 1) {
      return candidates;
    }

    const groupedByRoot = new Map<string, SiteIncidentWithDistance[]>();

    for (const candidate of candidates) {
      const rootId = await this.repository.findRootIncidentId(candidate.id);
      const existingGroup = groupedByRoot.get(rootId) ?? [];
      existingGroup.push(candidate);
      groupedByRoot.set(rootId, existingGroup);
    }

    const representatives: SiteIncidentWithDistance[] = [];

    const groupedValues = Array.from(groupedByRoot.values());
    for (const group of groupedValues) {
      const mergedCandidates = group.filter(candidate => candidate.isMergedIncident);
      const pool = mergedCandidates.length > 0 ? mergedCandidates : group;
      const sortedPool = [...pool].sort(this.compareCandidates);
      const representative = sortedPool[0];

      if (representative) {
        representatives.push(representative);
      }
    }

    representatives.sort(this.compareCandidates);
    return representatives;
  }

  private compareCandidates = (
    left: SiteIncidentWithDistance,
    right: SiteIncidentWithDistance,
  ): number => {
    if (left.distanceKm !== right.distanceKm) {
      return left.distanceKm - right.distanceKm;
    }

    if (left.updatedAt.getTime() !== right.updatedAt.getTime()) {
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    }

    if (left.startedAt.getTime() !== right.startedAt.getTime()) {
      return left.startedAt.getTime() - right.startedAt.getTime();
    }

    return left.id.localeCompare(right.id);
  };

  private isIncidentStale(incident: SiteIncident): boolean {
    const inactiveMs = Date.now() - incident.updatedAt.getTime();
    const inactiveHours = inactiveMs / (1000 * 60 * 60);
    return inactiveHours >= this.inactiveHours;
  }

  private recordLifecycleStats(processingResult: AlertProcessingResult): void {
    if (processingResult.mergeEventCreated) {
      this.lifecycleStats.mergeEvents += 1;
    }

    if (processingResult.newMergedIncidentCreated) {
      this.lifecycleStats.newMergedIncidents += 1;
    }

    if (processingResult.absorbedIncidentCount > 0) {
      this.lifecycleStats.absorbedIncidents +=
        processingResult.absorbedIncidentCount;
    }
  }
}
