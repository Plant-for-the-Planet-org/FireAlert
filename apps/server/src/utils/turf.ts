const turf = require('@turf/turf');
import { Geometry } from "../server/api/zodSchemas/site.schema";

type DetectionCoordinates = Array<Array<[number, number] | [number, number, number?]>>;

export function makeDetectionCoordinates(geometry: Geometry, radius: number): DetectionCoordinates {
    let radiusInMeters = radius;
    let bufferCoordinates;
    if (geometry.type === 'Point' && radius === 0) {
        radiusInMeters = 5000;
    } else if ((geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') && radius === 0) {
        radiusInMeters = 0;
    }

    if (geometry.type === 'Point') {
        bufferCoordinates = turf.point(geometry.coordinates)
    } else if (geometry.type === 'Polygon') {
        bufferCoordinates = turf.polygon(geometry.coordinates)
    } else if (geometry.type === 'MultiPolygon') {
        bufferCoordinates = turf.multiPolygon(geometry.coordinates)
    }
    const bufferOutput = turf.buffer(bufferCoordinates, radiusInMeters, { units: 'meters' });
    return bufferOutput.geometry.coordinates
}