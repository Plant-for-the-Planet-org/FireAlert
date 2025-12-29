import {type SiteAlertRepository} from './SiteAlertRepository';
import {type GeoEventRepository} from '../GeoEvent/GeoEventRepository';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {logger} from '../../server/logger';

/**
 * Service for coordinating site alert creation workflow.
 * Handles stale event processing and provider-specific batch processing.
 */
export class SiteAlertService {
  constructor(
    private readonly repository: SiteAlertRepository,
    private readonly geoEventRepository: GeoEventRepository,
  ) {}

  /**
   * Creates alerts for all unprocessed events from a provider.
   * Process:
   * 1. Process unprocessed events in batches
   * 2. Use provider-specific logic (GEOSTATIONARY vs POLAR)
   * 3. Mark processed events after alert creation
   *
   * NOTE: V0 calls markStaleAsProcessed at the start, but this causes issues
   * with historical NASA FIRMS data where eventDate is the actual fire detection
   * time (often >24hrs ago). V3 skips this step - events are marked as processed
   * after alerts are created from them.
   *
   * @param providerId - The provider ID
   * @param clientId - The client ID (determines batch size and logic)
   * @param slice - The slice value
   * @returns Total number of alerts created
   */
  async createAlertsForProvider(
    providerId: string,
    clientId: string,
    slice: string,
  ): Promise<number> {
    const metrics = new PerformanceMetrics();
    metrics.startTimer('alert_creation_total');
    metrics.recordMemorySnapshot('alert_start');

    // NOTE: V0 calls markStaleAsProcessed here, but it causes issues with historical
    // NASA FIRMS data where eventDate is the actual fire detection time (often >24hrs ago).
    // This would mark newly fetched events as stale immediately.
    //
    // V0 "works" because:
    // 1. It processes events in the same transaction as marking them
    // 2. The POLAR branch has a bug that updates ALL events, not just the batch
    //
    // V3 approach: Skip markStaleAsProcessed entirely. Events are marked as processed
    // after alerts are created from them. Truly stale events (from failed runs) will
    // be processed on the next run or can be handled by a separate cleanup job.

    const isGeostationary = clientId === 'GEOSTATIONARY';
    const batchSize = isGeostationary ? 500 : 1000;
    let totalAlerts = 0;
    let moreToProcess = true;
    let batchCount = 0;
    const batchDurations: number[] = [];

    while (moreToProcess) {
      const unprocessed =
        await this.geoEventRepository.findUnprocessedByProvider(
          providerId,
          batchSize,
        );

      if (unprocessed.length === 0) {
        moreToProcess = false;
        continue;
      }

      batchCount++;
      const batchStart = Date.now();
      const eventIds = unprocessed.map(e => e.id);

      const count = await this.processBatch(
        eventIds,
        providerId,
        clientId,
        slice,
        isGeostationary,
      );

      const batchDuration = Date.now() - batchStart;
      batchDurations.push(batchDuration);
      totalAlerts += count;
    }

    const totalDuration = metrics.endTimer('alert_creation_total');
    metrics.recordMemorySnapshot('alert_end');

    // Record metrics
    metrics.recordMetric('total_alerts_created', totalAlerts);
    metrics.recordMetric('batches_processed', batchCount);
    metrics.recordMetric('batch_size_used', batchSize);
    metrics.recordMetric('provider_type', isGeostationary ? 1 : 0); // 1 for geo, 0 for polar

    if (batchDurations.length > 0) {
      metrics.recordMetric(
        'avg_batch_duration_ms',
        PerformanceMetrics.calculateAverage(batchDurations),
      );
      metrics.recordMetric(
        'slowest_batch_ms',
        PerformanceMetrics.findMax(batchDurations),
      );
      metrics.recordNestedMetric('batch_durations', batchDurations);
    }

    // Add detailed SiteAlert processing log
    logger(
      `SiteAlert process: processed GeoEvents in ${batchCount} batches, created ${totalAlerts} alerts, time took ${totalDuration}ms, batch size: ${batchSize}, provider type: ${isGeostationary ? 'GEOSTATIONARY' : 'POLAR'}`,
      'debug',
    );

    return totalAlerts;
  }

  /**
   * Processes a batch of events and creates alerts.
   * Routes to the appropriate repository method based on provider type.
   *
   * @param eventIds - Array of event IDs to process
   * @param providerId - The provider ID
   * @param clientId - The client ID
   * @param slice - The slice value
   * @param isGeostationary - Whether this is a geostationary provider
   * @returns Number of alerts created
   */
  async processBatch(
    eventIds: string[],
    providerId: string,
    clientId: string,
    slice: string,
    isGeostationary: boolean,
  ): Promise<number> {
    const metrics = new PerformanceMetrics();
    metrics.startTimer('batch_processing');

    let alertCount: number;

    if (isGeostationary) {
      metrics.startTimer('geostationary_query');
      alertCount = await this.repository.createAlertsForGeostationary(
        eventIds,
        providerId,
        clientId,
        slice,
      );
      metrics.endTimer('geostationary_query');
    } else {
      metrics.startTimer('polar_query');
      alertCount = await this.repository.createAlertsForPolar(
        eventIds,
        providerId,
        clientId,
        slice,
      );
      metrics.endTimer('polar_query');
    }

    const batchDuration = metrics.endTimer('batch_processing');

    // Log slow batch processing
    if (batchDuration > 3000) {
      // >3 seconds
      logger(
        `SLOW BATCH: ${clientId} batch with ${eventIds.length} events took ${batchDuration}ms`,
        'warn',
      );
    }

    return alertCount;
  }
}
