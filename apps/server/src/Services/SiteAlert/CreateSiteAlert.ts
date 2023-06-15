import { Prisma } from "@prisma/client";
import { prisma } from '../../server/db'
import { logger } from "../../../src/server/logger";

const createSiteAlerts = async (geoEventProviderId: string, slice: string) => {
    let siteAlertsCreatedCount = 0;
    try {
        const siteAlertCreationQuery = Prisma.sql`
            INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
            SELECT
                gen_random_uuid (),
                e.type,
                FALSE,
                e. "eventDate",
                e. "identityGroup"::"GeoEventDetectionInstrument",
                e.confidence,
                e.latitude,
                e.longitude,
                s.id,
                e.data,
                ST_Distance(ST_SetSRID (e.geometry, 4326), s. "detectionGeometry") AS distance
            FROM
                "GeoEvent" e
                INNER JOIN "Site" s ON ST_Within(ST_SetSRID (e.geometry, 4326), s. "detectionGeometry")
                    AND s. "deletedAt" IS NULL
                    AND s. "isMonitored" = TRUE
            WHERE
                e. "isProcessed" = FALSE
                AND e. "geoEventProviderId" = ${geoEventProviderId}
                AND s.slices @> ('["' || ${slice} || '"]')::jsonb
                AND NOT EXISTS (
                    SELECT
                        1
                    FROM
                        "SiteAlert"
                    WHERE
                        "SiteAlert".longitude = e.longitude
                        AND "SiteAlert".latitude = e.latitude
                        AND "SiteAlert"."eventDate" = e. "eventDate")`;


        const updateGeoEventIsProcessedToTrue = Prisma.sql`UPDATE "GeoEvent" SET "isProcessed" = true WHERE "isProcessed" = false AND "geoEventProviderId" = ${geoEventProviderId} AND "slice" = ${slice}`;

        // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
        siteAlertsCreatedCount = await prisma.$executeRaw(siteAlertCreationQuery);

        // Set all GeoEvents as processed
        await prisma.$executeRaw(updateGeoEventIsProcessedToTrue);
    } catch (error) {
        logger(`Failed to create SiteAlerts. Error: ${error}`, "error");
    }
    return siteAlertsCreatedCount;
}

export default createSiteAlerts;