import {SiteAlertRepository} from '../repositories/SiteAlertRepository';
import {GeoEventRepository} from '../repositories/GeoEventRepository';
import {BatchProcessor} from '../utils/BatchProcessor';

/**
 * Service for coordinating site alert creation workflow.
 * Handles stale event processing and provider-specific batch processing.
 */
export class SiteAlertService {
  constructor(
    private readonly repository: SiteAlertRepository,
    private readonly geoEventRepository: GeoEventRepository,
    private readonly batchProcessor: BatchProcessor,
  ) {}

  /**
   * Creates alerts for all unprocessed events from a provider.
   * Process:
   * 1. Mark events >24hrs as processed
   * 2. Process unprocessed events in batches
   * 3. Use provider-specific logic (GEOSTATIONARY vs POLAR)
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
    // Mark events >24hrs as processed
    await this.geoEventRepository.markStaleAsProcessed(24);

    const isGeostationary = clientId === 'GEOSTATIONARY';
    const batchSize = isGeostationary ? 500 : 1000;
    let totalAlerts = 0;
    let moreToProcess = true;

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

      const eventIds = unprocessed.map(e => e.id);
      const count = await this.processBatch(
        eventIds,
        providerId,
        clientId,
        slice,
        isGeostationary,
      );
      totalAlerts += count;
    }

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
    if (isGeostationary) {
      return await this.repository.createAlertsForGeostationary(
        eventIds,
        providerId,
        clientId,
        slice,
      );
    } else {
      return await this.repository.createAlertsForPolar(
        eventIds,
        providerId,
        clientId,
        slice,
      );
    }
  }
}
