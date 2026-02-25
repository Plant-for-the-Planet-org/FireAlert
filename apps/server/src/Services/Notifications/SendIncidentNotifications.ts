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

type IncidentNotificationType =
  | 'INCIDENT_START'
  | 'INCIDENT_END'
  | 'INCIDENT_MERGE';

type IncidentNotificationMetadata = {
  incidentId: string;
  siteId?: string;
  siteName?: string;
  type: IncidentNotificationType;
  detectionCount?: number;
  duration?: string;
  mergeSourceCount?: number;
};

export class SendIncidentNotifications {
  static async run(req?: NextApiRequest): Promise<number> {
    const instance = new SendIncidentNotifications();
    return await instance.process(req);
  }

  async process(req?: NextApiRequest): Promise<number> {
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
      const notifications = (await prisma.notification.findMany({
        where: {
          isSkipped: false,
          isDelivered: false,
          notificationStatus: {
            in: [
              NotificationStatus.START_SCHEDULED,
              NotificationStatus.END_SCHEDULED,
              NotificationStatus.MERGE_SCHEDULED,
            ],
          },
          alertMethod: {
            notIn: alertMethodsExclusionList,
            in: ['email', 'sms', 'whatsapp'],
          },
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
        `Processing batch ${batchCount + 1}: ${notifications.length} incident notifications to be sent.`,
        'info',
      );

      const successfulIds: string[] = [];
      const failedIds: string[] = [];
      const successfulDestinations: string[] = [];

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

            const incidentMetadata = metadata as IncidentNotificationMetadata | null;
            const incidentId = incidentMetadata?.incidentId || siteAlert.id;

            const notificationType = this.resolveNotificationType(
              notificationStatus,
              incidentMetadata,
            );

            const {subject, message} = this.constructMessage(
              notificationType,
              siteAlert,
              siteName,
              incidentId,
              alertMethod,
              incidentMetadata,
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

      if (successfulIds.length > 0) {
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

        await prisma.notification.updateMany({
          where: {
            id: {in: successfulIds},
            notificationStatus: NotificationStatus.MERGE_SCHEDULED,
          },
          data: {
            isDelivered: true,
            sentAt: new Date(),
            notificationStatus: NotificationStatus.MERGE_SENT,
          },
        });

        await prisma.alertMethod.updateMany({
          where: {destination: {in: successfulDestinations}},
          data: {failCount: 0},
        });

        successCount += successfulIds.length;
      }

      if (failedIds.length > 0) {
        await prisma.notification.updateMany({
          where: {id: {in: failedIds}},
          data: {isSkipped: true},
        });
      }

      batchCount++;
      await new Promise(resolve => setTimeout(resolve, 700));
    }

    return successCount;
  }

  private resolveNotificationType(
    notificationStatus: NotificationStatus | null,
    metadata: IncidentNotificationMetadata | null,
  ): IncidentNotificationType {
    if (metadata?.type) {
      return metadata.type;
    }

    switch (notificationStatus) {
      case NotificationStatus.END_SCHEDULED:
        return 'INCIDENT_END';
      case NotificationStatus.MERGE_SCHEDULED:
        return 'INCIDENT_MERGE';
      case NotificationStatus.START_SCHEDULED:
      default:
        return 'INCIDENT_START';
    }
  }

  private constructMessage(
    notificationType: IncidentNotificationType,
    alert: SiteAlert,
    siteName: string,
    incidentId: string,
    alertMethod: string = NOTIFICATION_METHOD.EMAIL,
    metadata?: IncidentNotificationMetadata | null,
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

    if (notificationType === 'INCIDENT_MERGE') {
      const mergedCount = metadata?.mergeSourceCount ?? 2;
      const subject = `Multiple incidents converged at ${siteName}`;

      switch (alertMethod) {
        case NOTIFICATION_METHOD.EMAIL:
          return {
            subject,
            message: `
                <p><strong>Multiple incidents converged</strong> at <strong>${siteName}</strong>.</p>
                <p>Converged incident groups: ${mergedCount}</p>
                <p>Update time: ${dateStr}</p>
                <p><a href="${incidentUrl}">Open in FireAlert</a></p>
            `,
          };

        case NOTIFICATION_METHOD.SMS:
          return {
            subject: '',
            message: `Multiple incidents converged at ${siteName}. View: ${incidentUrl}`,
          };

        case NOTIFICATION_METHOD.WHATSAPP:
          return {
            subject: '',
            message: `*Multiple incidents converged*\n\nLocation: ${siteName}\nUpdate: ${dateStr}\n\nView details: ${incidentUrl}`,
          };

        default:
          return {
            subject,
            message: `Multiple incidents converged at ${siteName}. View details: ${incidentUrl}`,
          };
      }
    }

    if (notificationType === 'INCIDENT_START') {
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

        case NOTIFICATION_METHOD.SMS:
          return {
            subject: '',
            message: `🔥 Fire incident started at ${siteName}. Detection: ${dateStr}. View: ${incidentUrl}`,
          };

        case NOTIFICATION_METHOD.WHATSAPP:
          return {
            subject: '',
            message: `🔥 *Fire Incident Started*\n\nLocation: ${siteName}\nFirst Detection: ${dateStr}\nConfidence: ${confidence}\n\nView Details: ${incidentUrl}`,
          };

        default:
          return {
            subject,
            message: `Fire incident started at ${siteName}. Detection: ${dateStr}`,
          };
      }
    }

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

      case NOTIFICATION_METHOD.SMS:
        return {
          subject: '',
          message: `✅ Fire incident ended at ${siteName}. Last detection: ${dateStr}. View: ${incidentUrl}`,
        };

      case NOTIFICATION_METHOD.WHATSAPP:
        return {
          subject: '',
          message: `✅ *Fire Incident Ended*\n\nLocation: ${siteName}\nLast Detection: ${dateStr}\n\nView Summary: ${incidentUrl}`,
        };

      default:
        return {
          subject,
          message: `Fire incident ended at ${siteName}. Last detection: ${dateStr}`,
        };
    }
  }
}
