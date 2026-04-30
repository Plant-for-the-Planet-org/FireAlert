import {type NextApiRequest} from 'next';
import {prisma} from '../../server/db';
import {logger, escapeLogfmt} from '../../server/logger';
import {env} from '../../env.mjs';
import {
  NotificationStatus,
  type Prisma,
  type SiteAlert,
} from '@prisma/client';
import NotifierRegistry from '../Notifier/NotifierRegistry';
import {NOTIFICATION_METHOD} from '../Notifier/methodConstants';
import type {NotificationParameters} from '../../Interfaces/NotificationParameters';
import {getLocalTime} from '../../../src/utils/date';
import type DataRecord from '../../Interfaces/DataRecord';
import type {IncidentNotificationMetadata} from '../../Interfaces/SiteIncidentNotifications';
import {unsubscribeService} from '../AlertMethod/UnsubscribeService';

const notificationWithRelationsInclude = {
  siteAlert: {
    include: {
      site: true,
    },
  },
} satisfies Prisma.NotificationInclude;

type ScheduledToSentTransition = {
  from: NotificationStatus;
  to: NotificationStatus;
};

const STATUS_TRANSITIONS: ScheduledToSentTransition[] = [
  {
    from: NotificationStatus.START_SCHEDULED,
    to: NotificationStatus.START_SENT,
  },
  {
    from: NotificationStatus.END_SCHEDULED,
    to: NotificationStatus.END_SENT,
  },
  {
    from: NotificationStatus.MERGE_START_SCHEDULED,
    to: NotificationStatus.MERGE_START_SENT,
  },
  {
    from: NotificationStatus.MERGE_END_SCHEDULED,
    to: NotificationStatus.MERGE_END_SENT,
  },
];

const SCHEDULED_STATUSES = STATUS_TRANSITIONS.map(transition => transition.from);

export class SendIncidentNotifications {
  static async run(req?: NextApiRequest): Promise<number> {
    const instance = new SendIncidentNotifications();
    return await instance.process(req);
  }

  async process(req?: NextApiRequest): Promise<number> {
    const alertMethodsExclusionList: string[] = [];
    if (env.ALERT_SMS_DISABLED)
      alertMethodsExclusionList.push(NOTIFICATION_METHOD.SMS);
    if (env.ALERT_WHATSAPP_DISABLED)
      alertMethodsExclusionList.push(NOTIFICATION_METHOD.WHATSAPP);

    const BATCH_SIZE = parseInt(env.NOTIFICATION_BATCH_SIZE || '10', 10);
    let successCount = 0;
    let continueProcessing = true;
    let batchCount = 0;

    while (continueProcessing) {
      const notifications = await prisma.notification.findMany({
        where: {
          isSkipped: false,
          isDelivered: false,
          notificationStatus: {
            in: SCHEDULED_STATUSES,
          },
          alertMethod: {
            notIn: alertMethodsExclusionList,
            in: ['email', 'sms', 'whatsapp'],
          },
        },
        include: notificationWithRelationsInclude,
        take: BATCH_SIZE,
      });

      if (notifications.length === 0) {
        continueProcessing = false;
        break;
      }

      logger(
        `stage=NotificationSender channel=incident event=batch_start batch=${batchCount + 1} count=${notifications.length}`,
        'debug',
      );

      const successfulIds: string[] = [];
      const failedIds: string[] = [];
      const successfulDestinations: string[] = [];
      let skippedMissingMetadataCount = 0;
      let processingErrorCount = 0;

      await Promise.all(
        notifications.map(async notification => {
          try {
            const {
              id,
              destination,
              alertMethod,
              siteAlert,
              metadata: rawMetadata,
            } = notification;

            const metadata = rawMetadata as IncidentNotificationMetadata | null;
            if (!metadata?.incidentId || !metadata?.type) {
              skippedMissingMetadataCount++;
              failedIds.push(id);
              return;
            }

            const site = siteAlert.site;
            const siteName = site.name || 'Unnamed Site';
            const incidentId = metadata.incidentId;

            const {subject, message} = this.constructMessage(
              metadata,
              siteAlert,
              siteName,
              incidentId,
              alertMethod,
            );

            const url = `https://firealert.plant-for-the-planet.org/incident/${incidentId}`;

            let unsubscribeToken: string | undefined;
            if (alertMethod === NOTIFICATION_METHOD.EMAIL) {
              unsubscribeToken =
                await this.getUnsubscribeTokenForDestination(destination);
            }

            const params: NotificationParameters = {
              id,
              message,
              subject,
              url,
              siteName,
              unsubscribeToken,
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
                siteName,
                data: siteAlert.data as DataRecord,
              },
            };

            const notifier = NotifierRegistry.get(alertMethod);
            const isDelivered = await notifier.notify(destination, params, {req});

            if (isDelivered) {
              successfulIds.push(id);
              successfulDestinations.push(destination);
            } else {
              failedIds.push(id);
            }
          } catch {
            processingErrorCount++;
            failedIds.push(notification.id);
          }
        }),
      );

      if (successfulIds.length > 0) {
        await this.markSuccessfulNotifications(successfulIds);

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

      logger(
        `stage=NotificationSender channel=incident event=batch_complete batch=${batchCount + 1} successful=${successfulIds.length} failed=${failedIds.length} missing_metadata=${skippedMissingMetadataCount} errors=${processingErrorCount}`,
        'info',
      );

      batchCount++;
      await new Promise(resolve => setTimeout(resolve, 700));
    }

    return successCount;
  }

