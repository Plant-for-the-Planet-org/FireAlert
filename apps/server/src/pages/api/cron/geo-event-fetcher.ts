// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geo-event-fetcher
// FEATURE FLAG CONTROLLED - Supports both legacy and refactored implementations

import {type NextApiRequest, type NextApiResponse} from 'next';
import {type GeoEventProvider} from '@prisma/client';
import {prisma} from '../../../../src/server/db';
import {logger} from '../../../../src/server/logger';
import {env} from '../../../env.mjs';
import {
  type ProviderConfig,
  type ProcessedGeoEventResult,
} from '../../../types/GeoEventProvider.types';
import {type GeoEventInterface} from '../../../Interfaces/GeoEvent';
import {type GeoEventProviderClientId} from '../../../Interfaces/GeoEventProvider';

// This ensures that the alertFetcher Vercel serverless function runs for a maximum of 300 seconds
// 300s is the maximum allowed duration for Vercel pro plans
export const config = {
  maxDuration: 300,
};

// TODO: Run this cron every 5 minutes
export default async function alertFetcher(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Check feature flag to determine which implementation to use
  if (env.USE_REFACTORED_PIPELINE) {
    logger('Using REFACTORED pipeline implementation', 'info');
    return await refactoredImplementation(req, res);
  } else {
    logger('Using LEGACY pipeline implementation', 'info');
    return await legacyImplementation(req, res);
  }
}

/**
 * REFACTORED IMPLEMENTATION - Service layer architecture
 * Uses dependency injection and clean separation of concerns
 */
async function refactoredImplementation(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {RequestHandler} = await import('../../../utils/RequestHandler');
  const {GeoEventProviderRepository} = await import(
    '../../../Services/GeoEventProvider/GeoEventProviderRepository'
  );
  const {GeoEventRepository} = await import(
    '../../../Services/GeoEvent/GeoEventRepository'
  );
  const {SiteAlertRepository} = await import(
    '../../../Services/SiteAlert/SiteAlertRepository'
  );
  const {GeoEventService} = await import(
    '../../../Services/GeoEvent/GeoEventService'
  );
  const {SiteAlertService} = await import(
    '../../../Services/SiteAlert/SiteAlertService'
  );
  const {GeoEventProviderService} = await import(
    '../../../Services/GeoEventProvider/GeoEventProviderService'
  );
  const {EventProcessor} = await import('../../../utils/EventProcessor');
  const {ProviderManager} = await import('../../../utils/ProviderManager');
  const {BatchProcessor} = await import('../../../utils/BatchProcessor');
  const {PQueue} = await import('../../../utils/PQueue');
  const {OperationResult} = await import('../../../utils/OperationResult');

  // 1. Validate cron key
  if (!RequestHandler.validateCron(req)) {
    return res.status(403).json(RequestHandler.buildUnauthorized());
  }

  // 2. Parse request parameters
  const limit = RequestHandler.parseLimit(req);

  // 3. Find eligible providers
  const providerRepo = new GeoEventProviderRepository(prisma);
  const eligible = await providerRepo.findEligibleProviders(limit);

  // 4. Shuffle and select providers
  const providerManager = new ProviderManager();
  const selected = providerManager.selectProviders(eligible, limit);

  if (selected.length === 0) {
    logger('No eligible providers to process', 'info');
    return res
      .status(200)
      .json(RequestHandler.buildSuccess(OperationResult.empty()));
  }

  logger(
    `Running Geo Event Fetcher. Taking ${selected.length} eligible providers.`,
    'info',
  );

  // 5. Initialize services with dependency injection
  const eventProcessor = new EventProcessor();
  await eventProcessor.initialize();

  const geoEventRepo = new GeoEventRepository(prisma);
  const siteAlertRepo = new SiteAlertRepository(prisma);

  const geoEventService = new GeoEventService(
    geoEventRepo,
    eventProcessor,
    new BatchProcessor(),
  );

  const siteAlertService = new SiteAlertService(
    siteAlertRepo,
    geoEventRepo,
    new BatchProcessor(),
  );

  const queue = new PQueue({concurrency: 3}); // Concurrency limit of 3

  const providerService = new GeoEventProviderService(
    providerRepo,
    geoEventService,
    siteAlertService,
    providerManager,
    queue,
  );

  // 6. Process providers with concurrency control
  const result = await providerService.processProviders(selected, 3);

  // 7. Return response
  res.status(200).json(RequestHandler.buildSuccess(result));
}

/**
 * LEGACY IMPLEMENTATION - Original inline implementation
 * Preserved for safe rollback capability
 *
 * Now properly typed for better type safety while maintaining exact runtime behavior.
 */
