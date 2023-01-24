import React, {useEffect} from 'react';
import SplashScreen from 'react-native-splash-screen';

import {Home, Login} from './screens';

function App(): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 2000);
  }, []);
  return <Login />;
}

export default App;
