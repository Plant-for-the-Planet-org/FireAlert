// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/geo-event-fetcher

import {type NextApiRequest, type NextApiResponse} from 'next';
import {z} from 'zod';
import GeoEventProviderClassRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry';
import {type GeoEventProvider} from '@prisma/client';
import {
  type GeoEventProviderConfig,
  type GeoEventProviderClientId,
  GeoEventProviderClient,
} from '../../../Interfaces/GeoEventProvider';
import {env} from '../../../env.mjs';
import processGeoEvents from '../../../../src/Services/GeoEvent/GeoEventHandler';
import createSiteAlerts from '../../../../src/Services/SiteAlert/CreateSiteAlert';
import {logger} from '../../../../src/server/logger';
import {prisma} from '../../../../src/server/db';
import {shuffleArray, chunkArray} from '../../../utils/arrayUtils';

// This ensures that the geoEventFetcher Vercel serverless function runs for a maximum of 300 seconds
// 300s is the maximum allowed duration for Vercel pro plans
export const config = {
  maxDuration: 300,
};

// ============================================================================
// Type Definitions
// ============================================================================

interface ProcessingResult {
  totalProviders: number;
  totalGeoEvents: number;
  totalNewGeoEvents: number;
  totalSiteAlerts: number;
  executionDuration: number;
  serviceErrors: string[];
  processingDetails: {
    geoEventProcessingDuration: number;
    siteAlertProcessingDuration: number;
    batchesProcessed: number;
  };
}

interface ApiResponse {
  message: string;
  alertsCreated: number;
  processedProviders: number;
  status: number;
  metrics?: ProcessingResult;
}

interface ProviderProcessingResult {
  providerId: string;
  geoEventsFetched: number;
  newGeoEventsCreated: number;
  siteAlertsCreated: number;
  geoEventProcessingDuration: number;
  siteAlertProcessingDuration: number;
  batchesProcessed: number;
  errors: string[];
}

// Zod schema for provider configuration validation
// Using passthrough() to allow additional properties like apiUrl
const GeoEventProviderConfigSchema = z
  .object({
    bbox: z.string(),
    slice: z.string(),
    client: z.nativeEnum(GeoEventProviderClient),
  })
  .passthrough(); // Allow additional properties like apiUrl

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Authenticates the incoming request by validating the CRON_KEY
 * @param req - The Next.js API request object
 * @returns true if authenticated, false otherwise
 */
function authenticateRequest(req: NextApiRequest): boolean {
  if (!env.CRON_KEY) {
    return true; // No CRON_KEY configured, allow request
  }

  const cronKey = req.query['cron_key'];
  return cronKey === env.CRON_KEY;
}

/**
 * Parses and validates query parameters from the request
 * @param req - The Next.js API request object
 * @returns An object containing the validated limit parameter
 */
function parseQueryParameters(req: NextApiRequest): {limit: number} {
  const rawLimit = req.query['limit'];
  const DEFAULT_LIMIT = 2;
  const MAX_LIMIT = 7;

  if (typeof rawLimit === 'string') {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_LIMIT) {
      return {limit: parsedLimit};
    }
    // If parsed limit is greater than MAX_LIMIT, use MAX_LIMIT
    if (!isNaN(parsedLimit) && parsedLimit > MAX_LIMIT) {
      return {limit: MAX_LIMIT};
    }
  }

  return {limit: DEFAULT_LIMIT};
}

/**
 * Selects active providers from the database that are due for processing
 * @param providerLimit - Maximum number of providers to select
 * @returns Array of active GeoEventProvider records
 */
