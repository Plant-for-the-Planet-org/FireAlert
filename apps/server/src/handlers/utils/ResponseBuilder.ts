import {ProcessingResult} from '../../domain/ProcessingResult';

/**
 * Utility for building consistent API responses.
 */
export class ResponseBuilder {
  /**
   * Builds a success response with processing results.
   * @param result - The ProcessingResult containing metrics
   * @returns Response object with success message and metrics
   */
  static success(result: ProcessingResult): {
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
  static unauthorized(): {
    message: string;
    status: number;
  } {
    return {
      message: 'Unauthorized Invalid Cron Key',
      status: 403,
    };
  }
}
