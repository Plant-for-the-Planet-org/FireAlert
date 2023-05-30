import {UseQueryResult, useQuery} from '@tanstack/react-query';

import {trpc} from '../services/trpc';

export const fetchSites = async (): Promise<FireAlerts[]> => {
  // Fetch the list of sites from the API using trpc
  const response = await trpc.alert.getAlerts();

  // Return the data from the API response
  return response.data;
};

export const useFetchSites = (): UseQueryResult<FireAlerts[], Error> => {
  return useQuery('getAlerts', fetchSites);
};

interface FireAlerts {
  // Define your site properties here
}
