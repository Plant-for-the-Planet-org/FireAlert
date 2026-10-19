/**
 * Push notification (FCM) integration types.
 */

/** Push provider stored on the server AlertMethod (`pushProvider`). */
export type PushProvider = 'ONESIGNAL' | 'FCM';

/** Provider used by this app version for new device alert methods. */
export const CURRENT_PUSH_PROVIDER: PushProvider = 'FCM';

export interface DeviceState {
  /** FCM registration token. Used as AlertMethod.destination. */
  token: string | null;
  /** OS notification permission granted. */
  permission: boolean;
  isInitialized: boolean;
  /** @deprecated Unused. Remove when the legacy OneSignal notification system is fully removed. */
  lastUpdated: number;
}

export interface StateChangeEvent {
  type: 'permission_changed' | 'token_changed' | 'state_updated';
  previousState: DeviceState;
  currentState: DeviceState;
  /** @deprecated Unused. Remove when the legacy OneSignal notification system is fully removed. */
  timestamp: number;
}

/** Minimal device alert method shape for sync logic (aligned with getAlertMethods response). */
export interface DeviceAlertMethodRecord {
  id: string;
  method: string;
  destination: string;
  deviceId: string | null;
  deviceName: string | null;
  pushProvider?: PushProvider | null;
  isEnabled: boolean;
  isVerified: boolean;
}

/** Result of computeDeviceSyncAction: what sync should do. */
export type SyncAction =
  | {action: 'create'}
  | {action: 'no_change'}
  | {action: 'update'; alertMethodId: string; isEnabled: boolean};

/** Data needed to route a tapped notification. */
export interface NotificationOpenPayload {
  url?: string | null;
  data?: Record<string, unknown> | null;
}

export interface NotificationHandlers {
  onOpened?: (payload: NotificationOpenPayload) => void;
}

export type StateChangeListener = (event: StateChangeEvent) => void;
