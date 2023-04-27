import superjson from 'superjson';
import React, {useState} from 'react';
import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import Config from 'react-native-config';
import {Auth0Provider} from 'react-native-auth0';

import {store} from './redux/store';
import {trpc} from './services/trpc';
import {httpBatchLink} from '@trpc/client';
import AppNavigator from './routes/AppNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

const httpBatchLinkArgs = {
  url: `${Config.NEXT_API_URL}`,
  // You can pass any HTTP headers you wish here
  async headers() {
    return {
      authorization: `Bearer ${store.getState().loginSlice.accessToken}`,
    };
  },
};

function App(): JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink(httpBatchLinkArgs)],
      transformer: superjson,
    }),
  );
  return (
    <Auth0Provider
      domain={Config.AUTH0_DOMAIN}
      clientId={Config.AUTH0_CLIENT_ID}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <MapLayerProvider>
              <AppNavigator />
            </MapLayerProvider>
          </Provider>
        </QueryClientProvider>
      </trpc.Provider>
    </Auth0Provider>
  );
}

export default App;
