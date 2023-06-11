import { Prisma, PrismaClient } from "@prisma/client";
import notificationEmitter from "../../Events/EventEmitter/NotificationEmitter";
import { NOTIFICATION_CREATED } from "../../Events/messageConstants";
const prisma = new PrismaClient();

const createSiteAlerts = async (geoEventProviderId: string, slice: string) => {
    let siteAlertsCreated:number = 0;
    try {
        const siteAlertCreationQuery = Prisma.sql`
        INSERT INTO "SiteAlert" (id, type, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance") 
        SELECT gen_random_uuid(), e.type, false, e."eventDate", e."identityGroup"::"GeoEventDetectionInstrument", e.confidence, e.latitude, e.longitude, s.id, e.data, ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") as distance 
            FROM "GeoEvent" e 
                INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AND s."deletedAt" IS NULL AND s."isMonitored" = TRUE
                WHERE e."isProcessed" = false 
                AND (
                    e.slice = ANY(array(SELECT jsonb_array_elements_text(slices)))
                    OR '0' = ANY(array(SELECT jsonb_array_elements_text(slices)))
                )
                AND NOT EXISTS ( 
                    SELECT 1 
                    FROM "SiteAlert" 
                    WHERE 
                    "SiteAlert".longitude = e.longitude 
                    AND "SiteAlert".latitude = e.latitude 
                    AND "SiteAlert"."eventDate" = e."eventDate" 
                )`;        
        const updateGeoEventIsProcessedToTrue = Prisma.sql`UPDATE "GeoEvent" SET "isProcessed" = true WHERE "isProcessed" = false AND "geoEventProviderId" = ${geoEventProviderId} AND "slice" = ${slice}`;

        // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
        siteAlertsCreated = await prisma.$executeRaw(siteAlertCreationQuery);
        // DEBUG: SiteAlerts can be created twice with the same data.

        // Set all GeoEvents as processed
        await prisma.$executeRaw(updateGeoEventIsProcessedToTrue);
        
    } catch (error) {
        console.log(error)
    }
    if(siteAlertsCreated > 0){
        notificationEmitter.emit(NOTIFICATION_CREATED);
    }
}

export default createSiteAlerts;