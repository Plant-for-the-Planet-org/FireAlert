import { AlertMethodMethod, Prisma, PrismaClient } from "@prisma/client";
import NotifierRegistry from "../Notifier/NotifierRegistry";
import { NotificationParameters } from "../../Interfaces/NotificationParameters";
import DataRecord from "../../Interfaces/DataRecord";

const prisma = new PrismaClient();

const sendNotifications = async () => {
    debugger;
    // get all undelivered Notifications and using relation from SiteAlert, get the data on Site
    // for each notification, send the notification to the destination
    // After sending notification update the notification table to set isDelivered to true and sentAt to current time
    // If notification fails to send, increment the failCount in all alertMethods table where destination and method match.

    try {
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
            }
        });
        debugger;
        await Promise.all(notifications.map(async (notification) => {
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
            // Todo: Create a page that shows a simple map, with a coordinate and site geojson.
            // Show information about the fire, just like on the mobile app.

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
            debugger;
            const notifier = NotifierRegistry.get(alertMethod);

            debugger;
            const isDelivered = await notifier.notify(destination, notificationParameters)

            // Update notification's isDelivered status and sentAt
            await prisma.notification.update({
                where: { id: id },
                data: {
                    isDelivered: isDelivered,
                    sentAt: new Date()
                }
            })
            debugger;
            // If notification was not delivered, increment the failCount
            if (!isDelivered) {
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
                // TODO: increment the retry count if a pre-defined limit has not been reached
            }
            debugger;
        }));
    } catch (error) {
        console.log(error)
    }
}

export default sendNotifications;