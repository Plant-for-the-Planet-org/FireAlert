/**
 * OneSignal Service Exports
 */

export {
  OneSignalStateManager,
  getOneSignalStateManager,
  resetOneSignalStateManager,
} from './OneSignalStateManager';
export {computeDeviceSyncAction} from './deviceSyncLogic';
export type {ComputeDeviceSyncActionParams} from './deviceSyncLogic';
export type {
  DeviceState,
  StateChangeEvent,
  AlertMethod,
  SyncResult,
  SyncAction,
  DeviceAlertMethodRecord,
  NotificationHandlers,
  UseOneSignalOptions,
  UseOneSignalReturn,
  StateChangeListener,
} from './types';
