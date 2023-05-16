interface GeoEvent {
    id?: string
    longitude: number,
    latitude: number,
    confidence: string,
    detectedBy: string,
    date: Date,
}

export default GeoEvent;