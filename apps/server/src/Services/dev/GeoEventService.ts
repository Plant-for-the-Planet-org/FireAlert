import {type PrismaClient} from '@prisma/client';
import {BaseDataService} from './BaseDataService';
import {logger} from '../../../server/logger';

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
        const providers = await this.getAvailableProviders();

        if (providers.length === 0) {
          throw new Error('No active GeoEvent providers found');
        }

        const randomProvider =
          providers[Math.floor(Math.random() * providers.length)];
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
          geometry: `POINT (${data.longitude} ${data.latitude})`,
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
      logger(
        `Error creating test GeoEvent: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }
}
