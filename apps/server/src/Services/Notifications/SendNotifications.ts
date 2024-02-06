import {type AlertMethodMethod} from '../../Interfaces/AlertMethod';
import NotifierRegistry from '../Notifier/NotifierRegistry';
import {type NotificationParameters} from '../../Interfaces/NotificationParameters';
import type DataRecord from '../../Interfaces/DataRecord';
import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {getLocalTime} from '../../../src/utils/date';

// get all undelivered Notifications and using relation from SiteAlert, get the data on Site
// for each notification, send the notification to the destination
// After sending notification update the notification table to set isDelivered to true and sentAt to current time
// If notification fails to send, increment the failCount in all alertMethods table where destination and method match.
const sendNotifications = async (): Promise<number> => {
  const take = 20;
  let successCount = 0;
  while (true) {
    const notifications = await prisma.notification.findMany({
      where: {
        isDelivered: false,
        sentAt: null,
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

    // If no notifications are found, exit the loop
    if (notifications.length === 0) {
      logger(`Nothing to process anymore notification.length = 0`, 'info');
      break;
    }
    logger(`Notifications to be sent: ${notifications.length}`, 'info');

    await Promise.all(
      notifications.map(async notification => {
        try {
          const {id, alertMethod, destination, siteAlert} = notification;
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
          let inout = `${distanceKm} km outside`;
          if (distance == 0) {
            inout = `inside`;
          }

          const checkLatLong = `Check ${latitude}, ${longitude} for fires.`;
          const subject = `Likely fire ${inout} ${siteName} 🔥`;

          let message = `Detected ${inout} ${siteName} with ${confidence} confidence. ${checkLatLong}`;

          if (distance == 0) {
            message = `Detected ${inout} ${siteName} with ${confidence} confidence. ${checkLatLong}`;
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

            message = `<p>A likely fire was detected at ${localEventDate} ${inout} ${siteName} with ${confidence} confidence </p>
                
                    <p>${checkLatLong}</p>
                
                    <p><a href="https://maps.google.com/?q=${latitude},${longitude}">Open in Google Maps</a></p>

                    <p><a href="https://firealert.plant-for-the-planet.org/alert/${alertId}">Open in FireAlert</a></p>
              
                    <p>Best,<br>The FireAlert Team</p>`;
          }

          const notificationParameters: NotificationParameters = {
            id: id,
            message: message,
            subject: subject,
            url: url,
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
          };
          const notifier = NotifierRegistry.get(alertMethod);

          const isDelivered = await notifier.notify(
            destination,
            notificationParameters,
          );

          // Update notification's isDelivered status and sentAt
          if (isDelivered === true) {
            await prisma.notification.update({
              where: {id: id},
              data: {
                isDelivered: true,
                sentAt: new Date(),
              },
            });
            successCount++;
          } else {
            await prisma.alertMethod.updateMany({
              where: {
                destination: destination,
                method: alertMethod as AlertMethodMethod,
              },
              data: {
                failCount: {
                  increment: 1,
                },
              },
            });
          }
        } catch (error) {
          logger(`Error processing notification ${notification.id}:`, 'error');
        }
      }),
    );

    // skip += take; No need to skip take as we update the notifications to isDelivered = true
    // wait .7 seconds before starting the next round to ensure we aren't hitting any rate limits.
    // Todo: make this configurable and adjust as needed.
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  return successCount;
};

export default sendNotifications;