  private async markSuccessfulNotifications(successfulIds: string[]) {
    for (const transition of STATUS_TRANSITIONS) {
      await prisma.notification.updateMany({
        where: {
          id: {in: successfulIds},
          notificationStatus: transition.from,
        },
        data: {
          isDelivered: true,
          sentAt: new Date(),
          notificationStatus: transition.to,
        },
      });
    }
  }

  private async getUnsubscribeTokenForDestination(
    destination: string,
  ): Promise<string | undefined> {
    try {
      const alertMethodRecord = await prisma.alertMethod.findFirst({
        where: {
          destination,
          method: 'email',
          isEnabled: true,
        },
      });

      if (!alertMethodRecord) {
        return undefined;
      }

      return unsubscribeService.generateToken(
        alertMethodRecord.id,
        alertMethodRecord.userId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger(
        `stage=NotificationSender channel=incident event=token_generation_failure message="${escapeLogfmt(message)}"`,
        'warn',
      );
      return undefined;
    }
  }

  private formatDuration(durationMinutes?: number): string {
    if (!durationMinutes || durationMinutes <= 0) {
      return 'unknown duration';
    }
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    }
    return `${Math.round(durationMinutes / 60)} hours`;
  }

  private constructMessage(
    metadata: IncidentNotificationMetadata,
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
    const detectionCount =
      metadata.aggregatedDetectionCount ?? metadata.detectionCount ?? 0;
    const durationMinutes =
      metadata.aggregatedDurationMinutes ?? metadata.durationMinutes;
    const mergedIncidentCount = metadata.mergedIncidentCount || 0;
    const mergedParentCount = metadata.mergedParentIncidentCount || 0;
    const durationText = this.formatDuration(durationMinutes);

    switch (metadata.type) {
      case 'INCIDENT_MERGE_START': {
        const subject = `🔥 Fire Incidents Merged: ${siteName}`;

        if (alertMethod === NOTIFICATION_METHOD.EMAIL) {
          return {
            subject,
            message: `
                <p>Multiple fire incidents have merged near <strong>${siteName}</strong>.</p>
                <p>Merge detected: ${dateStr}</p>
                <p>Merged incidents: ${mergedIncidentCount}</p>
                <p>Source parent incidents: ${mergedParentCount}</p>
                <p>Confidence: ${confidence}</p>
                <p>Location: ${lat}, ${long}</p>
                <p><a href="${incidentUrl}">Open merged incident in FireAlert</a></p>
            `,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.SMS) {
          return {
            subject: '',
            message: `🔥 Multiple fire incidents merged at ${siteName}. Merged incidents: ${mergedIncidentCount}. View: ${incidentUrl}`,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.WHATSAPP) {
          return {
            subject: '',
            message: `🔥 *Incidents Merged*\n\nLocation: ${siteName}\nMerged incidents: ${mergedIncidentCount}\nParents: ${mergedParentCount}\nDetected: ${dateStr}\n\nView: ${incidentUrl}`,
          };
        }

        return {
          subject,
          message: `Multiple fire incidents merged at ${siteName}. View: ${incidentUrl}`,
        };
      }

      case 'INCIDENT_START': {
        const subject = `🔥 Fire Incident Started: ${siteName}`;

        if (alertMethod === NOTIFICATION_METHOD.EMAIL) {
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
        }

        if (alertMethod === NOTIFICATION_METHOD.SMS) {
          return {
            subject: '',
            message: `🔥 Fire incident started at ${siteName}. Detection: ${dateStr}. View: ${incidentUrl}`,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.WHATSAPP) {
          return {
            subject: '',
            message: `🔥 *Fire Incident Started*\n\nLocation: ${siteName}\nFirst Detection: ${dateStr}\nConfidence: ${confidence}\n\nView: ${incidentUrl}`,
          };
        }

        return {
          subject,
          message: `Fire incident started at ${siteName}. Detection: ${dateStr}`,
        };
      }

      case 'INCIDENT_MERGE_END': {
        const subject = `✅ Merged Fire Incident Ended: ${siteName}`;

        if (alertMethod === NOTIFICATION_METHOD.EMAIL) {
          return {
            subject,
            message: `
                <p>The merged fire incident at <strong>${siteName}</strong> has ended.</p>
                <p>Last detection: ${dateStr}</p>
                <p>Merged incidents in chain: ${mergedIncidentCount}</p>
                <p>Total detections across chain: ${detectionCount}</p>
                <p>Combined duration: ${durationText}</p>
                <p><a href="${incidentUrl}">View merged incident summary</a></p>
            `,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.SMS) {
          return {
            subject: '',
            message: `✅ Merged incident ended at ${siteName}. Incidents: ${mergedIncidentCount}, detections: ${detectionCount}, duration: ${durationText}. View: ${incidentUrl}`,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.WHATSAPP) {
          return {
            subject: '',
            message: `✅ *Merged Incident Ended*\n\nLocation: ${siteName}\nIncidents: ${mergedIncidentCount}\nDetections: ${detectionCount}\nDuration: ${durationText}\n\nView: ${incidentUrl}`,
          };
        }

        return {
          subject,
          message: `Merged incident ended at ${siteName}. Detections: ${detectionCount}. Duration: ${durationText}.`,
        };
      }

      case 'INCIDENT_END':
      default: {
        const subject = `✅ Fire Incident Ended: ${siteName}`;

        if (alertMethod === NOTIFICATION_METHOD.EMAIL) {
          return {
            subject,
            message: `
                <p>The fire incident at <strong>${siteName}</strong> has ended.</p>
                <p>Last detection: ${dateStr}</p>
                <p>Total detections: ${detectionCount}</p>
                <p>Duration: ${durationText}</p>
                <p><a href="${incidentUrl}">View details</a></p>
            `,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.SMS) {
          return {
            subject: '',
            message: `✅ Fire incident ended at ${siteName}. Detections: ${detectionCount}. Duration: ${durationText}. View: ${incidentUrl}`,
          };
        }

        if (alertMethod === NOTIFICATION_METHOD.WHATSAPP) {
          return {
            subject: '',
            message: `✅ *Fire Incident Ended*\n\nLocation: ${siteName}\nDetections: ${detectionCount}\nDuration: ${durationText}\n\nView: ${incidentUrl}`,
          };
        }

        return {
          subject,
          message: `Fire incident ended at ${siteName}. Last detection: ${dateStr}`,
        };
      }
    }
  }
}
