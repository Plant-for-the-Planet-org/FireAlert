import {type PrismaClient} from '@prisma/client';
import {BaseDataService} from '@/Services/dev/BaseDataService';
import {logger} from '@/server/logger';

export class GeoEventService extends BaseDataService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Create a test GeoEvent
   */
  async createTestGeoEvent(data: {
    latitude: number;
    longitude: number;
    eventDate?: Date;
    geoEventProviderId?: string;
  }) {
    try {
      // Get a random provider if not specified
      let providerId = data.geoEventProviderId;
      if (!providerId) {
        const providers = await super.getAvailableProviders();

        if (providers.length === 0) {
          throw new Error('No active GeoEvent providers found');
        }

        const randomProvider =
          providers[Math.floor(Math.random() * providers.length)];
        if (!randomProvider) {
          throw new Error('Failed to select random provider');
        }
        providerId = randomProvider.id;
      }

      const provider = await this.prisma.geoEventProvider.findUnique({
        where: {id: providerId},
        select: {clientId: true},
      });

      if (!provider) {
        throw new Error(`GeoEvent provider with ID ${providerId} not found`);
      }

      const eventDate = data.eventDate || new Date();

      const geoEvent = await this.prisma.geoEvent.create({
        data: {
          type: 'fire',
          latitude: data.latitude,
          longitude: data.longitude,
          eventDate,
          confidence: this.getRandomConfidence(),
          isProcessed: false,
          geoEventProviderClientId: provider.clientId,
          geoEventProviderId: providerId,
          radius: this.getRandomRadius(),
          slice: this.getRandomSlice(),
          data: this.generateFIRMSData(
            data.latitude,
            data.longitude,
            provider.clientId,
          ),
        },
      });

      logger(`Created test GeoEvent: ${geoEvent.id}`, 'info');
      return geoEvent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger(`Error creating test GeoEvent: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Get available GeoEvent providers
   */
  async getAvailableProviders() {
    return super.getAvailableProviders();
  }
}
