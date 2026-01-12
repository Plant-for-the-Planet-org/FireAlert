/**
 * OneSignal Service Exports
 */

export {
  OneSignalStateManager,
  getOneSignalStateManager,
  resetOneSignalStateManager,
} from './OneSignalStateManager';
export {OneSignalDeviceSync} from './OneSignalDeviceSync';
export type {
  DeviceState,
  StateChangeEvent,
  AlertMethod,
  SyncResult,
  NotificationHandlers,
  UseOneSignalOptions,
  UseOneSignalReturn,
  StateChangeListener,
} from './types';
