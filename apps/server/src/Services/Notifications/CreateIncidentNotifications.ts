import {NotificationStatus, type Prisma} from '@prisma/client';
import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {
  type IncidentNotificationMetadata,
  type NotificationQueueItem,
} from '../../Interfaces/SiteIncidentNotifications';
import {
  NotificationStatus,
  SiteIncidentReviewStatus,
  type SiteIncident,
} from '@prisma/client';
import {isSiteIncidentMethod} from './NotificationRoutingConfig';

type IncidentWithRelations = Prisma.SiteIncidentGetPayload<{
  include: {
    site: {
      include: {
        user: {
          include: {
            alertMethods: true;
          };
        };
        siteRelations: {
          include: {
            user: {
              include: {
                alertMethods: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type AlertMethodRecord = {
  method: string;
  destination: string;
  isEnabled: boolean;
  isVerified: boolean;
};

export class CreateIncidentNotifications {
  static async run(): Promise<number> {
    const instance = new CreateIncidentNotifications();
    return await instance.process();
  }

  async process(): Promise<number> {
    const BATCH_SIZE = 50;
    let totalNotificationsCreated = 0;
    let totalIncidentsProcessed = 0;
    let batchNumber = 0;
    const skippedByMethod: Record<string, number> = {
      email: 0,
      sms: 0,
      whatsapp: 0,
    };

    // Process all unprocessed incidents in batches
    while (true) {
      batchNumber++;

      // 1. Fetch batch of unprocessed incidents
      const incidents = await this.processUnprocessedIncidents(BATCH_SIZE);

      if (incidents.length === 0) {
        break;
      }

      totalIncidentsProcessed += incidents.length;

      // 2. Create notification queue for this batch
      const notificationQueue = await this.createNotificationQueue(
        incidents,
        skippedByMethod,
      );

      if (notificationQueue.length === 0) {
        // Mark incidents as processed even if no notifications were generated
        await this.markIncidentsAsProcessed(incidents.map(i => i.id));
        continue;
      }

      // 3. Persist notifications and update incidents
      await this.executeTransaction(
        notificationQueue,
        incidents.map(i => i.id),
      );

      totalNotificationsCreated += notificationQueue.length;
    }

    logger(
      `CreateIncidentNotifications: Processed ${totalIncidentsProcessed} incidents in ${batchNumber} batches, Created ${totalNotificationsCreated} notifications (email, sms, whatsapp methods only)`,
      'info',
    );
    const totalSkipped =
      skippedByMethod.email + skippedByMethod.sms + skippedByMethod.whatsapp;
    logger(
      `CreateIncidentNotifications: Skipped ${totalSkipped} notifications due to STOP_ALERTS (email=${skippedByMethod.email}, sms=${skippedByMethod.sms}, whatsapp=${skippedByMethod.whatsapp})`,
      'info',
    );

    return totalNotificationsCreated;
  }

  // Fetch incidents that need notifications
  // TODO: Revisit this logic - currently only processes incidents updated in last 6 hours
  // Consider: Should we process all unprocessed incidents regardless of age?
  // Or should the 6-hour window be configurable via environment variable?
  private async processUnprocessedIncidents(batchSize: number) {
    const SIX_HOURS_AGO = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const incidents = await prisma.siteIncident.findMany({
      where: {
        isProcessed: false,
        updatedAt: {
          gte: SIX_HOURS_AGO,
        },
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
      take: batchSize,
    });
  }

  private async createNotificationQueue(
    incidents: any[],
    skippedByMethod: Record<string, number>,
  ): Promise<NotificationQueueItem[]> {
    const queue: NotificationQueueItem[] = [];

    for (const incident of incidents) {
      const ownerMethods = incident.site.user?.alertMethods ?? [];
      const relatedMethods = incident.site.siteRelations.flatMap(
        relation => relation.user.alertMethods,
      );
      const validMethods = [...ownerMethods, ...relatedMethods].filter(
        (method): method is AlertMethodRecord =>
          method.isVerified &&
          method.isEnabled &&
          isSiteIncidentMethod(method.method),
      );

      if (validMethods.length === 0) {
        continue;
      }

      if (incident.reviewStatus === SiteIncidentReviewStatus.STOP_ALERTS) {
        for (const method of validMethods) {
          const methodKey = method.method;
          skippedByMethod[methodKey] = (skippedByMethod[methodKey] || 0) + 1;
        }
        continue;
      }

      // Determine Notification Type
      const isStart = incident.isActive;
      const notificationStatus = isStart
        ? NotificationStatus.START_SCHEDULED
        : NotificationStatus.END_SCHEDULED;
      const targetSiteAlertId = isStart
        ? incident.startSiteAlertId
        : incident.endSiteAlertId || incident.latestSiteAlertId;

      const metadata: IncidentNotificationMetadata = {
        type: isStart ? 'INCIDENT_START' : 'INCIDENT_END',
        incidentId: incident.id,
        siteId: incident.site.id,
        siteName: incident.site.name || 'Unnamed Site',
      };

      if (!isStart && incident.startedAt && incident.endedAt) {
        metadata.durationMinutes = Math.round(
          (incident.endedAt.getTime() - incident.startedAt.getTime()) / 60000,
        );
      }

      for (const method of validMethods) {
        queue.push({
          siteIncidentId: incident.id,
          siteAlertId: targetSiteAlertId,
          siteId: incident.site.id,
          alertMethod: method.method,
          destination: method.destination,
          notificationStatus,
          metadata,
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
    await prisma.$transaction(async tx => {
      // 1. Create all notifications and capture their IDs + metadata
      const createdNotifications = await Promise.all(
        queue.map(item =>
          tx.notification.create({
            data: {
              siteAlertId: item.siteAlertId,
              alertMethod: item.alertMethod,
              destination: item.destination,
              isDelivered: false,
              isSkipped: false,
              notificationStatus: item.notificationStatus,
              metadata: item.metadata as any, // Json type casting
            },
          }),
        ),
      );

      // Build a per-incident map of start/end notification IDs based on metadata
      const incidentNotificationMap = new Map<
        string,
        {start?: string; end?: string}
      >();

      for (const notif of createdNotifications) {
        const meta = notif.metadata as
          | IncidentNotificationMetadata
          | null
          | undefined;
        if (!meta?.incidentId) continue;

        const existing = incidentNotificationMap.get(meta.incidentId) ?? {};

        if (meta.type === 'INCIDENT_START' && !existing.start) {
          existing.start = notif.id;
        } else if (meta.type === 'INCIDENT_END' && !existing.end) {
          existing.end = notif.id;
        }

        incidentNotificationMap.set(meta.incidentId, existing);
      }

      // 2. Mark incidents as processed
      if (processedIncidentIds.length > 0) {
        await tx.siteIncident.updateMany({
          where: {id: {in: processedIncidentIds}},
          data: {isProcessed: true},
        });
      }

      // 3. Update startNotificationId / endNotificationId on SiteIncident
      const incidentUpdatePromises: Promise<SiteIncident>[] = [];
      for (const [incidentId, {start, end}] of incidentNotificationMap) {
        const data: {
          startNotificationId?: string;
          endNotificationId?: string;
        } = {};

        if (start) {
          data.startNotificationId = start;
        }

        if (end) {
          data.endNotificationId = end;
        }

        if (Object.keys(data).length === 0) continue;

        incidentUpdatePromises.push(
          tx.siteIncident.update({
            where: {id: incidentId},
            data,
          }),
        );
      }

      if (incidentUpdatePromises.length > 0) {
        await Promise.all(incidentUpdatePromises);
      }

      // 4. Update Site lastMessageCreated (Only for START notifications?)
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
