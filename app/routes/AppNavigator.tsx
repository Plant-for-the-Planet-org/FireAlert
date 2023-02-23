import * as React from 'react';
import Auth0 from 'react-native-auth0';
import {NavigationContainer} from '@react-navigation/native';

import {CommonStack, SignInStack} from './stack';
import Config from 'react-native-config';

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  const checkUserValidation = async () => {
    const auth0 = new Auth0({
      domain: Config.AUTH0_DOMAIN,
      clientId: Config.AUTH0_CLIENT_ID,
    });

    const isLogged = await auth0.credentialsManager.hasValidCredentials();

    if (isLogged) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  };

  React.useEffect(() => {
    checkUserValidation();
  }, []);

  return (
    <NavigationContainer>
      {isLoggedIn ? <CommonStack /> : <SignInStack />}
    </NavigationContainer>
  );
}
