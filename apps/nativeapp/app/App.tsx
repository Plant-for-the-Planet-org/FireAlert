import React, {JSX} from 'react';
import {StyleSheet} from 'react-native';
import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {Auth0Provider} from 'react-native-auth0';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
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
    <GestureHandlerRootView style={styles.container}>
      <Auth0Provider
        domain={Config.AUTH0_DOMAIN}
        clientId={Config.AUTH0_CLIENT_ID}>
        <ToastProvider
          duration={2000}
          offsetBottom={100}
          placement={'bottom'}
          animationType="zoom-in">
          <BottomSheetModalProvider>
            <BottomBarProvider>
              <TRPCProvider>
                <Provider store={store}>
                  <MapLayerProvider>
                    <AppNavigator />
                  </MapLayerProvider>
                </Provider>
              </TRPCProvider>
            </BottomBarProvider>
          </BottomSheetModalProvider>
        </ToastProvider>
      </Auth0Provider>
    </GestureHandlerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