async function selectActiveProviders(
  providerLimit: number,
): Promise<GeoEventProvider[]> {
  try {
    const activeProviders: GeoEventProvider[] = await prisma.$queryRaw`
      SELECT *
      FROM "GeoEventProvider"
      WHERE "isActive" = true
        AND "fetchFrequency" IS NOT NULL
        AND ("lastRun" + ("fetchFrequency" || ' minutes')::INTERVAL) < (current_timestamp AT TIME ZONE 'UTC')
      ORDER BY (current_timestamp AT TIME ZONE 'UTC' - "lastRun") DESC
      LIMIT ${providerLimit};
    `;

    // Shuffle providers to distribute load evenly across different providers
    // This prevents always processing the same providers first
    const shuffledProviders = shuffleArray([...activeProviders]);
    const selectedProviders = shuffledProviders.slice(0, providerLimit);

    logger(
      `Selected ${selectedProviders.length} providers out of ${activeProviders.length} eligible providers`,
      'info',
    );

    return selectedProviders;
  } catch (error) {
    logger(
      `Failed to select active providers: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
    throw error;
  }
}

/**
 * Parses and validates provider configuration using Zod schema
 * @param config - Raw configuration object from database
 * @returns Validated GeoEventProviderConfig
 */
function parseProviderConfig(config: unknown): GeoEventProviderConfig {
  try {
    return GeoEventProviderConfigSchema.parse(config);
  } catch (error) {
    logger(
      `Failed to parse provider config: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
    throw new Error('Invalid provider configuration');
  }
}

/**
 * Gets the API key for a provider, with support for FIRMS_MAP_KEY override
 * @param provider - The GeoEventProvider record
 * @param providerConfig - The parsed provider configuration
 * @returns The API key to use for this provider
 */
function getApiKey(
  provider: GeoEventProvider,
  providerConfig: GeoEventProviderConfig,
): string {
  // Check if this is a FIRMS provider and FIRMS_MAP_KEY is configured
  const isFirmsProvider =
    providerConfig.client === GeoEventProviderClient.FIRMS;

  if (isFirmsProvider && env.FIRMS_MAP_KEY) {
    logger(
      `Using FIRMS_MAP_KEY environment variable for provider ${provider.clientId}`,
      'info',
    );
    return env.FIRMS_MAP_KEY;
  }

  logger(
    `Using database clientApiKey for provider ${provider.clientId}`,
    'info',
  );
  return provider.clientApiKey;
}

/**
 * Updates the lastRun timestamp for a provider
 * @param providerId - The ID of the provider to update
 */
async function updateProviderLastRun(providerId: string): Promise<void> {
  try {
    await prisma.geoEventProvider.update({
      where: {id: providerId},
      data: {lastRun: new Date().toISOString()},
    });
  } catch (error) {
    logger(
      `Failed to update lastRun for provider ${providerId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
    // Don't throw - this is not critical enough to fail the entire process
  }
}

/**
 * Processes geo-events for a single provider
 * @param provider - The GeoEventProvider to process
 * @returns Processing result with metrics
 */
async function processProviderGeoEvents(
  provider: GeoEventProvider,
): Promise<ProviderProcessingResult> {
  const {
    config,
    id: geoEventProviderId,
    clientId: geoEventProviderClientId,
    clientApiKey,
    lastRun,
  } = provider;

  const result: ProviderProcessingResult = {
    providerId: geoEventProviderId,
    geoEventsFetched: 0,
    newGeoEventsCreated: 0,
    siteAlertsCreated: 0,
    geoEventProcessingDuration: 0,
    siteAlertProcessingDuration: 0,
    batchesProcessed: 0,
    errors: [],
  };

  try {
    // Parse and validate provider configuration
    const parsedConfig = parseProviderConfig(config);
    const client = parsedConfig.client;
    const slice = parsedConfig.slice;

    // Get the appropriate API key (with FIRMS_MAP_KEY override support)
    const apiKey = getApiKey(provider, parsedConfig);

    // Initialize provider
    const geoEventProvider = GeoEventProviderClassRegistry.get(client);
    geoEventProvider.initialize(parsedConfig);

    // Create log prefix for this provider
    const logPrefix =
      geoEventProviderClientId === 'GEOSTATIONARY'
        ? `Geostationary Satellite ${clientApiKey}:`
        : `${geoEventProviderClientId} Slice ${slice}:`;

    // Fetch geo-events from the provider
    const geoEvents = await geoEventProvider.getLatestGeoEvents(
      geoEventProviderClientId,
      geoEventProviderId,
      slice,
      apiKey,
      lastRun,
    );

    result.geoEventsFetched = geoEvents.length;
    logger(`${logPrefix} Fetched ${geoEvents.length} geoEvents`, 'info');

    if (geoEvents.length > 0) {
      // Split geoEvents into smaller chunks for memory-efficient processing
      const CHUNK_SIZE = 2000;
      const geoEventChunks = chunkArray(geoEvents, CHUNK_SIZE);

      let totalEventCount = 0;
      let totalNewGeoEvent = 0;

      // Process each chunk sequentially
      for (const geoEventChunk of geoEventChunks) {
        try {
          const processedGeoEvent = await processGeoEvents(
            geoEventProviderClientId as GeoEventProviderClientId,
            geoEventProviderId,
            slice,
            geoEventChunk,
          );
          totalEventCount += processedGeoEvent.geoEventCount;
          totalNewGeoEvent += processedGeoEvent.newGeoEventCount;

          // Collect processing duration
          if (processedGeoEvent.processingDuration) {
            result.geoEventProcessingDuration +=
              processedGeoEvent.processingDuration;
          }

          // Collect errors if any
          if (processedGeoEvent.errors && processedGeoEvent.errors.length > 0) {
            result.errors.push(...processedGeoEvent.errors);
            logger(
              `${logPrefix} Processing errors: ${processedGeoEvent.errors.join(
                ', ',
              )}`,
              'warn',
            );
          }
        } catch (error) {
          const errorMessage = `Failed to process chunk: ${
            error instanceof Error ? error.message : String(error)
          }`;
          result.errors.push(errorMessage);
          logger(`${logPrefix} ${errorMessage}`, 'error');
          // Continue processing remaining chunks
        }
      }

      result.newGeoEventsCreated = totalNewGeoEvent;

      logger(`${logPrefix} Found ${totalNewGeoEvent} new Geo Events`, 'info');
      logger(`${logPrefix} Created ${totalEventCount} Geo Events`, 'info');
      if (result.geoEventProcessingDuration > 0) {
        logger(
          `${logPrefix} Geo-event processing took ${result.geoEventProcessingDuration}ms`,
          'info',
        );
      }

      // Create site alerts for the processed events
      const siteAlertResult = await createSiteAlerts(
        geoEventProviderId,
        geoEventProviderClientId as GeoEventProviderClientId,
        slice,
      );

      result.siteAlertsCreated = siteAlertResult.totalAlertsCreated;
      result.batchesProcessed = siteAlertResult.batchesProcessed;

      // Collect site alert processing duration
      if (siteAlertResult.processingDuration) {
        result.siteAlertProcessingDuration = siteAlertResult.processingDuration;
      }

      // Collect site alert errors if any
      if (siteAlertResult.errors && siteAlertResult.errors.length > 0) {
        result.errors.push(...siteAlertResult.errors);
        logger(
          `${logPrefix} Site alert errors: ${siteAlertResult.errors.join(
            ', ',
          )}`,
          'warn',
        );
      }

      logger(
        `${logPrefix} Created ${siteAlertResult.totalAlertsCreated} Site Alerts in ${siteAlertResult.batchesProcessed} batches`,
        'info',
      );
      if (result.siteAlertProcessingDuration > 0) {
        logger(
          `${logPrefix} Site alert processing took ${result.siteAlertProcessingDuration}ms`,
          'info',
        );
      }
    }

    // Update lastRun timestamp
    await updateProviderLastRun(provider.id);

    return result;
  } catch (error) {
    logger(
      `Failed to process provider ${geoEventProviderClientId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
    // Return partial results even on error
    return result;
  }
}

/**
 * Orchestrates the processing of multiple providers
 * @param providers - Array of GeoEventProvider records to process
 * @returns Processing result with aggregated metrics
 */
async function orchestrateGeoEventProcessing(
  providers: GeoEventProvider[],
): Promise<ProcessingResult> {
  const startTime = Date.now();

  logger(
    `Running Geo Event Fetcher. Processing ${providers.length} eligible providers`,
    'info',
  );

  // Handle edge case: no providers to process
  if (providers.length === 0) {
    logger('No active providers available for processing', 'info');
    return {
      totalProviders: 0,
      totalGeoEvents: 0,
      totalNewGeoEvents: 0,
      totalSiteAlerts: 0,
      executionDuration: Date.now() - startTime,
      serviceErrors: [],
      processingDetails: {
        geoEventProcessingDuration: 0,
        siteAlertProcessingDuration: 0,
        batchesProcessed: 0,
      },
    };
  }

  // Process all providers in parallel
  const providerProcessingPromises = providers.map(provider =>
    processProviderGeoEvents(provider),
  );

  const results = await Promise.allSettled(providerProcessingPromises);

  // Aggregate results from all providers
  let totalGeoEvents = 0;
  let totalNewGeoEvents = 0;
  let totalSiteAlerts = 0;
  let geoEventProcessingDuration = 0;
  let siteAlertProcessingDuration = 0;
  let batchesProcessed = 0;
  const serviceErrors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      totalGeoEvents += result.value.geoEventsFetched;
      totalNewGeoEvents += result.value.newGeoEventsCreated;
      totalSiteAlerts += result.value.siteAlertsCreated;
      geoEventProcessingDuration += result.value.geoEventProcessingDuration;
      siteAlertProcessingDuration += result.value.siteAlertProcessingDuration;
      batchesProcessed += result.value.batchesProcessed;

      // Collect errors from successful provider processing
      if (result.value.errors.length > 0) {
        serviceErrors.push(
          ...result.value.errors.map(
            err => `${providers[index]?.clientId}: ${err}`,
          ),
        );
      }
    } else {
      const errorMessage =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      logger(
        `Provider ${providers[index]?.clientId} processing failed: ${errorMessage}`,
        'error',
      );
      serviceErrors.push(`${providers[index]?.clientId}: ${errorMessage}`);
    }
  });

  const executionDuration = Date.now() - startTime;

  logger(
    `Geo Event Fetcher completed in ${executionDuration}ms. Processed ${providers.length} providers, ${totalGeoEvents} events, created ${totalSiteAlerts} alerts`,
    'info',
  );

  if (serviceErrors.length > 0) {
    logger(
      `Encountered ${serviceErrors.length} service errors during processing`,
      'warn',
    );
  }

  return {
    totalProviders: providers.length,
    totalGeoEvents,
    totalNewGeoEvents,
    totalSiteAlerts,
    executionDuration,
    serviceErrors,
    processingDetails: {
      geoEventProcessingDuration,
      siteAlertProcessingDuration,
      batchesProcessed,
    },
  };
}

