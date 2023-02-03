import MapboxGL from '@rnmapbox/maps';
import React, {useEffect} from 'react';
import SplashScreen from 'react-native-splash-screen';

import AppNavigator from './routes/AppNavigator';
import {MapLayerProvider} from './global/reducers/mapLayers';

MapboxGL.setAccessToken(
  'sk.eyJ1IjoibWF5YW5rNHBsYW50LWZvci10aGUtcGxhbmV0IiwiYSI6ImNsZGNvbW44azBjN2UzdXF6YXlsZHQ2NjAifQ.biPiyvXSzxjT_-oEPRQSRQ',
);

function App(): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 2000);
  }, []);
  return (
    <MapLayerProvider>
      <AppNavigator />
    </MapLayerProvider>
  );
}

export default App;
