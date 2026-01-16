import {TRPCError} from '@trpc/server';
import {createTRPCRouter, protectedProcedure} from '@/server/api/trpc';
import {GeoEventService} from '@/Services/dev/GeoEventService';
import {logger} from '@/server/logger';
import {z} from 'zod';
import {idSchema} from '@/server/api/zodSchemas/alert.schema';

const createGeoEventSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  eventDate: z.string().datetime().optional(),
  geoEventProviderId: idSchema.optional(),
});

/**
 * GeoEvent development router
 * Only available in development environment
 */
export const geoEventRouter = createTRPCRouter({
  /**
   * Create a test GeoEvent (dev only)
   */
  create: protectedProcedure
    .input(createGeoEventSchema)
    .mutation(async ({ctx, input}) => {
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Test data generation is only available in development mode',
        });
      }

      try {
        const geoEventService = new GeoEventService(ctx.prisma);

        const geoEvent = await geoEventService.createTestGeoEvent({
          latitude: input.latitude,
          longitude: input.longitude,
          eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
          geoEventProviderId: input.geoEventProviderId,
        });

        return {
          status: 'success',
          data: geoEvent,
        };
      } catch (error) {
        logger(
          `Dev API error in createGeoEvent: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'error',
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create test GeoEvent',
        });
      }
    }),

  /**
   * Get available GeoEvent providers (dev only)
   */
  getProviders: protectedProcedure.query(async ({ctx}) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Test data generation is only available in development mode',
      });
    }

    try {
      const geoEventService = new GeoEventService(ctx.prisma);
      const providers = await geoEventService.getAvailableProviders();

      return {
        status: 'success',
        data: providers,
      };
    } catch (error) {
      logger(
        `Dev API error in getProviders: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch providers',
      });
    }
  }),
});
