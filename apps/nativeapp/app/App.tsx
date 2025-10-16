import React, {JSX} from 'react';
import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import {Auth0Provider} from 'react-native-auth0';
import {ToastProvider} from 'react-native-toast-notifications';
import {store} from './redux/store';
import {TRPCProvider} from './services/trpc';
import AppNavigator from './routes/AppNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';
import {BottomBarProvider} from './global/reducers/bottomBar';
import {Config} from '../config';
import {promptAppUpdateOnInit} from './utils/PromptInAppUpdate';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

promptAppUpdateOnInit();

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
        <BottomBarProvider>
          <TRPCProvider>
            <Provider store={store}>
              <MapLayerProvider>
                <AppNavigator />
              </MapLayerProvider>
            </Provider>
          </TRPCProvider>
        </BottomBarProvider>
      </ToastProvider>
    </Auth0Provider>
  );
}

export default App;
