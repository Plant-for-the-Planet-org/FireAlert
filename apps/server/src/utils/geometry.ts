import slices from "../utils/slices"
interface Slice {
    name: string;
    bbox: string;
    coordinates: number[][];
    description: string;
}
export interface Slices {
    [key: string]: Slice;
}
// Given that the slices are defined by their bounding boxes (bbox) which simplifies the geometry to rectangular areas, 
// we can determine slice using a quick containment check. 

// This method assumes that the slices do not overlap and are well-defined.

export function determineSlice(latitude: number, longitude: number): string {
    for (const [sliceKey, slice] of Object.entries(slices)) {
        const bbox = slice.bbox.split(',').map(Number);
        const [minLon, minLat, maxLon, maxLat] = bbox;

        // Check if the point is within the bbox of the slice
        if (longitude >= minLon && longitude <= maxLon && latitude >= minLat && latitude <= maxLat) {
            return sliceKey; // Return the slice name if the point is within the bbox
        }
    }
    return '0'; // Return '0' if the point doesn't fall into any slice
}