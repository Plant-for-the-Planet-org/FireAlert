import type {RouterOutputs} from '../utils/api';
import type {GeoEventProviderClientId} from '../Interfaces/GeoEventProvider';
import type {Confidence} from '../Interfaces/GeoEvent';
import type {Prisma} from '@prisma/client';

/**
 * Type for the alert returned from the getAlert endpoint
 */
export type AlertResponse = RouterOutputs['alert']['getAlert'];

/**
 * Type for the alert data within the response
 */
export type AlertData = AlertResponse['data'];

/**
 * Type for alerts returned from the getAlertsForSite endpoint
 */
export type AlertsForSiteResponse = RouterOutputs['alert']['getAlertsForSite'];

/**
 * Type for individual alert data within the getAlertsForSite response
 */
export type AlertForSiteData = AlertsForSiteResponse['data'][number];

/**
 * GeoJSON geometry types that can be used in polygon fields
 */
export type GeoJSONGeometry =
  | {
      type: 'Point';
      coordinates: [number, number];
    }
  | {
      type: 'Polygon';
      coordinates: [number, number][][];
    }
  | {
      type: 'MultiPolygon';
      coordinates: [number, number][][][];
    };

/**
 * Type guard to check if a value is a valid GeoJSON geometry
 */
export function isGeoJSONGeometry(value: unknown): value is GeoJSONGeometry {
  if (typeof value !== 'object' || value === null) return false;
  const geom = value as Record<string, unknown>;
  return (
    typeof geom.type === 'string' &&
    Array.isArray(geom.coordinates) &&
    (geom.type === 'Point' ||
      geom.type === 'Polygon' ||
      geom.type === 'MultiPolygon')
  );
}

/**
 * Props for AlertId component - derived from AlertData
 */
export interface AlertIdProps {
  timeAgo: string;
  formattedDateString: string;
  confidence: string;
  detectedBy: string | null;
  latitude: string;
  longitude: string;
  polygon: GeoJSONGeometry | Prisma.JsonValue;
  siteId?: string;
}

/**
 * Helper type to extract site geometry from AlertData
 */
export type SiteGeometry = AlertData['site']['geometry'];

