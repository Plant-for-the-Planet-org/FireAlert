/**
 * Device alert method sync: orchestration only. Uses alert method queries and
 * deviceSyncLogic to perform create / update / deleteThenCreate. No OneSignal init.
 */

import {useCallback, useRef} from 'react';
import {useAlertMethodQueries} from '../../api/alertMethod';
import {computeDeviceSyncAction} from '../../services/OneSignal/deviceSyncLogic';
import type {DeviceState} from '../../services/OneSignal/types';
import {getDeviceInfo} from '../../utils/deviceInfo';
import type {DeviceAlertMethodRecord} from '../../services/OneSignal/types';

/** Extract alert methods array from refetch result (server returns { status, data: array }). */
function getAlertMethodsArray(
  refetchResult: unknown,
): DeviceAlertMethodRecord[] {
  const r = refetchResult as
    | {data?: {data?: DeviceAlertMethodRecord[]}}
    | {data?: DeviceAlertMethodRecord[]}
    | undefined;
  if (!r) return [];
  if (Array.isArray((r as {data?: DeviceAlertMethodRecord[]}).data))
    return (r as {data: DeviceAlertMethodRecord[]}).data;
  return (r as {data?: {data?: DeviceAlertMethodRecord[]}}).data?.data ?? [];
}

export interface UseDeviceAlertMethodSyncOptions {
  /** Called when a create, update, or deleteThenCreate has completed successfully. */
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
    deleteAlertMethod,
  } = useAlertMethodQueries();

  const syncInProgressRef = useRef(false);

  const performDeviceSync = useCallback(
    async (deviceState: DeviceState, _fireAlertUserId: string) => {
      if (syncInProgressRef.current) {
        return;
      }

      if (!deviceState.userId) {
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
          oneSignalUserId: deviceState.userId,
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
                  destination: deviceState.userId,
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

          case 'deleteThenCreate': {
            deleteAlertMethod.mutate(
              {json: {alertMethodId: syncAction.alertMethodId}},
              {
                onSuccess: () => {
                  createAlertMethod.mutate(
                    {
                      json: {
                        deviceId,
                        deviceName,
                        method: 'device',
                        destination: deviceState.userId,
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
      deleteAlertMethod,
      onSyncCompleted,
    ],
  );

  return {performDeviceSync};
}
