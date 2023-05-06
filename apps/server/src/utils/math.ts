// From a string of Coordinates to a number[][][] coordinates
export function makeCoordinates(str: string): number[][][] {
    const arr = str.split(',').map((val) => Number(val.trim()));
    const result: number[][] = [];

    for (let i = 0; i < arr.length; i += 2) {
        const group = [arr[i]!, arr[i + 1]!];
        if (group.every((val) => typeof val === 'number' && !isNaN(val))) {
            result.push(group);
        }
    }
    return [result];
}


// Make string of unarrayed coordinates from geojson coordinates
interface Point {
    type: 'Point';
    coordinates: [number, number];
}

interface LineString {
    type: 'LineString';
    coordinates: [number, number][];
}

interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
}

type Geometry = Point | LineString | Polygon;

export function makeUnarrayedCoordinates(geometry: Geometry): string {
    const { coordinates } = geometry;
    const flattened = coordinates.flat();
    return flattened.join(', ');
}

export function generate5DigitOTP() {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < 5; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }

    return otp;
}
