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
   * Builds a success response with operation results.
   * @param result - The OperationResult containing metrics
   * @returns Response object with success message and metrics
   */
  static buildSuccess(result: OperationResult): {
    message: string;
    eventsProcessed: number;
    eventsCreated: number;
    alertsCreated: number;
    errors: string[];
    status: number;
  } {
    return {
      message: 'Geo-event-fetcher Cron job executed successfully',
      ...result.toJSON(),
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
