import {Provider} from 'react-redux';
import MapboxGL from '@rnmapbox/maps';
import React, {useEffect} from 'react';
import Config from 'react-native-config';
import {Auth0Provider} from 'react-native-auth0';
import SplashScreen from 'react-native-splash-screen';

import {store} from './redux/store';
import AppNavigator from './routes/AppNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

function App(): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 2000);
  }, []);
  return (
    <Auth0Provider
      domain={Config.AUTH0_DOMAIN}
      clientId={Config.AUTH0_CLIENT_ID}>
      <Provider store={store}>
        <MapLayerProvider>
          <AppNavigator />
        </MapLayerProvider>
      </Provider>
    </Auth0Provider>
  );
}

export default App;
