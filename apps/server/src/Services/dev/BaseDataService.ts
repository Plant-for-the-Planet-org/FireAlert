import {type PrismaClient} from '@prisma/client';

/**
 * Base class for development data generation services
 */
export abstract class BaseDataService {
  constructor(protected readonly prisma: PrismaClient) {}

  /**
   * Generate random confidence level
   */
  protected getRandomConfidence(): 'high' | 'medium' | 'low' {
    const confidences: Array<'high' | 'medium' | 'low'> = [
      'high',
      'medium',
      'low',
    ];
    return confidences[Math.floor(Math.random() * confidences.length)];
  }

  /**
   * Generate random slice value
   */
  protected getRandomSlice(): string {
    const slices = ['1', '2', '8', '53']; // Common FIRMS slice values
    return slices[Math.floor(Math.random() * slices.length)];
  }

  /**
   * Generate random radius
   */
  protected getRandomRadius(): number {
    return Math.floor(Math.random() * 5); // 0-4 km radius
  }

  /**
   * Generate FIRMS-style data object
   */
  protected generateFIRMSData(
    lat: number,
    lng: number,
    providerClientId: string,
  ): Record<string, string | number | boolean> {
    const baseData: Record<string, string | number | boolean> = {
      frp: parseFloat((Math.random() * 60).toFixed(2)),
      scan: parseFloat((Math.random() * 3).toFixed(2)),
      track: parseFloat((Math.random() * 2).toFixed(2)),
      version: '6.1NRT',
      acq_date: new Date().toISOString().split('T')[0] || '',
      acq_time: Math.floor(Math.random() * 2400)
        .toString()
        .padStart(4, '0'),
      daynight: Math.random() > 0.5 ? 'N' : 'D',
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5)),
      satellite: Math.random() > 0.5 ? 'Aqua' : 'Terra',
      bright_t31: parseFloat((280 + Math.random() * 20).toFixed(2)),
      brightness: parseFloat((300 + Math.random() * 20).toFixed(2)),
      confidence: Math.floor(Math.random() * 100).toString(),
      instrument: 'MODIS',
    };

    // Add VIIRS-specific fields if it's a VIIRS provider
    if (providerClientId.includes('VIIRS')) {
      return {
        ...baseData,
        instrument: 'VIIRS',
        version: '1.0NRT',
        satellite: 'Suomi-NPP',
      };
    }

    return baseData;
  }

  /**
   * Get available GeoEvent providers
   */
  async getAvailableProviders() {
    const providers = await this.prisma.geoEventProvider.findMany({
      where: {isActive: true},
      select: {
        id: true,
        name: true,
        clientId: true,
        type: true,
      },
    });
    return providers;
  }

  /**
   * Get user's sites for testing
   */
  async getUserSites(userId: string) {
    const sites = await this.prisma.site.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
    return sites;
  }
}
