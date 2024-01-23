import * as React from 'react';
import jwt_decode from 'jwt-decode';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import NetInfo from '@react-native-community/netinfo';
import SplashScreen from 'react-native-splash-screen';
import {NavigationContainer} from '@react-navigation/native';
import {onlineManager, useQueryClient} from '@tanstack/react-query';

import {
  getConfigData,
  getUserDetails,
  updateIsLoggedIn,
  updateAccessToken,
} from '../redux/slices/login/loginSlice';
import {CommonStack, SignInStack} from './stack';
import {clearAll, getData, storeData} from '../utils/localStorage';
import {useAppDispatch, useAppSelector, useOneSignal} from '../hooks';
import useAppLinkHandler from '../hooks/notification/useAppLinkHandler';

const onesignalAppId = Config.ONESIGNAL_APP_ID || '';
const auth0 = new Auth0({
  domain: Config.AUTH0_DOMAIN,
  clientId: Config.AUTH0_CLIENT_ID,
});

export default function AppNavigator() {
  const {isLoggedIn} = useAppSelector(state => state.loginSlice);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

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

  const handleUrl = url => {
    console.log(url, 'url');
  };

  useAppLinkHandler(handleUrl);

  React.useEffect(() => {
    onlineManager.setEventListener(setOnline => {
      return NetInfo.addEventListener(state => {
        setOnline(!!state.isConnected);
      });
    });
  }, []);

  React.useEffect(() => {
    const request = {
      onSuccess: async () => {},
      onFail: () => {},
    };
    dispatch(getConfigData(request));
  }, [dispatch]);

  React.useEffect(() => {
    (async () => {
      const cred = await getData('cred');
      if (cred) {
        try {
          const decoded = jwt_decode(cred?.accessToken);
          const currentTime = new Date();
          if (decoded.exp * 1000 < currentTime.getTime()) {
            auth0.auth
              .refreshToken({refreshToken: cred?.refreshToken})
              .then(newAccessToken => {
                const request = {
                  onSuccess: () => {},
                  onFail: () => {},
                };
                storeData('cred', newAccessToken);
                dispatch(updateAccessToken(newAccessToken?.accessToken));
                dispatch(getUserDetails(request));
                dispatch(updateIsLoggedIn(true));
                SplashScreen.hide();
              })
              .catch(accessTokenErr => {
                console.log('error getting new access token: ', accessTokenErr);
                SplashScreen.hide();
              });
          } else {
            const request = {
              onSuccess: () => {},
              onFail: () => {},
            };
            dispatch(updateAccessToken(cred?.accessToken));
            dispatch(getUserDetails(request));
            dispatch(updateIsLoggedIn(true));
            SplashScreen.hide();
          }
        } catch (e) {
          SplashScreen.hide();
          console.log(e);
          auth0.webAuth.clearSession().then(async () => {
            dispatch(updateIsLoggedIn(false));
            queryClient.clear();
            await clearAll();
          });
        }
      } else {
        SplashScreen.hide();
      }
    })();
  }, [dispatch, queryClient]);

  return (
    <NavigationContainer>
      {isLoggedIn ? <CommonStack /> : <SignInStack />}
    </NavigationContainer>
  );
}
