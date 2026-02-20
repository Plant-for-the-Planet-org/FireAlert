/**
 * useSettingsData Hook
 *
 * Custom hook for fetching and caching Settings screen data.
 * Orchestrates data fetching from tRPC queries and computes derived data.
 *
 * @module Settings/hooks/useSettingsData
 */

import {useMemo, useCallback} from 'react';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../../services/trpc';
import {useOneSignal} from '../../../hooks/notification/useOneSignal';
import {categorizedRes, groupSitesAsProject} from '../../../utils/filters';
import type {
  UseSettingsDataReturn,
  Site,
  GroupedProject,
  CategorizedAlertMethods,
} from '../types';
import type {AlertMethod} from '../../../services/OneSignal/types';

/**
 * Custom hook for Settings screen data fetching and caching
 *
 * Fetches sites and alert methods data using tRPC queries with appropriate
 * caching strategies. Computes grouped projects and categorized alert methods.
 * Provides device-specific alert preferences filtering.
 *
 * @returns {UseSettingsDataReturn} Settings data with loading states and refetch function
 *
 * @example
 * ```tsx
 * const {
 *   sites,
 *   groupedProjects,
 *   alertMethods,
 *   deviceAlertPreferences,
 *   isLoading,
 *   isFetching,
 *   refetch
 * } = useSettingsData();
 * ```
 */
export function useSettingsData(): UseSettingsDataReturn {
  const toast = useToast();
  const {state: oneSignalState} = useOneSignal();

  // Fetch sites data with infinite stale time (cache indefinitely)
  const {
    data: sitesData,
    refetch: refetchSites,
    isSuccess: sitesSuccess,
    isFetching: isFetchingSites,
    isLoading: isLoadingSites,
  } = (trpc.site as any).getSites.useQuery(['site', 'getSites'], {
    enabled: true,
    retryDelay: 3000,
    staleTime: Infinity,
    cacheTime: Infinity,
    keepPreviousData: true,
    onError: () => {
      toast.show('Failed to load sites', {type: 'danger'});
    },
  });

  // Fetch alert methods data with 5 minute stale time
  const {
    data: alertMethodsData,
    refetch: refetchAlertMethods,
    isFetching: isFetchingAlertMethods,
    isLoading: isLoadingAlertMethods,
  } = (trpc.alertMethod as any).getAlertMethods.useQuery(undefined, {
    enabled: sitesSuccess,
    retryDelay: 3000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: () => {
      toast.show('Failed to load alert methods', {type: 'danger'});
    },
  });

  // Extract sites array from response
  const sites: Site[] = useMemo(() => sitesData?.json?.data || [], [sitesData]);

  // Compute grouped projects from sites data
  const groupedProjects: GroupedProject[] = useMemo(() => {
    const grouped = groupSitesAsProject(sites);
    // Transform the generic result to match GroupedProject interface
    return grouped.map((project: any) => ({
      projectId: project.id,
      projectName: project.name,
      sites: project.sites,
    }));
  }, [sites]);

  // Categorize alert methods by type
  const alertMethods: CategorizedAlertMethods = useMemo(() => {
    const categorized = categorizedRes(
      alertMethodsData?.json?.data || [],
      'method',
    );
    // Ensure all required categories exist
    return {
      email: categorized.email || [],
      sms: categorized.sms || [],
      device: categorized.device || [],
      whatsapp: categorized.whatsapp || [],
      webhook: categorized.webhook || [],
    } as CategorizedAlertMethods;
  }, [alertMethodsData]);

  // Basic device alert preferences filtering
  // Note: More sophisticated device-specific filtering (matching current device ID)
  // is handled by useAlertPreferencesVM hook
  const deviceAlertPreferences: AlertMethod[] = useMemo(() => {
    const userId = oneSignalState?.userId ?? null;

    // Return empty array if OneSignal user ID is not available
    if (userId == null) {
      return [];
    }

    // Get device methods from categorized alert methods
    const deviceMethods = alertMethods.device || [];

    // Filter to show only device methods with valid device names
    return deviceMethods.filter(el => el.deviceName !== '');
  }, [alertMethods.device, oneSignalState?.userId]);

  // Refetch function for pull-to-refresh
  const refetch = useCallback(async () => {
    try {
      await Promise.all([refetchSites(), refetchAlertMethods()]);
    } catch (error) {
      toast.show('Failed to refresh data', {type: 'danger'});
    }
  }, [refetchSites, refetchAlertMethods, toast]);

  // Determine overall loading and fetching states
  const isLoading = isLoadingSites || isLoadingAlertMethods;
  const isFetching = isFetchingSites || isFetchingAlertMethods;

  return {
    sites,
    groupedProjects,
    alertMethods,
    deviceAlertPreferences,
    isLoading,
    isFetching,
    refetch,
  };
}
