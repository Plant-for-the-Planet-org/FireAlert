import {type NextApiRequest} from 'next';
import {env} from '../env.mjs';
import {OperationResult} from './OperationResult';

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
    return cronKey === env.CRON_KEY;
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
   * Builds a success response with operation results and detailed metrics.
   * @param result - The OperationResult containing metrics
   * @returns Response object with success message and detailed metrics breakdown
   */
  static buildSuccess(result: OperationResult): {
    message: string;
    eventsProcessed: number;
    eventsCreated: number;
    alertsCreated: number;
    errors: string[];
    metrics?: {
      total_duration_ms?: number;
      provider_processing?: any;
      avg_chunk_duration_ms?: number;
      slowest_chunk_ms?: number;
      memory_usage?: {
        start_mb?: number;
        end_mb?: number;
      };
      [key: string]: any;
    };
    status: number;
  } {
    const response = {
      message: 'Geo-event-fetcher Cron job executed successfully',
      ...result.toJSON(),
      status: 200,
    };

    // Enhance metrics formatting for better readability
    const metrics = result.getMetrics();
    if (metrics && !metrics.isEmpty()) {
      const metricsData = metrics.getMetrics() as any;

      // Format the metrics for better API response structure
      const formattedMetrics: any = {};

      // Extract key timing metrics
      if (metricsData.total_processing_ms) {
        formattedMetrics.total_duration_ms = metricsData.total_processing_ms;
      }

      if (metricsData.provider_processing) {
        formattedMetrics.provider_processing = metricsData.provider_processing;
      }

      if (metricsData.avg_chunk_duration_ms) {
        formattedMetrics.avg_chunk_duration_ms =
          metricsData.avg_chunk_duration_ms;
      }

      if (metricsData.slowest_chunk_ms) {
        formattedMetrics.slowest_chunk_ms = metricsData.slowest_chunk_ms;
      }

      // Format memory usage
      if (metricsData.start_memory_mb || metricsData.end_memory_mb) {
        formattedMetrics.memory_usage = {};
        if (metricsData.start_memory_mb) {
          formattedMetrics.memory_usage.start_mb = metricsData.start_memory_mb;
        }
        if (metricsData.end_memory_mb) {
          formattedMetrics.memory_usage.end_mb = metricsData.end_memory_mb;
        }
      }

      // Include providers processed count
      if (metricsData.providers_processed) {
        formattedMetrics.providers_processed = metricsData.providers_processed;
      }

      // Add any other metrics that don't fit the above categories
      Object.keys(metricsData).forEach(key => {
        if (
          ![
            'total_processing_ms',
            'provider_processing',
            'avg_chunk_duration_ms',
            'slowest_chunk_ms',
            'start_memory_mb',
            'end_memory_mb',
            'providers_processed',
          ].includes(key)
        ) {
          formattedMetrics[key] = metricsData[key];
        }
      });

      response.metrics = formattedMetrics;
    }

    return response;
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
