/**
 * Response Header Middleware for tRPC
 *
 * This middleware adds version information to all API response headers:
 * - X-API-Version: Current CalVer version of the API
 *
 * This allows clients to verify which API version they're communicating with
 * and helps with debugging version-related issues.
 *
 * Requirements: 3.2, 7.4
 */

import {VERSION_CONFIG} from '../../../config/version';
import {logger} from '../../logger';

/**
 * Response header middleware
 *
 * Adds the X-API-Version header to all API responses with the current CalVer version.
 * This middleware runs for all requests and does not perform any validation or blocking.
 *
 * The header is added before the request is processed, ensuring it's present even
 * if the request fails or is rejected by other middleware.
 */
export const responseHeaderMiddleware = async ({ctx, next}: any) => {
  // Add API version header to response
  ctx.res.setHeader('X-API-Version', VERSION_CONFIG.CALVER);

  logger(`Added X-API-Version header: ${VERSION_CONFIG.CALVER}`, 'info');

  // Continue to next middleware/procedure
  return next({
    ctx,
  });
};
