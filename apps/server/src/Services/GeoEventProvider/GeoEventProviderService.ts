import {type GeoEventProvider} from '@prisma/client';
import {type GeoEventProviderClientId} from '../../Interfaces/GeoEventProvider';
import {logger} from '../../server/logger';
import {BatchProcessor} from '../../utils/BatchProcessor';
import {OperationResult} from '../../utils/OperationResult';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {type PQueue} from '../../utils/PQueue';
import {type ProviderManager} from '../../utils/ProviderManager';
import {type GeoEventService} from '../GeoEvent/GeoEventService';
import {type SiteAlertService} from '../SiteAlert/SiteAlertService';
import {type GeoEventProviderRepository} from './GeoEventProviderRepository';

/**
 * Top-level service for orchestrating provider processing workflow.
 * Manages concurrency, coordinates event fetching, deduplication, and alert creation.
 */
export class GeoEventProviderService {
  constructor(
    private readonly providerRepository: GeoEventProviderRepository,
    private readonly geoEventService: GeoEventService,
    private readonly siteAlertService: SiteAlertService,
    private readonly providerManager: ProviderManager,
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
  ): Promise<OperationResult> {
    const metrics = new PerformanceMetrics();
    metrics.startTimer('total_processing');
    metrics.recordMemorySnapshot('start');

    const promises = providers.map(provider =>
      this.queue.add(() => this.processEachProvider(provider)),
    );

    const results = await Promise.all(promises);

    const totalDuration = metrics.endTimer('total_processing');
    metrics.recordMemorySnapshot('end');
    metrics.recordMetric('providers_processed', providers.length);

    // Aggregate provider-specific metrics
    const providerMetrics: any = {};
    const chunkDurations: number[] = [];

    results.forEach((result, index) => {
      const providerMetrics_result = result.getMetrics();
      if (providerMetrics_result) {
        const providerId = providers[index]?.id || `provider_${index}`;
        providerMetrics[`provider_${providerId}`] =
          providerMetrics_result.getMetrics();

        // Collect chunk durations for average calculation
        const providerChunkDurations =
          providerMetrics_result.getMetrics() as any;
        if (providerChunkDurations.chunk_durations) {
          chunkDurations.push(...providerChunkDurations.chunk_durations);
        }
      }
    });

    // Calculate aggregate metrics
    if (chunkDurations.length > 0) {
      metrics.recordMetric(
        'avg_chunk_duration_ms',
        PerformanceMetrics.calculateAverage(chunkDurations),
      );
      metrics.recordMetric(
        'slowest_chunk_ms',
        PerformanceMetrics.findMax(chunkDurations),
      );
    }

    metrics.recordNestedMetric('provider_processing', providerMetrics);

    // Log performance warnings
    if (totalDuration > 30000) {
      // >30 seconds
      logger(
        `WARNING: Total provider processing took ${totalDuration}ms (>30s threshold)`,
        'warn',
      );
    } else if (totalDuration > 5000) {
      // >5 seconds
      logger(`INFO: Total provider processing took ${totalDuration}ms`, 'info');
    }

    const finalResult = results.reduce(
      (acc, result) => acc.merge(result),
      OperationResult.empty(),
    );

    finalResult.setMetrics(metrics);
    return finalResult;
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
  ): Promise<OperationResult> {
    const result = new OperationResult();
    const metrics = new PerformanceMetrics();

    metrics.startTimer('provider_total');
    metrics.recordMemorySnapshot('provider_start');

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
      metrics.startTimer('fetch_events');
      const geoEventProvider = this.providerManager.createProvider(provider);
      const geoEvents = await geoEventProvider.getLatestGeoEvents(
        geoEventProviderClientId,
        geoEventProviderId,
        slice,
        clientApiKey,
        lastRun,
      );
      const fetchDuration = metrics.endTimer('fetch_events');

      logger(
        `${breadcrumbPrefix} Fetched ${geoEvents.length} geoEvents`,
        'info',
      );

      if (geoEvents.length > 0) {
        // OPTIMIZATION: Pre-fetch existing IDs once for all chunks
        metrics.startTimer('prefetch_existing_ids');
        const existingIdsResult =
          await this.geoEventService.repository.fetchExistingIdsWithTiming(
            geoEventProviderId,
            12,
          );
        const preFetchedIds = existingIdsResult.ids;
        const prefetchDuration = metrics.endTimer('prefetch_existing_ids');

        logger(
          `${breadcrumbPrefix} Pre-fetched ${preFetchedIds.length} existing IDs in ${prefetchDuration}ms`,
          'debug',
        );

        // Process events in chunks to prevent memory issues
        metrics.startTimer('chunk_processing');
        const chunkSize = 2000;
        const batchProcessor = new BatchProcessor();
        const chunkDurations: number[] = [];

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

            // Pass pre-fetched IDs to avoid re-querying for each chunk
            const chunkResult = await this.geoEventService.deduplicateAndSave(
              chunk,
              geoEventProviderId,
              preFetchedIds, // Use pre-fetched IDs
            );

            const chunkDuration = Date.now() - chunkStart;
            chunkDurations.push(chunkDuration);

            // Log performance warnings for slow chunks
            if (chunkDuration > 2000) {
              // >2 seconds
              logger(
                `INFO: Chunk ${chunkIndex} took ${chunkDuration}ms (>2s threshold)`,
                'info',
              );
            }

            logger(
              `${breadcrumbPrefix} Chunk ${chunkIndex} completed in ${chunkDuration}ms - Created: ${chunkResult.created}, New: ${chunkResult.new}`,
              'debug',
            );

            return chunkResult;
          },
        );

        const chunkProcessingDuration = metrics.endTimer('chunk_processing');
        metrics.recordMetric('chunks_processed', chunkResults.length);
        metrics.recordMetric('prefetch_duration_ms', prefetchDuration);
        metrics.recordMetric('existing_ids_prefetched', preFetchedIds.length);
        metrics.recordNestedMetric('chunk_durations', chunkDurations);

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
      metrics.startTimer('alert_creation');
      const alertCount = await this.siteAlertService.createAlertsForProvider(
        geoEventProviderId,
        geoEventProviderClientId as GeoEventProviderClientId,
        slice,
      );
      const alertDuration = metrics.endTimer('alert_creation');

      // Log performance warnings for slow alert creation
      if (alertDuration > 3000) {
        // >3 seconds
        logger(
          `INFO: Alert creation took ${alertDuration}ms (>3s threshold)`,
          'info',
        );
      }

      result.addAlertsCreated(alertCount);
      logger(`${breadcrumbPrefix} Created ${alertCount} Site Alerts.`, 'info');

      // Update lastRun timestamp
      metrics.startTimer('db_update');
      await this.providerRepository.updateLastRun(
        geoEventProviderId,
        new Date(),
      );
      metrics.endTimer('db_update');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error(String(error));
      result.addError(errorMessage);
      logger(
        `Error processing provider ${provider.id}: ${errorMessage.message}`,
        'error',
      );
    }

    const totalProviderDuration = metrics.endTimer('provider_total');
    metrics.recordMemorySnapshot('provider_end');

    // Log performance warnings for slow providers
    if (totalProviderDuration > 30000) {
      // >30 seconds
      logger(
        `WARNING: Provider ${provider.id} took ${totalProviderDuration}ms (>30s threshold)`,
        'warn',
      );
    } else if (totalProviderDuration > 5000) {
      // >5 seconds
      logger(
        `INFO: Provider ${provider.id} took ${totalProviderDuration}ms (>5s threshold)`,
        'info',
      );
    }

    result.setMetrics(metrics);
    return result;
  }
}
