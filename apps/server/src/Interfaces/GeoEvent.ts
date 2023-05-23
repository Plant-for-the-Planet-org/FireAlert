import DataRecord from "./DataRecord";

interface GeoEvent {
    id?: string,
    longitude: number,
    latitude: number,
    eventDate: Date,
    type: "fire",
    confidence: "high" | "medium" | "low",
    providerKey:"FIRMS",
    identityGroup: string,
    data: DataRecord
}


export default GeoEvent;