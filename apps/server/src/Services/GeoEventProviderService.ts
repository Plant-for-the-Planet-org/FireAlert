import {type GeoEventProvider} from '@prisma/client';
import {type GeoEventProviderRepository} from '../repositories/GeoEventProviderRepository';
import {type GeoEventService} from './GeoEventService';
import {type SiteAlertService} from './SiteAlertService';
import {type GeoEventProviderFactory} from '../utils/GeoEventProviderFactory';
import {ProcessingResult} from '../domain/ProcessingResult';
import {logger} from '../server/logger';
import {type GeoEventProviderClientId} from '../Interfaces/GeoEventProvider';
import {type PQueue} from '../utils/PQueue';
import {BatchProcessor} from '../utils/BatchProcessor';

/**
 * Top-level service for orchestrating provider processing workflow.
 * Manages concurrency, coordinates event fetching, deduplication, and alert creation.
 */
export class GeoEventProviderService {
  constructor(
    private readonly providerRepository: GeoEventProviderRepository,
    private readonly geoEventService: GeoEventService,
    private readonly siteAlertService: SiteAlertService,
    private readonly providerFactory: GeoEventProviderFactory,
    private readonly queue: PQueue,
  ) {}

  /**
   * Processes multiple providers with concurrency control.
   * Uses PQueue to limit concurrent provider processing.
   *
   * @param providers - Array of providers to process
   * @param concurrency - Maximum number of concurrent operations
   * @returns Aggregated ProcessingResult
   */
  async processProviders(
    providers: GeoEventProvider[],
    concurrency: number,
  ): Promise<ProcessingResult> {
    const promises = providers.map(provider =>
      this.queue.add(() => this.processEachProvider(provider)),
    );

    const results = await Promise.all(promises);

    return results.reduce(
      (acc, result) => acc.merge(result),
      ProcessingResult.empty(),
    );
  }

  /**
   * Processes a single provider.
   * Workflow:
   * 1. Fetch latest geo events from provider
   * 2. Deduplicate and save events
   * 3. Create site alerts
   * 4. Update provider lastRun timestamp
   *
   * @param provider - The provider to process
   * @returns ProcessingResult with metrics
   */
  async processEachProvider(
    provider: GeoEventProvider,
  ): Promise<ProcessingResult> {
    const result = new ProcessingResult();

    try {
      const {
        config,
        id: geoEventProviderId,
        clientId: geoEventProviderClientId,
        clientApiKey,
        lastRun,
      } = provider;

      const parsedConfig = JSON.parse(JSON.stringify(config));
      const slice = parsedConfig.slice;

      let breadcrumbPrefix = `${geoEventProviderClientId} Slice ${slice}:`;
      if (geoEventProviderClientId === 'GEOSTATIONARY') {
        breadcrumbPrefix = `Geostationary Satellite ${clientApiKey}:`;
      }

      // Fetch latest geo events from provider
      const geoEventProvider = this.providerFactory.create(provider);
      const geoEvents = await geoEventProvider.getLatestGeoEvents(
        geoEventProviderClientId,
        geoEventProviderId,
        slice,
        clientApiKey,
        lastRun,
      );

      logger(
        `${breadcrumbPrefix} Fetched ${geoEvents.length} geoEvents`,
        'info',
      );

      if (geoEvents.length > 0) {
        // Process events in chunks to prevent memory issues
        const chunkSize = 2000;
        const batchProcessor = new BatchProcessor();

        logger(
          `${breadcrumbPrefix} Processing ${geoEvents.length} events in chunks of ${chunkSize}`,
          'info',
        );

        let chunkIndex = 0;
        const chunkResults = await batchProcessor.processSequentially(
          geoEvents,
          chunkSize,
          async chunk => {
            chunkIndex++;
            const chunkStart = Date.now();
            logger(
              `${breadcrumbPrefix} Processing chunk ${chunkIndex} with ${chunk.length} events`,
              'debug',
            );

            const chunkResult = await this.geoEventService.deduplicateAndSave(
              chunk,
              geoEventProviderId,
            );

            const chunkDuration = Date.now() - chunkStart;
            logger(
              `${breadcrumbPrefix} Chunk ${chunkIndex} completed in ${chunkDuration}ms - Created: ${chunkResult.created}, New: ${chunkResult.new}`,
              'debug',
            );

            return chunkResult;
          },
        );

        // Aggregate results from all chunks
        const totalCreated = chunkResults.reduce(
          (sum, r) => sum + r.created,
          0,
        );
        const totalNew = chunkResults.reduce((sum, r) => sum + r.new, 0);

        result.addEventsProcessed(geoEvents.length);
        result.addEventsCreated(totalCreated);

        logger(`${breadcrumbPrefix} Found ${totalNew} new Geo Events`, 'info');
        logger(
          `${breadcrumbPrefix} Created ${totalCreated} Geo Events`,
          'info',
        );
      }

      // Create site alerts
      const alertCount = await this.siteAlertService.createAlertsForProvider(
        geoEventProviderId,
        geoEventProviderClientId as GeoEventProviderClientId,
        slice,
      );

      result.addAlertsCreated(alertCount);
      logger(`${breadcrumbPrefix} Created ${alertCount} Site Alerts.`, 'info');

      // Update lastRun timestamp
      await this.providerRepository.updateLastRun(
        geoEventProviderId,
        new Date(),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error(String(error));
      result.addError(errorMessage);
      logger(
        `Error processing provider ${provider.id}: ${errorMessage.message}`,
        'error',
      );
    }

    return result;
  }
}
