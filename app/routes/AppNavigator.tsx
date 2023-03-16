import * as React from 'react';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import {NavigationContainer} from '@react-navigation/native';

import {CommonStack, SignInStack} from './stack';
import {useAppDispatch, useAppSelector} from '../hooks';
import {getSites} from '../redux/slices/sites/siteSlice';
import {
  getAlerts,
  getAlertsPreferences,
} from '../redux/slices/alerts/alertSlice';
import {updateIsLoggedIn} from '../redux/slices/login/loginSlice';

export default function AppNavigator() {
  const {isLoggedIn} = useAppSelector(state => state.loginSlice);
  const dispatch = useAppDispatch();

  const checkUserValidation = async () => {
    const auth0 = new Auth0({
      domain: Config.AUTH0_DOMAIN,
      clientId: Config.AUTH0_CLIENT_ID,
    });

    const isLogged = await auth0.credentialsManager.hasValidCredentials();

    if (isLogged) {
      dispatch(updateIsLoggedIn(true));
    } else {
      dispatch(updateIsLoggedIn(false));
    }
  };

  React.useEffect(() => {
    checkUserValidation();
  }, []);

  React.useEffect(() => {
    if (isLoggedIn) {
      const request = {
        onSuccess: () => {},
        onFail: () => {},
      };
      dispatch(getSites(request));
      dispatch(getAlerts(request));
      dispatch(getAlertsPreferences(request));
    }
  }, [isLoggedIn]);

  return (
    <NavigationContainer>
      {isLoggedIn ? <CommonStack /> : <SignInStack />}
    </NavigationContainer>
  );
}