/**
 * Formats the API response with backward compatibility
 * @param processingResult - The processing result with metrics
 * @returns Formatted API response
 */
function formatResponse(processingResult: ProcessingResult): ApiResponse {
  return {
    message: 'Geo-event-fetcher Cron job executed successfully',
    alertsCreated: processingResult.totalSiteAlerts,
    processedProviders: processingResult.totalProviders,
    status: 200,
    metrics: processingResult,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main CRON job handler for fetching and processing geo-events
 * Endpoint: GET /api/cron/geo-event-fetcher
 */
export default async function geoEventFetcher(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    // Authenticate request
    if (!authenticateRequest(req)) {
      res.status(403).json({message: 'Unauthorized Invalid Cron Key'});
      return;
    }

    // Parse and validate query parameters
    const {limit: providerLimit} = parseQueryParameters(req);

    // Select active providers
    const selectedProviders = await selectActiveProviders(providerLimit);

    // Orchestrate geo-event processing
    const processingResult = await orchestrateGeoEventProcessing(
      selectedProviders,
    );

    // Format and return response
    const response = formatResponse(processingResult);
    res.status(200).json(response);
  } catch (error) {
    logger(
      `Geo Event Fetcher failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
    res.status(500).json({
      message: 'Geo-event-fetcher Cron job failed',
      error: error instanceof Error ? error.message : String(error),
      status: 500,
    });
  }
}
