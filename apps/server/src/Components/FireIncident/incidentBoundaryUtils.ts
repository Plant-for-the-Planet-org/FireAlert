import {
  area,
  buffer,
  booleanPointInPolygon,
  circle,
  convex,
  featureCollection,
  point,
} from '@turf/turf';
import type {Feature, LineString, Polygon, MultiPolygon} from 'geojson';
import countriesData from '../../data/countries-optimized.geo.json';

interface FirePoint {
  latitude: number;
  longitude: number;
}

/**
 * Checks if any fire point is within the United States boundaries
 * using the countries GeoJSON data for accurate detection
 *
 * @param fires - Array of fire points with latitude and longitude
 * @returns true if any fire is within USA boundaries, false otherwise
 */
export function isFiresInUSA(fires: FirePoint[]): boolean {
  // Find USA feature from countries data
  const usaFeature = countriesData.features.find(
    feature => feature.properties.iso_a2 === 'US',
  );

  if (!usaFeature) {
    return false;
  }

  // Check if any fire point is within USA polygon
  return fires.some(fire => {
    const firePoint = point([fire.longitude, fire.latitude]);
    return booleanPointInPolygon(firePoint, usaFeature);
  });
}

/**
 * [Deprecatedd] Generates a polygon encompassing all fire points in an incident.
 * Handles 0/1/2 fires with simple shapes, delegates 3+ fires to convex hull logic
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

  // Handle 1 fire: simple circle
  if (fires.length === 1) {
    const circlePolygon = circle(
      [fires[0].longitude, fires[0].latitude],
      0.1, // Fixed 0.1km radius for single fire
      {steps: 32, units: 'kilometers'},
    );

    return circlePolygon;
  }

  // Handle 2 fires: line connecting them + buffer
  if (fires.length === 2) {
    const lineFeature: Feature<LineString> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [fires[0].longitude, fires[0].latitude],
          [fires[1].longitude, fires[1].latitude],
        ],
      },
      properties: {},
    };

    // Buffer the line to create a polygon around it
    const bufferedPolygon = buffer(lineFeature, 0.3, {units: 'kilometers'});

    if (!bufferedPolygon) {
      return null;
    }

    // Buffer can return Feature<Polygon> or Feature<MultiPolygon>
    // We need to handle both cases and ensure we return Feature<Polygon>
    if (bufferedPolygon.geometry.type === 'MultiPolygon') {
      // For MultiPolygon, we could convert to Polygon or return null
      // For now, let's return null as this is an edge case
      return null;
    }

    return bufferedPolygon as Feature<Polygon>;
  }

  // For 3+ fires: return null - let parent function handle with convex hull
  return null;
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
): string {
  const result = generateIncidentPolygon(fires, paddingKm ?? 0.5);

  if (!result) {
    return 'Something went Wrong';
  }

  // Calculate area in square meters first
  const areaM2 = area(result);

  // Convert to square kilometers
  const areaKm2 = areaM2 / 1_000_000;

  // Check if any fire is in USA using accurate boundary detection
  const isInUSA = isFiresInUSA(fires);

  if (isInUSA) {
    return `${(areaM2 * 10.7639).toFixed(2)} sq miles`;
  } else {
    if (areaKm2 < 1) {
      return `${Math.round(areaM2)} sq m`;
    } else {
      return `${Math.round(areaKm2)} sq km`;
    }
  }
}
