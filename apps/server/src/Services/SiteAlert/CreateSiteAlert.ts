import {Prisma} from '@prisma/client';
import {prisma} from '../../server/db';
import {logger} from '../../../src/server/logger';
import {type GeoEventProviderClientId} from '../../Interfaces/GeoEventProvider';

/**
 * Result interface for site alert creation operations
 */
export interface SiteAlertCreationResult {
  totalAlertsCreated: number;
  batchesProcessed: number;
  processingDuration?: number;
  errors?: string[];
}

/**
 * Creates site alerts by matching unprocessed geo-events with monitored sites
 * @param geoEventProviderId - The unique ID of the provider
 * @param geoEventProviderClientId - The client ID of the geo-event provider
 * @param slice - The geographic slice identifier
 * @returns Creation result with counts, duration, and any errors
 */
const createSiteAlerts = async (
  geoEventProviderId: string,
  geoEventProviderClientId: GeoEventProviderClientId,
  slice: string,
): Promise<SiteAlertCreationResult> => {
  const startTime = Date.now();
  const errors: string[] = [];
  let totalSiteAlertsCreatedCount = 0;
  let batchesProcessed = 0;
  let geoEventBatch: number = 1000;
  let moreToProcess = true;

  try {
    // Automatically process any unprocessed geoEvents older than 24 hours ago.
    await prisma.$executeRaw`
        UPDATE "GeoEvent"
        SET "isProcessed" = true
        WHERE "isProcessed" = false
          AND "eventDate" < NOW() - INTERVAL '24 HOURS';
    `;
  } catch (error) {
    const errorMessage = `Failed to cleanup stale events: ${
      error instanceof Error ? error.message : String(error)
    }`;
    errors.push(errorMessage);
    logger(errorMessage, 'error');
  }

  // Use a different SQL for GEOSTATIONARY satellite
  if (geoEventProviderClientId === 'GEOSTATIONARY') {
    geoEventBatch = 500;
    while (moreToProcess) {
      try {
        const unprocessedGeoEvents = await prisma.geoEvent.findMany({
          where: {
            isProcessed: false,
            geoEventProviderId: geoEventProviderId,
          },
          select: {
            id: true,
          },
          take: geoEventBatch,
        });

        if (unprocessedGeoEvents.length === 0) {
          moreToProcess = false;
          continue; // Skip the current iteration of the loop
          // Since moreToProcess is false, continue will end the while clause here
        }

        const unprocessedGeoEventIds = unprocessedGeoEvents.map(
          geoEvent => geoEvent.id,
        );

        try {
          const siteAlertCreationQuery = Prisma.sql`INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
        SELECT
            gen_random_uuid(),
            e.type,
            FALSE,
            e."eventDate",
            ${geoEventProviderClientId},
            e.confidence,
            e.latitude,
            e.longitude,
            s.id AS SiteId,
            e.data,
            ST_Distance(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex'))) AS distance
        FROM
            "GeoEvent" e
        CROSS JOIN 
            "Site" s,
            jsonb_array_elements_text(s."geometry"->'properties'->'detection_geometry') AS dg_elem
        WHERE
            e.id IN (${Prisma.join(unprocessedGeoEventIds)})
            AND s."type" = 'MultiPolygon'
            AND s."deletedAt" IS NULL
            AND s."isMonitored" = TRUE
            AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
            AND e."isProcessed" = FALSE
            AND e. "geoEventProviderId" = ${geoEventProviderId}
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(s.slices) AS slice_element
              WHERE slice_element = ANY(string_to_array(${Prisma.raw(
                `'${slice}'`,
              )}, ',')::text[])
            )
            AND ST_Within(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex')))
            AND NOT EXISTS (
                SELECT 1
                FROM "SiteAlert"
                WHERE "SiteAlert".longitude = e.longitude
                    AND "SiteAlert".latitude = e.latitude
                    AND "SiteAlert"."eventDate" = e."eventDate"
                    AND "SiteAlert"."siteId" = s.id
            )
        
        UNION
        
        SELECT
            gen_random_uuid(),
            e.type,
            FALSE,
            e."eventDate",
            ${geoEventProviderClientId},
            e.confidence,
            e.latitude,
            e.longitude,
            s.id AS SiteId,
            e.data,
            ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
        FROM
            "GeoEvent" e
        INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
            AND e.id IN (${Prisma.join(unprocessedGeoEventIds)})
            AND s."deletedAt" IS NULL
            AND s."isMonitored" = TRUE
            AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
            AND e."isProcessed" = FALSE
            AND e. "geoEventProviderId" = ${geoEventProviderId}
            AND (s.type = 'Polygon' OR s.type = 'Point')
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(s.slices) AS slice_element
              WHERE slice_element = ANY(string_to_array(${Prisma.raw(
                `'${slice}'`,
              )}, ',')::text[])
            )
            AND NOT EXISTS (
                SELECT 1
                FROM "SiteAlert"
                WHERE "SiteAlert".longitude = e.longitude
                    AND "SiteAlert".latitude = e.latitude
                    AND "SiteAlert"."eventDate" = e."eventDate"
                    AND "SiteAlert"."siteId" = s.id
            );
        `;

          const updateGeoEventIsProcessedToTrue = Prisma.sql`
          UPDATE "GeoEvent" 
          SET "isProcessed" = true 
          WHERE id IN (${Prisma.join(unprocessedGeoEventIds)})`;
          // REMOVE after 2nd release
          const updateGeostationarySiteAlertIsProcessedToTrue = Prisma.sql`UPDATE "SiteAlert" SET "isProcessed" = true WHERE "isProcessed" = false AND "detectedBy" = ${geoEventProviderClientId}`;
          // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
          // And, Set all GeoEvents as processed
          const results = await prisma.$transaction([
            prisma.$executeRaw(siteAlertCreationQuery),
            prisma.$executeRaw(updateGeoEventIsProcessedToTrue),
          ]);
          await prisma.$executeRaw(
            updateGeostationarySiteAlertIsProcessedToTrue,
          );
          const siteAlertsCreatedInBatchCount = results[0] as number;
          totalSiteAlertsCreatedCount += siteAlertsCreatedInBatchCount;
          batchesProcessed++;
        } catch (error) {
          const errorMessage = `Failed to create SiteAlerts for GEOSTATIONARY batch ${
            batchesProcessed + 1
          }: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMessage);
          logger(errorMessage, 'error');
          // Continue processing remaining batches
          batchesProcessed++;
        }
      } catch (error) {
        const errorMessage = `Failed to fetch unprocessed events for GEOSTATIONARY: ${
          error instanceof Error ? error.message : String(error)
        }`;
        errors.push(errorMessage);
        logger(errorMessage, 'error');
        moreToProcess = false;
      }
    }
  } else {
    // Non-geostationary satellites do not belong to a specific site
    geoEventBatch = 1000;
    while (moreToProcess) {
      try {
        const unprocessedGeoEvents = await prisma.geoEvent.findMany({
          where: {
            isProcessed: false,
            geoEventProviderId: geoEventProviderId,
          },
          select: {
            id: true,
          },
          take: geoEventBatch,
        });

        if (unprocessedGeoEvents.length === 0) {
          moreToProcess = false;
          continue; // Skip the current iteration of the loop
          // Since moreToProcess is false, continue will end the while clause here
        }

        const unprocessedGeoEventIds = unprocessedGeoEvents.map(
          geoEvent => geoEvent.id,
        );

        try {
          const siteAlertCreationQuery = Prisma.sql`INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
    
        SELECT
            gen_random_uuid(),
            e.type,
            FALSE,
            e."eventDate",
            ${geoEventProviderClientId},
            e.confidence,
            e.latitude,
            e.longitude,
            s.id AS SiteId,
            e.data,
            ST_Distance(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex'))) AS distance
        FROM
            "GeoEvent" e
        CROSS JOIN 
            "Site" s,
            jsonb_array_elements_text(s."geometry"->'properties'->'detection_geometry') AS dg_elem
        WHERE
            e.id IN (${Prisma.join(unprocessedGeoEventIds)})
            AND s."type" = 'MultiPolygon'
            AND s."deletedAt" IS NULL
            AND s."isMonitored" = TRUE
            AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
            AND e."isProcessed" = FALSE
            AND e. "geoEventProviderId" = ${geoEventProviderId}
            AND s.slices @> ('["' || ${slice} || '"]')::jsonb
            AND ST_Within(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex')))
            AND NOT EXISTS (
                SELECT 1
                FROM "SiteAlert"
                WHERE "SiteAlert".longitude = e.longitude
                    AND "SiteAlert".latitude = e.latitude
                    AND "SiteAlert"."eventDate" = e."eventDate"
                    AND "SiteAlert"."siteId" = s.id
            )
        
        UNION
        
        SELECT
            gen_random_uuid(),
            e.type,
            FALSE,
            e."eventDate",
            ${geoEventProviderClientId},
            e.confidence,
            e.latitude,
            e.longitude,
            s.id AS SiteId,
            e.data,
            ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
        FROM
            "GeoEvent" e
        INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
            AND e.id IN (${Prisma.join(unprocessedGeoEventIds)})
            AND s."deletedAt" IS NULL
            AND s."isMonitored" = TRUE
            AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
            AND e."isProcessed" = FALSE
            AND e. "geoEventProviderId" = ${geoEventProviderId}
            AND s.slices @> ('["' || ${slice} || '"]')::jsonb
            AND (s.type = 'Polygon' OR s.type = 'Point')
            AND NOT EXISTS (
                SELECT 1
                FROM "SiteAlert"
                WHERE "SiteAlert".longitude = e.longitude
                    AND "SiteAlert".latitude = e.latitude
                    AND "SiteAlert"."eventDate" = e."eventDate"
                    AND "SiteAlert"."siteId" = s.id
            );
        `;

          const updateGeoEventIsProcessedToTrue = Prisma.sql`UPDATE "GeoEvent" SET "isProcessed" = true WHERE "isProcessed" = false AND "geoEventProviderId" = ${geoEventProviderId} AND "slice" = ${slice}`;

          // Create SiteAlerts by joining New GeoEvents and Sites that have the event's location in their proximity
          // And, Set all GeoEvents as processed
          const results = await prisma.$transaction([
            prisma.$executeRaw(siteAlertCreationQuery),
            prisma.$executeRaw(updateGeoEventIsProcessedToTrue),
          ]);
          const siteAlertsCreatedInBatchCount = results[0] as number;
          totalSiteAlertsCreatedCount += siteAlertsCreatedInBatchCount;
          batchesProcessed++;
        } catch (error) {
          const errorMessage = `Failed to create SiteAlerts for batch ${
            batchesProcessed + 1
          }: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMessage);
          logger(errorMessage, 'error');
          // Continue processing remaining batches
          batchesProcessed++;
        }
      } catch (error) {
        const errorMessage = `Failed to fetch unprocessed events: ${
          error instanceof Error ? error.message : String(error)
        }`;
        errors.push(errorMessage);
        logger(errorMessage, 'error');
        moreToProcess = false;
      }
    }
  }

  const processingDuration = Date.now() - startTime;

  return {
    totalAlertsCreated: totalSiteAlertsCreatedCount,
    batchesProcessed,
    processingDuration,
    errors: errors.length > 0 ? errors : undefined,
  };
};

export default createSiteAlerts;
