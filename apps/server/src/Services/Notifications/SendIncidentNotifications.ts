import {type NextApiRequest} from 'next';
import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {env} from '../../env.mjs';
import {
  NotificationStatus,
  type Notification,
  type SiteAlert,
  type Site,
} from '@prisma/client';
import NotifierRegistry from '../Notifier/NotifierRegistry';
import {NOTIFICATION_METHOD} from '../Notifier/methodConstants';
import type {NotificationParameters} from '../../Interfaces/NotificationParameters';
import {getLocalTime} from '../../../src/utils/date';
import type DataRecord from '../../Interfaces/DataRecord';

type NotificationWithRelations = Notification & {
  siteAlert: SiteAlert & {
    site: Site;
  };
};

type IncidentNotificationMetadata = {
  incidentId: string;
  type: 'INCIDENT_START' | 'INCIDENT_END';
  detectionCount?: number;
  duration?: string;
};

export class SendIncidentNotifications {
  static async run(req?: NextApiRequest): Promise<number> {
    const instance = new SendIncidentNotifications();
    return await instance.process(req);
  }

  async process(req?: NextApiRequest): Promise<number> {
    // Exclude disabled methods
    const alertMethodsExclusionList = [];
    if (env.ALERT_SMS_DISABLED)
      alertMethodsExclusionList.push(NOTIFICATION_METHOD.SMS);
    if (env.ALERT_WHATSAPP_DISABLED)
      alertMethodsExclusionList.push(NOTIFICATION_METHOD.WHATSAPP);

    const BATCH_SIZE = parseInt(env.NOTIFICATION_BATCH_SIZE || '10', 10);
    let successCount = 0;
    let continueProcessing = true;
    let batchCount = 0;

    while (continueProcessing) {
      // Fetch notifications
      // Status IN [START_SCHEDULED, END_SCHEDULED]
      // isDelivered = false
      // isSkipped = false
      const notifications = (await prisma.notification.findMany({
        where: {
          isSkipped: false,
          isDelivered: false,
          notificationStatus: {
            in: [
              NotificationStatus.START_SCHEDULED,
              NotificationStatus.END_SCHEDULED,
            ],
          },
          alertMethod: {notIn: alertMethodsExclusionList},
        },
        include: {
          siteAlert: {
            include: {
              site: true,
            },
          },
        },
        take: BATCH_SIZE,
      })) as NotificationWithRelations[];

      if (notifications.length === 0) {
        continueProcessing = false;
        break;
      }

      logger(
        `Processing batch ${batchCount + 1}: ${
          notifications.length
        } incident notifications to be sent.`,
        'info',
      );

      const successfulIds: string[] = [];
      const failedIds: string[] = [];
      const successfulDestinations: string[] = [];
      const failedDestinations: {destination: string; method: string}[] = [];

      await Promise.all(
        notifications.map(async (notification: NotificationWithRelations) => {
          try {
            const {
              id,
              destination,
              alertMethod,
              notificationStatus,
              siteAlert,
              metadata,
            } = notification;
            const site = siteAlert.site;
            const siteName = site.name || 'Unnamed Site';

            // Extract incident ID from metadata
            const incidentMetadata =
              metadata as IncidentNotificationMetadata | null;
            const incidentId = incidentMetadata?.incidentId || siteAlert.id;

            // Construct Message
            const isStart =
              notificationStatus === NotificationStatus.START_SCHEDULED;
            const {subject, message} = this.constructMessage(
              isStart,
              siteAlert,
              siteName,
              incidentId,
              alertMethod,
            );

            const url = `https://firealert.plant-for-the-planet.org/incident/${incidentId}`;

            const params: NotificationParameters = {
              id: id,
              message: message,
              subject: subject,
              url: url,
              siteName: siteName,
              alert: {
                id: siteAlert.id,
                type: siteAlert.type,
                confidence: siteAlert.confidence,
                source: siteAlert.detectedBy,
                date: siteAlert.eventDate,
                longitude: siteAlert.longitude,
                latitude: siteAlert.latitude,
                distance: siteAlert.distance,
                siteId: site.id,
                siteName: siteName,
                data: siteAlert.data as DataRecord,
              },
            };

            const notifier = NotifierRegistry.get(alertMethod);
            const isDelivered = await notifier.notify(destination, params, {
              req,
            });

            if (isDelivered) {
              successfulIds.push(id);
              successfulDestinations.push(destination);
            } else {
              failedIds.push(id);
              failedDestinations.push({destination, method: alertMethod});
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            logger(
              `Error sending notification ${notification.id}: ${errorMessage}`,
              'error',
            );
            failedIds.push(notification.id);
          }
        }),
      );

      // Update Success
      if (successfulIds.length > 0) {
        // For START -> START_SENT
        // For END -> END_SENT
        // We need to split updates or do them individually?
        // Actually we can do filtered updates.
        // Or just update individually if needed.
        // But wait, we can just say `notificationStatus: status === START_SCHEDULED ? START_SENT : END_SENT`.
        // Prisma doesn't support conditional updates like that easily in updateMany.
        // So we update all successful to isDelivered=true.
        // And we ALSO need to update the status.
        // Since we processed a batch mixed of START and END, we might need two queries for status update.

        await prisma.notification.updateMany({
          where: {
            id: {in: successfulIds},
            notificationStatus: NotificationStatus.START_SCHEDULED,
          },
          data: {
            isDelivered: true,
            sentAt: new Date(),
            notificationStatus: NotificationStatus.START_SENT,
          },
        });

        await prisma.notification.updateMany({
          where: {
            id: {in: successfulIds},
            notificationStatus: NotificationStatus.END_SCHEDULED,
          },
          data: {
            isDelivered: true,
            sentAt: new Date(),
            notificationStatus: NotificationStatus.END_SENT,
          },
        });

        // Reset fail count for successful destinations
        await prisma.alertMethod.updateMany({
          where: {destination: {in: successfulDestinations}},
          data: {failCount: 0},
        });

        successCount += successfulIds.length;
      }

      // Update Failures
      if (failedIds.length > 0) {
        await prisma.notification.updateMany({
          where: {id: {in: failedIds}},
          data: {isSkipped: true}, // Mark as skipped so we don't retry forever
        });

        // Increment fail count?
        // Logic from SendNotifications.ts:
        // if notification fails, increment failCount.
        // The original code collected failedAlertMethods but didn't use it.
        // So we skip this for now.
      }

      batchCount++;
      await new Promise(resolve => setTimeout(resolve, 700)); // Rate limit
    }

    return successCount;
  }

  private constructMessage(
    isStart: boolean,
    alert: SiteAlert,
    siteName: string,
    incidentId: string,
    alertMethod: string = NOTIFICATION_METHOD.EMAIL,
  ) {
    const localTimeObject = getLocalTime(
      alert.eventDate,
      alert.latitude.toString(),
      alert.longitude.toString(),
    );
    const dateStr = new Date(localTimeObject.localDate).toLocaleString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: localTimeObject.timeZone,
      },
    );

