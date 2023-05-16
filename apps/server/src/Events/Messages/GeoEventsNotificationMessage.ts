import GeoEvent from "../../Interfaces/GeoEvent"

export class GeoEventsNotificationMessage {
    source: string; // MODIS
    geoEvents: Array<GeoEvent>

    constructor(source: string, geoEvents: Array<GeoEvent>) {
        this.source = source
        this.geoEvents = geoEvents
    }
}