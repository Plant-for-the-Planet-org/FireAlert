/**
 * useSettingsActions Hook
 *
 * Custom hook that wraps tRPC mutations for all Settings screen operations.
 * Implements optimistic updates with automatic rollback on error for site
 * and alert method mutations.
 *
 * @module Settings/hooks/useSettingsActions
 */

import {useQueryClient} from '@tanstack/react-query';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../../services/trpc';
import type {UseSettingsActionsReturn, UpdateSiteInput} from '../types';

/**
 * Custom hook for Settings screen mutation operations
 *
 * Wraps tRPC mutations for site updates, deletions, monitoring toggles,
 * and alert method operations. Implements optimistic updates with automatic
 * rollback on error. Provides granular loading states for UI feedback.
 *
 * @returns {UseSettingsActionsReturn} Mutation functions and loading states
 *
 * @example
 * ```tsx
 * const {
 *   updateSite,
 *   deleteSite,
 *   toggleSiteMonitoring,
 *   toggleAlertMethod,
 *   removeAlertMethod,
 *   isUpdating,
 *   isDeleting
 * } = useSettingsActions();
 *
 * // Update site name
 * await updateSite('site-id', { name: 'New Name' });
 *
 * // Toggle site monitoring
 * await toggleSiteMonitoring('site-id', false);
 *
 * // Toggle alert method
 * await toggleAlertMethod('method-id', true);
 * ```
 */
