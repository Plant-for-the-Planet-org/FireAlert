/**
 * Push Notification (FCM) Service Exports
 */

export {
  PushNotificationStateManager,
  getPushNotificationStateManager,
  // Deprecated: unused, see PushNotificationStateManager.ts.
  resetPushNotificationStateManager,
  ANDROID_CHANNEL_ID,
  ensureAndroidChannel,
} from './PushNotificationStateManager';
export {computeDeviceSyncAction} from './deviceSyncLogic';
export type {ComputeDeviceSyncActionParams} from './deviceSyncLogic';
export {CURRENT_PUSH_PROVIDER} from './types';
export type {
  DeviceState,
  StateChangeEvent,
  SyncAction,
  DeviceAlertMethodRecord,
  NotificationHandlers,
  NotificationOpenPayload,
  PushProvider,
  StateChangeListener,
} from './types';
