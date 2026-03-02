import {TRPCError} from '@trpc/server';
import {
  getIncidentSchema,
  getActiveIncidentsSchema,
  getIncidentHistorySchema,
  updateIncidentReviewStatusSchema,
  closeIncidentSchema,
} from '../zodSchemas/siteIncident.schema';
import {createTRPCRouter, protectedProcedure, publicProcedure} from '../trpc';
import {SiteIncidentService} from '../../../Services/SiteIncident/SiteIncidentService';
import {SiteIncidentRepository} from '../../../Services/SiteIncident/SiteIncidentRepository';
import {IncidentResolver} from '../../../Services/SiteIncident/IncidentResolver';
import {getIncidentById} from '../../../repositories/siteIncident';
import {checkUserHasSitePermission} from '../../../utils/routers/site';
import {prisma} from '../../../server/db';
// Initialize services
const siteIncidentRepository = new SiteIncidentRepository(prisma);
const incidentResolver = new IncidentResolver(siteIncidentRepository);
const siteIncidentService = new SiteIncidentService(
  siteIncidentRepository,
  incidentResolver,
  6, // Default 6 hours inactivity threshold
);

export const siteIncidentRouter = createTRPCRouter({
  /**
   * Get a single incident by ID (public endpoint for sharing)
   */
  getIncidentPublic: publicProcedure
    .input(getIncidentSchema)
    .query(async ({ctx, input}) => {
      try {
        const incident = await ctx.prisma.siteIncident.findUnique({
          where: {id: input.incidentId},
          include: {
            site: {
              select: {
                id: true,
                name: true,
                geometry: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            startSiteAlert: {
              select: {
                id: true,
                eventDate: true,
                latitude: true,
                longitude: true,
                detectedBy: true,
                confidence: true,
              },
            },
            latestSiteAlert: {
              select: {
                id: true,
                eventDate: true,
                latitude: true,
                longitude: true,
                detectedBy: true,
                confidence: true,
              },
            },
            siteAlerts: {
              select: {
                id: true,
                eventDate: true,
                latitude: true,
                longitude: true,
                detectedBy: true,
                confidence: true,
              },
              orderBy: {
                eventDate: 'asc',
              },
            },
          },
        });

        if (!incident) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Incident not found',
          });
        }

        return {
          status: 'success',
          data: incident,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong!',
        });
      }
    }),

  /**
   * Get a single incident by ID (protected endpoint)
   */
  getIncident: protectedProcedure
    .input(getIncidentSchema)
    .query(async ({ctx, input}) => {
      try {
        // logger(`getIncident `, 'debug');
        const incident = await getIncidentById(input.incidentId);

        if (!incident) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Incident not found',
          });
        }

        // Check user has permission to view this site
        await checkUserHasSitePermission({
          ctx,
          siteId: incident.siteId,
          userId: ctx.user!.id,
        });

        return incident;
      } catch (error) {
        console.error('Error in getIncident:', error);
        throw error;
      }
    }),

  /**
   * Get all active incidents for a site
   */
  getActiveIncidents: protectedProcedure
    .input(getActiveIncidentsSchema)
    .query(async ({ctx, input}) => {
      // Check user has permission to view this site
      await checkUserHasSitePermission({
        ctx,
        siteId: input.siteId,
        userId: ctx.user!.id,
      });

      const incident = await siteIncidentService.getActiveIncidentForSite(
        input.siteId,
      );

      return incident ? [incident] : [];
    }),

  /**
   * Get incident history for a site within a date range
   */
  getIncidentHistory: protectedProcedure
    .input(getIncidentHistorySchema)
    .query(async ({ctx, input}) => {
      // Check user has permission to view this site
      await checkUserHasSitePermission({
        ctx,
        siteId: input.siteId,
        userId: ctx.user!.id,
      });

      const incidents = await siteIncidentService.getIncidentsByDateRange(
        input.siteId,
        input.startDate,
        input.endDate,
      );

      return incidents;
    }),

  /**
   * Update the review status of an incident
   */
  updateIncidentReviewStatus: protectedProcedure
    .input(updateIncidentReviewStatusSchema)
    .mutation(async ({ctx, input}) => {
      // Get the incident to check permissions
      const incident = await getIncidentById(input.incidentId);

      if (!incident) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Incident not found',
        });
      }

      // Check user has permission to modify this site
      await checkUserHasSitePermission({
        ctx,
        siteId: incident.siteId,
        userId: ctx.user!.id,
      });

      const updatedIncident = await siteIncidentService.updateReviewStatus(
        input.incidentId,
        input.status,
      );

      return updatedIncident;
    }),

  /**
   * Manually close an incident (admin operation)
   */
  closeIncident: protectedProcedure
    .input(closeIncidentSchema)
    .mutation(async ({ctx, input}) => {
      // Get the incident to check permissions
      const incident = await getIncidentById(input.incidentId);

      if (!incident) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Incident not found',
        });
      }

      // Check user has permission to modify this site
      await checkUserHasSitePermission({
        ctx,
        siteId: incident.siteId,
        userId: ctx.user?.id as string,
      });

      if (!incident.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Incident is already closed',
        });
      }

      // Close the incident
      const closedIncident = await ctx.prisma.siteIncident.update({
        where: {id: input.incidentId},
        data: {
          isActive: false,
          isProcessed: false,
          endedAt: new Date(),
        },
      });

      return closedIncident;
    }),
});
