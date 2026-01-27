import {type PrismaClient, type GeoEventProvider} from '@prisma/client';

/**
 * Repository for GeoEventProvider data access operations.
 * Centralizes all database queries related to GeoEventProvider.
 */
export class GeoEventProviderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds eligible providers that are due for processing.
   * A provider is eligible if:
   * - It is active
   * - It has a fetch frequency configured
   * - Its last run + fetch frequency is less than current time
   *
   * @param limit - Maximum number of providers to return
   * @returns Array of eligible GeoEventProvider records
   */
  async findEligibleProviders(limit: number): Promise<GeoEventProvider[]> {
    return await this.prisma.$queryRaw<GeoEventProvider[]>`
      SELECT *
      FROM "GeoEventProvider"
      WHERE "isActive" = true
        AND "fetchFrequency" IS NOT NULL
        AND ("lastRun" + ("fetchFrequency" || ' minutes')::INTERVAL) < (current_timestamp AT TIME ZONE 'UTC')
      ORDER BY (current_timestamp AT TIME ZONE 'UTC' - "lastRun") DESC
      LIMIT ${limit};
    `;
  }

  /**
   * Updates the lastRun timestamp for a provider.
   * @param providerId - The ID of the provider to update
   * @param timestamp - The new lastRun timestamp
   */
  async updateLastRun(providerId: string, timestamp: Date): Promise<void> {
    await this.prisma.geoEventProvider.update({
      where: {id: providerId},
      data: {lastRun: timestamp.toISOString()},
    });
  }
}
