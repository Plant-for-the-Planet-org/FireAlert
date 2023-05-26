import { Prisma, PrismaClient } from "@prisma/client";
import NotifierRegistry from "./Notifier/NotifierRegistry";
import { NotificationParameters } from "../Interfaces/NotificationParameters";
import DataRecord from "../Interfaces/DataRecord";

const prisma = new PrismaClient();

const matchGeoEvents = async () => {

    const siteAlertCreationQuery = Prisma.sql`
        INSERT INTO "SiteAlert" (id, type, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance") 
        SELECT gen_random_uuid(), e.type, false, e."eventDate", e."identityGroup"::"GeoEventDetectionInstrument", e.confidence, e.latitude, e.longitude, s.id, e.data, ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") as distance 
            FROM "GeoEvent" e 
                INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") 
                WHERE e."isProcessed" = false AND NOT EXISTS ( 
                    SELECT 1 
                    FROM "SiteAlert" WHERE "SiteAlert"."isProcessed" = false AND "SiteAlert".longitude = e.longitude AND "SiteAlert".latitude = e.latitude AND "SiteAlert"."eventDate" = e."eventDate" 
                    )`;

    const updateIsProcessedToTrue = Prisma.sql`UPDATE "GeoEvent" SET "isProcessed" = true WHERE "isProcessed" = false`;

    const notificationCreationQuery = Prisma.sql`
        INSERT INTO "Notification" (id, "siteAlertId", "alertMethod", destination, "isDelivered") 
        SELECT gen_random_uuid(), a.id, m.method, m.destination, false 
            FROM "SiteAlert" a 
                INNER JOIN "Site" s ON a."siteId" = s.id 
                INNER JOIN "AlertMethod" m ON m."userId" = s."userId" 
                    WHERE a."isProcessed" = false AND m."isEnabled" = true AND m."isVerified" = true`;

    // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
    await prisma.$executeRaw(siteAlertCreationQuery);

    // Set all GeoEvents as processed
    await prisma.$executeRaw(updateIsProcessedToTrue);

    // Create Notifications for all unprocessed SiteAlerts
    await prisma.$executeRaw(notificationCreationQuery);




    // get all undelivered Notifications
    try {
        // TODO: in case we implement a max retry-count, filter by retryCount < max_retry_count
        const notifications = await prisma.notification.findMany({
            where: {
                isDelivered: false
            },
            include: {
                siteAlert: true
            }
        })

        await Promise.all(notifications.map(async (notification) => {
            const { id, alertMethod, destination, siteAlert, siteAlertId } = notification;
            const { id: alertId, siteId: siteId, confidence, data, type, longitude, latitude, distance, detectedBy, eventDate } = siteAlert;

            // use the alertId to find the site associated with it.
            const site = await prisma.site.findFirst({
                where: {
                    alerts: {
                        some: {
                            id: siteAlertId
                        }
                    }
                }
            });
            const siteName = site!.name ? site!.name : "";
            const subject = `Heat anomaly near ${siteName} 🔥`;
            const message = `Detected ${distance} km outside ${siteName} with ${confidence} confidence. Check ${latitude}, ${longitude} for fires.`;
            const url = `https://firealert.plant-for-the-planet.org/alert/${alertId}`;

            const notificationParameters: NotificationParameters = {
                message: message,
                subject: subject,
                url: url,
                alertId: alertId,
                type: type,
                confidence: confidence,
                detectedBy: detectedBy,
                eventDate: eventDate,
                longitude: longitude,
                latitude: latitude,
                distance: distance,
                data: data as DataRecord,
                siteName: siteName,
                siteId: site!.id
            }

            const notifier = NotifierRegistry.get(alertMethod);
            const isDelivered = await notifier.notify(destination, notificationParameters)

            if (isDelivered) {
                const response = await prisma.notification.update({
                    where: { id: id },
                    data: {
                        isDelivered: true
                    }
                })
                const a = response;
            } else {
                // increment the retry count if a pre-defined limit has not been reached
            }
        }));
    } catch (error) {
        console.log(error)
    }
}

export default matchGeoEvents;