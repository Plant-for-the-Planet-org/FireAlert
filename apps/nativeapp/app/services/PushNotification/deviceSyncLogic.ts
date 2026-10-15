/**
 * Pure device sync logic: given device state and alert methods, decide create / update.
 * No tRPC or React; data in, SyncAction out. Used by useDeviceAlertMethodSync.
 */

import type {SyncAction, DeviceAlertMethodRecord} from './types';

export interface ComputeDeviceSyncActionParams {
  deviceId: string;
  deviceName: string;
  /** FCM token of this device. */
  pushToken: string | null;
  permission: boolean;
  alertMethods: DeviceAlertMethodRecord[];
}

/**
 * Compute what sync should do: create, update, or no_change.
 */
export function computeDeviceSyncAction(
  params: ComputeDeviceSyncActionParams,
): SyncAction {
  const {deviceId, pushToken, alertMethods} = params;

  if (!pushToken) {
    return {action: 'no_change'};
  }

  const deviceMethods = alertMethods.filter(
    m => m.method === 'device' && (m.deviceId ?? null) === deviceId,
  );

  if (deviceMethods.length === 0) {
    return {action: 'create'};
  }

  // A row for this device with a different destination is stale: reinstall,
  // FCM token rotation, or the old OneSignal ID after upgrading. Create (or
  // re-confirm) the current row; the server then inactivates the stale rows.
  // The app never deletes first, so a failed create leaves the old row active.
  const current = deviceMethods.find(m => m.destination === pushToken);
  const hasStale = deviceMethods.some(m => m.destination !== pushToken);
  if (!current || hasStale) {
    return {action: 'create'};
  }

  return {
    action: 'update',
    alertMethodId: current.id,
    isEnabled: params.permission,
  };
}
