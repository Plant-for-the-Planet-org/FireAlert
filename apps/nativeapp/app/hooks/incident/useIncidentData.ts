import {trpc} from '../../services/trpc';
import type {
  IncidentData,
  UseIncidentDataParams,
  UseIncidentDataReturn,
} from '../../types/incident';

export function useIncidentData(
  params: UseIncidentDataParams,
): UseIncidentDataReturn {
  const {incidentId, enabled = true} = params;
  const safeIncidentId = incidentId ?? '';

  const {data, isLoading, isError, error} = trpc.siteIncident.getIncidentPublic.useQuery(
    {json: {incidentId: safeIncidentId}},
    {
      enabled: Boolean(incidentId) && enabled,
      retry: 1,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  return {
    incident: (data?.json?.data ?? null) as IncidentData | null,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
  };
}
