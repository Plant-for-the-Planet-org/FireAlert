import type DataRecord from './DataRecord';
import {type GeoEventProviderClientId} from './GeoEventProvider';

export interface GeoEventInterface {
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

export interface ConfidenceLevels {
  [key: string]: {
    [key: string]: string;
  };
}

// Use enum like this:
// let instrument: GeoEventDetectionInstrument = GeoEventDetectionInstrument.MODIS;
// let eventSource: GeoEventSource = GeoEventSource.FIRMS;
