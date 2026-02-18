import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {
  type NotificationQueueItem,
  type IncidentNotificationMetadata,
} from '../../Interfaces/SiteIncidentNotifications';
import {NotificationStatus, type SiteIncident} from '@prisma/client';
import {isSiteIncidentMethod} from './NotificationRoutingConfig';

export class CreateIncidentNotifications {
  static async run(): Promise<number> {
    const instance = new CreateIncidentNotifications();
    return await instance.process();
  }

  async process(): Promise<number> {
    logger(
      'Starting CreateIncidentNotifications for SiteIncident methods (email, sms, whatsapp) only',
      'info',
    );

    // 1. Fetch unprocessed site incidents
    const incidents = await this.processUnprocessedIncidents();
    if (incidents.length === 0) {
      logger('No unprocessed incidents found.', 'info');
      return 0;
    }

    logger(`Found ${incidents.length} unprocessed incidents.`, 'info');

    // 2. Create notification queue
    const notificationQueue = await this.createNotificationQueue(incidents);

    if (notificationQueue.length === 0) {
      logger('No notifications to create from incidents.', 'info');
      // Mark incidents as processed even if no notifications were generated (e.g. no verified methods)
      await this.markIncidentsAsProcessed(incidents.map(i => i.id));
      return 0;
    }

    // 3. Persist notifications and update incidents
    await this.executeTransaction(
      notificationQueue,
      incidents.map(i => i.id),
    );

    logger(
      `Successfully created ${notificationQueue.length} notifications.`,
      'info',
    );
    logger(
      `CreateIncidentNotifications completed. Created ${notificationQueue.length} incident notifications (email, sms, whatsapp methods only)`,
      'info',
    );
    return notificationQueue.length;
  }

  // Fetch incidents that need notifications
  private async processUnprocessedIncidents() {
    const incidents = await prisma.siteIncident.findMany({
      where: {
        isProcessed: false,
      },
      include: {
        site: {
          include: {
            user: {
              include: {
                alertMethods: true,
              },
            },
            siteRelations: {
              include: {
                user: {
                  include: {
                    alertMethods: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 50,
    });
    return incidents;
  }

  private async createNotificationQueue(
    incidents: any[],
  ): Promise<NotificationQueueItem[]> {
    const queue: NotificationQueueItem[] = [];
    const methodCounters = new Map<string, Map<string, number>>();

    for (const incident of incidents) {
      const site = incident.site;
      if (!site) continue;

      const siteId = site.id;

      // Flatten all available alert methods
      let allAlertMethods: any[] = [];
      if (site.user && site.user.alertMethods) {
        allAlertMethods.push(...site.user.alertMethods);
      }
      if (site.siteRelations) {
        site.siteRelations.forEach((rel: any) => {
          if (rel.user && rel.user.alertMethods) {
            allAlertMethods.push(...rel.user.alertMethods);
          }
        });
      }

      // Filter Verified & Enabled & SiteIncident methods only
      const validMethods = allAlertMethods.filter(
        (m: any) =>
          m.isVerified && m.isEnabled && isSiteIncidentMethod(m.method),
      );

      if (validMethods.length === 0) continue;

      // Determine Notification Type
      const isStart = incident.isActive;
      const notificationStatus = isStart
        ? NotificationStatus.START_SCHEDULED
        : NotificationStatus.END_SCHEDULED;
      const metadataType = isStart ? 'INCIDENT_START' : 'INCIDENT_END';

      // Determine referencing SiteAlertId
      // For Start: startSiteAlertId
      // For End: endSiteAlertId ?? latestSiteAlertId
      const targetSiteAlertId = isStart
        ? incident.startSiteAlertId
        : incident.endSiteAlertId || incident.latestSiteAlertId;

      // Metadata Construction
      const metadata: IncidentNotificationMetadata = {
        type: metadataType,
        incidentId: incident.id,
        siteId: site.id,
        siteName: site.name || 'Unnamed Site',
      };

      if (!isStart) {
        if (incident.startedAt && incident.endedAt) {
          const duration = Math.round(
            (new Date(incident.endedAt).getTime() -
              new Date(incident.startedAt).getTime()) /
              60000,
          );
          metadata.durationMinutes = duration;
        }
      }

      // Add to Queue for each valid method
      for (const method of validMethods) {
        queue.push({
          siteIncidentId: incident.id,
          siteAlertId: targetSiteAlertId,
          siteId: site.id,
          alertMethod: method.method,
          destination: method.destination,
          notificationStatus: notificationStatus,
          metadata: metadata,
        });
      }
    }

    return queue;
  }

  private async markIncidentsAsProcessed(incidentIds: string[]) {
    if (incidentIds.length === 0) return;
    await prisma.siteIncident.updateMany({
      where: {id: {in: incidentIds}},
      data: {isProcessed: true},
    });
  }

  private async executeTransaction(
    queue: NotificationQueueItem[],
    processedIncidentIds: string[],
  ) {
    // Process in batches if queue is large? Transaction limit is high but good to be safe.
    // For now assuming 50 incidents * ~2-3 methods = 150 notifications. OK for one transaction.

    await prisma.$transaction(async tx => {
      // 1. Create Notifications
      // We use createMany for efficiency
      const notificationsData = queue.map(item => ({
        siteAlertId: item.siteAlertId,
        alertMethod: item.alertMethod,
        destination: item.destination,
        isDelivered: false,
        isSkipped: false,
        notificationStatus: item.notificationStatus,
        metadata: item.metadata as any, // Json type casting
      }));

      if (notificationsData.length > 0) {
        await tx.notification.createMany({
          data: notificationsData,
        });
      }

      // 2. Mark Incidents as processed
      if (processedIncidentIds.length > 0) {
        await tx.siteIncident.updateMany({
          where: {id: {in: processedIncidentIds}},
          data: {isProcessed: true},
        });
      }

      // 3. Update Site lastMessageCreated (Only for START notifications?)
      // The requirement says: "Update Site.lastMessageCreated".
      // Usually we do this to rate limit per site.
      // With Incidents, we rate limit by "One Incident per X hours".
      // But updating lastMessageCreated is still good practice for "Last time we bugged the user".
      const siteIdsToUpdate = [...new Set(queue.map(q => q.siteId))];
      if (siteIdsToUpdate.length > 0) {
        await tx.site.updateMany({
          where: {id: {in: siteIdsToUpdate}},
          data: {lastMessageCreated: new Date()},
        });
      }
    });
  }
}
