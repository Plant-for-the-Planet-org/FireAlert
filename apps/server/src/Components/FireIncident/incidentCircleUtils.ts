import {
  area,
  buffer,
  circle as turfCircle,
  clustersDbscan,
  concave,
  convex,
  distance,
  featureCollection,
  point,
  union,
  center,
} from '@turf/turf';
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson';

type IncidentContourGeometry = Polygon | MultiPolygon;

interface FirePoint {
  latitude: number;
  longitude: number;
}

interface IncidentCircleResult {
  /** The GeoJSON contour polygon/multipolygon encompassing incident fire clusters */
  circlePolygon: Feature<IncidentContourGeometry>;
  /** The centroid coordinates [longitude, latitude] */
  centroid: Position;
  /** Approximate radius of spread in kilometers */
  radiusKm: number;
  /** The area of the contour in square kilometers */
  areaKm2: number;
}

const MIN_CLUSTER_RADIUS_KM = 0.1;
const MIN_POINT_BUFFER_KM = 0.15;
const MIN_SMOOTHING_KM = 0.05;

function isContourGeometry(
  geometry: Polygon | MultiPolygon | Point | null | undefined,
): geometry is IncidentContourGeometry {
  return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
}

function extractContourFeatures(
  value: unknown,
): Feature<IncidentContourGeometry>[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const featureLike = value as
    | Feature<Polygon | MultiPolygon>
    | FeatureCollection<Polygon | MultiPolygon>;

  if (featureLike.type === 'FeatureCollection') {
    return featureLike.features.filter(
      feature => feature.geometry && isContourGeometry(feature.geometry),
    ) as Feature<IncidentContourGeometry>[];
  }

  if (featureLike.type === 'Feature' && isContourGeometry(featureLike.geometry)) {
    return [featureLike as Feature<IncidentContourGeometry>];
  }

  return [];
}

function mergeContourFeatures(
  features: Feature<IncidentContourGeometry>[],
): Feature<IncidentContourGeometry> | null {
  if (features.length === 0) return null;
  if (features.length === 1) return features[0] ?? null;

  try {
    const merged = union(
      featureCollection(features as Feature<Polygon | MultiPolygon>[]),
    );
    if (merged && isContourGeometry(merged.geometry)) {
      return merged as Feature<IncidentContourGeometry>;
    }
  } catch {
    // Fallback below keeps all pockets as MultiPolygon if union fails.
  }

  const coordinates: MultiPolygon['coordinates'] = [];

  for (const feature of features) {
    if (feature.geometry.type === 'Polygon') {
      coordinates.push(feature.geometry.coordinates);
    } else {
      coordinates.push(...feature.geometry.coordinates);
    }
  }

  if (coordinates.length === 0) return null;

  if (coordinates.length === 1) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: coordinates[0] ?? [],
      },
    };
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
  };
}

function smoothContour(
  contour: Feature<IncidentContourGeometry>,
  smoothingKm: number,
): Feature<IncidentContourGeometry> {
  if (smoothingKm <= 0) return contour;

  try {
    const expanded = buffer(contour, smoothingKm, {units: 'kilometers'});
    const expandedFeatures = extractContourFeatures(expanded);
    const expandedContour = mergeContourFeatures(expandedFeatures);
    if (!expandedContour) return contour;

    const contracted = buffer(expandedContour, -smoothingKm * 0.75, {
      units: 'kilometers',
    });
    const contractedFeatures = extractContourFeatures(contracted);
    return (
      mergeContourFeatures(contractedFeatures) ??
      mergeContourFeatures(expandedFeatures) ??
      contour
    );
  } catch {
    return contour;
  }
}

