import { type AlertMethodMethod } from "@prisma/client";
import NotifierRegistry from "../Notifier/NotifierRegistry";
import { type NotificationParameters } from "../../Interfaces/NotificationParameters";
import type DataRecord from "../../Interfaces/DataRecord";
import { prisma } from '../../server/db'
import { logger } from "../../server/logger";

// get all undelivered Notifications and using relation from SiteAlert, get the data on Site
// for each notification, send the notification to the destination
// After sending notification update the notification table to set isDelivered to true and sentAt to current time
// If notification fails to send, increment the failCount in all alertMethods table where destination and method match.
const sendNotifications = async () => {
    let skip = 0;
    const take = 20;

    while (true) {
        const notifications = await prisma.notification.findMany({
            where: {
                isDelivered: false,
                sentAt: null,
            },
            include: {
                siteAlert: {
                    include: {
                        site: true
                    }
                }
            },
            skip: skip,
            take: take,
        });

        // If no notifications are found, exit the loop
        if (notifications.length === 0) {
            logger(`No notifications found. Terminating Cron.`, "info");
            break;
        }
        logger(`Notifications to be sent: ${notifications.length}`, "info");
        console.log(`Notifications to be sent: ${notifications.length}`);

        await Promise.all(notifications.map(async (notification) => {
            try {
                const { id, alertMethod, destination, siteAlert } = notification;
                const { id: alertId, confidence, data, type, longitude, latitude, distance, detectedBy, eventDate, site } = siteAlert;

                // if distance = 0 then the fire is inside the site's original geometry
                // if distance > 0 then the fire is outside the site's original geometry
                // message should change depending on the distance

                const distanceKm = Math.round(distance / 1000);
                const siteName = site.name ? site.name : "";
                const subject = `Heat anomaly near ${siteName} 🔥`;

                let message = `Detected ${distanceKm} km outside ${siteName} with ${confidence} confidence. Check ${latitude}, ${longitude} for fires.`;

                if (distance == 0) {
                    message = `Detected inside ${siteName} with ${confidence} confidence. Check ${latitude}, ${longitude} for fires.`;
                }

                const url = `https://firealert.plant-for-the-planet.org/alert/${alertId}`;

                const notificationParameters: NotificationParameters = {
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
                        data: data as DataRecord
                    }
                }
                const notifier = NotifierRegistry.get(alertMethod);

                const isDelivered = await notifier.notify(destination, notificationParameters)

                // Update notification's isDelivered status and sentAt
                if (isDelivered === true) {
                    await prisma.notification.update({
                        where: { id: id },
                        data: {
                            isDelivered: true,
                            sentAt: new Date()
                        }
                    })
                } else {
                    await prisma.alertMethod.updateMany({
                        where: {
                            destination: destination,
                            method: alertMethod as AlertMethodMethod
                        },
                        data: {
                            failCount: {
                                increment: 1
                            }
                        }
                    })
                }
            } catch (error) {
                console.error(`Error processing notification ${notification.id}:`, error);
                logger(`Error processing notification ${notification.id}:`, "error");
            }
        }));

        // Increase the number of notifications to skip in the next round
        skip += take;
    }
}

export default sendNotifications;