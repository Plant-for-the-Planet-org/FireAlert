import { PrismaClient } from "@prisma/client";
import NotifierRegistry from "./Notifier/NotifierRegistry";

const prisma = new PrismaClient();

const matchGeoEvents = async () => {
    debugger;
    const getSiteAlertCreationQuery = (): string => {
        return `
            INSERT INTO "SiteAlert" (id, type, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
            SELECT gen_random_uuid(), e.type, false, e."eventDate", e."detectedBy",e.confidence, e.latitude, e.longitude, s.id, e.data, ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") as distance
            FROM "GeoEvent" e
                    INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
            WHERE e."isProcessed" = false
            AND NOT EXISTS (
            SELECT 1
            FROM "SiteAlert"
            WHERE "SiteAlert"."isProcessed" = false
                AND "SiteAlert".longitude = e.longitude
                AND "SiteAlert".latitude = e.latitude
                AND "SiteAlert"."eventDate" = e."eventDate"
            )`;
    }

    const getNotificationCreationQuery = (): string => {
        return `
            INSERT INTO "Notification" (id, "siteAlertId", "alertMethod", destination, "isDelivered")
            SELECT gen_random_uuid(), a.id, m.method, m.destination, false
                FROM "SiteAlert" a
            INNER JOIN "Site" s ON a."siteId" = s.id
            INNER JOIN "AlertMethod" m ON m."userId" = s."userId"
            WHERE a."isProcessed" = false
            AND m."isEnabled" = true
            AND m."isVerified" = true`;
    }

    // create SiteAlerts by joining New GeoEvents and Site that have the event's location in their proximity
    prisma.$queryRawUnsafe(getSiteAlertCreationQuery());
    // set all GeoEvents as processed
    prisma.$queryRawUnsafe('UPDATE "GeoEvent" SET "isProcessed"=true WHERE "isProcessed"=false');

    // create Notifications for all unprocessed SiteAlerts
    prisma.$queryRawUnsafe(getNotificationCreationQuery());

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
            const { confidence, data, type, longitude, latitude, distance } = siteAlert;

            const notifier = NotifierRegistry.get(alertMethod);
            const isDelivered = notifier.notify(destination, `${type} at [${longitude},${latitude}] ${distance}m from your site with ${confidence} confidence`)

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