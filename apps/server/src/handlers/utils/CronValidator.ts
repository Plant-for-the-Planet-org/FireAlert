import {type NextApiRequest} from 'next';
import {env} from '../../env.mjs';

/**
 * Utility for validating cron job requests using CRON_KEY.
 */
export class CronValidator {
  /**
   * Validates that the request contains a valid cron key.
   * @param req - The Next.js API request object
   * @returns True if the request is authorized, false otherwise
   */
  static validate(req: NextApiRequest): boolean {
    // If no CRON_KEY is configured, allow all requests
    if (!env.CRON_KEY) {
      return true;
    }

    const cronKey = req.query['cron_key'];
    return cronKey === env.CRON_KEY;
  }
}
