import {type PrismaClient, Prisma} from '@prisma/client';
import {logger} from '../../server/logger';

/**
 * Repository for SiteAlert data access operations.
 * Handles provider-specific SQL queries with PostGIS spatial joins.
 */
export class SiteAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds SiteAlerts by their associated GeoEvent IDs.
   * Used for incident processing after alert creation.
   *
   * @param eventIds - Array of GeoEvent IDs
   * @returns Array of SiteAlerts
   */
  async findAlertsByEventIds(eventIds: string[]): Promise<any[]> {
    try {
      const alerts = await this.prisma.$queryRaw`
        SELECT sa.*
        FROM "SiteAlert" sa
        INNER JOIN "GeoEvent" ge ON 
          sa.latitude = ge.latitude 
          AND sa.longitude = ge.longitude 
          AND sa."eventDate" = ge."eventDate"
        WHERE ge.id IN (${Prisma.join(eventIds)})
        ORDER BY sa."createdAt" DESC
      `;
      return alerts;
    } catch (error) {
      logger(`Failed to find alerts by event IDs. Error: ${error}`, 'error');
      return [];
    }
  }

  /**
   * Creates site alerts for GEOSTATIONARY providers using spatial joins.
   * GEOSTATIONARY providers have different slice membership logic.
   *
   * @param eventIds - Array of GeoEvent IDs to process
   * @param providerId - The provider ID
   * @param clientId - The client ID (should be 'GEOSTATIONARY')
   * @param slice - The slice value
   * @returns Number of alerts created
   */
  async createAlertsForGeostationary(
    eventIds: string[],
    providerId: string,
    clientId: string,
    slice: string,
  ): Promise<number> {
    try {
      const siteAlertCreationQuery = Prisma.sql`INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
      SELECT
          gen_random_uuid(),
          e.type,
          FALSE,
          e."eventDate",
          ${clientId},
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
          e.id IN (${Prisma.join(eventIds)})
          AND s."type" = 'MultiPolygon'
          AND s."deletedAt" IS NULL
          AND s."isMonitored" = TRUE
          AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
          AND e."isProcessed" = FALSE
          AND e. "geoEventProviderId" = ${providerId}
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
          ${clientId},
          e.confidence,
          e.latitude,
          e.longitude,
          s.id AS SiteId,
          e.data,
          ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
      FROM
          "GeoEvent" e
      INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
          AND e.id IN (${Prisma.join(eventIds)})
          AND s."deletedAt" IS NULL
          AND s."isMonitored" = TRUE
          AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
          AND e."isProcessed" = FALSE
          AND e. "geoEventProviderId" = ${providerId}
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
        WHERE id IN (${Prisma.join(eventIds)})`;

      const updateGeostationarySiteAlertIsProcessedToTrue = Prisma.sql`UPDATE "SiteAlert" SET "isProcessed" = true WHERE "isProcessed" = false AND "detectedBy" = ${clientId}`;

      const results = await this.prisma.$transaction([
        this.prisma.$executeRaw(siteAlertCreationQuery),
        this.prisma.$executeRaw(updateGeoEventIsProcessedToTrue),
      ]);

      await this.prisma.$executeRaw(
        updateGeostationarySiteAlertIsProcessedToTrue,
      );

      const alertsCreated = results[0];

      return alertsCreated;
    } catch (error) {
      logger(
        `Failed to create SiteAlerts for GEOSTATIONARY. Error: ${error}`,
        'error',
      );
      return 0;
    }
  }

  /**
   * Creates site alerts for POLAR (non-geostationary) providers using spatial joins.
   * POLAR providers use different slice membership logic.
   *
   * @param eventIds - Array of GeoEvent IDs to process
   * @param providerId - The provider ID
   * @param clientId - The client ID
   * @param slice - The slice value
   * @returns Number of alerts created
   */
  async createAlertsForPolar(
    eventIds: string[],
    providerId: string,
    clientId: string,
    slice: string,
  ): Promise<number> {
    try {
      const siteAlertCreationQuery = Prisma.sql`INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
  
      SELECT
          gen_random_uuid(),
          e.type,
          FALSE,
          e."eventDate",
          ${clientId},
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
          e.id IN (${Prisma.join(eventIds)})
          AND s."type" = 'MultiPolygon'
          AND s."deletedAt" IS NULL
          AND s."isMonitored" = TRUE
          AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
          AND e."isProcessed" = FALSE
          AND e. "geoEventProviderId" = ${providerId}
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
          ${clientId},
          e.confidence,
          e.latitude,
          e.longitude,
          s.id AS SiteId,
          e.data,
          ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
      FROM
          "GeoEvent" e
      INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
          AND e.id IN (${Prisma.join(eventIds)})
          AND s."deletedAt" IS NULL
          AND s."isMonitored" = TRUE
          AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
          AND e."isProcessed" = FALSE
          AND e. "geoEventProviderId" = ${providerId}
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

      const updateGeoEventIsProcessedToTrue = Prisma.sql`UPDATE "GeoEvent" SET "isProcessed" = true WHERE id IN (${Prisma.join(
        eventIds,
      )})`;

      const results = await this.prisma.$transaction([
        this.prisma.$executeRaw(siteAlertCreationQuery),
        this.prisma.$executeRaw(updateGeoEventIsProcessedToTrue),
      ]);

      const alertsCreated = results[0];

      return alertsCreated;
    } catch (error) {
      logger(`Failed to create SiteAlerts for POLAR. Error: ${error}`, 'error');
      return 0;
    }
  }
}
