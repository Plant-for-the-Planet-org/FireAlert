import React from 'react';
import Config from 'react-native-config';
import {createTRPCReact, httpBatchLink} from '@trpc/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {QueryClient} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';

import {store} from '../redux/store';
import type {AppRouter} from '../../../server/src/server/api/root';

export const trpc = createTRPCReact<AppRouter>();

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export const TRPCProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [queryClient] = React.useState(() => new QueryClient());
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${Config.NEXT_API_URL}`,
          // You can pass any HTTP headers you wish here
          async headers() {
            return {
              authorization: `Bearer ${
                store.getState().loginSlice.accessToken
              }`,
            };
          },
        }),
      ],
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{persister: asyncStoragePersister}}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </PersistQueryClientProvider>
  );
};
