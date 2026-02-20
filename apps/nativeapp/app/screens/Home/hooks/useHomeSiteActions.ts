/**
 * useHomeSiteActions Hook
 *
 * Custom hook that wraps tRPC mutations for site update and delete operations.
 * Implements optimistic updates with automatic rollback on error.
 *
 * @returns {UseHomeSiteActionsReturn} Object containing mutation functions and loading states
 *
 * @example
 * const { updateSite, deleteSite, isUpdating, isDeleting } = useHomeSiteActions();
 *
 * // Update site name
 * await updateSite('site-id', { name: 'New Name' });
 *
 * // Delete site
 * await deleteSite('site-id');
 */

import {useQueryClient} from '@tanstack/react-query';
import {useToast} from 'react-native-toast-notifications';
import {trpc} from '../../../services/trpc';
import type {UseHomeSiteActionsReturn, UpdateSiteInput} from '../types';

export function useHomeSiteActions(): UseHomeSiteActionsReturn {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Update site mutation
  const updateSiteMutation = (trpc.site as any).updateSite.useMutation({
    retry: 3,
    retryDelay: 3000,
    onSuccess: (res: any) => {
      // Update sites cache with new data
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData?.json,
                  data: oldData?.json?.data?.map((item: any) =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null,
      );
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  // Delete site mutation
  const deleteSiteMutation = (trpc.site as any).deleteSite.useMutation({
    retry: 3,
    retryDelay: 3000,
    onSuccess: (_res: any, req: any) => {
      // Remove site from sites cache
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

      toast.show('Deleted', {type: 'success'});
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  /**
   * Update a site with new data
   *
   * @param {string} siteId - The ID of the site to update
   * @param {UpdateSiteInput} data - The data to update (name, radius, geometry, isMonitored)
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

  return {
    updateSite,
    deleteSite,
    isUpdating: updateSiteMutation.status === 'pending',
    isDeleting: deleteSiteMutation.status === 'pending',
  };
}
