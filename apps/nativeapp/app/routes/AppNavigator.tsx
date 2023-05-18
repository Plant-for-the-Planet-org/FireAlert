import * as React from 'react';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import SplashScreen from 'react-native-splash-screen';
import {NavigationContainer} from '@react-navigation/native';

import {
  getUserDetails,
  updateIsLoggedIn,
  updateAccessToken,
  getConfigData,
} from '../redux/slices/login/loginSlice';
import {getData} from '../utils/localStorage';
import {CommonStack, SignInStack} from './stack';
import {useAppDispatch, useAppSelector, useOneSignal} from '../hooks';

const onesignalAppId = Config.ONESIGNAL_APP_ID || '';

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

  useOneSignal(onesignalAppId, {
    onReceived: notification => {
      // Handle received notification
      console.log('Notification received:', notification);
    },
    onOpened: openResult => {
      // Handle notification opened
      console.log('Notification opened:', openResult);
    },
    onIds: device => {
      // Save device ID for sending personalized notifications
      console.log('Device info:', device);
    },
  });

  React.useEffect(() => {
    const request = {
      onSuccess: async message => {},
      onFail: message => {},
    };
    checkUserValidation();
    dispatch(getConfigData(request));
  }, []);

  React.useEffect(() => {
    (async () => {
      const auth0 = new Auth0({
        domain: Config.AUTH0_DOMAIN,
        clientId: Config.AUTH0_CLIENT_ID,
      });
      const cred = await getData('cred');
      if (cred) {
        auth0.auth
          .userInfo({token: cred?.accessToken})
          .then(data => {
            const request = {
              onSuccess: async message => {},
              onFail: message => {},
            };
            dispatch(updateIsLoggedIn(true));
            dispatch(updateAccessToken(cred?.accessToken));
            dispatch(getUserDetails(request));
          })
          .catch(err => {
            // get the refresh token from the secure storage
            // request for a new access token using the refresh token
            auth0.auth
              .refreshToken({refreshToken: cred?.refreshToken})
              .then(newAccessToken => {
                const request = {
                  onSuccess: async message => {},
                  onFail: message => {},
                };
                dispatch(updateAccessToken(newAccessToken));
                dispatch(getUserDetails(request));
              })
              .catch(accessTokenErr => {
                console.log('error getting new access token: ', accessTokenErr);
              });
          });
      }
    })();
    SplashScreen.hide();
  }, []);

  return (
    <NavigationContainer>
      {isLoggedIn ? <CommonStack /> : <SignInStack />}
    </NavigationContainer>
  );
}
