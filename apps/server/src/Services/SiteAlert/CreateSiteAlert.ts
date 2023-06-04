import { Prisma, PrismaClient } from "@prisma/client";
import notificationEmitter from "../../Events/EventEmitter/NotificationEmitter";
import { NOTIFICATION_CREATED } from "../../Events/messageConstants";
const prisma = new PrismaClient();

const createSiteAlerts = async (identityGroup: string) => {
    try {
        debugger;
        const siteAlertCreationQuery = Prisma.sql`
        INSERT INTO "SiteAlert" (id, type, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance") 
        SELECT gen_random_uuid(), e.type, false, e."eventDate", e."identityGroup"::"GeoEventDetectionInstrument", e.confidence, e.latitude, e.longitude, s.id, e.data, ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") as distance 
            FROM "GeoEvent" e 
                INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AND s."deletedAt" IS NULL AND s."isMonitored" = TRUE
                WHERE e."isProcessed" = false AND NOT EXISTS ( 
                    SELECT 1 
                    FROM "SiteAlert" WHERE "SiteAlert"."isProcessed" = false AND "SiteAlert".longitude = e.longitude AND "SiteAlert".latitude = e.latitude AND "SiteAlert"."eventDate" = e."eventDate" 
                    )`;
        const updateGeoEventIsProcessedToTrue = Prisma.sql`UPDATE "GeoEvent" SET "isProcessed" = true WHERE "isProcessed" = false AND "identityGroup" = ${identityGroup}`;
        // Todo: Ensure we only mark GeoEvents as processed if they are from the same source as the SiteAlerts that were created from them
        // Break in a different function:
        // After Creating SiteAlerts, trigger a different event, to create AlertNotifications for each SiteAlert.
        // Break the process of sending Notifications from creation of Notifications.

        // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
        await prisma.$executeRaw(siteAlertCreationQuery);
        // DEBUG: SiteAlerts can be created twice with the same data.

        // Set all GeoEvents as processed
        await prisma.$executeRaw(updateGeoEventIsProcessedToTrue);
        
        debugger;
    } catch (error) {
        console.log(error)
    }

    notificationEmitter.emit(NOTIFICATION_CREATED);
}

export default createSiteAlerts;