import React from 'react';
import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import Config from 'react-native-config';
import {Auth0Provider} from 'react-native-auth0';
import {ToastProvider} from 'react-native-toast-notifications';

import {store} from './redux/store';
import {TRPCProvider} from './services/trpc';
import AppNavigator from './routes/appNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

function App(): JSX.Element {
  return (
    <Auth0Provider
      domain={Config.AUTH0_DOMAIN}
      clientId={Config.AUTH0_CLIENT_ID}>
      <ToastProvider
        duration={2000}
        offsetBottom={100}
        placement={'bottom'}
        animationType="zoom-in">
        <TRPCProvider>
          <Provider store={store}>
            <MapLayerProvider>
              <AppNavigator />
            </MapLayerProvider>
          </Provider>
        </TRPCProvider>
      </ToastProvider>
    </Auth0Provider>
  );
}

export default App;
