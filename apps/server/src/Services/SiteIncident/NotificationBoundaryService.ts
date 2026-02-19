import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {TRPCError} from '@trpc/server';
import type {
  SiteIncident,
  SiteAlert,
  Notification,
  Prisma,
} from '@prisma/client';

/**
 * Metadata structure for incident notifications
 */
interface IncidentNotificationMetadata {
  type: 'INCIDENT_START' | 'INCIDENT_END';
  incidentId: string;
  siteId: string;
  siteName: string;
  detectionCount?: number;
  durationMinutes?: number;
}

/**
 * Service for managing notifications at incident boundaries (start/end)
 */
export class NotificationBoundaryService {
  /**
   * Creates a START notification for a new incident
   *
   * @param incident - The SiteIncident that was created
   * @param siteAlert - The first SiteAlert that triggered the incident
   * @returns The created Notification
   */
  async createStartNotification(
    incident: SiteIncident,
    siteAlert: SiteAlert,
  ): Promise<Notification> {
    try {
      // Get site information
      const site = await prisma.site.findUnique({
        where: {id: incident.siteId},
        select: {name: true},
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Site with id ${incident.siteId} not found`,
        });
      }

      // Get user's alert methods
      const alertMethods = await prisma.alertMethod.findMany({
        where: {
          user: {
            sites: {
              some: {
                id: incident.siteId,
              },
            },
          },
          isEnabled: true,
          isVerified: true,
          deletedAt: null,
        },
      });

      if (alertMethods.length === 0) {
        logger(
          `No enabled alert methods found for site ${incident.siteId}`,
          'warn',
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No enabled alert methods found',
        });
      }

      // Create metadata
      const metadata: IncidentNotificationMetadata = {
        type: 'INCIDENT_START',
        incidentId: incident.id,
        siteId: incident.siteId,
        siteName: site.name || 'Unknown Site',
      };

      const firstMethod = alertMethods[0];
      if (!firstMethod) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Alert method not found',
        });
      }

      // Create notification for the first alert method
      // In a real implementation, you'd create one for each method
      const notification = await prisma.notification.create({
        data: {
          siteAlertId: siteAlert.id,
          alertMethod: firstMethod.method,
          destination: firstMethod.destination,
          metadata: metadata as unknown as Prisma.InputJsonValue,
          isDelivered: false,
          isSkipped: false,
        },
      });

      logger(
        `Created START notification ${notification.id} for incident ${incident.id}`,
        'info',
      );

      return notification;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger(
        `Failed to create start notification for incident ${
          incident.id
        }: ${String(error)}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create start notification',
        cause: error,
      });
    }
  }

  /**
   * Creates an END notification for a closed incident
   *
   * @param incident - The SiteIncident that was closed
   * @returns The created Notification
   */
  async createEndNotification(incident: SiteIncident): Promise<Notification> {
    try {
      // Get site information
      const site = await prisma.site.findUnique({
        where: {id: incident.siteId},
        select: {name: true},
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Site with id ${incident.siteId} not found`,
        });
      }

      // Get the end alert
      const endAlert = await prisma.siteAlert.findUnique({
        where: {id: incident.endSiteAlertId || incident.latestSiteAlertId},
      });

      if (!endAlert) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End alert not found for incident',
        });
      }

      // Count alerts in this incident
      const alertCount = await prisma.siteAlert.count({
        where: {siteIncidentId: incident.id},
      });

      // Calculate duration
      const durationMs = incident.endedAt
        ? incident.endedAt.getTime() - incident.startedAt.getTime()
        : 0;
      const durationMinutes = Math.floor(durationMs / 60000);

      // Get user's alert methods
      const alertMethods = await prisma.alertMethod.findMany({
        where: {
          user: {
            sites: {
              some: {
                id: incident.siteId,
              },
            },
          },
          isEnabled: true,
          isVerified: true,
          deletedAt: null,
        },
      });

      if (alertMethods.length === 0) {
        logger(
          `No enabled alert methods found for site ${incident.siteId}`,
          'warn',
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No enabled alert methods found',
        });
      }

      // Create metadata
      const metadata: IncidentNotificationMetadata = {
        type: 'INCIDENT_END',
        incidentId: incident.id,
        siteId: incident.siteId,
        siteName: site.name || 'Unknown Site',
        detectionCount: alertCount,
        durationMinutes,
      };

      const firstMethod = alertMethods[0];
      if (!firstMethod) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Alert method not found',
        });
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          siteAlertId: endAlert.id,
          alertMethod: firstMethod.method,
          destination: firstMethod.destination,
          metadata: metadata as unknown as Prisma.InputJsonValue,
          isDelivered: false,
          isSkipped: false,
        },
      });

      logger(
        `Created END notification ${notification.id} for incident ${incident.id}`,
        'info',
      );

      return notification;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger(
        `Failed to create end notification for incident ${
          incident.id
        }: ${String(error)}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create end notification',
        cause: error,
      });
    }
  }

  /**
   * Records that a notification was sent for an incident
   *
   * @param incidentId - The ID of the incident
   * @param notificationType - Whether this is a START or END notification
   * @param notificationId - The ID of the notification that was sent
   */
  async recordNotificationSent(
    incidentId: string,
    notificationType: 'START' | 'END',
    notificationId: string,
  ): Promise<void> {
    try {
      const updateData =
        notificationType === 'START'
          ? {startNotificationId: notificationId, isProcessed: true}
          : {endNotificationId: notificationId, isProcessed: true};

      await prisma.siteIncident.update({
        where: {id: incidentId},
        data: updateData,
      });

      logger(
        `Recorded ${notificationType} notification ${notificationId} for incident ${incidentId}`,
        'info',
      );
    } catch (error) {
      logger(
        `Failed to record notification for incident ${incidentId}: ${String(
          error,
        )}`,
        'error',
      );
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to record notification',
        cause: error,
      });
    }
  }
}

export const notificationBoundaryService = new NotificationBoundaryService();
