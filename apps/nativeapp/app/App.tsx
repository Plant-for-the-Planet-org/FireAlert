import React from 'react';
import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import Config from 'react-native-config';
import {Auth0Provider} from 'react-native-auth0';

import {store} from './redux/store';
import {TRPCProvider} from './utils/api';
import AppNavigator from './routes/AppNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

function App(): JSX.Element {
  return (
    <Auth0Provider
      domain={Config.AUTH0_DOMAIN}
      clientId={Config.AUTH0_CLIENT_ID}>
      <Provider store={store}>
        <TRPCProvider>
          <MapLayerProvider>
            <AppNavigator />
          </MapLayerProvider>
        </TRPCProvider>
      </Provider>
    </Auth0Provider>
  );
}

export default App;
