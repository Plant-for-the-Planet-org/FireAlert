import {GeoEventInterface as GeoEvent} from './GeoEvent';

export enum GeoEventProviderClientId {
  LANDSAT_NRT = 'LANDSAT_NRT',
  MODIS_NRT = 'MODIS_NRT',
  MODIS_SP = 'MODIS_SP',
  VIIRS_NOAA20_NRT = 'VIIRS_NOAA20_NRT',
  VIIRS_SNPP_NRT = 'VIIRS_SNPP_NRT',
  VIIRS_SNPP_SP = 'VIIRS_SNPP_SP',
  GEOSTATIONARY = 'GEOSTATIONARY',
}

export enum GeoEventProviderClient {
  FIRMS = 'FIRMS',
  GOES16 = 'GOES-16',
}

export interface GeoEventProviderConfig {
  bbox: string;
  slice: string;
  client: GeoEventProviderClient; //'FIRMS'
}

/**
 * Interface for geo event provider implementations.
 * Each provider (FIRMS, GOES-16, etc.) must implement this interface.
 */
export interface GeoEventProviderClass {
  /**
   * Returns the unique key identifying this provider type
   * @returns Provider key (e.g., "FIRMS", "GOES-16")
   */
  getKey: () => string;

  /**
   * Initializes the provider with configuration
   * @param config - Provider-specific configuration
   */
  initialize: (config?: GeoEventProviderConfigGeneral) => void;

  /**
   * Fetches the latest geo events from the provider
   * @param client - Client identifier
   * @param geoEventProviderId - Provider ID
   * @param slice - Time slice identifier
   * @param clientApiKey - API key for authentication
   * @param lastRun - Timestamp of last successful run
   * @returns Promise resolving to array of geo events
   */
  getLatestGeoEvents: (
    client: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
    lastRun: Date | null,
  ) => Promise<GeoEvent[]>;
}

export interface GeoEventProviderConfigGeneral {
  [key: string]: any;
}

export interface GeoEventProvider {
  id?: string;
  name?: string;
  description?: string;
  type: string;
  clientId: string;
  clientApiKey: string;
  fetchFrequency?: number;
  isActive: boolean;
  lastRun: Date;
  config: GeoEventProviderConfig;
}
