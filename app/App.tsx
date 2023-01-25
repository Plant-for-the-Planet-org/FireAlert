import MapboxGL from '@rnmapbox/maps';
import React, {useEffect} from 'react';
import SplashScreen from 'react-native-splash-screen';

import AppNavigator from './routes/AppNavigator';

MapboxGL.setAccessToken(
  'sk.eyJ1IjoibWF5YW5rNHBsYW50LWZvci10aGUtcGxhbmV0IiwiYSI6ImNsYzhsbjZ2bjAwbTgzcHBjd3Z1em51dW0ifQ.eVUMzupZhzqKU3knkY7YBw',
);

function App(): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 2000);
  }, []);
  return <AppNavigator />;
}

export default App;
