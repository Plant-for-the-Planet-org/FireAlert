/**
 * Custom hook for fetching fire incident data
 * Encapsulates incident data fetching logic and state management
 */

import {useEffect} from 'react';
import {trpc} from '../../services/trpc';
import type {
  IncidentData,
  UseIncidentDataParams,
  UseIncidentDataReturn,
} from '../../types/incident';

/**
 * Hook to fetch incident data by incident ID
 * Uses tRPC's getIncidentPublic endpoint for public access
 *
 * @param params - Parameters including incidentId and enabled flag
 * @returns Object containing incident data, loading state, error state, and error object
 *
 * @example
 * const {incident, isLoading, isError} = useIncidentData({
 *   incidentId: selectedAlert?.siteIncidentId,
 *   enabled: !!selectedAlert?.siteIncidentId,
 * });
 *
 * if (isLoading) return <ActivityIndicator />;
 * if (isError) return <Text>Failed to load incident</Text>;
 * if (incident) return <IncidentSummaryCard {...incident} />;
 */
export function useIncidentData(
  params: UseIncidentDataParams,
): UseIncidentDataReturn {
  const {incidentId, enabled = true} = params;

  // Fetch incident data using tRPC
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = trpc.siteIncident.getIncidentPublic.useQuery(
    {incidentId: incidentId!},
    {
      // Only fetch if incidentId is provided and enabled is true
      enabled: !!incidentId && enabled,
      // Retry once on failure
      retry: 1,
      // Don't show error toast - fail silently
      onError: err => {
        console.error('Failed to fetch incident data:', err);
      },
    },
  );

  // Extract incident data from response
  const incident = response?.data ?? null;

  // Convert error to Error object if needed
  const errorObj = error instanceof Error ? error : null;

  return {
    incident: incident as IncidentData | null,
    isLoading,
    isError,
    error: errorObj,
  };
}
