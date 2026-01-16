import {createTRPCRouter, protectedProcedure} from '../../trpc';
import {geoEventRouter} from '@/server/api/routers/dev/geo-event';
import {siteAlertRouter} from '@/server/api/routers/dev/site-alert';

/**
 * Development-only router that combines geo-event and site-alert functionality
 * Only available in development environment
 */
export const devRouter = createTRPCRouter({
  /**
   * Check if development APIs are available
   */
  isDevMode: protectedProcedure.query(async () => {
    return {
      isDevelopment: process.env.NODE_ENV === 'development',
      environment: process.env.NODE_ENV || 'unknown',
    };
  }),

  // Include geo-event routes
  geoEvent: geoEventRouter,

  // Include site-alert routes
  siteAlert: siteAlertRouter,
});
