/**
 * Utility functions for calculating fire incident circles
 * Uses Turf.js for geospatial calculations
 */

import {
  point,
  featureCollection,
  center,
  circle as turfCircle,
  distance,
  area,
} from '@turf/turf';
import type {Feature, Polygon, Position} from 'geojson';
import type {FirePoint, IncidentCircleResult} from '../../types/incident';

/**
 * Generates a circle polygon encompassing all fire points in an incident.
 * The circle is centered at the centroid of all fires and extends to cover
 * the farthest fire point plus a padding distance.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Additional padding in kilometers around the farthest fire (default: 2km)
 * @returns Object containing the circle polygon, centroid, radius, and area, or null if no fires
 *
 * @example
 * const fires = [
 *   { latitude: 10.5, longitude: 20.3 },
 *   { latitude: 10.6, longitude: 20.4 }
 * ];
 * const result = generateIncidentCircle(fires, 2);
 * // Returns: { circlePolygon, centroid, radiusKm, areaKm2 }
 */
export function generateIncidentCircle(
  fires: FirePoint[],
  paddingKm: number = 2,
): IncidentCircleResult | null {
  // Validate input
  if (!fires || fires.length === 0) {
    console.warn('[incident] generateIncidentCircle: No fire points provided');
    return null;
  }

  console.log(
    `[incident] Calculating incident circle - fireCount: ${fires.length}, paddingKm: ${paddingKm}`,
  );

  try {
    // Convert fire points to GeoJSON points
    const points = fires.map(fire => point([fire.longitude, fire.latitude]));
    const collection = featureCollection(points);

    // Calculate the centroid of all fire points
    const centroidFeature = center(collection);
    const centroidCoords = centroidFeature.geometry.coordinates as Position;

    console.log(
      `[incident] Centroid calculated - lat: ${centroidCoords[1]}, lon: ${centroidCoords[0]}`,
    );

    // Calculate the maximum distance from centroid to any fire point
    let maxDistance = 0;
    for (const fire of fires) {
      const firePoint = point([fire.longitude, fire.latitude]);
      const d = distance(centroidFeature, firePoint, {units: 'kilometers'});
      if (d > maxDistance) {
        maxDistance = d;
      }
    }

    // Add padding to the radius (minimum 0.1km for single fire case)
    const radiusKm = Math.max(maxDistance + paddingKm, 0.1 + paddingKm);

    console.log(
      `[incident] Circle radius calculated - maxDistance: ${maxDistance.toFixed(
        2,
      )}km, radiusWithPadding: ${radiusKm.toFixed(2)}km`,
    );

    // Create the circle polygon using turf
    const circlePolygon = turfCircle(centroidCoords, radiusKm, {
      steps: 64,
      units: 'kilometers',
    }) as Feature<Polygon>;

    // Calculate the area of the circle in square kilometers
    const areaM2 = area(circlePolygon);
    const areaKm2 = areaM2 / 1_000_000;

    console.log(
      `[incident] Circle polygon generated - areaKm2: ${areaKm2.toFixed(
        2,
      )}, steps: 64`,
    );

    return {
      circlePolygon,
      centroid: centroidCoords as [number, number],
      radiusKm,
      areaKm2,
    };
  } catch (error) {
    console.error(
      `[incident] Error generating incident circle - fireCount: ${fires.length}`,
      error,
    );
    return null;
  }
}

/**
 * Calculates just the area affected by fires in an incident.
 * This is a convenience function when only the area is needed.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Additional padding in kilometers around the farthest fire (default: 2km)
 * @returns The area in square kilometers, or 0 if no fires or error occurs
 *
 * @example
 * const fires = [
 *   { latitude: 10.5, longitude: 20.3 },
 *   { latitude: 10.6, longitude: 20.4 }
 * ];
 * const areaKm2 = calculateIncidentArea(fires, 2);
 * // Returns: 12.45 (km²)
 */
export function calculateIncidentArea(
  fires: FirePoint[],
  paddingKm: number = 2,
): number {
  try {
    const result = generateIncidentCircle(fires, paddingKm);
    return result?.areaKm2 ?? 0;
  } catch (error) {
    console.error('Error calculating incident area:', error);
    return 0;
  }
}
