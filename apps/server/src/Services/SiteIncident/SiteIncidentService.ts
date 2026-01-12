import {type SiteAlert, type SiteIncident} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type SiteIncidentInterface,
  type IncidentMetrics,
} from '../../Interfaces/SiteIncident';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {type SiteIncidentRepository} from './SiteIncidentRepository';
import {type IncidentResolver} from './IncidentResolver';

/**
 * SiteIncidentService orchestrates the incident lifecycle
 * Handles creation, association, and resolution of fire incidents
 */
export class SiteIncidentService {
  private metrics: PerformanceMetrics;

  constructor(
    private readonly repository: SiteIncidentRepository,
    private readonly resolver: IncidentResolver,
    private readonly inactiveHours: number = 6,
  ) {
    this.metrics = new PerformanceMetrics();
  }

  /**
   * Processes a new SiteAlert for incident creation or association
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

      // Check for active incident
      this.metrics.startTimer('find_active_incident');
      const activeIncident = await this.repository.findActiveBySiteId(
        alert.siteId,
      );
      this.metrics.endTimer('find_active_incident');

      let incident: SiteIncident;

      if (activeIncident) {
        // Associate with existing incident
        logger(
          `Associating alert ${alert.id} with existing incident ${activeIncident.id}`,
          'debug',
        );

        this.metrics.startTimer('associate_alert');
        incident = await this.repository.associateAlert(
          activeIncident.id,
          alert.id,
        );
        this.metrics.endTimer('associate_alert');

        logger(
          `Associated alert ${alert.id} with incident ${incident.id}`,
          'debug',
        );
      } else {
        // Create new incident
        logger(
          `Creating new incident for alert ${alert.id} on site ${alert.siteId}`,
          'debug',
        );

        this.metrics.startTimer('create_incident');
        incident = await this.repository.createIncident({
          siteId: alert.siteId,
          startSiteAlertId: alert.id,
          latestSiteAlertId: alert.id,
          startedAt: new Date(),
        });
        this.metrics.endTimer('create_incident');

        logger(
          `Created new incident ${incident.id} for site ${alert.siteId}`,
          'debug',
        );
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

      // Find inactive incidents
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
        `Found ${inactiveIncidents.length} inactive incidents to resolve`,
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
}
