/**
 * OneSignal Integration Constants
 */

export const ONESIGNAL_RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 8000,
};

export const ONESIGNAL_LOG_PREFIXES = {
  ONESIGNAL: '[OneSignal]',
  DEVICE_SYNC: '[DeviceSync]',
  ERROR: '[Error]',
  PERMISSION: '[Permission]',
};

export const ONESIGNAL_TIMEOUT_MS = 10000;

export const DEVICE_STATE_DEFAULTS: Record<string, any> = {
  userId: null,
  pushToken: null,
  externalId: null,
  optedIn: false,
  permission: false,
  isInitialized: false,
  lastUpdated: 0,
};
