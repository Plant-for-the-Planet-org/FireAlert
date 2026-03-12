import {
  area,
  center,
  circle as turfCircle,
  distance,
  featureCollection,
  point,
} from '@turf/turf';
import type {Feature, Polygon, Position} from 'geojson';
import type {FirePoint, IncidentCircleResult} from '../../types/incident';

export function generateIncidentCircle(
  fires: FirePoint[],
  paddingKm: number = 2,
): IncidentCircleResult | null {
  if (!fires || fires.length === 0) {
    return null;
  }

  try {
    const points = fires.map(fire => point([fire.longitude, fire.latitude]));
    const collection = featureCollection(points);
    const centroidFeature = center(collection);
    const centroidCoords = centroidFeature.geometry.coordinates as Position;

    let maxDistance = 0;
    for (const fire of fires) {
      const firePoint = point([fire.longitude, fire.latitude]);
      const currentDistance = distance(centroidFeature, firePoint, {
        units: 'kilometers',
      });
      if (currentDistance > maxDistance) {
        maxDistance = currentDistance;
      }
    }

    const radiusKm = Math.max(maxDistance + paddingKm, 0.1 + paddingKm);
    const circlePolygon = turfCircle(centroidCoords, radiusKm, {
      steps: 64,
      units: 'kilometers',
    }) as Feature<Polygon>;
    const areaKm2 = area(circlePolygon) / 1_000_000;

    return {
      circlePolygon,
      centroid: centroidCoords as [number, number],
      radiusKm,
      areaKm2,
    };
  } catch {
    return null;
  }
}

export function calculateIncidentArea(
  fires: FirePoint[],
  paddingKm: number = 2,
): number {
  return generateIncidentCircle(fires, paddingKm)?.areaKm2 ?? 0;
}
