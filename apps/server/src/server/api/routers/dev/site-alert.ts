import {TRPCError} from '@trpc/server';
import {createTRPCRouter, protectedProcedure} from '../../trpc';
import {SiteAlertService} from '../../../Services/dev/SiteAlertService';
import {logger} from '../../../../server/logger';
import {z} from 'zod';
import {idSchema} from '../zodSchemas/alert.schema';

const createSiteAlertSchema = z.object({
  siteId: idSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  eventDate: z.string().datetime().optional(),
  geoEventProviderId: idSchema.optional(),
});

const createBulkSiteAlertsSchema = createSiteAlertSchema.extend({
  count: z.number().min(1).max(50).default(5),
  radiusKm: z.number().min(0.1).max(10).default(1),
});

/**
 * SiteAlert development router
 * Only available in development environment
 */
export const siteAlertRouter = createTRPCRouter({
  /**
   * Create a test SiteAlert (dev only)
   */
  create: protectedProcedure
    .input(createSiteAlertSchema)
    .mutation(async ({ctx, input}) => {
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Test data generation is only available in development mode',
        });
      }

      try {
        const siteAlertService = new SiteAlertService(ctx.prisma);

        const siteAlert = await siteAlertService.createTestSiteAlert({
          siteId: input.siteId,
          latitude: input.latitude,
          longitude: input.longitude,
          eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
          geoEventProviderId: input.geoEventProviderId,
        });

        return {
          status: 'success',
          data: siteAlert,
        };
      } catch (error) {
        logger(
          `Dev API error in createSiteAlert: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'error',
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create test SiteAlert',
        });
      }
    }),

  /**
   * Create multiple test SiteAlerts in an area (dev only)
   */
  createBulk: protectedProcedure
    .input(createBulkSiteAlertsSchema)
    .mutation(async ({ctx, input}) => {
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Test data generation is only available in development mode',
        });
      }

      try {
        const siteAlertService = new SiteAlertService(ctx.prisma);
        const results = await siteAlertService.createBulkSiteAlerts({
          siteId: input.siteId,
          latitude: input.latitude,
          longitude: input.longitude,
          eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
          geoEventProviderId: input.geoEventProviderId,
          count: input.count,
          radiusKm: input.radiusKm,
        });

        return {
          status: 'success',
          data: {
            created: results.length,
            events: results,
          },
        };
      } catch (error) {
        logger(
          `Dev API error in createBulkSiteAlerts: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'error',
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create bulk test data',
        });
      }
    }),

  /**
   * Get user's sites for testing (dev only)
   */
  getUserSites: protectedProcedure.query(async ({ctx}) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Test data generation is only available in development mode',
      });
    }

    try {
      const siteAlertService = new SiteAlertService(ctx.prisma);
      const sites = await siteAlertService.getUserSites(ctx.user?.id || '');

      return {
        status: 'success',
        data: sites,
      };
    } catch (error) {
      logger(
        `Dev API error in getUserSites: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user sites',
      });
    }
  }),
});
