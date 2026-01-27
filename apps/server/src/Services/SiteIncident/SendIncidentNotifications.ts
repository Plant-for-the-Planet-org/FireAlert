import type {AdditionalOptions} from '../../Interfaces/AdditionalOptions';
import {type AlertMethodMethod} from '../../Interfaces/AlertMethod';
import type DataRecord from '../../Interfaces/DataRecord';
import {type NotificationParameters} from '../../Interfaces/NotificationParameters';
import {getLocalTime} from '../../../src/utils/date';
import {env} from '../../env.mjs';
import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import NotifierRegistry from '../Notifier/NotifierRegistry';
import {NOTIFICATION_METHOD} from '../Notifier/methodConstants';
import type {NotificationStatus, SiteAlert, Site, Prisma} from '@prisma/client';

const ALERT_SMS_DISABLED = env.ALERT_SMS_DISABLED;
const ALERT_WHATSAPP_DISABLED = env.ALERT_WHATSAPP_DISABLED;

/**
 * Service for sending incident boundary notifications (START and END)
 * Processes notifications with SCHEDULED status and delivers them through configured alert methods
 */

// Helper function to safely convert any to string
function ensureString(value: unknown): string {
  return String(value);
}

// Helper function to safely convert any to NotificationStatus
function ensureNotificationStatus(value: unknown): NotificationStatus {
  return value as NotificationStatus;
}

interface IncidentMetadata {
  type: 'INCIDENT_START' | 'INCIDENT_END';
  incidentId: string;
  siteId: string;
  siteName: string;
  detectionCount?: number;
  durationMinutes?: number;
}

type IncidentMessageInput = {
  latitude: number;
  longitude: number;
  eventDate: Date;
  confidence: string;
};

type IncidentMessageOutput = {
  message: string;
  subject: string;
  url: string;
};

type NotificationWithIncidentRelations = Prisma.NotificationGetPayload<{
  include: {
    siteAlert: {
      include: {
        site: true;
      };
    };
  };
}>;

/**
 * Constructs appropriate message for START or END incident notifications
 */
