import DataRecord from "./DataRecord";
import { Confidence } from "./GeoEvent";
import { GeoEventProviderClientId } from "./GeoEventProvider";

export enum AlertType {
    fire = 'fire'
}

export interface SiteAlertInterface {
    id?: string,
    siteId: string,
    type: AlertType,
    latitude: number,
    longitude: number,
    eventDate: Date,
    detectedBy: GeoEventProviderClientId,
    confidence: Confidence,
    isProcessed?: boolean,
    deletedAt?: boolean,
    distance: number,
    data: DataRecord,
}