function buildClusterContour(
  clusterPoints: Feature<Point>[],
  clusterRadiusKm: number,
  smoothingKm: number,
): Feature<IncidentContourGeometry> | null {
  const clusterCollection = featureCollection(clusterPoints);
  let contour: Feature<IncidentContourGeometry> | null = null;

  if (clusterPoints.length >= 3) {
    const concaveContour = concave(clusterCollection, {
      maxEdge: Math.max(clusterRadiusKm * 2, MIN_POINT_BUFFER_KM),
      units: 'kilometers',
    });

    if (concaveContour && isContourGeometry(concaveContour.geometry)) {
      contour = concaveContour as Feature<IncidentContourGeometry>;
    } else {
      const convexContour = convex(clusterCollection);
      if (convexContour && isContourGeometry(convexContour.geometry)) {
        contour = convexContour as Feature<IncidentContourGeometry>;
      }
    }
  }

  if (!contour) {
    const bufferedPoints = clusterPoints.map(clusterPoint =>
      turfCircle(
        clusterPoint.geometry.coordinates,
        Math.max(clusterRadiusKm * 0.25, MIN_POINT_BUFFER_KM),
        {
          steps: 24,
          units: 'kilometers',
        },
      ),
    );

    contour = mergeContourFeatures(
      bufferedPoints as Feature<IncidentContourGeometry>[],
    );
  }

  if (!contour) return null;
  return smoothContour(contour, smoothingKm);
}

/**
 * Generates a geographic contour from clustered fire points.
 * Uses DBSCAN clustering + concave/convex fallback and light smoothing.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Used as clustering radius in kilometers (default: 2km)
 * @returns Object containing contour geometry, centroid, radius, and area
 */
export function generateIncidentCircle(
  fires: FirePoint[],
  paddingKm: number = 2,
): IncidentCircleResult | null {
  if (fires.length === 0) {
    return null;
  }

  const clusterRadiusKm = Math.max(paddingKm, MIN_CLUSTER_RADIUS_KM);
  const smoothingKm = Math.max(clusterRadiusKm * 0.08, MIN_SMOOTHING_KM);

  const points = fires.map(fire => point([fire.longitude, fire.latitude]));
  const collection = featureCollection(points);
  const centroidFeature = center(collection);
  const centroidCoords = centroidFeature.geometry.coordinates as Position;

  const clusteredPoints = clustersDbscan(collection, clusterRadiusKm, {
    units: 'kilometers',
    minPoints: 1,
  });

  const groupedClusters = new Map<string, Feature<Point>[]>();
  let noiseIndex = 0;

  for (const clusteredPoint of clusteredPoints.features) {
    const clusterId = clusteredPoint.properties?.['cluster'];
    const key =
      typeof clusterId === 'number'
        ? `cluster-${clusterId}`
        : `noise-${noiseIndex++}`;

    const group = groupedClusters.get(key) ?? [];
    group.push(clusteredPoint as Feature<Point>);
    groupedClusters.set(key, group);
  }

  const clusterContours: Feature<IncidentContourGeometry>[] = [];
  groupedClusters.forEach(clusterPoints => {
    const contour = buildClusterContour(
      clusterPoints,
      clusterRadiusKm,
      smoothingKm,
    );
    if (contour) {
      clusterContours.push(contour);
    }
  });

  let contourPolygon = mergeContourFeatures(clusterContours);
  if (!contourPolygon) {
    contourPolygon = turfCircle(
      centroidCoords,
      Math.max(clusterRadiusKm * 0.3, MIN_POINT_BUFFER_KM),
      {
        steps: 32,
        units: 'kilometers',
      },
    ) as Feature<IncidentContourGeometry>;
  }

  let maxDistance = 0;
  for (const fire of fires) {
    const firePoint = point([fire.longitude, fire.latitude]);
    const d = distance(centroidFeature, firePoint, {units: 'kilometers'});
    if (d > maxDistance) {
      maxDistance = d;
    }
  }

  const radiusKm = Math.max(maxDistance, MIN_CLUSTER_RADIUS_KM);
  const areaKm2 = area(contourPolygon) / 1_000_000;

  return {
    circlePolygon: contourPolygon,
    centroid: centroidCoords,
    radiusKm,
    areaKm2,
  };
}

/**
 * Calculates just the contour area affected by fires in an incident.
 *
 * @param fires - Array of fire points with latitude and longitude
 * @param paddingKm - Used as clustering radius in kilometers (default: 2km)
 * @returns The area in square kilometers, or 0 if no fires
 */
export function calculateIncidentArea(
  fires: FirePoint[],
  paddingKm: number = 2,
): number {
  const result = generateIncidentCircle(fires, paddingKm);
  return result?.areaKm2 ?? 0;
}
