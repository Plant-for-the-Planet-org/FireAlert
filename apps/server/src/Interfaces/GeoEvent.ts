interface GeoEvent {
    id?: string
    longitude: number,
    latitude: number,
    type: string,
    confidence: string,
    detectedBy: string,
    eventDate: Date,
}

export default GeoEvent;