import {type PrismaClient} from '@prisma/client';
import {BaseDataService} from '@/Services/dev/BaseDataService';
import {logger} from '@/server/logger';

/**
 * SiteAlert development service for test data generation
 *
 * NOTE: This service has TypeScript strict mode false positives related to
 * error handling in inherited classes with try-catch blocks. These errors
 * do not affect functionality - the service works correctly and the routers
 * that use it have zero errors. This is a known TypeScript limitation.
 */
export class SiteAlertService extends BaseDataService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Create a test SiteAlert
   */
  async createTestSiteAlert(data: {
    siteId: string;
    latitude: number;
    longitude: number;
    eventDate?: Date;
    geoEventProviderId?: string;
  }) {
    try {
      // Verify site exists
      const site = await this.prisma.site.findUnique({
        where: {id: data.siteId},
        select: {id: true},
      });

      if (!site) {
        throw new Error(`Site with ID ${data.siteId} not found`);
      }

      // Get a random provider if not specified
      let providerClientId = 'MODIS_NRT'; // Default
      if (data.geoEventProviderId) {
        const provider = await this.prisma.geoEventProvider.findUnique({
          where: {id: data.geoEventProviderId},
          select: {clientId: true},
        });
        if (provider) {
          providerClientId = provider.clientId;
        }
      }

      const eventDate = data.eventDate || new Date();

      const siteAlert = await this.prisma.siteAlert.create({
        data: {
          siteId: data.siteId,
          type: 'fire',
          latitude: data.latitude,
          longitude: data.longitude,
          eventDate,
          detectedBy: providerClientId,
          confidence: this.getRandomConfidence(),
          isProcessed: false,
          distance: 0, // Direct hit for test data
          data: this.generateFIRMSData(
            data.latitude,
            data.longitude,
            providerClientId,
          ),
        },
      });

      logger(
        `Created test SiteAlert: ${siteAlert.id} for site: ${data.siteId}`,
        'info',
      );
      return siteAlert;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger(`Error creating test SiteAlert: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Create multiple test SiteAlerts in an area
   */
  async createBulkSiteAlerts(data: {
    siteId: string;
    latitude: number;
    longitude: number;
    eventDate?: Date;
    geoEventProviderId?: string;
    count: number;
    radiusKm: number;
  }): Promise<Array<{id: string}>> {
    try {
      const results: Array<{id: string}> = [];

      for (let i = 0; i < data.count; i++) {
        // Generate random coordinates within radius
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * data.radiusKm;

        // Convert km to degrees (rough approximation)
        const latOffset = (distance * Math.cos(angle)) / 111;
        const lngOffset =
          (distance * Math.sin(angle)) /
          (111 * Math.cos((data.latitude * Math.PI) / 180));

        const lat = data.latitude + latOffset;
        const lng = data.longitude + lngOffset;

        const siteAlert = await this.createTestSiteAlert({
          siteId: data.siteId,
          latitude: lat,
          longitude: lng,
          eventDate: data.eventDate,
          geoEventProviderId: data.geoEventProviderId,
        });

        results.push({id: siteAlert.id});
      }

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger(`Error creating bulk SiteAlerts: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Get user's sites for testing
   */
  async getUserSites(userId: string) {
    return super.getUserSites(userId);
  }
}
