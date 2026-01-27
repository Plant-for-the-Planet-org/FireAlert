import {type NextApiRequest} from 'next';
import {env} from '../env.mjs';
import {type OperationResult} from './OperationResult';
import {logger} from '../server/logger';

/**
 * Type definitions for metrics data structure
 */
interface ProviderMetrics {
  provider_start_memory_mb?: number;
  fetch_events_ms?: number;
  prefetch_existing_ids_ms?: number;
  chunk_processing_ms?: number;
  chunks_processed?: number;
  prefetch_duration_ms?: number;
  existing_ids_prefetched?: number;
  alert_creation_ms?: number;
  db_update_ms?: number;
  provider_total_ms?: number;
  provider_end_memory_mb?: number;
  chunk_durations?: number[];
}

interface MetricsData {
  total_processing_ms?: number;
  providers_processed?: number;
  avg_chunk_duration_ms?: number;
  slowest_chunk_ms?: number;
  start_memory_mb?: number;
  end_memory_mb?: number;
  provider_processing?: Record<string, ProviderMetrics>;
  [key: string]: unknown;
}

/**
 * Type guard to check if an object has the expected metrics structure
 */
function isMetricsData(obj: unknown): obj is MetricsData {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Safely gets a numeric value from metrics data
 */
function getNumericValue(data: MetricsData, key: keyof MetricsData): number | undefined {
  const value = data[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safely gets a string or number value for display
 */
function getDisplayValue(value: unknown): string | number {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return 'N/A';
}

/**
 * Consolidated utility for handling HTTP requests and responses.
 * Provides validation, parsing, and response building functionality.
 */
export class RequestHandler {
  /**
   * Validates that the request contains a valid cron key.
   * @param req - The Next.js API request object
   * @returns True if the request is authorized, false otherwise
   */
  static validateCron(req: NextApiRequest): boolean {
    // If no CRON_KEY is configured, allow all requests
    if (!env.CRON_KEY) {
      return true;
    }

    const cronKey = req.query['cron_key'];
    // return cronKey === env.CRON_KEY;
    // Handle both string and array cases  
    const keyValue = Array.isArray(cronKey) ? cronKey[0] : cronKey;  
    return keyValue === env.CRON_KEY;  
  }

  /**
   * Parses the 'limit' query parameter with validation.
   * @param req - The Next.js API request object
   * @returns The parsed limit value (default: 2, max: 7)
   */
  static parseLimit(req: NextApiRequest): number {
    const rawLimit = req.query['limit'];

    // Default to 2 if not provided
    if (typeof rawLimit !== 'string') {
      return 2;
    }

    const parsed = parseInt(rawLimit, 10);

    // Return max of 7 if invalid or exceeds limit
    if (isNaN(parsed) || parsed > 7) {
      return 7;
    }

    return parsed;
  }

  /**
   * Builds a success response matching legacy format.
   * Logs all metrics information to terminal/BetterStack instead of including in response.
   * @param result - The OperationResult containing metrics
   * @returns Simple response object matching legacy format
   */
  static buildSuccess(result: OperationResult): {
    message: string;
    alertsCreated: number;
    processedProviders: number;
    status: number;
  } {
    const resultData = result.toJSON();
    
    // Log all metrics information to terminal/BetterStack
    const metrics = result.getMetrics();
    let metricsData: MetricsData = {};
    
    if (metrics && !metrics.isEmpty()) {
      const rawMetrics = metrics.getMetrics();
      if (isMetricsData(rawMetrics)) {
        metricsData = rawMetrics;
        
        // Log comprehensive metrics information in consolidated format
        const totalDuration = getNumericValue(metricsData, 'total_processing_ms');
        const providersProcessed = getNumericValue(metricsData, 'providers_processed');
        // const avgChunkDuration = getNumericValue(metricsData, 'avg_chunk_duration_ms');
        // const slowestChunk = getNumericValue(metricsData, 'slowest_chunk_ms');
        const startMemory = getNumericValue(metricsData, 'start_memory_mb');
        const endMemory = getNumericValue(metricsData, 'end_memory_mb');
        
        // Single line summary
        logger(
          `GEO-EVENT-FETCHER SUMMARY: Events Processed: ${resultData.eventsProcessed}, Created: ${resultData.eventsCreated}, Alerts: ${resultData.alertsCreated}, Duration: ${totalDuration || 'N/A'}ms, Providers: ${providersProcessed || 0}, Memory: ${getDisplayValue(startMemory)}MB → ${getDisplayValue(endMemory)}MB`,
          'debug',
        );
        
        // Log provider-specific metrics (one line per provider)
        if (metricsData.provider_processing) {
          Object.entries(metricsData.provider_processing).forEach(([providerId, providerMetrics]) => {
            logger(
              `Provider ${providerId}: Fetch: ${providerMetrics.fetch_events_ms || 'N/A'}ms, Processing: ${providerMetrics.chunk_processing_ms || 'N/A'}ms, Alerts: ${providerMetrics.alert_creation_ms || 'N/A'}ms, Total: ${providerMetrics.provider_total_ms || 'N/A'}ms, Chunks: ${providerMetrics.chunks_processed || 0}`,
              'debug',
            );
          });
        }
      }
    }

    // Return simple response matching legacy format
    return {
      message: 'Geo-event-fetcher Cron job executed successfully',
      alertsCreated: resultData.alertsCreated,
      processedProviders: getNumericValue(metricsData, 'providers_processed') || 0,
      status: 200,
    };
  }

  /**
   * Builds an unauthorized response.
   * @returns Response object with 403 status
   */
  static buildUnauthorized(): {
    message: string;
    status: number;
  } {
    return {
      message: 'Unauthorized Invalid Cron Key',
      status: 403,
    };
  }
}
