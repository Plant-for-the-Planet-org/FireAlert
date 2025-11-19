import {type NextApiRequest} from 'next';

/**
 * Utility for parsing and validating request parameters.
 */
export class RequestParser {
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
}
