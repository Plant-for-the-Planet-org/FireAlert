import React from 'react';
import Config from 'react-native-config';
import {createTRPCReact, httpBatchLink} from '@trpc/react-query';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {store} from '../redux/store';
import type {AppRouter} from '../../../server/src/server/api/root';

export const trpc = createTRPCReact<AppRouter>();

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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
