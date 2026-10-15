/**
 * Device alert method sync: orchestration only. Uses alert method queries and
 * deviceSyncLogic to perform create / update. No push SDK init.
 */

import {useCallback, useRef} from 'react';
import {useAlertMethodQueries} from '../../api/alertMethod';
import {computeDeviceSyncAction} from '../../services/PushNotification/deviceSyncLogic';
import {
  CURRENT_PUSH_PROVIDER,
  type DeviceState,
} from '../../services/PushNotification/types';
import {getDeviceInfo} from '../../utils/deviceInfo';
import type {DeviceAlertMethodRecord} from '../../services/PushNotification/types';

/**
 * Extract alert methods array from refetch result.
 * Server returns { status, data: array }; the tRPC client wraps it as { json: {...} }.
 */
function getAlertMethodsArray(
  refetchResult: unknown,
): DeviceAlertMethodRecord[] {
  const body = (refetchResult as {data?: unknown} | undefined)?.data as
    | {json?: {data?: DeviceAlertMethodRecord[]}; data?: unknown}
    | DeviceAlertMethodRecord[]
    | undefined;
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.json?.data)) return body.json!.data!;
  if (Array.isArray(body.data)) return body.data as DeviceAlertMethodRecord[];
  return [];
}

export interface UseDeviceAlertMethodSyncOptions {
  /** Called when a create or update has completed successfully. */
  onSyncCompleted?: () => void;
}

export function useDeviceAlertMethodSync(
  options: UseDeviceAlertMethodSyncOptions = {},
) {
  const {onSyncCompleted} = options;
  const {
    refetchAlertMethods,
    createAlertMethod,
    updateAlertMethod,
  } = useAlertMethodQueries();

  const syncInProgressRef = useRef(false);

  const performDeviceSync = useCallback(
    async (deviceState: DeviceState, _fireAlertUserId: string) => {
      if (syncInProgressRef.current) {
        return;
      }

      const pushToken = deviceState.token;
      if (!pushToken) {
        return;
      }

      try {
        syncInProgressRef.current = true;

        const {deviceId, deviceName} = await getDeviceInfo();
        const refetchResult = await refetchAlertMethods();
        const alertMethods = getAlertMethodsArray(refetchResult);

        const syncAction = computeDeviceSyncAction({
          deviceId,
          deviceName,
          pushToken,
          permission: deviceState.permission,
          alertMethods,
        });

        switch (syncAction.action) {
          case 'no_change':
            syncInProgressRef.current = false;
            onSyncCompleted?.();
            return;

          case 'create': {
            createAlertMethod.mutate(
              {
                json: {
                  deviceId,
                  deviceName,
                  method: 'device',
                  destination: pushToken,
                  pushProvider: CURRENT_PUSH_PROVIDER,
                },
              },
              {
                onSuccess: () => {
                  syncInProgressRef.current = false;
                  onSyncCompleted?.();
                },
                onError: (_err: Error) => {
                  syncInProgressRef.current = false;
                },
              },
            );
            return;
          }

          case 'update': {
            updateAlertMethod.mutate(
              {
                json: {
                  params: {alertMethodId: syncAction.alertMethodId},
                  body: {isEnabled: syncAction.isEnabled},
                },
              },
              {
                onSuccess: () => {
                  syncInProgressRef.current = false;
                  onSyncCompleted?.();
                },
                onError: (_err: Error) => {
                  syncInProgressRef.current = false;
                },
              },
            );
            return;
          }
        }
      } catch (_err) {
        syncInProgressRef.current = false;
      }
    },
    [
      refetchAlertMethods,
      createAlertMethod,
      updateAlertMethod,
      onSyncCompleted,
    ],
  );

  return {performDeviceSync};
}
