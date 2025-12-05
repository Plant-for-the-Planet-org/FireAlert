import {TRPCError} from '@trpc/server';
import {
  getIncidentSchema,
  getActiveIncidentsSchema,
  getIncidentHistorySchema,
  updateIncidentReviewStatusSchema,
  closeIncidentSchema,
  mockCreateIncidentNotificationsSchema,
  mockSendIncidentNotificationsSchema,
} from '../zodSchemas/siteIncident.schema';
import {createTRPCRouter, protectedProcedure, publicProcedure} from '../trpc';
import {siteIncidentService} from '../../../Services/SiteIncident/SiteIncidentService';
import {getIncidentById} from '../../../repositories/siteIncident';
import {checkUserHasSitePermission} from '../../../utils/routers/site';
import {logger} from '../../../server/logger';
import {createIncidentNotifications} from '../../../Services/SiteIncident/CreateIncidentNotifications';
import {sendIncidentNotifications} from '../../../Services/SiteIncident/SendIncidentNotifications';

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
        userId: ctx.user?.id,
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

  /**
   * Mock API to create incident notifications
   * For testing without CRON automation
   */
  mockCreateIncidentNotifications: protectedProcedure
    .input(mockCreateIncidentNotificationsSchema)
    .mutation(async ({ctx, input}) => {
      try {
        logger('Mock create incident notifications called', 'info');

        // Build filter conditions
        const whereConditions: {
          isProcessed: boolean;
          id?: string;
          siteId?: string;
          isActive?: boolean;
        } = {
          isProcessed: false,
        };

        if (input.incidentId) {
          whereConditions.id = input.incidentId;
        }

        if (input.siteId) {
          whereConditions.siteId = input.siteId;
        }

        if (input.notificationType) {
          whereConditions.isActive = input.notificationType === 'START';
        }

        // Get filtered incidents
        const incidents = await ctx.prisma.siteIncident.findMany({
          where: whereConditions,
          select: {
            id: true,
            siteId: true,
            isActive: true,
          },
        });

        const processedIncidentIds = incidents.map(i => i.id);

        // Call the create notifications service
        const notificationsCreated = await createIncidentNotifications();

        // Get method counts from created notifications
        const notifications = await ctx.prisma.notification.findMany({
          where: {
            metadata: {
              path: ['incidentId'],
              in: processedIncidentIds,
            },
          },
          select: {
            alertMethod: true,
          },
        });

        const methodCounts: Record<string, number> = {};
        notifications.forEach(n => {
          methodCounts[n.alertMethod] = (methodCounts[n.alertMethod] || 0) + 1;
        });

        return {
          success: true,
          notificationsCreated,
          processedIncidentIds,
          methodCounts,
          errors: [],
        };
      } catch (error) {
        logger(
          `Error in mockCreateIncidentNotifications: ${
            (error as Error)?.message
          }`,
          'error',
        );
        return {
          success: false,
          notificationsCreated: 0,
          processedIncidentIds: [],
          methodCounts: {},
          errors: [(error as Error)?.message || 'Unknown error'],
        };
      }
    }),

  /**
   * Mock API to send incident notifications
   * For testing without CRON automation
   */
  mockSendIncidentNotifications: protectedProcedure
    .input(mockSendIncidentNotificationsSchema)
    .mutation(async ({ctx, input}) => {
      try {
        logger('Mock send incident notifications called', 'info');

        // Build filter conditions for notifications
        const whereConditions: {
          isSkipped: boolean;
          isDelivered: boolean;
          sentAt: null;
          notificationStatus?: {in: string[]};
          metadata?: {
            path: string[];
            equals?: string;
            string_contains?: string;
          };
        } = {
          isSkipped: false,
          isDelivered: false,
          sentAt: null,
        };

        // Filter by notification type
        if (input.notificationType) {
          whereConditions.notificationStatus = {
            in:
              input.notificationType === 'START'
                ? ['START_SCHEDULED']
                : ['END_SCHEDULED'],
          };
        } else {
          whereConditions.notificationStatus = {
            in: ['START_SCHEDULED', 'END_SCHEDULED'],
          };
        }

        // Filter by incident ID or site ID
        if (input.incidentId) {
          whereConditions.metadata = {
            path: ['incidentId'],
            equals: input.incidentId,
          };
        } else if (input.siteId) {
          whereConditions.metadata = {
            path: ['siteId'],
            equals: input.siteId,
          };
        }

        // Get notifications before sending
        const notificationsBefore = await ctx.prisma.notification.findMany({
          where: whereConditions,
          select: {
            id: true,
            metadata: true,
            alertMethod: true,
          },
        });

        const notificationCount = notificationsBefore.length;

        // Call the send notifications service
        const notificationsSent = await sendIncidentNotifications({
          req: ctx.req,
        });

        // Get processed incident IDs
        const processedIncidentIds = Array.from(
          new Set(
            notificationsBefore
              .map(n => {
                const metadata = n.metadata as {incidentId?: string};
                return metadata?.incidentId;
              })
              .filter((id): id is string => id !== undefined),
          ),
        );

        // Get failure stats
        const failedNotifications = await ctx.prisma.notification.findMany({
          where: {
            id: {in: notificationsBefore.map(n => n.id)},
            isSkipped: true,
          },
          select: {
            alertMethod: true,
          },
        });

        const failureStats: Record<string, number> = {};
        failedNotifications.forEach(n => {
          failureStats[n.alertMethod] = (failureStats[n.alertMethod] || 0) + 1;
        });

        const notificationsFailed = failedNotifications.length;

        return {
          success: true,
          notificationsSent,
          notificationsFailed,
          processedIncidentIds,
          failureStats,
          errors: [],
        };
      } catch (error) {
        logger(
          `Error in mockSendIncidentNotifications: ${
            (error as Error)?.message
          }`,
          'error',
        );
        return {
          success: false,
          notificationsSent: 0,
          notificationsFailed: 0,
          processedIncidentIds: [],
          failureStats: {},
          errors: [(error as Error)?.message || 'Unknown error'],
        };
      }
    }),
});
