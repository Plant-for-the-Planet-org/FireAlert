import {
  point,
  featureCollection,
  center,
  circle as turfCircle,
  distance,
  area,
} from '@turf/turf';
import type {Feature, Polygon, Position} from 'geojson';

interface FirePoint {
  latitude: number;
  longitude: number;
}

interface IncidentCircleResult {
  /** The GeoJSON circle polygon encompassing all fires */
  circlePolygon: Feature<Polygon>;
  /** The centroid coordinates [longitude, latitude] */
  centroid: Position;
  /** The radius of the circle in kilometers */
  radiusKm: number;
  /** The area of the circle in square kilometers */
  areaKm2: number;
}

/**
 * Generates a circle polygon encompassing all fire points in an incident.
 * The circle is centered at the centroid of all fires and extends to cover
 * the farthest fire point plus a padding distance.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Additional padding in kilometers around the farthest fire (default: 2km)
 * @returns Object containing the circle polygon, centroid, radius, and area
 */
export function generateIncidentCircle(
  fires: FirePoint[],
  paddingKm: number = 2,
): IncidentCircleResult | null {
  if (fires.length === 0) {
    return null;
  }

  // Convert fire points to GeoJSON points
  const points = fires.map(fire => point([fire.longitude, fire.latitude]));
  const collection = featureCollection(points);

  // Calculate the centroid of all fire points
  const centroidFeature = center(collection);
  const centroidCoords = centroidFeature.geometry.coordinates as Position;

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

  // Create the circle polygon using turf
  const circlePolygon = turfCircle(centroidCoords, radiusKm, {
    steps: 64,
    units: 'kilometers',
  }) as Feature<Polygon>;

  // Calculate the area of the circle in square kilometers
  const areaM2 = area(circlePolygon);
  const areaKm2 = areaM2 / 1_000_000;

  return {
    circlePolygon,
    centroid: centroidCoords,
    radiusKm,
    areaKm2,
  };
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
  paddingKm: number = 2,
): number {
  const result = generateIncidentCircle(fires, paddingKm);
  return result?.areaKm2 ?? 0;
}
