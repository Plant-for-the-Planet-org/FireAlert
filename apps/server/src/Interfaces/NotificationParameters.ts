import type DataRecord from './DataRecord';

export interface NotificationParameters {
  id?: string;
  message?: string;
  subject?: string;
  url?: string;
  authenticationMessage?: boolean;
  otp?: string,
  siteName?: string,
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
