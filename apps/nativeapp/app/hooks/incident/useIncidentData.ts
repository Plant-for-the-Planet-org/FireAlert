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

  useEffect(() => {
    console.log(
      `[incident] useIncidentData hook initialized - incidentId: ${incidentId}, enabled: ${enabled}`,
    );
  }, [incidentId, enabled]);

  // Fetch incident data using tRPC
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = trpc.siteIncident.getIncident.useQuery(
    {json: {incidentId: incidentId!}},
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
