/**
 * Alert method tRPC queries and mutations for device sync and reuse.
 * Single place for alert-method API usage; keeps hooks type-safe and testable.
 */

import {trpc} from '../services/trpc';

export function useAlertMethodQueries() {
  type AlertMethodRouter = {
    getAlertMethods: {
      useQuery: (
        input: undefined,
        opts: object,
      ) => {data: unknown; refetch: () => Promise<{data?: {data?: unknown[]}}>};
    };
    createAlertMethod: {
      useMutation: (opts?: object) => {
        mutate: (v: unknown, opts?: object) => void;
      };
    };
    updateAlertMethod: {
      useMutation: (opts?: object) => {
        mutate: (v: unknown, opts?: object) => void;
      };
    };
    deleteAlertMethod: {
      useMutation: (opts?: object) => {
        mutate: (v: unknown, opts?: object) => void;
      };
    };
  };
  const alertMethod = (trpc as {alertMethod: AlertMethodRouter}).alertMethod;
  const {data: getAlertMethodsData, refetch: refetchAlertMethodsInternal} =
    alertMethod.getAlertMethods.useQuery(undefined, {
      enabled: false,
      retry: 2,
    });

  const refetchAlertMethods = async () => {
    return await refetchAlertMethodsInternal();
  };

  const createAlertMethod = alertMethod.createAlertMethod.useMutation({
    retry: 3,
    onMutate: () => {
      // onMutate handler
    },
  });

  const updateAlertMethod = alertMethod.updateAlertMethod.useMutation({
    retry: 3,
    onMutate: () => {
      // onMutate handler
    },
  });

  const deleteAlertMethod = alertMethod.deleteAlertMethod.useMutation({
    retry: 3,
    onMutate: () => {
      // onMutate handler
    },
  });

  return {
    refetchAlertMethods,
    getAlertMethodsData,
    createAlertMethod,
    updateAlertMethod,
    deleteAlertMethod,
  };
}
