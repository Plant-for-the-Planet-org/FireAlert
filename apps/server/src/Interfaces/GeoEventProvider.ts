import {geoEventInterface as GeoEvent} from './GeoEvent';

export enum GeoEventProviderClientId {
  LANDSAT_NRT = 'LANDSAT_NRT',
  MODIS_NRT = 'MODIS_NRT',
  MODIS_SP = 'MODIS_SP',
  VIIRS_NOAA20_NRT = 'VIIRS_NOAA20_NRT',
  VIIRS_SNPP_NRT = 'VIIRS_SNPP_NRT',
  VIIRS_SNPP_SP = 'VIIRS_SNPP_SP',
}

export enum GeoEventProviderClient {
  FIRMS = 'FIRMS',
}

export interface GeoEventProviderConfig {
  bbox: string;
  slice: string;
  apiUrl: string;
  client: GeoEventProviderClient; //'FIRMS'
}

export interface GeoEventProviderClass {
  getKey: () => string;
  initialize: (config?: GeoEventProviderConfigGeneral) => void;
  getLatestGeoEvents: (
    client: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
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
