import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {
  type NotificationQueueItem,
  type IncidentNotificationMetadata,
} from '../../Interfaces/SiteIncidentNotifications';
import {
  NotificationStatus,
  SiteIncidentReviewStatus,
  type SiteIncident,
} from '@prisma/client';
import {isSiteIncidentMethod} from './NotificationRoutingConfig';

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
    return incidents;
  }

  private async createNotificationQueue(
    incidents: any[],
    skippedByMethod: Record<string, number>,
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
        const meta = notif.metadata as IncidentNotificationMetadata | null | undefined;
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
