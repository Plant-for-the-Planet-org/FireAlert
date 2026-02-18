/**
 * OneSignal Integration Types
 * Defines all TypeScript interfaces for the OneSignal service layer
 */

export interface DeviceState {
  userId: string | null;
  pushToken: string | null;
  externalId: string | null;
  optedIn: boolean;
  permission: boolean;
  isInitialized: boolean;
  lastUpdated: number;
}

export interface StateChangeEvent {
  type:
    | 'initialized'
    | 'login'
    | 'logout'
    | 'permission_changed'
    | 'subscription_changed'
    | 'state_updated';
  previousState: DeviceState;
  currentState: DeviceState;
  timestamp: number;
}

export interface AlertMethod {
  id: string;
  userId: string;
  method: string;
  destination: string;
  deviceId: string;
  deviceName: string;
  isEnabled: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SyncResult {
  action: 'created' | 'updated' | 'no_change' | 'deleted';
  alertMethodId?: string;
  message: string;
  timestamp: number;
}

/** Minimal device alert method shape for sync logic (aligned with getAlertMethods response). */
export interface DeviceAlertMethodRecord {
  id: string;
  method: string;
  destination: string;
  deviceId: string | null;
  deviceName: string | null;
  isEnabled: boolean;
  isVerified: boolean;
}

/** Result of computeDeviceSyncAction: what sync should do. */
export type SyncAction =
  | {action: 'create'}
  | {action: 'no_change'}
  | {action: 'update'; alertMethodId: string; isEnabled: boolean}
  | {action: 'deleteThenCreate'; alertMethodId: string};

export interface NotificationHandlers {
  onReceived?: (notification: any) => void;
  onOpened?: (openResult: any) => void;
  onIds?: (device: any) => void;
}

export interface UseOneSignalOptions {
  appId: string;
  handlers?: NotificationHandlers;
}

export interface UseOneSignalReturn {
  state: DeviceState;
  isInitialized: boolean;
  error: Error | null;
}

export type StateChangeListener = (event: StateChangeEvent) => void;
