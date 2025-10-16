import React, {useState} from 'react';
import {Text} from 'react-native';
import {
  CreateTRPCClientOptions,
  createTRPCReact,
  httpBatchLink,
} from '@trpc/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';

import {Config} from '../../config';
import {store} from '../redux/store';
import type {AppRouter} from '../../../server/src/server/api/root';

export const trpc = createTRPCReact<AppRouter>();

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export const createTRPCClientOptions: CreateTRPCClientOptions<AppRouter> = {
  links: [
    httpBatchLink({
      url: `${Config.NEXT_API_URL}`,
      async headers() {
        return {
          authorization: `Bearer ${store.getState().loginSlice.accessToken}`,
        };
      },
    }),
  ],
};

const TRPCErrorBoundary = ({children}: {children: React.ReactNode}) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('TRPC Provider Error:', error);
    return <Text>Failed to load TRPC Provider</Text>;
  }
};

export function TRPCProvider({children}: {children: React.ReactNode}) {
  console.log('Initializing TRPC Provider...');

  const [queryClient] = useState(() => {
    console.log('Creating QueryClient...');
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          cacheTime: 1000 * 60 * 5, // 5 minutes
        },
      },
    });
  });

  const [trpcClient] = useState(() => {
    console.log('Creating TRPC Client...');
    return trpc.createClient(createTRPCClientOptions);
  });

  console.log('Rendering TRPC Provider structure...');

  return (
    <TRPCErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            dehydrateOptions: {
              shouldDehydrateQuery: () => true,
            },
          }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {children}
          </trpc.Provider>
        </PersistQueryClientProvider>
      </QueryClientProvider>
    </TRPCErrorBoundary>
  );
}
