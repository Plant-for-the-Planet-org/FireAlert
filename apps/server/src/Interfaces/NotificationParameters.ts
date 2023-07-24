import type DataRecord from './DataRecord';

export interface NotificationParameters {
  message: string;
  subject: string;
  url?: string;
  alert?: {
    id: string;
    type: string;
    confidence: string;
    source: string;
    date: Date;
    longitude: number;
    latitude: number;
    distance: number;
    data: DataRecord;
    siteId: string;
    siteName: string;
  };
}
