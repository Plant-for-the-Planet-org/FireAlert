import {type PrismaClient} from '@prisma/client';
import {type GeoEventInterface as GeoEvent} from '../Interfaces/GeoEvent';
import {AlertType} from '../Interfaces/SiteAlert';

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
   * @param providerId - The provider ID to filter by
   * @param sinceHours - Number of hours to look back (default: 30)
   * @returns Array of existing event IDs
   */
  async fetchExistingIds(
    providerId: string,
    sinceHours = 30,
  ): Promise<string[]> {
    const geoEvents = await this.prisma.geoEvent.findMany({
      select: {id: true},
      where: {
        geoEventProviderId: providerId,
        eventDate: {gt: new Date(Date.now() - sinceHours * 60 * 60 * 1000)},
      },
    });

    return geoEvents.map(geoEvent => geoEvent.id);
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
  async markStaleAsProcessed(hoursOld: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "GeoEvent"
      SET "isProcessed" = true
      WHERE "isProcessed" = false
        AND "eventDate" < NOW() - INTERVAL '${hoursOld} HOURS';
    `;
  }
}