function constructIncidentMessage(
  metadata: IncidentMetadata,
  alertMethod: AlertMethodMethod,
  siteAlert: IncidentMessageInput,
): IncidentMessageOutput {
  const {type, siteName, detectionCount, durationMinutes} = metadata;
  const {latitude, longitude, eventDate} = siteAlert;

  const checkLatLong = `Check ${latitude}, ${longitude} for fires.`;
  const alertUrl = `https://firealert.plant-for-the-planet.org/site/${metadata.siteId}`;

  if (type === 'INCIDENT_START') {
    const subject = `Fire incident started at ${siteName} 🔥`;
    let message = `A fire incident has started at ${siteName}. ${checkLatLong}`;

    if (alertMethod === 'email') {
      const localTimeObject = getLocalTime(
        eventDate,
        latitude.toString(),
        longitude.toString(),
      );
      const localEventDate = new Date(localTimeObject.localDate).toLocaleString(
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

      message = `<p>A fire incident has started at ${siteName} on ${localEventDate}.</p>
                
                <p>${checkLatLong}</p>
            
                <p><a href="https://maps.google.com/?q=${latitude},${longitude}">Open in Google Maps</a></p>

                <p><a href="${alertUrl}">View incident details in FireAlert</a></p>
          
                <p>Best,<br>The FireAlert Team</p>`;
    }

    return {message, subject, url: alertUrl};
  } else {
    // INCIDENT_END
    const durationText =
      durationMinutes !== undefined
        ? durationMinutes < 60
          ? `${durationMinutes} minutes`
          : `${Math.round(durationMinutes / 60)} hours`
        : 'unknown duration';

    const subject = `Fire incident ended at ${siteName} ✅`;
    let message = `The fire incident at ${siteName} has ended after ${durationText}. Total detections: ${
      detectionCount || 0
    }.`;

    if (alertMethod === 'email') {
      const localTimeObject = getLocalTime(
        eventDate,
        latitude.toString(),
        longitude.toString(),
      );
      const localEventDate = new Date(localTimeObject.localDate).toLocaleString(
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

      message = `<p>The fire incident at ${siteName} has ended as of ${localEventDate}.</p>
                
                <p><strong>Incident Summary:</strong></p>
                <ul>
                  <li>Duration: ${durationText}</li>
                  <li>Total detections: ${detectionCount || 0}</li>
                </ul>
            
                <p><a href="https://maps.google.com/?q=${latitude},${longitude}">Open in Google Maps</a></p>

                <p><a href="${alertUrl}">View incident details in FireAlert</a></p>
          
                <p>Best,<br>The FireAlert Team</p>`;
    }

    return {message, subject, url: alertUrl};
  }
}

/**
 * Main function to send incident boundary notifications
 * Processes notifications with SCHEDULED status and delivers them
 *
 * @param options - Additional options including request context
 * @returns Number of notifications successfully sent
 */
export async function sendIncidentNotifications(
  options: AdditionalOptions = {},
): Promise<number> {
  const alertMethodsExclusionList: string[] = [];
  if (ALERT_SMS_DISABLED)
    alertMethodsExclusionList.push(NOTIFICATION_METHOD.SMS);
  if (ALERT_WHATSAPP_DISABLED)
    alertMethodsExclusionList.push(NOTIFICATION_METHOD.WHATSAPP);

  const BATCH_SIZE = parseInt(env.NOTIFICATION_BATCH_SIZE || '10', 10);
  const take = BATCH_SIZE;
  let successCount = 0;
  let continueProcessing = true;
  let batchCount = 0;

  while (continueProcessing) {
    // Get notifications with SCHEDULED status
    const notifications = (await prisma.notification.findMany({
      where: {
        isSkipped: false,
        isDelivered: false,
        sentAt: null,
        alertMethod: {notIn: alertMethodsExclusionList},
        notificationStatus: {
          in: ['START_SCHEDULED', 'END_SCHEDULED'],
        },
      },
      include: {
        siteAlert: {
          include: {
            site: true,
          },
        },
      },
      take: take,
    })) as NotificationWithIncidentRelations[];

    // If no notifications are found, exit the loop
    if (notifications.length === 0) {
      logger(
        `No incident notifications to process (notification.length = 0)`,
        'info',
      );
      continueProcessing = false;
      break;
    }

    logger(
      `Incident notifications to be sent: ${notifications.length}`,
      'info',
    );

    const successfulNotificationIds: string[] = [];
    const successfulDestinations: string[] = [];
    const notificationStatusUpdates: {
      id: string;
      status: NotificationStatus;
    }[] = [];

    await Promise.all(
      notifications.map(
        async (notification: NotificationWithIncidentRelations) => {
          const {id, destination, siteAlert} = notification;
          const id_typed: string = id;
          const destination_typed: string = ensureString(destination);
          try {
            const alertMethod_str: string = ensureString(
              notification.alertMethod,
            );
            const alertMethod_typed: AlertMethodMethod =
              alertMethod_str as AlertMethodMethod;
            const metadata_typed: IncidentMetadata | null =
              notification.metadata as IncidentMetadata | null;
            const notificationStatus_typed: NotificationStatus | null =
              ensureNotificationStatus(
                notification.notificationStatus,
              ) as NotificationStatus | null;

            if (!metadata_typed || !notificationStatus_typed) {
              logger(
                `Notification ${id_typed} missing metadata or status, skipping`,
                'warn',
              );
              return;
            }

            const incidentMetadata: IncidentMetadata = metadata_typed;
            const siteAlertWithSite = siteAlert as SiteAlert & {site: Site};
            const {
              id: alertId,
              confidence,
              data,
              type,
              longitude,
              latitude,
              eventDate,
              site,
            } = siteAlertWithSite;
            const alertId_typed: string = alertId;

            // Construct incident-specific message
            const {message, subject, url} = constructIncidentMessage(
              incidentMetadata,
              alertMethod_typed,
              {
                latitude,
                longitude,
                eventDate,
                confidence,
              },
            );

            const notificationParameters: NotificationParameters = {
              id: id_typed,
              message: message,
              subject: subject,
              url: url,
              alert: {
                id: alertId_typed,
                type: type,
                confidence: confidence,
                source: 'INCIDENT',
                date: eventDate,
                longitude: longitude,
                latitude: latitude,
                distance: 0,
                siteId: site.id,
                siteName: site.name || 'Unknown Site',
                data: data as DataRecord,
              },
            };

            const notifier = NotifierRegistry.get(alertMethod_typed);
            const isDelivered = await notifier.notify(
              destination_typed,
              notificationParameters,
              options,
            );

            if (isDelivered === true) {
              successfulNotificationIds.push(id_typed);
              successfulDestinations.push(destination_typed);

              // Determine new status based on current status
              const newStatus: NotificationStatus =
                notificationStatus_typed === 'START_SCHEDULED'
                  ? ('START_SENT' as const)
                  : ('END_SENT' as const);

              notificationStatusUpdates.push({id: id_typed, status: newStatus});
              successCount++;
            }
          } catch (error) {
            logger(
              `Error processing incident notification ${id_typed}: ${
                (error as Error)?.message
              }`,
              'error',
            );
          }
        },
      ),
    );

    // Update successful notifications
    if (successfulNotificationIds.length > 0) {
      // Update each notification with its specific status
      await Promise.all(
        notificationStatusUpdates.map(
          (update: {id: string; status: NotificationStatus}) => {
            const status_typed: NotificationStatus = ensureNotificationStatus(
              update.status,
            );
            const updateId_typed: string = ensureString(update.id);
            return prisma.notification.update({
              where: {id: updateId_typed},
              data: {
                isDelivered: true,
                sentAt: new Date(),
                notificationStatus: status_typed,
              },
            });
          },
        ),
      );

      // Reset fail count for successful alert methods
      await prisma.alertMethod.updateMany({
        where: {destination: {in: successfulDestinations}},
        data: {failCount: 0},
      });
    }

    batchCount += 1;

    // Handle failed notifications - mark them as skipped
    const unsuccessfulNotifications = notifications.filter(
      ({id}: NotificationWithIncidentRelations) =>
        !successfulNotificationIds.includes(id),
    );

    if (unsuccessfulNotifications.length > 0) {
      const unsuccessfulNotificationIds = unsuccessfulNotifications.map(
        ({id}: NotificationWithIncidentRelations) => ensureString(id),
      );

      await prisma.notification.updateMany({
        where: {id: {in: unsuccessfulNotificationIds}},
        data: {isSkipped: true, isDelivered: false, sentAt: null},
      });

      // Increment fail count for failed alert methods
      const failedDestinations = unsuccessfulNotifications.map(
        n => n.destination,
      );
      const failedMethods = unsuccessfulNotifications.map(n => n.alertMethod);

      for (let i = 0; i < failedDestinations.length; i++) {
        await prisma.alertMethod.updateMany({
          where: {
            destination: failedDestinations[i],
            method: failedMethods[i],
          },
          data: {
            failCount: {
              increment: 1,
            },
          },
        });
      }
    }

    logger(
      `Completed incident notification batch ${batchCount}. Successful: ${successfulNotificationIds.length}, Failed: ${unsuccessfulNotifications.length}`,
      'info',
    );

    // Wait 0.7 seconds before starting the next round to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  return successCount;
}

export default sendIncidentNotifications;
