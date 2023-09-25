// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/unprocessed-sites-alert-checker

import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../server/db'
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import { Prisma } from "@prisma/client";

// Run this cron every x minutes.
// This cron will fetch sites that are unprocessed, and check if there are any existing fires on those sites
// If there is a fire, then create an alert for the site.

export default async function (req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
            return;
        }
    }
    try {
        let siteAlertsCreatedCount = 0;
        const unprocessedSites = await prisma.site.findMany({
            where: {
                siteProcessed: null,
            }
        })

        if (unprocessedSites.length > 0) {
            // Make a list of siteIds from unprocessedSites
            const ids_unprocessedSite = unprocessedSites.map(site => site.id)
            console.log(ids_unprocessedSite.length)
            
            // Check for fires within the sites
            const siteAlertCreationQuery = Prisma.sql`
                INSERT INTO "SiteAlert" (id, "type", "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
                SELECT
                    gen_random_uuid(),
                    e.type,
                    FALSE,
                    e."eventDate",
                    e."geoEventProviderClientId",
                    e.confidence,
                    e.latitude,
                    e.longitude,
                    s.id,
                    e.data,
                    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
                FROM
                    "GeoEvent" e
                    INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
                        AND s."deletedAt" IS NULL
                        AND s.id IN (${Prisma.join(ids_unprocessedSite)})
                        AND s."isMonitored" IS TRUE
                WHERE
                    e."isProcessed" = TRUE
                    AND (
                        e.slice = ANY(array(SELECT jsonb_array_elements_text(slices)))
                        OR '0' = ANY(array(SELECT jsonb_array_elements_text(slices)))
                    )
                    AND NOT EXISTS (
                        SELECT
                            1
                        FROM
                            "SiteAlert"
                        WHERE
                            "SiteAlert".longitude = e.longitude
                            AND "SiteAlert".latitude = e.latitude
                            AND "SiteAlert"."eventDate" = e."eventDate"
                    );
            `;
            const results = await prisma.$transaction([
                prisma.$executeRaw(siteAlertCreationQuery),
                prisma.site.updateMany({
                    where: {
                        id: {
                            in: ids_unprocessedSite,
                        },
                    },
                    data: {
                        siteProcessed: new Date()
                    }
                })
            ])
            siteAlertsCreatedCount = results[0]
            logger(`Unprocessed Sites have been checked for alerts and processed. ${siteAlertsCreatedCount} Site Alerts created`, 'info');
            res.status(200).json({ message: 'UnProcessed Sites processed for alerts successfully' });
        } else {
            res.status(200).json({ message: 'No unprocessed sites found' });
        }
    } catch (error) {
        logger(`Internal Server Error in Unprocessed-site-alert-checker Cron: ${error}`, 'error');
        res.status(500).json({ message: 'Internal Server Error' });
    }
}