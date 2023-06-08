import {UseQueryOptions} from '@tanstack/react-query';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../services/trpc';

export const useFetchSites = ({enabled, ...props}: UseQueryOptions) => {
  const toast = useToast();
  const data = trpc.alert.getAlerts.useQuery(['alerts', 'getAlerts'], {
    enabled,
    retryDelay: 3000, // Delay between retry attempts in milliseconds
    onError: () => {
      toast.show('Something went wrong', {type: 'danger'});
    },
    ...props,
  });
  return data;
};
