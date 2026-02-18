/**
 * Pure device sync logic: given device state and alert methods, decide create / update / delete.
 * No tRPC or React; data in, SyncAction out. Used by useDeviceAlertMethodSync.
 */

import type {SyncAction, DeviceAlertMethodRecord} from './types';

export interface ComputeDeviceSyncActionParams {
  deviceId: string;
  deviceName: string;
  oneSignalUserId: string | null;
  permission: boolean;
  alertMethods: DeviceAlertMethodRecord[];
}

/**
 * Find the device alert method for this deviceId, if any.
 */
function findDeviceAlertMethod(
  alertMethods: DeviceAlertMethodRecord[],
  deviceId: string,
): DeviceAlertMethodRecord | undefined {
  return alertMethods.find(
    m => m.method === 'device' && (m.deviceId ?? null) === deviceId,
  );
}

/**
 * Compute what sync should do: create, update, no_change, or deleteThenCreate (reinstall).
 */
export function computeDeviceSyncAction(
  params: ComputeDeviceSyncActionParams,
): SyncAction {
  const {deviceId, oneSignalUserId, alertMethods} = params;

  if (!oneSignalUserId) {
    return {action: 'no_change'};
  }

  const existing = findDeviceAlertMethod(alertMethods, deviceId);

  if (!existing) {
    return {action: 'create'};
  }

  if (existing.destination !== oneSignalUserId) {
    return {action: 'deleteThenCreate', alertMethodId: existing.id};
  }

  return {
    action: 'update',
    alertMethodId: existing.id,
    isEnabled: params.permission,
  };
}
