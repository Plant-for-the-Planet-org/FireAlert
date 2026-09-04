export type AlertMethodType =
  | 'email'
  | 'sms'
  | 'device'
  | 'whatsapp'
  | 'webhook';

export interface AlertMethod {
  id: string;
  method: AlertMethodType;
  destination: string;
  deviceName?: string | null;
  deviceId?: string | null;
  isEnabled: boolean;
  isVerified: boolean;
  lastTokenSentDate?: string | null;
  userId: string;
}

export interface SuperjsonEnvelope<T> {
  json: T;
  meta?: unknown;
}

export interface AlertMethodListResponse {
  status: string;
  data: AlertMethod[];
}

export const ALERT_METHODS_QUERY_KEY = [
  ['alertMethod', 'getAlertMethods'],
  {type: 'query'},
] as const;
