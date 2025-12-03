import {TRPCError} from '@trpc/server';
import {
  getIncidentSchema,
  getActiveIncidentsSchema,
  getIncidentHistorySchema,
  updateIncidentReviewStatusSchema,
  closeIncidentSchema,
} from '../zodSchemas/siteIncident.schema';
import {createTRPCRouter, protectedProcedure} from '../trpc';
import {siteIncidentService} from '../../../Services/SiteIncident/SiteIncidentService';
import {getIncidentById} from '../../../repositories/siteIncident';
import {checkUserHasSitePermission} from '../../../utils/routers/site';

export const siteIncidentRouter = createTRPCRouter({
  /**
   * Get a single incident by ID
   */
  getIncident: protectedProcedure
    .input(getIncidentSchema)
    .query(async ({ctx, input}) => {
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
        userId: ctx.user!.id,
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
