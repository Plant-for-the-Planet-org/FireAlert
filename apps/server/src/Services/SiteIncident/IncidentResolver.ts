import {type SiteIncident, type SiteAlert} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type IncidentState,
  type ResolveResult,
} from '../../Interfaces/SiteIncident';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {type SiteIncidentRepository} from './SiteIncidentRepository';

/**
 * IncidentResolver handles specialized logic for incident resolution
 * Determines when incidents should be resolved and calculates geometry
 */
export class IncidentResolver {
  constructor(
    private readonly repository: SiteIncidentRepository,
    private readonly inactiveHours: number = 6,
  ) {}

  /**
   * Determines if an incident should be resolved based on inactivity
   * @param incident - The incident to check
   * @param lastAlertTime - Time of the last associated alert
   * @returns True if incident should be resolved
   */
  shouldResolveIncident(incident: SiteIncident, lastAlertTime: Date): boolean {
    if (!incident.isActive) {
      return false;
    }

    const now = new Date();
    const inactiveMs = now.getTime() - lastAlertTime.getTime();
    const inactiveHours = inactiveMs / (1000 * 60 * 60);

    const shouldResolve = inactiveHours >= this.inactiveHours;

    if (shouldResolve) {
      logger(
        `Incident ${
          incident.id
        } should be resolved (inactive for ${inactiveHours.toFixed(2)}h)`,
        'debug',
      );
    }

    return shouldResolve;
  }

  /**
   * Calculates the incident state including inactivity duration
   * @param incident - The incident to analyze
   * @param lastAlertTime - Time of the last alert
   * @returns Incident state information
   */
  calculateIncidentState(
    incident: SiteIncident,
    lastAlertTime: Date,
  ): IncidentState {
    const now = new Date();
    const inactiveMs = now.getTime() - lastAlertTime.getTime();
    const inactiveMinutes = Math.floor(inactiveMs / (1000 * 60));
    const inactiveHours = inactiveMinutes / 60;

    return {
      incident,
      lastAlertTime,
      alertCount: 0, // Will be populated by caller if needed
      shouldResolve: inactiveHours >= this.inactiveHours,
      inactiveMinutes,
    };
  }

  /**
   * Batch resolves multiple incidents
   * @param incidents - Incidents to resolve
   * @returns Resolution result with metrics
   */
  async batchResolveIncidents(
    incidents: SiteIncident[],
  ): Promise<ResolveResult> {
    const metrics = new PerformanceMetrics();
    metrics.startTimer('batch_resolution_total');

    try {
      logger(
        `Starting batch resolution of ${incidents.length} incidents`,
        'debug',
      );

      const result = await this.repository.resolveIncidentsBatch(incidents);

      const totalDuration = metrics.endTimer('batch_resolution_total');

      metrics.recordMetric('resolved_count', result.resolvedCount);
      metrics.recordMetric('error_count', result.errors.length);
      metrics.recordMetric('batch_size', incidents.length);
      metrics.recordMetric('total_duration_ms', totalDuration);

      logger(
        `Batch resolution completed: ${result.resolvedCount}/${incidents.length} resolved in ${totalDuration}ms`,
        'info',
      );

      return result;
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
   * Validates incident data for consistency
   * @param incident - Incident to validate
   * @returns True if incident is valid
   */
  validateIncident(incident: SiteIncident): boolean {
    if (!incident.id || !incident.siteId) {
      logger(`Invalid incident: missing id or siteId`, 'warn');
      return false;
    }

    if (!incident.startSiteAlertId || !incident.latestSiteAlertId) {
      logger(`Invalid incident ${incident.id}: missing alert IDs`, 'warn');
      return false;
    }

    if (!incident.startedAt) {
      logger(`Invalid incident ${incident.id}: missing startedAt`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Calculates time since last alert in minutes
   * @param lastAlertTime - Time of last alert
   * @returns Minutes since last alert
   */
  getInactiveMinutes(lastAlertTime: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - lastAlertTime.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Checks if incident is within resolution window
   * @param incident - Incident to check
   * @returns True if incident can be resolved
   */
  isInResolutionWindow(incident: SiteIncident): boolean {
    if (!incident.isActive || incident.isProcessed) {
      return false;
    }

    // Incident must have been active for at least the inactive hours threshold
    const now = new Date();
    const ageMs = now.getTime() - incident.startedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    return ageHours >= this.inactiveHours;
  }

  /**
   * Prepares incident for resolution
   * @param incident - Incident to prepare
   * @returns Prepared incident data
   */
  prepareForResolution(incident: SiteIncident): {
    endedAt: Date;
    isActive: boolean;
    isProcessed: boolean;
  } {
    return {
      endedAt: new Date(),
      isActive: false,
      isProcessed: false, // Will trigger end notifications
    };
  }
}
