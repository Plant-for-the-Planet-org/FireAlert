const turf = require('@turf/turf');


interface Geometry {
    type: "Point" | "Polygon" | "MultiPolygon";
    coordinates:
      | [number, number, number?] // Point
      | [[number, number, number?][]] // Polygon
      | [[[number, number, number?][]]] // MultiPolygon
  }
type DetectionCoordinates = Array<Array<[number, number] | [number, number, number?]>>; 

export function makeDetectionCoordinates(geometry:Geometry, radius: string):DetectionCoordinates {
    let radiusInMeters = 0;
    let bufferCoordinates;
    if(geometry.type === 'Point' && radius === 'inside'){
        radiusInMeters = 5000;
    }else if((geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') && radius === 'inside'){
        radiusInMeters = 0;
    }else if(radius === 'within5km'){
        radiusInMeters = 50000;
    }else if(radius === 'within10km'){
        radiusInMeters = 10000;
    }else if(radius === 'within100km'){
        radiusInMeters = 100000;
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