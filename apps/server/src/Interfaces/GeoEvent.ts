import DataRecord from "./DataRecord";

interface GeoEvent {
    id?: string
    longitude: number,
    latitude: number,
    type: string,
    confidence: string,
    detectedBy: string,
    eventDate: Date,
    data: DataRecord
}

export default GeoEvent;