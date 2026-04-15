import {type SiteAlert, type SiteIncident, type SiteIncidentReviewStatus} from '@prisma/client';
import {logger} from '../../server/logger';
import {env} from '../../env.mjs';
import {
  type ProximityDetectionService,
  type ProximityDetectionResult,
  type DistanceCalculator,
  type IncidentMetadataManager,
  type ExtendedSiteIncidentRepository,
  type RelatedSiteIncident,
} from './types';
import {DistanceCalculatorService} from './DistanceCalculatorService';
import {IncidentMetadataService} from './IncidentMetadataService';

/**
 * Service for orchestrating proximity-based incident detection
 * Integrates distance calculation, metadata management, and repository operations
 * Supports multiple concurrent incidents per site with proximity-based association
 */
export class SiteIncidentProximityService implements ProximityDetectionService {
  private distanceCalculator: DistanceCalculator;
  private metadataManager: IncidentMetadataManager;
  private proximityKm: number;

  constructor(
    private readonly repository: ExtendedSiteIncidentRepository,
  ) {
    this.distanceCalculator = new DistanceCalculatorService();
    this.metadataManager = new IncidentMetadataService();
    this.proximityKm = env.INCIDENT_PROXIMITY_KM;
  }

  /**
   * Finds the best matching incident for a given alert using proximity detection
   * @param alert - The alert to process
   * @returns Detection result with matched incident or creation flag
   */
  async findBestMatchingIncident(alert: SiteAlert): Promise<ProximityDetectionResult> {
    try {
      // Validate input
      this.validateAlert(alert);

      // Get all active incidents for the site
      const activeIncidents = await this.repository.findActiveIncidentsBySiteId(
        alert.siteId,
      );

      // If no active incidents, create new incident
      if (activeIncidents.length === 0) {
        return {
          shouldCreateNew: true,
          consideredIncidents: [],
          matchingIncidents: [],
          terminalIncidents: [],
          mergeParentIncidents: [],
        };
      }

      const activeIncidentsById = new Map(
        activeIncidents.map(incident => [
          incident.id,
          incident as RelatedSiteIncident,
        ]),
      );

      // Find all incidents within proximity threshold
      const proximityMatches = this.distanceCalculator.findIncidentsWithinProximity(
        alert,
        activeIncidents,
        this.proximityKm,
      );

      if (proximityMatches.length === 0) {
        return {
          shouldCreateNew: true,
          consideredIncidents: activeIncidents as RelatedSiteIncident[],
          matchingIncidents: [],
          terminalIncidents: [],
          mergeParentIncidents: [],
        };
      }

      const matchingIncidents = proximityMatches.map(match => {
        const sourceIncident = match.incident as RelatedSiteIncident;
        const terminalIncident = this.resolveTerminalIncident(
          sourceIncident,
          activeIncidentsById,
        );

        return {
          incident: sourceIncident,
          distance: match.distance,
          terminalIncident,
        };
      });

      // Dedupe terminal incidents so parent + child overlap maps to one terminal
      const terminalById = new Map<string, (typeof matchingIncidents)[number]>();
      for (const match of matchingIncidents) {
        const key = match.terminalIncident.id;
        const existing = terminalById.get(key);

        if (!existing || match.distance < existing.distance) {
          terminalById.set(key, match);
        }
      }

      const terminalMatches = Array.from(terminalById.values()).sort(
        (a, b) => a.distance - b.distance,
      );
      const terminalIncidents = terminalMatches.map(
        match => match.terminalIncident,
      );

      if (terminalIncidents.length === 1) {
        const [singleTerminalMatch] = terminalMatches;
        if (!singleTerminalMatch) {
          throw new Error('Unexpected empty terminal match result');
        }
        return {
          incident: singleTerminalMatch.terminalIncident,
          distance: singleTerminalMatch.distance,
          shouldCreateNew: false,
          consideredIncidents: activeIncidents as RelatedSiteIncident[],
          matchingIncidents,
          terminalIncidents,
          mergeParentIncidents: [],
        };
      }

      return {
        shouldCreateNew: true,
        consideredIncidents: activeIncidents as RelatedSiteIncident[],
        matchingIncidents,
        terminalIncidents,
        mergeParentIncidents: terminalIncidents,
      };
    } catch (error) {
      logger(
        `Error in proximity detection for alert ${alert.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Determines if a new incident should be created based on proximity analysis
   * @param alert - The alert to evaluate
   * @param closestIncident - The closest incident found (if any)
   * @returns Whether to create a new incident
   */
  shouldCreateNewIncident(
    alert: SiteAlert,
    closestIncident?: {incident: SiteIncident; distance: number},
  ): boolean {
    try {
      // Validate input
      this.validateAlert(alert);

      // If no closest incident, create new
      if (!closestIncident) {
        return true;
      }

      // Check if distance is within proximity threshold
      const withinThreshold = closestIncident.distance <= this.proximityKm;

      if (withinThreshold) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      logger(
        `Error determining incident creation for alert ${alert.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      // Default to creating new incident on error
      return true;
    }
  }

  /**
   * Updates an incident with a new centre from an alert
   * Updates both the latestSiteAlertId and the metadata centres array
   * @param incident - The incident to update
   * @param alert - The alert providing the new centre
   * @returns Updated incident
   */
  async updateIncidentCentre(
    incident: SiteIncident,
    alert: SiteAlert,
  ): Promise<SiteIncident> {
    try {
      // Validate inputs
      this.validateIncident(incident);
      this.validateAlert(alert);

      // Add new centre to metadata
      const updatedMetadata = this.metadataManager.addCentre(incident, alert);

      // Update incident with new metadata and latest alert
      await this.repository.updateIncidentMetadata(incident.id, updatedMetadata);

      // Also update the latestSiteAlertId and association
      const finalIncident = await this.repository.updateIncident(incident.id, {
        latestSiteAlertId: alert.id,
      });

      // Associate the alert with the incident
      await this.repository.associateAlert(incident.id, alert.id);

      return finalIncident;
    } catch (error) {
      logger(
        `Error updating incident centre for incident ${incident.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Creates a new incident with initial metadata from an alert
   * @param alert - The alert to create incident from
   * @returns Created incident
   */
  async createIncidentWithMetadata(
    alert: SiteAlert,
    options?: {
      reviewStatus?: SiteIncidentReviewStatus;
    },
  ): Promise<SiteIncident> {
    try {
      // Validate input
      this.validateAlert(alert);

      // Initialize metadata with first centre
      const initialMetadata = this.metadataManager.initializeMetadata(alert);

      // Create incident through repository
      const incident = await this.repository.createIncident({
        siteId: alert.siteId,
        startSiteAlertId: alert.id,
        latestSiteAlertId: alert.id,
        startedAt: new Date(),
        reviewStatus: options?.reviewStatus,
      });

      // Update incident with initial metadata
      const updatedIncident = await this.repository.updateIncidentMetadata(
        incident.id,
        initialMetadata,
      );

      // Associate the alert with the incident
      await this.repository.associateAlert(incident.id, alert.id);

      return updatedIncident;
    } catch (error) {
      logger(
        `Error creating incident for alert ${alert.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Validates a SiteAlert object
   * @param alert - Alert to validate
   * @throws Error if invalid
   */
  private validateAlert(alert: SiteAlert): void {
    if (!alert || typeof alert !== 'object') {
      throw new Error('Invalid alert: must be an object');
    }

    if (!alert.id || typeof alert.id !== 'string') {
      throw new Error('Invalid alert: missing or invalid id');
    }

    if (!alert.siteId || typeof alert.siteId !== 'string') {
      throw new Error('Invalid alert: missing or invalid siteId');
    }

    if (
      typeof alert.latitude !== 'number' ||
      typeof alert.longitude !== 'number'
    ) {
      throw new Error('Invalid alert: latitude and longitude must be numbers');
    }

    if (!alert.eventDate || !(alert.eventDate instanceof Date)) {
      throw new Error('Invalid alert: eventDate must be a valid Date');
    }

    if (isNaN(alert.eventDate.getTime())) {
      throw new Error('Invalid alert: eventDate must be a valid date');
    }

    // Validate coordinate ranges
    if (
      isNaN(alert.latitude) ||
      isNaN(alert.longitude) ||
      alert.latitude < -90 ||
      alert.latitude > 90 ||
      alert.longitude < -180 ||
      alert.longitude > 180
    ) {
      throw new Error('Invalid alert: coordinates out of valid range');
    }
  }

  /**
   * Validates a SiteIncident object
   * @param incident - Incident to validate
   * @throws Error if invalid
   */
  private validateIncident(incident: SiteIncident): void {
    if (!incident || typeof incident !== 'object') {
      throw new Error('Invalid incident: must be an object');
    }

    if (!incident.id || typeof incident.id !== 'string') {
      throw new Error('Invalid incident: missing or invalid id');
    }

    if (!incident.siteId || typeof incident.siteId !== 'string') {
      throw new Error('Invalid incident: missing or invalid siteId');
    }
  }

  /**
   * Resolves an incident to its terminal child in active chain
   * Uses parent -> child direction via relatedIncidentId
   * @param incident - Starting incident
   * @param activeIncidentsById - Active incidents lookup
   * @returns Terminal incident for association
   */
  private resolveTerminalIncident(
    incident: RelatedSiteIncident,
    activeIncidentsById: Map<string, RelatedSiteIncident>,
  ): RelatedSiteIncident {
    let current = incident;
    const visited = new Set<string>([incident.id]);

    while (true) {
      const childId = this.getRelatedIncidentId(current);
      if (!childId) {
        return current;
      }

      if (visited.has(childId)) {
        logger(
          `Detected cycle while resolving terminal incident from ${incident.id}; returning ${current.id}`,
          'warn',
        );
        return current;
      }

      const childIncident = activeIncidentsById.get(childId);
      if (!childIncident) {
        return current;
      }

      if (childIncident.siteId !== incident.siteId) {
        logger(
          `Cross-site related incident link detected: ${current.id} -> ${childIncident.id}. Ignoring link`,
          'warn',
        );
        return current;
      }

      current = childIncident;
      visited.add(current.id);
    }
  }

  private getRelatedIncidentId(incident: SiteIncident): string | null {
    return ((incident as unknown as {relatedIncidentId?: string | null})
      .relatedIncidentId || null);
  }

  /**
   * Gets the current proximity threshold
   * @returns Proximity threshold in kilometers
   */
  getProximityThreshold(): number {
    return this.proximityKm;
  }

  /**
   * Updates the proximity threshold (for testing or configuration changes)
   * @param proximityKm - New proximity threshold in kilometers
   */
  setProximityThreshold(proximityKm: number): void {
    if (typeof proximityKm !== 'number' || proximityKm <= 0) {
      throw new Error('Invalid proximityKm: must be a positive number');
    }

    this.proximityKm = proximityKm;
    logger(`Updated proximity threshold to ${proximityKm}km`, 'info');
  }
}
