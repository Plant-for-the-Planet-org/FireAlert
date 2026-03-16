import {
  area,
  booleanPointInPolygon,
  buffer,
  circle,
  convex,
  featureCollection,
  point,
} from '@turf/turf';
import type {Feature, Polygon} from 'geojson';
import countriesData from '../../data/countries-optimized.geo.json';

interface FirePoint {
  latitude: number;
  longitude: number;
}

/**
 * Creates an ellipse polygon that encompasses two fire points
 * The ellipse is oriented along the line connecting the two points
 *
 * @param fire1 - First fire point
 * @param fire2 - Second fire point
 * @param bufferKm - Additional buffer distance in kilometers (default: 0.04km)
 * @returns Feature<Polygon> representing the ellipse
 */
export function createEllipseBetweenFires(
  fire1: FirePoint,
  fire2: FirePoint,
  bufferKm: number = 0.04,
): Feature<Polygon> {
  // Calculate midpoint between the two fires
  const midpoint = [
    (fire1.longitude + fire2.longitude) / 2,
    (fire1.latitude + fire2.latitude) / 2,
  ];

  // Calculate distance between the two fires in kilometers
  const distanceBetweenFires =
    Math.sqrt(
      Math.pow(fire2.longitude - fire1.longitude, 2) +
        Math.pow(fire2.latitude - fire1.latitude, 2),
    ) * 111; // Convert degrees to km (approximate)

  // Calculate angle between the two points
  const angle = Math.atan2(
    fire2.latitude - fire1.latitude,
    fire2.longitude - fire1.longitude,
  );

  // Create ellipse parameters
  const semiMajorAxis = distanceBetweenFires / 2 + bufferKm; // Half distance + buffer
  const semiMinorAxis = bufferKm * 2; // Width perpendicular to the line

  // Generate ellipse points
  const ellipsePoints = [];
  const steps = 64;

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;

    // Ellipse in local coordinates
    const x = semiMajorAxis * Math.cos(theta);
    const y = semiMinorAxis * Math.sin(theta);

    // Rotate to match the angle between fire points
    const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
    const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);

    // Convert to longitude/latitude and add midpoint offset
    const lng = midpoint[0] + rotatedX / 111; // Convert km back to degrees
    const lat = midpoint[1] + rotatedY / 111;

    ellipsePoints.push([lng, lat]);
  }

  // Close the polygon
  ellipsePoints.push(ellipsePoints[0]);

  // Create ellipse polygon
  const ellipsePolygon: Feature<Polygon> = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ellipsePoints],
    },
    properties: {},
  };

  return ellipsePolygon;
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
      0.004, // Fixed 0.1km radius for single fire
      {steps: 32, units: 'kilometers'},
    );

    return circlePolygon;
  }

  // Handle 2 fires: create an oval/ellipse around both points
  if (fires.length === 2) {
    return createEllipseBetweenFires(fires[0], fires[1], 0.04);
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
