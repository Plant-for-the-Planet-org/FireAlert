import {type SiteAlert, type SiteIncident} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type IncidentMetadataManager,
  type IncidentCentre,
  type SiteIncidentMetadata,
} from './types';

/**
 * Service for managing incident metadata and centre time series
 * Handles the storage and retrieval of incident centre points
 * Follows convention: latest centre at index 0 for efficient access
 */
export class IncidentMetadataService implements IncidentMetadataManager {
  /**
   * Adds a new centre to the incident metadata
   * New centre is added at the beginning (index 0) as per convention
   * @param incident - The incident to update
   * @param alert - The alert providing the new centre coordinates
   * @returns Updated metadata
   */
  addCentre(incident: SiteIncident, alert: SiteAlert): SiteIncidentMetadata {
    try {
      // Validate inputs
      this.validateIncident(incident);
      this.validateAlert(alert);

      // Parse existing metadata
      const metadata = this.parseMetadata(incident.metadata);

      // Create new centre from alert
      const newCentre: IncidentCentre = {
        latitude: alert.latitude,
        longitude: alert.longitude,
        at: alert.eventDate,
      };

      // Validate new centre
      this.validateCentre(newCentre);

      // Add new centre at the beginning (index 0)
      metadata.centres.unshift(newCentre);

      // Optional: Limit array size to prevent unlimited growth
      // Keep only the most recent 100 centres to manage memory
      if (metadata.centres.length > 100) {
        metadata.centres = metadata.centres.slice(0, 100);
        logger(
          `Trimmed centres array to 100 items for incident ${incident.id}`,
          'debug',
        );
      }

      logger(
        `Added new centre [${newCentre.latitude}, ${newCentre.longitude}] at ${newCentre.at.toISOString()} to incident ${incident.id}. Total centres: ${metadata.centres.length}`,
        'debug',
      );

      return metadata;
    } catch (error) {
      logger(
        `Error adding centre to incident ${incident.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Gets the latest centre from incident metadata
   * @param incident - The incident to get centre from
   * @returns Latest centre or null if no centres exist
   */
  getLatestCentre(incident: SiteIncident): IncidentCentre | null {
    try {
      // Validate input
      this.validateIncident(incident);

      // Parse metadata
      const metadata = this.parseMetadata(incident.metadata);

      // Return latest centre (index 0 as per convention)
      const latestCentre = metadata.centres[0];

      if (latestCentre) {
        logger(
          `Retrieved latest centre [${latestCentre.latitude}, ${latestCentre.longitude}] at ${latestCentre.at.toISOString()} for incident ${incident.id}`,
          'debug',
        );
      } else {
        logger(`No centres found for incident ${incident.id}`, 'debug');
      }

      return latestCentre || null;
    } catch (error) {
      logger(
        `Error getting latest centre for incident ${incident.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Initializes metadata for a new incident
   * @param alert - The first alert for the incident
   * @returns Initial metadata structure
   */
  initializeMetadata(alert: SiteAlert): SiteIncidentMetadata {
    try {
      // Validate input
      this.validateAlert(alert);

      // Create initial centre from alert
      const initialCentre: IncidentCentre = {
        latitude: alert.latitude,
        longitude: alert.longitude,
        at: alert.eventDate,
      };

      // Validate centre
      this.validateCentre(initialCentre);

      // Create initial metadata with the first centre
      const metadata: SiteIncidentMetadata = {
        centres: [initialCentre],
      };

      logger(
        `Initialized metadata for new incident with centre [${initialCentre.latitude}, ${initialCentre.longitude}] at ${initialCentre.at.toISOString()}`,
        'debug',
      );

      return metadata;
    } catch (error) {
      logger(
        `Error initializing metadata for alert ${alert.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Parses and validates metadata from database JSON
   * Handles legacy incidents without metadata structure
   * @param metadata - Raw metadata from database
   * @returns Parsed metadata or empty structure
   */
  parseMetadata(metadata: unknown): SiteIncidentMetadata {
    try {
      // Handle null/undefined metadata
      if (!metadata) {
        logger('No metadata found, returning empty structure', 'debug');
        return {centres: []};
      }

      // Type guard for object
      if (typeof metadata !== 'object' || metadata === null) {
        logger(`Invalid metadata type: ${typeof metadata}`, 'warn');
        return {centres: []};
      }

      const metadataObj = metadata as Record<string, unknown>;

      // Check for centres array
      if (!metadataObj.centres || !Array.isArray(metadataObj.centres)) {
        logger('No centres array found in metadata, returning empty structure', 'debug');
        return {centres: []};
      }

      const centres = metadataObj.centres;

      // Validate and parse each centre
      const validCentres: IncidentCentre[] = [];
      for (const centre of centres) {
        try {
          const parsedCentre = this.parseCentre(centre);
          if (parsedCentre) {
            validCentres.push(parsedCentre);
          }
        } catch (error) {
          logger(
            `Skipping invalid centre: ${
              error instanceof Error ? error.message : String(error)
            }`,
            'warn',
          );
          continue;
        }
      }

      logger(
        `Parsed metadata: ${validCentres.length} valid centres found`,
        'debug',
      );

      return {centres: validCentres};
    } catch (error) {
      logger(
        `Error parsing metadata: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      return {centres: []};
    }
  }

  /**
   * Parses and validates a single centre object
   * @param centre - Raw centre data
   * @returns Parsed centre or null if invalid
   */
  private parseCentre(centre: unknown): IncidentCentre | null {
    try {
      if (!centre || typeof centre !== 'object' || centre === null) {
        return null;
      }

      const centreObj = centre as Record<string, unknown>;

      // Validate required fields
      if (
        typeof centreObj.latitude !== 'number' ||
        typeof centreObj.longitude !== 'number' ||
        typeof centreObj.at !== 'string' &&
        typeof centreObj.at !== 'object' // Date object or string
      ) {
        return null;
      }

      // Validate coordinate ranges
      if (
        isNaN(centreObj.latitude) ||
        isNaN(centreObj.longitude) ||
        centreObj.latitude < -90 ||
        centreObj.latitude > 90 ||
        centreObj.longitude < -180 ||
        centreObj.longitude > 180
      ) {
        return null;
      }

      // Parse date
      let date: Date;
      if (centreObj.at instanceof Date) {
        date = centreObj.at;
      } else if (typeof centreObj.at === 'string') {
        date = new Date(centreObj.at);
        if (isNaN(date.getTime())) {
          return null;
        }
      } else {
        return null;
      }

      return {
        latitude: centreObj.latitude,
        longitude: centreObj.longitude,
        at: date,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates a centre object
   * @param centre - Centre to validate
   * @throws Error if invalid
   */
  private validateCentre(centre: IncidentCentre): void {
    if (!centre || typeof centre !== 'object') {
      throw new Error('Invalid centre: must be an object');
    }

    if (
      typeof centre.latitude !== 'number' ||
      typeof centre.longitude !== 'number'
    ) {
      throw new Error('Invalid centre: latitude and longitude must be numbers');
    }

    if (isNaN(centre.latitude) || isNaN(centre.longitude)) {
      throw new Error('Invalid centre: latitude and longitude cannot be NaN');
    }

    if (centre.latitude < -90 || centre.latitude > 90) {
      throw new Error('Invalid centre: latitude must be between -90 and 90');
    }

    if (centre.longitude < -180 || centre.longitude > 180) {
      throw new Error('Invalid centre: longitude must be between -180 and 180');
    }

    if (!centre.at || !(centre.at instanceof Date)) {
      throw new Error('Invalid centre: at must be a valid Date');
    }

    if (isNaN(centre.at.getTime())) {
      throw new Error('Invalid centre: at must be a valid date');
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
}
