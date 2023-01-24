import React, {useEffect} from 'react';
import SplashScreen from 'react-native-splash-screen';

import Home from './screens/Home/Home';

function App(): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 2000);
  }, []);
  return <Home />;
}

export default App;
