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
import {unsubscribeService} from '../AlertMethod/UnsubscribeService';
import {isSiteAlertMethod} from './NotificationRoutingConfig';
import type {Notification, SiteAlert, Site} from '@prisma/client';

type SiteAlertWithSite = SiteAlert & {
  site: Site;
};

type NotificationWithRelations = Notification & {
  siteAlert: SiteAlertWithSite;
};

type FailedAlertMethod = {
  destination: string;
  method: AlertMethodMethod;
};

// Removed MAX_RETRIES - we now process all batches until no more notifications remain
const ALERT_SMS_DISABLED = env.ALERT_SMS_DISABLED;
const ALERT_WHATSAPP_DISABLED = env.ALERT_WHATSAPP_DISABLED;

// get all undelivered Notifications and using relation from SiteAlert, get the data on Site
// for each notification, send the notification to the destination
// After sending notification update the notification table to set isDelivered to true and sentAt to current time
// If notification fails to send, increment the failCount in all alertMethods table where destination and method match.
const sendNotifications = async ({req}: AdditionalOptions): Promise<number> => {
  const alertMethodsExclusionList = [];
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
    const notifications = await prisma.notification.findMany({
      where: {
        isSkipped: false,
        isDelivered: false,
        sentAt: null,
        alertMethod: {
          notIn: alertMethodsExclusionList,
          in: ['device', 'webhook'],
        },
        notificationStatus: null,
      },
      include: {
        siteAlert: {
          include: {
            site: true,
          },
        },
      },
      take: take,
    });

    // Filter out notifications for disabled AlertMethods
    const enabledNotifications = [];
    for (const notification of notifications) {
      try {
        const alertMethodRecord = await prisma.alertMethod.findFirst({
          where: {
            destination: notification.destination,
            method: notification.alertMethod,
            isEnabled: true,
          },
        });

        if (alertMethodRecord) {
          enabledNotifications.push(notification);
        } else {
          // Mark notification as skipped if AlertMethod is disabled
          await prisma.notification.update({
            where: {id: notification.id},
            data: {isSkipped: true},
          });
          logger(
            `Skipped notification ${notification.id} - AlertMethod disabled for ${notification.destination}`,
            'info',
          );
        }
      } catch (error) {
        logger(
          `Error checking AlertMethod for notification ${notification.id}: ${
            (error as Error).message
          }`,
          'warn',
        );
        enabledNotifications.push(notification); // Include in case of error to avoid blocking
      }
    }

    const filteredNotifications = enabledNotifications;

    // If no notifications are found, exit the loop
    if (filteredNotifications.length === 0) {
      logger(`Nothing to process anymore notification.length = 0`, 'info');
      continueProcessing = false;
      break;
    }
    logger(`Notifications to be sent: ${filteredNotifications.length}`, 'info');

    const successfulNotificationIds: string[] = [];
    const successfulDestinations: string[] = [];
    const failedAlertMethods: FailedAlertMethod[] = [];

    await Promise.all(
      notifications.map(async (notification: NotificationWithRelations) => {
        try {
          const {id, destination, siteAlert} = notification;
          const alertMethod = notification.alertMethod as AlertMethodMethod;
          const {
            id: alertId,
            confidence,
            data,
            type,
            longitude,
            latitude,
            distance,
            detectedBy,
            eventDate,
            site,
          } = siteAlert;
          // const siteId = site.id;
          // const userId = site.userId;

          // if distance = 0 then the fire is inside the site's original geometry
          // if distance > 0 then the fire is outside the site's original geometry
          // message should change depending on the distance

          // // if eventDate is over 24 hours ago, then the fire is old therefore do not send the message
          // const eventDate24HoursAgo = new Date();
          // if (eventDate > eventDate24HoursAgo) {
          //     logger(`Event date is over 24 hours ago. Not sending notification.`, "info");
          //     await prisma.notification.update({
          //         where: { id: id },
          //         data: {
          //             isDelivered: true,
          //         }
          //     })
          //     return;
          // }

          const siteName = site.name ? site.name : '';

          const distanceKm = Math.round(distance / 1000);
          let input = `${distanceKm} km outside`;
          if (distance == 0) {
            input = `inside`;
          }

          const checkLatLong = `Check ${latitude}, ${longitude} for fires.`;
          const subject = `Likely fire ${input} ${siteName} 🔥`;

          let message = `Detected ${input} ${siteName} with ${confidence} confidence. ${checkLatLong}`;

          if (distance == 0) {
            message = `Detected ${input} ${siteName} with ${confidence} confidence. ${checkLatLong}`;
          }
          const url = `https://firealert.plant-for-the-planet.org/alert/${alertId}`;

          // If the alertMethod is email, Construct the message for email
          if (alertMethod === 'email') {
            // Get Local Time for Email
            const localTimeObject = getLocalTime(
              eventDate,
              latitude.toString(),
              longitude.toString(),
            );
            const localEventDate = new Date(
              localTimeObject.localDate,
            ).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: localTimeObject.timeZone,
            });

            message = `<p>A likely fire was detected at ${localEventDate} ${input} ${siteName} with ${confidence} confidence </p>
                
                    <p>${checkLatLong}</p>
                
                    <p><a href="https://maps.google.com/?q=${latitude},${longitude}">Open in Google Maps</a></p>

                    <p><a href="https://firealert.plant-for-the-planet.org/alert/${alertId}">Open in FireAlert</a></p>
              
                    <p>Best,<br>The FireAlert Team</p>`;
          }

          // Generate unsubscribe token for email notifications
          let unsubscribeToken: string | undefined;
          if (alertMethod === 'email') {
            try {
              // Find the AlertMethod for this email destination
              const alertMethodRecord = await prisma.alertMethod.findFirst({
                where: {
                  destination: destination,
                  method: 'email',
                  isEnabled: true,
                },
              });

              if (alertMethodRecord) {
                unsubscribeToken = unsubscribeService.generateToken(
                  alertMethodRecord.id,
                  alertMethodRecord.userId,
                );
              }
            } catch (error) {
              logger(
                `Failed to generate unsubscribe token for ${destination}: ${
                  (error as Error).message
                }`,
                'warn',
              );
            }
          }

          const notificationParameters: NotificationParameters = {
            id: id,
            message: message,
            subject: subject,
            url: url,
            unsubscribeToken: unsubscribeToken,
            alert: {
              id: alertId,
              type: type,
              confidence: confidence,
              source: detectedBy,
              date: eventDate,
              longitude: longitude,
              latitude: latitude,
              distance: distance,
              siteId: site.id,
              siteName: siteName,
              data: data as DataRecord,
            },
            // site: {id: siteId},
            // user: {id: userId!},
          };
          const notifier = NotifierRegistry.get(alertMethod);

          const isDelivered = await notifier.notify(
            destination,
            notificationParameters,
            {req},
          );

          if (isDelivered === true) {
            successfulNotificationIds.push(id);
            successfulDestinations.push(destination);
            successCount++;
          } else {
            failedAlertMethods.push({destination, method: alertMethod});
          }
        } catch (error) {
          logger(
            `Error processing notification ${notification.id}: ${
              (error as Error)?.message
            }`,
            'error',
          );
        }
      }),
    );

    // UpdateMany notification
    if (successfulNotificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {id: {in: successfulNotificationIds}},
        data: {isDelivered: true, sentAt: new Date()},
      });
      await prisma.alertMethod.updateMany({
        where: {destination: {in: successfulDestinations}},
        data: {failCount: 0},
      });
    }

    batchCount += 1;

    // Handle failed notifications - mark them as skipped if they failed
    const unsuccessfulNotifications = notifications.filter(
      ({id}) => !successfulNotificationIds.includes(id),
    );

    if (unsuccessfulNotifications.length > 0) {
      const unsuccessfulNotificationIds = unsuccessfulNotifications.map(
        ({id}) => id,
      );

      await prisma.notification.updateMany({
        where: {id: {in: unsuccessfulNotificationIds}},
        data: {isSkipped: true, isDelivered: false, sentAt: null},
      });
    }

    logger(
      `Completed batch ${batchCount}. Successful: ${successfulNotificationIds.length}, Failed: ${unsuccessfulNotifications.length}`,
      'info',
    );

    // skip += take; No need to skip take as we update the notifications to isDelivered = true
    // wait .7 seconds before starting the next round to ensure we aren't hitting any rate limits.
    // Todo: make this configurable and adjust as needed.
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  return successCount;
};

export default sendNotifications;
