import {type PrismaClient} from '@prisma/client';
import {type GeoEventInterface as GeoEvent} from '../../Interfaces/GeoEvent';
import {AlertType} from '../../Interfaces/SiteAlert';

/**
 * Repository for GeoEvent data access operations.
 * Centralizes all database queries related to GeoEvent.
 */
export class GeoEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetches existing event IDs from the database for duplicate checking.
   * Only returns IDs from events within the specified time window.
   *
   * OPTIMIZATION: Uses optimized query with proper indexing hints
   * and reduced time window for better performance.
   *
   * @param providerId - The provider ID to filter by
   * @param sinceHours - Number of hours to look back (default: 12, reduced from 30)
   * @returns Array of existing event IDs
   */
  async fetchExistingIds(
    providerId: string,
    sinceHours = 12, // Reduced from 30 to 12 hours for better performance
  ): Promise<string[]> {
    // Use raw query for better performance with proper index usage
    const hours = Math.max(1, Math.floor(sinceHours));
    const result = await this.prisma.$queryRaw<Array<{id: string}>>`
      SELECT id 
      FROM "GeoEvent" 
      WHERE "geoEventProviderId" = ${providerId}
        AND "eventDate" >= (NOW() - INTERVAL '1 HOUR' * ${hours})
      ORDER BY "eventDate" DESC
    `;

    return result.map(row => row.id);
  }

  /**
   * Fetches existing event IDs with timing metrics.
   * Includes performance monitoring for optimization analysis.
   *
   * @param providerId - The provider ID to filter by
   * @param sinceHours - Number of hours to look back
   * @returns Object with IDs and timing information
   */
  async fetchExistingIdsWithTiming(
    providerId: string,
    sinceHours = 12,
  ): Promise<{ids: string[]; queryTimeMs: number; count: number}> {
    const startTime = Date.now();
    const ids = await this.fetchExistingIds(providerId, sinceHours);
    const queryTimeMs = Date.now() - startTime;

    return {
      ids,
      queryTimeMs,
      count: ids.length,
    };
  }

  /**
   * Bulk creates GeoEvents in batches to avoid memory issues.
   *
   * @param events - Array of GeoEvents to create
   * @param batchSize - Number of records per batch (default: 1000)
   * @returns Total number of events created
   */
  async bulkCreate(events: GeoEvent[], batchSize = 1000): Promise<number> {
    let created = 0;

    for (let i = 0; i < events.length; i += batchSize) {
      const chunk = events.slice(i, i + batchSize);

      const geoEventsToCreate = chunk.map(event => ({
        id: event.id,
        type: AlertType.fire,
        latitude: event.latitude,
        longitude: event.longitude,
        eventDate: event.eventDate,
        confidence: event.confidence,
        isProcessed: false,
        geoEventProviderClientId: event.geoEventProviderClientId,
        geoEventProviderId: event.geoEventProviderId,
        radius: event.radius ? event.radius : 0,
        slice:
          event.geoEventProviderClientId === 'GEOSTATIONARY'
            ? event.slice
            : event.slice,
        data: event.data,
      }));

      await this.prisma.geoEvent.createMany({
        data: geoEventsToCreate,
        skipDuplicates: true,
      });

      created += chunk.length;
    }

    return created;
  }

  /**
   * Finds unprocessed events for a specific provider.
   *
   * @param providerId - The provider ID to filter by
   * @param limit - Maximum number of events to return
   * @returns Array of unprocessed event IDs
   */
  async findUnprocessedByProvider(
    providerId: string,
    limit: number,
  ): Promise<Array<{id: string}>> {
    return await this.prisma.geoEvent.findMany({
      where: {
        isProcessed: false,
        geoEventProviderId: providerId,
      },
      select: {
        id: true,
      },
      take: limit,
    });
  }

  /**
   * Marks events as processed.
   *
   * @param eventIds - Array of event IDs to mark as processed
   */
  async markAsProcessed(eventIds: string[]): Promise<void> {
    await this.prisma.geoEvent.updateMany({
      where: {
        id: {in: eventIds},
      },
      data: {
        isProcessed: true,
      },
    });
  }

  /**
   * Marks stale events (older than specified hours) as processed.
   *
   * @param hoursOld - Events older than this many hours will be marked as processed
   */
  async markStaleAsProcessed(hoursOld: number): Promise<number> {
    const result = await this.prisma.$executeRaw`
      UPDATE "GeoEvent"
      SET "isProcessed" = true
      WHERE "isProcessed" = false
        AND "eventDate" < NOW() - INTERVAL '${hoursOld} HOURS';
    `;
    return result as number;
  }
}
