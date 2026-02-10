/**
 * Type definitions for Fire Incident feature
 * Defines interfaces for incident data, alerts, and circle calculations
 */

/**
 * Represents a single fire detection at a specific location
 */
export interface SiteAlertData {
  id: string;
  eventDate: Date;
  latitude: number;
  longitude: number;
  detectedBy: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Represents a geographic coordinate pair (latitude, longitude)
 */
export interface FirePoint {
  latitude: number;
  longitude: number;
}

/**
 * Represents the result of incident circle calculation
 * Contains the GeoJSON polygon and calculated metrics
 */
export interface IncidentCircleResult {
  /** The GeoJSON circle polygon encompassing all fires */
  circlePolygon: GeoJSON.Feature<GeoJSON.Polygon>;
  /** The centroid coordinates [longitude, latitude] */
  centroid: [number, number];
  /** The radius of the circle in kilometers */
  radiusKm: number;
  /** The area of the circle in square kilometers */
  areaKm2: number;
}

/**
 * Represents a complete fire incident with all associated data
 * Groups multiple fire detections within a defined time window
 */
export interface IncidentData {
  id: string;
  siteId: string;
  startSiteAlertId: string;
  endSiteAlertId: string | null;
  latestSiteAlertId: string;
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
  isProcessed: boolean;
  startNotificationId: string | null;
  endNotificationId: string | null;
  reviewStatus: 'to_review' | 'in_review' | 'reviewed';
  createdAt: Date;
  updatedAt: Date;

  site: {
    id: string;
    name: string | null;
    geometry: GeoJSON.Geometry;
    project: {
      id: string;
      name: string;
    } | null;
  };

  startSiteAlert: SiteAlertData;
  latestSiteAlert: SiteAlertData;
  siteAlerts: SiteAlertData[];
}

/**
 * Parameters for useIncidentData hook
 */
export interface UseIncidentDataParams {
  incidentId: string | null | undefined;
  enabled?: boolean;
}

/**
 * Return value from useIncidentData hook
 */
export interface UseIncidentDataReturn {
  incident: IncidentData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Props for IncidentSummaryCard component
 */
export interface IncidentSummaryCardProps {
  isActive: boolean;
  startAlert: SiteAlertData;
  latestAlert: SiteAlertData;
  allAlerts: SiteAlertData[];
}