    const lat = alert.latitude;
    const long = alert.longitude;
    const confidence = alert.confidence;
    const incidentUrl = `https://firealert.plant-for-the-planet.org/incident/${incidentId}`;

    if (isStart) {
      const subject = `🔥 Fire Incident Started: ${siteName}`;

      switch (alertMethod) {
        case NOTIFICATION_METHOD.EMAIL:
          return {
            subject,
            message: `
                <p>A new fire incident has been detected at <strong>${siteName}</strong>.</p>
                <p>First detection: ${dateStr}</p>
                <p>Confidence: ${confidence}</p>
                <p>Location: ${lat}, ${long}</p>
                <p><a href="${incidentUrl}">Open in FireAlert</a></p>
            `,
          };

        case NOTIFICATION_METHOD.DEVICE:
          return {
            subject: '🔥 Fire Incident Started',
            message: `Fire detected at ${siteName}. First detection: ${dateStr}. Confidence: ${confidence}. Tap to view details.`,
          };

        case NOTIFICATION_METHOD.SMS:
          // TODO: Implement SMS message format
          return {
            subject: '',
            message: `🔥 Fire incident started at ${siteName}. Detection: ${dateStr}. View: ${incidentUrl}`,
          };

        case NOTIFICATION_METHOD.WHATSAPP:
          // TODO: Implement WhatsApp message format
          return {
            subject: '',
            message: `🔥 *Fire Incident Started*\n\nLocation: ${siteName}\nFirst Detection: ${dateStr}\nConfidence: ${confidence}\n\nView Details: ${incidentUrl}`,
          };

        case NOTIFICATION_METHOD.WEBHOOK:
          // TODO: Implement Webhook payload format
          return {
            subject: '',
            message: JSON.stringify({
              type: 'INCIDENT_START',
              siteName,
              incidentId,
              detectionTime: dateStr,
              confidence,
              location: {lat, long},
              incidentUrl,
            }),
          };

        case NOTIFICATION_METHOD.TEST:
          // TODO: Implement Test message format
          return {
            subject,
            message: `Test: Fire incident started at ${siteName}`,
          };

        default:
          return {
            subject,
            message: `Fire incident started at ${siteName}. Detection: ${dateStr}`,
          };
      }
    } else {
      const subject = `✅ Fire Incident Ended: ${siteName}`;

      switch (alertMethod) {
        case NOTIFICATION_METHOD.EMAIL:
          return {
            subject,
            message: `
                <p>The fire incident at <strong>${siteName}</strong> has ended.</p>
                <p>Last detection: ${dateStr}</p>
                <p><a href="${incidentUrl}">View Details</a></p>
            `,
          };

        case NOTIFICATION_METHOD.DEVICE:
          return {
            subject: '✅ Fire Incident Ended',
            message: `Fire incident at ${siteName} has ended. Last detection: ${dateStr}. Tap to view summary.`,
          };

        case NOTIFICATION_METHOD.SMS:
          // TODO: Implement SMS message format
          return {
            subject: '',
            message: `✅ Fire incident ended at ${siteName}. Last detection: ${dateStr}. View: ${incidentUrl}`,
          };

        case NOTIFICATION_METHOD.WHATSAPP:
          // TODO: Implement WhatsApp message format
          return {
            subject: '',
            message: `✅ *Fire Incident Ended*\n\nLocation: ${siteName}\nLast Detection: ${dateStr}\n\nView Summary: ${incidentUrl}`,
          };

        case NOTIFICATION_METHOD.WEBHOOK:
          // TODO: Implement Webhook payload format
          return {
            subject: '',
            message: JSON.stringify({
              type: 'INCIDENT_END',
              siteName,
              incidentId,
              endTime: dateStr,
              incidentUrl,
            }),
          };

        case NOTIFICATION_METHOD.TEST:
          // TODO: Implement Test message format
          return {
            subject,
            message: `Test: Fire incident ended at ${siteName}`,
          };

        default:
          return {
            subject,
            message: `Fire incident ended at ${siteName}. Last detection: ${dateStr}`,
          };
      }
    }
  }
}