export function useSettingsActions(): UseSettingsActionsReturn {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Site update mutation
  const updateSiteMutation = (trpc.site as any).updateSite.useMutation({
    retry: 3,
    retryDelay: 3000,
    onMutate: async (variables: any) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: [['site', 'getSites']],
      });

      // Snapshot previous value for rollback
      const previousSites = queryClient.getQueryData([
        ['site', 'getSites'],
        {input: ['site', 'getSites'], type: 'query'},
      ]);

      // Optimistically update cache
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        (oldData: any) => {
          if (!oldData) return null;

          const siteId = variables?.json?.params?.siteId;
          const updates = variables?.json?.body;

          return {
            ...oldData,
            json: {
              ...oldData.json,
              data: oldData.json.data.map((site: any) =>
                site.id === siteId ? {...site, ...updates} : site,
              ),
            },
          };
        },
      );

      return {previousSites};
    },
    onSuccess: (res: any) => {
      // Update cache with server response
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.map((item: any) =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null,
      );

      toast.show('Site updated successfully', {type: 'success'});
    },
    onError: (_error: any, _variables: any, context: any) => {
      // Rollback to previous state on error
      if (context?.previousSites) {
        queryClient.setQueryData(
          [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
          context.previousSites,
        );
      }

      toast.show('Failed to update site', {type: 'danger'});
    },
  });

  // Site delete mutation
  const deleteSiteMutation = (trpc.site as any).deleteSite.useMutation({
    retry: 3,
    retryDelay: 3000,
    onMutate: async (variables: any) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [['site', 'getSites']],
      });

      // Snapshot previous value
      const previousSites = queryClient.getQueryData([
        ['site', 'getSites'],
        {input: ['site', 'getSites'], type: 'query'},
      ]);

      // Optimistically remove site from cache
      const siteId = variables?.json?.siteId;
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        (oldData: any) => {
          if (!oldData) return null;

          return {
            ...oldData,
            json: {
              ...oldData.json,
              data: oldData.json.data.filter((site: any) => site.id !== siteId),
            },
          };
        },
      );

      return {previousSites};
    },
    onSuccess: (_res: any, req: any) => {
      // Confirm deletion in cache
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.filter(
                    (item: any) => item.id !== req.json.siteId,
                  ),
                },
              }
            : null,
      );

      // Remove alerts associated with deleted site
      queryClient.setQueryData(
        [
          ['alert', 'getAlerts'],
          {input: ['alerts', 'getAlerts'], type: 'query'},
        ],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.filter(
                    (item: any) => item?.site?.id !== req.json.siteId,
                  ),
                },
              }
            : null,
      );

      toast.show('Site deleted successfully', {type: 'success'});
    },
    onError: (_error: any, _variables: any, context: any) => {
      // Rollback on error
      if (context?.previousSites) {
        queryClient.setQueryData(
          [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
          context.previousSites,
        );
      }

      toast.show('Failed to delete site', {type: 'danger'});
    },
  });

  // Alert method update mutation (for toggling enabled state)
  const updateAlertMethodMutation = (
    trpc.alertMethod as any
  ).updateAlertMethod.useMutation({
    retry: 3,
    retryDelay: 3000,
    onMutate: async (variables: any) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [['alertMethod', 'getAlertMethods']],
      });

      // Snapshot previous value
      const previousAlertMethods = queryClient.getQueryData([
        ['alertMethod', 'getAlertMethods'],
        {type: 'query'},
      ]);

      // Optimistically update cache
      const methodId = variables?.json?.params?.alertMethodId;
      const updates = variables?.json?.body;

      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        (oldData: any) => {
          if (!oldData) return null;

          return {
            ...oldData,
            json: {
              ...oldData.json,
              data: oldData.json.data.map((method: any) =>
                method.id === methodId ? {...method, ...updates} : method,
              ),
            },
          };
        },
      );

      return {previousAlertMethods};
    },
    onSuccess: (res: any) => {
      // Update cache with server response
      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.map((item: any) =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null,
      );

      toast.show('Notification preference updated', {type: 'success'});
    },
    onError: (_error: any, _variables: any, context: any) => {
      // Rollback on error
      if (context?.previousAlertMethods) {
        queryClient.setQueryData(
          [['alertMethod', 'getAlertMethods'], {type: 'query'}],
          context.previousAlertMethods,
        );
      }

      toast.show('Failed to update notification preference', {type: 'danger'});
    },
  });

  // Alert method delete mutation
  const deleteAlertMethodMutation = (
    trpc.alertMethod as any
  ).deleteAlertMethod.useMutation({
    retry: 3,
    retryDelay: 3000,
    onMutate: async (variables: any) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [['alertMethod', 'getAlertMethods']],
      });

      // Snapshot previous value
      const previousAlertMethods = queryClient.getQueryData([
        ['alertMethod', 'getAlertMethods'],
        {type: 'query'},
      ]);

      // Optimistically remove alert method from cache
      const methodId = variables?.json?.alertMethodId;
      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        (oldData: any) => {
          if (!oldData) return null;

          return {
            ...oldData,
            json: {
              ...oldData.json,
              data: oldData.json.data.filter(
                (method: any) => method.id !== methodId,
              ),
            },
          };
        },
      );

      return {previousAlertMethods};
    },
    onSuccess: (_res: any, req: any) => {
      // Confirm deletion in cache
      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.filter(
                    (item: any) => item.id !== req.json.alertMethodId,
                  ),
                },
              }
            : null,
      );

      toast.show('Notification method removed', {type: 'success'});
    },
    onError: (_error: any, _variables: any, context: any) => {
      // Rollback on error
      if (context?.previousAlertMethods) {
        queryClient.setQueryData(
          [['alertMethod', 'getAlertMethods'], {type: 'query'}],
          context.previousAlertMethods,
        );
      }

      toast.show('Failed to remove notification method', {type: 'danger'});
    },
  });

  /**
   * Update a site with new data
   *
   * @param {string} siteId - The ID of the site to update
   * @param {UpdateSiteInput} data - The data to update (name, radius, stopAlerts, etc.)
   * @returns {Promise<void>}
   */
  const updateSite = async (
    siteId: string,
    data: UpdateSiteInput,
  ): Promise<void> => {
    await updateSiteMutation.mutateAsync({
      json: {
        params: {siteId},
        body: data,
      },
    });
  };

  /**
   * Delete a site
   *
   * @param {string} siteId - The ID of the site to delete
   * @returns {Promise<void>}
   */
  const deleteSite = async (siteId: string): Promise<void> => {
    await deleteSiteMutation.mutateAsync({
      json: {siteId},
    });
  };

  /**
   * Toggle site monitoring (enable/disable alerts)
   *
   * @param {string} siteId - The ID of the site to toggle
   * @param {boolean} enabled - Whether monitoring should be enabled
   * @returns {Promise<void>}
   */
  const toggleSiteMonitoring = async (
    siteId: string,
    enabled: boolean,
  ): Promise<void> => {
    await updateSiteMutation.mutateAsync({
      json: {
        params: {siteId},
        body: {stopAlerts: !enabled},
      },
    });
  };

  /**
   * Toggle alert method enabled state
   *
   * @param {string} methodId - The ID of the alert method to toggle
   * @param {boolean} enabled - Whether the method should be enabled
   * @returns {Promise<void>}
   */
  const toggleAlertMethod = async (
    methodId: string,
    enabled: boolean,
  ): Promise<void> => {
    await updateAlertMethodMutation.mutateAsync({
      json: {
        params: {alertMethodId: methodId},
        body: {enabled},
      },
    });
  };

  /**
   * Remove an alert method
   *
   * @param {string} methodId - The ID of the alert method to remove
   * @returns {Promise<void>}
   */
  const removeAlertMethod = async (methodId: string): Promise<void> => {
    await deleteAlertMethodMutation.mutateAsync({
      json: {alertMethodId: methodId},
    });
  };

  return {
    updateSite,
    deleteSite,
    toggleSiteMonitoring,
    toggleAlertMethod,
    removeAlertMethod,
    isUpdating: updateSiteMutation.status === 'pending',
    isDeleting:
      deleteSiteMutation.status === 'pending' ||
      deleteAlertMethodMutation.status === 'pending',
  };
}
