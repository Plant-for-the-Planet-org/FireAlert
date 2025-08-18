import React from 'react';
import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import Config from 'react-native-config';
import {Auth0Provider} from 'react-native-auth0';
import {ToastProvider} from 'react-native-toast-notifications';
import {store} from './redux/store';
import {TRPCProvider} from './services/trpc';
import AppNavigator from './routes/AppNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';
import {BottomBarProvider} from './global/reducers/bottomBar';
import {useInAppUpdate} from './hooks/useInAppUpdate';
import UpdateStatusListener from './components/UpdateStatusListener';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

function App(): JSX.Element {
  useInAppUpdate(true);

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
                <UpdateStatusListener />
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
