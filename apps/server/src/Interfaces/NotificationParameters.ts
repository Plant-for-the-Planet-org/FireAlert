import type DataRecord from "./DataRecord";

export interface NotificationParameters {
    message: string;
    subject: string;
    url: string;
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
    siteId: string,
}
