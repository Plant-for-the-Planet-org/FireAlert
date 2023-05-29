import { Prisma, PrismaClient } from "@prisma/client";
import NotifierRegistry from "./Notifier/NotifierRegistry";
import { NotificationParameters } from "../Interfaces/NotificationParameters";
import DataRecord from "../Interfaces/DataRecord";

const prisma = new PrismaClient();

const matchGeoEvents = async () => {
    try {
        const siteAlertCreationQuery = Prisma.sql`
        INSERT INTO "SiteAlert" (id, type, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance") 
        SELECT gen_random_uuid(), e.type, false, e."eventDate", e."identityGroup"::"GeoEventDetectionInstrument", e.confidence, e.latitude, e.longitude, s.id, e.data, ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") as distance 
            FROM "GeoEvent" e 
                INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AND s."deletedAt" IS NULL
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
                    WHERE a."isProcessed" = false AND a."deletedAt" IS NULL AND m."isEnabled" = true AND m."isVerified" = true`;

        const updateSiteAlertIsProcessedToTrue = Prisma.sql`UPDATE "SiteAlert" SET "isProcessed" = true WHERE "isProcessed" = false and "deletedAt" is null`;
        
        // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
        await prisma.$executeRaw(siteAlertCreationQuery);

        // Set all GeoEvents as processed
        await prisma.$executeRaw(updateIsProcessedToTrue);

        // Create Notifications for all unprocessed SiteAlerts
        await prisma.$executeRaw(notificationCreationQuery);

        // Set all SiteAlert as processed
        await prisma.$executeRaw(updateSiteAlertIsProcessedToTrue);

    } catch (error) {
        console.log(error)
    }


    // get all undelivered Notifications and using relation from SiteAlert, get the data on Site
    // for each notification, send the notification to the destination
    // After sending notification update the notification table to set isDelivered to true and sentAt to current time
    // If notification fails to send, increment the failCount in all alertMethods table where destination and method match.
    // 
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
    
        await Promise.all(notifications.map(async (notification) => {
            const { id, alertMethod, destination, siteAlert } = notification;
            const { id: alertId, confidence, data, type, longitude, latitude, distance, detectedBy, eventDate, site } = siteAlert;
            
            const siteName = site!.name ? site!.name : "";
            const subject = `Heat anomaly near ${siteName} 🔥`;
            const message = `Detected ${distance} km outside ${siteName} with ${confidence} confidence. Check ${latitude}, ${longitude} for fires.`;
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
                    siteId: site!.id,
                    siteName: siteName,
                    data: data as DataRecord
                }
            }
    
            const notifier = NotifierRegistry.get(alertMethod);
            const isDelivered = await notifier.notify(destination, notificationParameters)
    
            // Update notification's isDelivered status and sentAt
            await prisma.notification.update({
                where: { id: id },
                data: {
                    isDelivered: isDelivered,
                    sentAt: new Date()
                }
            })
    
            // If notification was not delivered, increment the failCount
            if (!isDelivered) {
                await prisma.alertMethod.updateMany({
                    where: {
                        destination: destination,
                        method: alertMethod
                    },
                    data: {
                        failCount: {
                            increment: 1
                        }
                    }
                })
                // TODO: increment the retry count if a pre-defined limit has not been reached
            }
        }));
    } catch (error) {
        console.log(error)
    }
    
}

export default matchGeoEvents;