import DataRecord from './DataRecord';
import {type GeoEventProviderClientId} from './GeoEventProvider';

export interface geoEventInterface {
  id?: string;
  type: 'fire';
  longitude: number;
  latitude: number;
  eventDate: Date;
  confidence: Confidence.High | Confidence.Medium | Confidence.Low;
  isProcessed?: boolean;
  geoEventProviderClientId: GeoEventProviderClientId;
  geoEventProviderId: string;
  radius?: number;
  slice: string;
  data: DataRecord;
}

export enum Confidence {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum GeoEventDetectionInstrument {
  MODIS = 'MODIS',
  VIIRS = 'VIIRS',
  LANDSAT = 'LANDSAT',
  GEOSTATIONARY = 'GEOSTATIONARY',
}

// Use enum like this:
// let instrument: GeoEventDetectionInstrument = GeoEventDetectionInstrument.MODIS;
// let eventSource: GeoEventSource = GeoEventSource.FIRMS;
