import {type GeoEventProvider} from '@prisma/client';
import {type GeoEventProviderRepository} from '../repositories/GeoEventProviderRepository';
import {type GeoEventService} from './GeoEventService';
import {type SiteAlertService} from './SiteAlertService';
import {type GeoEventProviderFactory} from '../utils/GeoEventProviderFactory';
import {ProcessingResult} from '../domain/ProcessingResult';
import {logger} from '../server/logger';
import {type GeoEventProviderClientId} from '../Interfaces/GeoEventProvider';
import {type PQueue} from '../utils/PQueue';

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
      this.queue.add(() => this.processProvider(provider)),
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
  async processProvider(provider: GeoEventProvider): Promise<ProcessingResult> {
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
        // Deduplicate and save events
        const {created, new: newCount} =
          await this.geoEventService.deduplicateAndSave(
            geoEvents,
            geoEventProviderId,
          );

        result.addEventsProcessed(geoEvents.length);
        result.addEventsCreated(created);

        logger(`${breadcrumbPrefix} Found ${newCount} new Geo Events`, 'info');
        logger(`${breadcrumbPrefix} Created ${created} Geo Events`, 'info');
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
