import type {QueryClient} from '@tanstack/react-query';

import {createLogger} from '../../utils/logger';
import {
  ALERT_METHODS_QUERY_KEY,
  type AlertMethod,
  type AlertMethodListResponse,
  type SuperjsonEnvelope,
} from '../../types/alertMethod';

const log = createLogger('Cache');

type AlertMethodsCacheData = SuperjsonEnvelope<AlertMethodListResponse>;

export function upsertAlertMethodInCache(
  queryClient: QueryClient,
  alertMethod: AlertMethod | null | undefined,
) {
  if (!alertMethod?.id) {
    log.warn('Skipped cache write: mutation result had no id', {
      alertMethod,
    });
    return;
  }

  queryClient.setQueryData<AlertMethodsCacheData>(
    ALERT_METHODS_QUERY_KEY as unknown as readonly unknown[],
    oldData => {
      if (!oldData) {
        log.warn('Skipped cache write: getAlertMethods cache is empty');
        return oldData;
      }
      const existing = oldData.json?.data ?? [];
      const exists = existing.some(item => item?.id === alertMethod.id);
      const nextData = exists
        ? existing.map(item =>
            item?.id === alertMethod.id ? alertMethod : item,
          )
        : [...existing, alertMethod];

      log.info(exists ? 'Replaced alertMethod in cache' : 'Appended alertMethod to cache', {
        id: alertMethod.id,
        method: alertMethod.method,
      });

      return {...oldData, json: {...oldData.json, data: nextData}};
    },
  );
}

export function removeAlertMethodFromCache(
  queryClient: QueryClient,
  alertMethodId: string | null | undefined,
) {
  if (!alertMethodId) {
    log.warn('Skipped cache removal: no alertMethodId provided');
    return;
  }

  queryClient.setQueryData<AlertMethodsCacheData>(
    ALERT_METHODS_QUERY_KEY as unknown as readonly unknown[],
    oldData => {
      if (!oldData) return oldData;
      const existing = oldData.json?.data ?? [];
      return {
        ...oldData,
        json: {
          ...oldData.json,
          data: existing.filter(item => item?.id !== alertMethodId),
        },
      };
    },
  );
}