async function legacyImplementation(req: NextApiRequest, res: NextApiResponse) {
  const GeoEventProviderClassRegistry = (
    await import(
      '../../../Services/GeoEventProvider/GeoEventProviderClassRegistry'
    )
  ).default;
  const processGeoEvents = (
    await import('../../../../src/Services/GeoEvent/GeoEventHandler')
  ).default;
  const createSiteAlerts = (
    await import('../../../../src/Services/SiteAlert/CreateSiteAlert')
  ).default;

  // Verify the 'cron_key' in the request headers before proceeding
  if (env.CRON_KEY) {
    // Verify the 'cron_key' in the request headers
    const cronKey = req.query['cron_key'];
    if (!cronKey || cronKey !== env.CRON_KEY) {
      res.status(403).json({message: 'Unauthorized Invalid Cron Key'});
      return;
    }
  }

  // Set Limit to 7 if not provided or greater than 7
  // Extract limit from query
  const rawLimit = req.query['limit'];

  // Initialize final limit as number
  let limit: number;

  if (typeof rawLimit === 'string') {
    const parsedLimit = parseInt(rawLimit, 10);
    if (isNaN(parsedLimit) || parsedLimit > 7) {
      limit = 7;
    } else {
      limit = parsedLimit;
    }
  } else {
    limit = 2;
  }

  // get all active providers where now  fetch frequency + last run is greater than current time

  let newSiteAlertCount = 0;
  let processedProviders = 0;
  const fetchCount = limit;
  // while (processedProviders <= limit) {
  const activeProviders = await prisma.$queryRaw<GeoEventProvider[]>`
        SELECT *
        FROM "GeoEventProvider"
        WHERE "isActive" = true
          AND "fetchFrequency" IS NOT NULL
          AND ("lastRun" + ("fetchFrequency" || ' minutes')::INTERVAL) < (current_timestamp AT TIME ZONE 'UTC')
        ORDER BY (current_timestamp AT TIME ZONE 'UTC' - "lastRun") DESC
        LIMIT ${fetchCount};
    `;
  /**
   * Shuffles an array using Fisher-Yates algorithm
   * @template T - The type of array elements
   * @param array - The array to shuffle (modified in place)
   * @returns The shuffled array
   */
  function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [array[i], array[j]] = [array[j]!, array[i]!]; // swap elements
    }
    return array;
  }
  const shuffledProviders = shuffleArray([...activeProviders]);
  const selectedProviders = shuffledProviders.slice(0, limit);

  // Filter out those active providers whose last (run date + fetchFrequency (in minutes) > current time
  // Break the loop if there are no active providers

  // if (activeProviders.length === 0) {
  //   logger(`Nothing to process anymore activeProviders.length = 0`, "info");
  //   break;
  // }

  logger(
    `Running Geo Event Fetcher. Taking ${selectedProviders.length} eligible providers.`,
    'info',
  );

  // Define Chunk Size for processGeoEvents
  const chunkSize = 2000;

  /**
   * Chunks an array into smaller arrays of specified size
   * @template T - The type of array elements
   * @param array - The array to chunk
   * @param size - The size of each chunk
   * @returns Array of chunked arrays
   */
  const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    let index = 0;
    while (index < array.length) {
      chunked.push(array.slice(index, size + index));
      index += size;
    }
    return chunked;
  };

  // Loop for each active provider and fetch geoEvents
  const promises = selectedProviders.map(async (provider: GeoEventProvider) => {
    const {
      config,
      id: geoEventProviderId,
      clientId: geoEventProviderClientId,
      clientApiKey,
      lastRun,
    } = provider;
    // For GOES-16, geoEventProviderId is 55, geoEventProviderClientId is GEOSTATIONARY, and clientApiKey is GOES-16
    const parsedConfig = JSON.parse(JSON.stringify(config)) as ProviderConfig;
    const client = parsedConfig.client; // For GOES-16 = GOES-16
    const geoEventProvider = GeoEventProviderClassRegistry.get(client);
    geoEventProvider.initialize(parsedConfig);

    const slice = parsedConfig.slice;
    let breadcrumbPrefix = `${geoEventProviderClientId} Slice ${slice}:`;
    if (geoEventProviderClientId === 'GEOSTATIONARY') {
      breadcrumbPrefix = `Geostationary Satellite ${clientApiKey}:`;
    }

    // First fetch all geoEvents from the provider
    return await geoEventProvider
      .getLatestGeoEvents(
        geoEventProviderClientId,
        geoEventProviderId,
        slice,
        clientApiKey,
        lastRun,
      )
      .then(async (geoEvents: GeoEventInterface[]) => {
        // If there are geoEvents, emit an event to find duplicates and persist them
        logger(
          `${breadcrumbPrefix} Fetched ${geoEvents.length} geoEvents`,
          'info',
        );

        let totalEventCount = 0;
        let totalNewGeoEvent = 0;

        if (geoEvents.length > 0) {
          // Split geoEvents into smaller chunks
          const geoEventChunks = chunkArray(geoEvents, chunkSize);

          // Process each chunk sequentially
          for (const geoEventChunk of geoEventChunks) {
            const processedGeoEvent: ProcessedGeoEventResult =
              await processGeoEvents(
                geoEventProviderClientId as GeoEventProviderClientId,
                geoEventProviderId,
                slice,
                geoEventChunk,
              );
            totalEventCount += processedGeoEvent.geoEventCount;
            totalNewGeoEvent += processedGeoEvent.newGeoEventCount;
          }
        }

        logger(
          `${breadcrumbPrefix} Found ${totalNewGeoEvent} new Geo Events`,
          'info',
        );
        logger(
          `${breadcrumbPrefix} Created ${totalEventCount} Geo Events`,
          'info',
        );

        // if (totalNewGeoEvent > 0) {
        const alertCount: number = await createSiteAlerts(
          geoEventProviderId,
          geoEventProviderClientId as GeoEventProviderClientId,
          slice,
        );
        logger(
          `${breadcrumbPrefix} Created ${alertCount} Site Alerts.`,
          'info',
        );

        newSiteAlertCount += alertCount;
        // }

        // Update lastRun value of the provider to the current Date()
        await prisma.geoEventProvider.update({
          where: {
            id: provider.id,
          },
          data: {
            lastRun: new Date().toISOString(),
          },
        });
      });
  });
  processedProviders += activeProviders.length;

  await Promise.all(promises).catch((error: unknown) =>
    logger(
      `Something went wrong before creating notifications. ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    ),
  );

  res.status(200).json({
    message: 'Geo-event-fetcher Cron job executed successfully',
    alertsCreated: newSiteAlertCount,
    // notificationCount: notificationCount,
    processedProviders: processedProviders,
    status: 200,
  });
}
