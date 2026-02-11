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

  console.log(
    `[incident] useIncidentData hook initialized - incidentId: ${incidentId}, enabled: ${enabled}`,
  );

  // Fetch incident data using tRPC
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = trpc.siteIncident.getIncidentPublic.useQuery(
    {json: {incidentId: incidentId!}},
    {
      enabled: !!incidentId && enabled,
      retry: 1,
      // Disable batching for this specific query
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      onError: err => {
        console.error(
          `[incident] Failed to fetch incident data for incidentId: ${incidentId}`,
          err,
        );
      },
    },
  );

  // Log loading state changes
  useEffect(() => {
    if (isLoading) {
      console.log(
        `[incident] Fetching incident data - incidentId: ${incidentId}`,
      );
    }
  }, [isLoading, incidentId]);

  // Log when data is received
  useEffect(() => {
    if (response?.json?.data) {
      console.log(
        `[incident] Incident data fetched successfully - incidentId: ${
          response.json.data.id
        }, isActive: ${response.json.data.isActive}, alertCount: ${
          response.json.data.siteAlerts?.length || 0
        }, firePoints: ${response.json.data.siteAlerts
          ?.map(
            (a: any) => `(${a.latitude.toFixed(2)},${a.longitude.toFixed(2)})`,
          )
          .join(', ')}`,
      );
    }
  }, [response?.json?.data]);

  // Extract incident data from response
  const incident = response?.json?.data ?? null;

  // Convert error to Error object if needed
  const errorObj = error instanceof Error ? error : null;

  if (isError) {
    console.warn(
      `[incident] Error fetching incident - incidentId: ${incidentId}, error: ${errorObj?.message}`,
    );
  }

  return {
    incident: incident as IncidentData | null,
    isLoading,
    isError,
    error: errorObj,
  };
}
