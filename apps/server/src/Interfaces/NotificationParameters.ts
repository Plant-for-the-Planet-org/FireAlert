import DataRecord from "./DataRecord";

export interface NotificationParameters {
    type: string;
    confidence: string;
    detectedBy: string;
    eventDate: Date;
    longitude: number;
    latitude: number;
    distance: number;
    data: DataRecord;
}
