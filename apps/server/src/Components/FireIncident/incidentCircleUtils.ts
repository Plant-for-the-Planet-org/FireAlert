import {
  area,
  buffer,
  center,
  circle,
  convex,
  distance,
  featureCollection,
  point,
} from '@turf/turf';
import type {Feature, Polygon} from 'geojson';

interface FirePoint {
  latitude: number;
  longitude: number;
}

/**
 * [Deprecatedd] Generates a circle polygon encompassing all fire points in an incident.
 * Now handles 1-2 fires with circles and 3+ fires with convex hull + buffer
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Buffer distance in kilometers (default: 0.1km)
 * @returns Object containing the polygon and area
 */
export function generateIncidentCircle(
  fires: FirePoint[],
  paddingKm: number = 0.1,
): Feature<Polygon> | null {
  if (fires.length === 0) {
    return null;
  }

  // Handle edge cases: 1-2 fire points - use circle logic
  if (fires.length <= 2) {
    // Convert fire points to GeoJSON points
    const points = fires.map(fire => point([fire.longitude, fire.latitude]));
    const collection = featureCollection(points);

    // Calculate the centroid of all fire points
    const centroidFeature = center(collection);
    const centroidCoords = centroidFeature.geometry.coordinates;

    // Calculate the maximum distance from centroid to any fire point
    let maxDistance = 0;
    for (const fire of fires) {
      const firePoint = point([fire.longitude, fire.latitude]);
      const d = distance(centroidFeature, firePoint, {units: 'kilometers'});
      if (d > maxDistance) {
        maxDistance = d;
      }
    }

    // For 1 fire: use paddingKm as radius, for 2 fires: use distance + small buffer
    const radiusKm =
      fires.length === 1
        ? 0.1 // For 1 Fire
        : 0.3; // For 2 Fires

    // Create the circle polygon using turf
    const circlePolygon = circle(centroidCoords, radiusKm, {
      steps: 32,
      units: 'kilometers',
    });

    return circlePolygon;
  } else {
    return null;
  }
}

/**
 * Based on input fires, generate a polygon that encompasses all fires
 * using convex hull with optional buffer for smoothing vertices and realistic fire spread
 * For 1-2 fires, creates a circle polygon instead
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param bufferKm - Optional buffer distance in kilometers to smooth vertices and account for fire spread (default: 0.5km)
 * @returns A polygon that encompasses all fires with smoothed vertices, or null if no fires
 */
export function generateIncidentPolygon(
  fires: FirePoint[],
  bufferKm: number = 0.5,
): Feature<Polygon> | null {
  if (fires.length === 0) {
    return null;
  }

  // Handle edge cases: 1-2 fire points
  if (fires.length <= 2) {
    const polygon = generateIncidentCircle(fires);
    return polygon || null;
  }

  // Convert fire points to GeoJSON points
  const points = fires.map(fire => point([fire.longitude, fire.latitude]));
  const collection = featureCollection(points);

  // Create the polygon using convex hull - this follows the outermost points, with number of fires as a input would affect make the area more Filled than Empty (or thin).
  const polygon = convex(collection, {concavity: fires.length});

  if (!polygon) {
    return null;
  }

  // Apply buffer to smooth vertices and account for fire spread
  // This creates rounded corners and expands the area realistically
  const bufferedPolygon = buffer(polygon, bufferKm, {units: 'kilometers'});

  return bufferedPolygon as Feature<Polygon>;
}

/**
 * Calculates just the area affected by fires in an incident.
 * This is a convenience function when only the area is needed.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Additional padding in kilometers around the farthest fire (default: 2km)
 * @returns The area in square kilometers, or 0 if no fires
 */
export function calculateIncidentArea(
  fires: FirePoint[],
  paddingKm?: number,
): number {
  // const result = generateIncidentCircle(fires, paddingKm);
  const result = generateIncidentPolygon(fires, paddingKm ?? 0.5);
  return result ? area(result) / 1_000_000 : 0; // 1_000_000 is same as 1000000
}
