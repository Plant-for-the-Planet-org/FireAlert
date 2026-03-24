/**
 * Utility functions for calculating fire incident boundaries
 * Uses Turf.js for geospatial calculations
 */

import {
  area,
  buffer,
  center,
  circle as turfCircle,
  convex,
  distance,
  featureCollection,
  point,
} from '@turf/turf';
import type {Feature, Polygon} from 'geojson';
import type {FirePoint, IncidentCircleResult} from '../../types/incident';

/**
 * Creates an ellipse polygon that encompasses two fire points.
 * The ellipse is oriented along the line connecting the two points.
 */
export function createEllipseBetweenFires(
  fire1: FirePoint,
  fire2: FirePoint,
  bufferKm: number = 0.04,
): Feature<Polygon> {
  const midpoint = [
    (fire1.longitude + fire2.longitude) / 2,
    (fire1.latitude + fire2.latitude) / 2,
  ];

  const distanceBetweenFires =
    Math.sqrt(
      Math.pow(fire2.longitude - fire1.longitude, 2) +
        Math.pow(fire2.latitude - fire1.latitude, 2),
    ) * 111;

  const angle = Math.atan2(
    fire2.latitude - fire1.latitude,
    fire2.longitude - fire1.longitude,
  );

  const semiMajorAxis = distanceBetweenFires / 2 + bufferKm;
  const semiMinorAxis = bufferKm * 2;

  const ellipsePoints = [];
  const steps = 64;

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;

    const x = semiMajorAxis * Math.cos(theta);
    const y = semiMinorAxis * Math.sin(theta);

    const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
    const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);

    const lng = midpoint[0] + rotatedX / 111;
    const lat = midpoint[1] + rotatedY / 111;

    ellipsePoints.push([lng, lat]);
  }

  ellipsePoints.push(ellipsePoints[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ellipsePoints],
    },
    properties: {},
  };
}

function generateSimpleIncidentBoundary(
  fires: FirePoint[],
): Feature<Polygon> | null {
  if (fires.length === 0) {
    return null;
  }

  if (fires.length === 1) {
    return turfCircle([fires[0].longitude, fires[0].latitude], 0.004, {
      steps: 32,
      units: 'kilometers',
    }) as Feature<Polygon>;
  }

  return createEllipseBetweenFires(fires[0], fires[1], 0.04);
}

/**
 * Based on input fires, generate a polygon that encompasses all fires
 * using convex hull with optional buffer for smoothing vertices and realistic fire spread.
 * For 1-2 fires, creates small edge-case boundaries.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param bufferKm - Optional buffer distance in kilometers (default: 0.5km)
 * @returns A polygon boundary, or null if no fires
 */
export function generateIncidentPolygon(
  fires: FirePoint[],
  bufferKm: number = 0.5,
): Feature<Polygon> | null {
  if (fires.length === 0) {
    return null;
  }

  if (fires.length <= 2) {
    return generateSimpleIncidentBoundary(fires);
  }

  const points = fires.map(fire => point([fire.longitude, fire.latitude]));
  const collection = featureCollection(points);
  const polygon = convex(collection, {concavity: fires.length});

  if (!polygon) {
    return null;
  }

  const bufferedPolygon = buffer(polygon, bufferKm, {units: 'kilometers'});

  if (!bufferedPolygon || bufferedPolygon.geometry.type !== 'Polygon') {
    return polygon as Feature<Polygon>;
  }

  return bufferedPolygon as Feature<Polygon>;
}

/**
 * Generates an incident boundary and returns it in the existing result shape.
 * This keeps native callers compatible while using the improved server-style polygon logic.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Buffer distance in kilometers for 3+ points (default: 0.5km)
 * @returns Object containing polygon, centroid, radius approximation, and area
 */
export function generateIncidentCircle(
  fires: FirePoint[],
  paddingKm: number = 0.5,
): IncidentCircleResult | null {
  if (!fires || fires.length === 0) {
    return null;
  }

  const polygon =
    fires.length <= 2
      ? generateSimpleIncidentBoundary(fires)
      : generateIncidentPolygon(fires, paddingKm);

  if (!polygon) {
    return null;
  }

  const centroidFeature = center(polygon);
  const centroidCoords = centroidFeature.geometry.coordinates as [number, number];

  let radiusKm = 0;
  for (const coordinate of polygon.geometry.coordinates[0] || []) {
    const edgePoint = point(coordinate);
    const edgeDistanceKm = distance(centroidFeature, edgePoint, {
      units: 'kilometers',
    });
    if (edgeDistanceKm > radiusKm) {
      radiusKm = edgeDistanceKm;
    }
  }

  const areaKm2 = area(polygon) / 1_000_000;

  return {
    circlePolygon: polygon,
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
 * @param paddingKm - Boundary buffer in kilometers for 3+ fires (default: 0.5km)
 * @returns The area in square kilometers, or 0 if no fires or error occurs
 */
export function calculateIncidentArea(
  fires: FirePoint[],
  paddingKm: number = 0.5,
): number {
  try {
    const incidentPolygon = generateIncidentPolygon(fires, paddingKm);
    if (!incidentPolygon) {
      return 0;
    }

    return area(incidentPolygon) / 1_000_000;
  } catch (error) {
    console.error('Error calculating incident area:', error);
    return 0;
  }
}
