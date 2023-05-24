import type DataRecord from "./DataRecord";

export interface NotificationParameters {
    alertId: string;
    type: string;
    confidence: string;
    detectedBy: string;
    eventDate: Date;
    longitude: number;
    latitude: number;
    distance: number;
    data: DataRecord;
    siteName: string;
}
