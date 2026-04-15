import {type SiteIncident, type SiteAlert} from '@prisma/client';
import {
  type CreateIncidentData,
  type UpdateIncidentData,
} from '../../Interfaces/SiteIncident';

export interface SiteIncidentRelationFields {
  relatedIncidentId: string | null;
}

export type RelatedSiteIncident = SiteIncident & SiteIncidentRelationFields;

/**
 * Represents a centre point in the incident's time series
 * Latest centre is always at index 0 for efficient access
 */
export interface IncidentCentre {
  latitude: number;
  longitude: number;
  at: Date;
}

/**
 * Metadata structure for SiteIncident proximity tracking
 * Stores time series of centre points for distance calculations
 */
export interface SiteIncidentMetadata {
  centres: IncidentCentre[];
}

export interface ProximityIncidentMatch {
  incident: RelatedSiteIncident;
  distance: number;
  terminalIncident: RelatedSiteIncident;
}

/**
 * Result of proximity detection operation
 */
export interface ProximityDetectionResult {
  /** The incident that was matched (if any) */
  incident?: RelatedSiteIncident;
  /** Distance in kilometers to the matched incident */
  distance?: number;
  /** Whether a new incident should be created */
  shouldCreateNew: boolean;
  /** All active incidents considered in the detection */
  consideredIncidents: RelatedSiteIncident[];
  /** All incidents that were in proximity threshold */
  matchingIncidents: ProximityIncidentMatch[];
  /** Distinct terminal incidents selected from matching incidents */
  terminalIncidents: RelatedSiteIncident[];
  /** Parent incidents that should be linked to newly-created child incident */
  mergeParentIncidents: RelatedSiteIncident[];
}

/**
 * Point coordinates for distance calculations
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Distance calculation interface
 * Abstracts the distance calculation implementation
 */
export interface DistanceCalculator {
  /**
   * Calculates distance between two points in kilometers
   * @param point1 - First point
   * @param point2 - Second point
   * @returns Distance in kilometers
   */
  calculateDistance(point1: GeoPoint, point2: GeoPoint): number;

  /**
   * Finds the closest incident to a given alert within proximity threshold
   * @param alert - The alert to find closest incident for
   * @param incidents - Array of incidents to check
   * @param proximityKm - Maximum distance threshold in kilometers
   * @returns Closest incident within threshold or null
   */
  findClosestIncident(
    alert: SiteAlert,
    incidents: SiteIncident[],
    proximityKm: number,
  ): {incident: SiteIncident; distance: number} | null;

  /**
   * Finds all incidents within proximity threshold sorted by nearest first
   * @param alert - The alert to compare
   * @param incidents - Incidents to check
   * @param proximityKm - Maximum distance threshold in kilometers
   * @returns Incidents within threshold with distances
   */
  findIncidentsWithinProximity(
    alert: SiteAlert,
    incidents: SiteIncident[],
    proximityKm: number,
  ): Array<{incident: SiteIncident; distance: number}>;
}

/**
 * Incident metadata management interface
 * Handles centre time series operations
 */
export interface IncidentMetadataManager {
  /**
   * Adds a new centre to the incident metadata
   * New centre is added at the beginning (index 0)
   * @param incident - The incident to update
   * @param alert - The alert providing the new centre coordinates
   * @returns Updated metadata
   */
  addCentre(incident: SiteIncident, alert: SiteAlert): SiteIncidentMetadata;

  /**
   * Gets the latest centre from incident metadata
   * @param incident - The incident to get centre from
   * @returns Latest centre or null if no centres exist
   */
  getLatestCentre(incident: SiteIncident): IncidentCentre | null;

  /**
   * Initializes metadata for a new incident
   * @param alert - The first alert for the incident
   * @returns Initial metadata structure
   */
  initializeMetadata(alert: SiteAlert): SiteIncidentMetadata;

  /**
   * Parses and validates metadata from database JSON
   * @param metadata - Raw metadata from database
   * @returns Parsed metadata or empty structure
   */
  parseMetadata(metadata: unknown): SiteIncidentMetadata;
}

/**
 * Proximity detection service interface
 * Orchestrates the proximity-based incident detection logic
 */
export interface ProximityDetectionService {
  /**
   * Finds the best matching incident for a given alert
   * @param alert - The alert to process
   * @returns Detection result with matched incident or creation flag
   */
  findBestMatchingIncident(alert: SiteAlert): Promise<ProximityDetectionResult>;

  /**
   * Determines if a new incident should be created
   * @param alert - The alert to evaluate
   * @param closestIncident - The closest incident found (if any)
   * @returns Whether to create a new incident
   */
  shouldCreateNewIncident(
    alert: SiteAlert,
    closestIncident?: {incident: SiteIncident; distance: number},
  ): boolean;

  /**
   * Updates an incident with a new centre from an alert
   * @param incident - The incident to update
   * @param alert - The alert providing the new centre
   * @returns Updated incident
   */
  updateIncidentCentre(
    incident: SiteIncident,
    alert: SiteAlert,
  ): Promise<SiteIncident>;
}

/**
 * Extended SiteIncidentRepository interface
 * Adds methods needed for proximity detection
 */
export interface ExtendedSiteIncidentRepository {
  /**
   * Finds all active incidents for a site (not just one)
   * @param siteId - The site ID to search
   * @returns Array of active incidents
   */
  findActiveIncidentsBySiteId(siteId: string): Promise<SiteIncident[]>;

  /**
   * Finds all active SiteIncidents across all sites
   * @returns Array of active incidents
   */
  findAllActiveIncidents(): Promise<SiteIncident[]>;

  /**
   * Updates incident metadata
   * @param incidentId - Incident ID
   * @param metadata - New metadata
   * @returns Updated incident
   */
  updateIncidentMetadata(
    incidentId: string,
    metadata: SiteIncidentMetadata,
  ): Promise<SiteIncident>;

  /**
   * Updates an existing SiteIncident
   * @param id - Incident ID
   * @param data - Update data
   * @returns Updated incident
   */
  updateIncident(id: string, data: UpdateIncidentData): Promise<SiteIncident>;

  /**
   * Creates a new SiteIncident
   * @param data - Incident creation data
   * @returns Created incident
   */
  createIncident(data: CreateIncidentData): Promise<SiteIncident>;

  /**
   * Links parent incidents to a child incident using relatedIncidentId
   * @param parentIncidentIds - Parent incident IDs
   * @param childIncidentId - Child incident ID
   * @param siteId - Site ID for safety checks
   * @returns Number of updated parent incidents
   */
  linkIncidentsToChild(
    parentIncidentIds: string[],
    childIncidentId: string,
    siteId: string,
  ): Promise<number>;

  /**
   * Associates a SiteAlert with an incident
   * @param incidentId - Incident ID
   * @param alertId - Alert ID to associate
   * @returns Updated incident
   */
  associateAlert(incidentId: string, alertId: string): Promise<SiteIncident>;
}
