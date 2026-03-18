import {point, distance} from '@turf/turf';
import {type SiteAlert, type SiteIncident} from '@prisma/client';
import {logger} from '../../server/logger';
import {
  type DistanceCalculator,
  type GeoPoint,
  type IncidentMetadataManager,
  type IncidentCentre,
  type SiteIncidentMetadata,
} from './types';

/**
 * Service for calculating distances between geographic points
 * Uses Turf.js for accurate great-circle distance calculations
 * Optimized for 2-10km distance ranges as specified
 */
export class DistanceCalculatorService implements DistanceCalculator {
  /**
   * Calculates distance between two points using Turf.js
   * Uses great-circle distance suitable for 2-10km ranges
   * @param point1 - First point coordinates
   * @param point2 - Second point coordinates
   * @returns Distance in kilometers
   */
  calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    try {
      // Validate input coordinates
      this.validateGeoPoint(point1);
      this.validateGeoPoint(point2);

      // Create Turf points (longitude, latitude order for GeoJSON)
      const turfPoint1 = point([point1.longitude, point1.latitude]);
      const turfPoint2 = point([point2.longitude, point2.latitude]);

      // Calculate distance using Turf.js with kilometers units
      const distanceKm = distance(turfPoint1, turfPoint2, {
        units: 'kilometers',
      });

      // Validate result
      if (isNaN(distanceKm) || distanceKm < 0) {
        throw new Error(`Invalid distance calculation result: ${distanceKm}`);
      }

      logger(
        `Calculated distance: ${distanceKm.toFixed(3)}km between points [${point1.latitude}, ${point1.longitude}] and [${point2.latitude}, ${point2.longitude}]`,
        'debug',
      );

      return distanceKm;
    } catch (error) {
      logger(
        `Error calculating distance between points [${point1.latitude}, ${point1.longitude}] and [${point2.latitude}, ${point2.longitude}]: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Finds the closest incident to an alert within proximity threshold
   * @param alert - The alert to find closest incident for
   * @param incidents - Array of incidents to check
   * @param proximityKm - Maximum distance threshold in kilometers
   * @returns Closest incident within threshold or null
   */
  findClosestIncident(
    alert: SiteAlert,
    incidents: SiteIncident[],
    proximityKm: number,
  ): {incident: SiteIncident; distance: number} | null {
    try {
      // Validate inputs
      this.validateAlert(alert);
      if (!Array.isArray(incidents) || incidents.length === 0) {
        logger('No incidents provided for proximity check', 'debug');
        return null;
      }

      if (typeof proximityKm !== 'number' || proximityKm <= 0) {
        throw new Error('Invalid proximityKm: must be a positive number');
      }

      const alertPoint: GeoPoint = {
        latitude: alert.latitude,
        longitude: alert.longitude,
      };

      let closestResult: {incident: SiteIncident; distance: number} | null = null;
      let minDistance = Infinity;

      // Find closest incident
      for (const incident of incidents) {
        try {
          const centre = this.getIncidentCentre(incident);
          if (!centre) {
            logger(
              `Skipping incident ${incident.id}: no centre data available`,
              'debug',
            );
            continue;
          }

          const distance = this.calculateDistance(alertPoint, centre);

          if (distance < minDistance) {
            minDistance = distance;
            closestResult = {incident, distance};
          }

          logger(
            `Distance to incident ${incident.id}: ${distance.toFixed(3)}km`,
            'debug',
          );
        } catch (error) {
          logger(
            `Error calculating distance to incident ${incident.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            'warn',
          );
          continue;
        }
      }

      // Check if closest incident is within proximity threshold
      if (closestResult && closestResult.distance <= proximityKm) {
        logger(
          `Found closest incident ${closestResult.incident.id} at ${closestResult.distance.toFixed(3)}km (within ${proximityKm}km threshold)`,
          'info',
        );
        return closestResult;
      }

      if (closestResult) {
        logger(
          `Closest incident ${closestResult.incident.id} at ${closestResult.distance.toFixed(3)}km is outside ${proximityKm}km threshold`,
          'info',
        );
      } else {
        logger('No valid incidents found for proximity check', 'info');
      }

      return null;
    } catch (error) {
      logger(
        `Error finding closest incident for alert ${alert.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Gets the centre point from an incident's metadata
   * @param incident - The incident to get centre from
   * @returns Centre point or null if not available
   */
  private getIncidentCentre(incident: SiteIncident): GeoPoint | null {
    try {
      if (!incident.metadata) {
        return null;
      }

      const metadata = incident.metadata as SiteIncidentMetadata;
      if (!metadata.centres || !Array.isArray(metadata.centres)) {
        return null;
      }

      // Return latest centre (index 0 as per convention)
      const latestCentre = metadata.centres[0];
      if (!latestCentre) {
        return null;
      }

      // Validate centre structure
      if (
        typeof latestCentre.latitude !== 'number' ||
        typeof latestCentre.longitude !== 'number' ||
        isNaN(latestCentre.latitude) ||
        isNaN(latestCentre.longitude)
      ) {
        logger(
          `Invalid centre data for incident ${incident.id}: ${JSON.stringify(
            latestCentre,
          )}`,
          'warn',
        );
        return null;
      }

      return {
        latitude: latestCentre.latitude,
        longitude: latestCentre.longitude,
      };
    } catch (error) {
      logger(
        `Error parsing centre data for incident ${incident.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'warn',
      );
      return null;
    }
  }

  /**
   * Validates a GeoPoint object
   * @param point - Point to validate
   * @throws Error if invalid
   */
  private validateGeoPoint(point: GeoPoint): void {
    if (!point || typeof point !== 'object') {
      throw new Error('Invalid point: must be an object');
    }

    if (
      typeof point.latitude !== 'number' ||
      typeof point.longitude !== 'number'
    ) {
      throw new Error('Invalid point: latitude and longitude must be numbers');
    }

    if (isNaN(point.latitude) || isNaN(point.longitude)) {
      throw new Error('Invalid point: latitude and longitude cannot be NaN');
    }

    if (point.latitude < -90 || point.latitude > 90) {
      throw new Error('Invalid point: latitude must be between -90 and 90');
    }

    if (point.longitude < -180 || point.longitude > 180) {
      throw new Error('Invalid point: longitude must be between -180 and 180');
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

    this.validateGeoPoint({
      latitude: alert.latitude,
      longitude: alert.longitude,
    });
  }
}
