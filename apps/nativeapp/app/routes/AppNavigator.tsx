import * as React from 'react';
import {jwtDecode} from 'jwt-decode';
import {useAuth0} from 'react-native-auth0';
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
import {useAppDispatch, useAppSelector} from '../hooks/redux/reduxHooks';
import {OneSignalProvider} from '../hooks/notification/useOneSignal';
import useAppLinkHandler from '../hooks/notification/useAppLinkHandler';
import {Config} from '../../config';
import {NotificationHandlers} from '../services/OneSignal';

const onesignalAppId = Config.ONESIGNAL_APP_ID || '';

export default function AppNavigator() {
  const {isLoggedIn} = useAppSelector(state => state.loginSlice);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const {getCredentials, clearSession, clearCredentials} = useAuth0();

  const notificationHandlers = React.useMemo<NotificationHandlers>(
    () => ({
      onReceived: notification => {
        console.log('[OneSignal] Notification received:', notification);
      },
      onOpened: openResult => {
        console.log('[OneSignal] Notification opened:', openResult);
      },
    }),
    [],
  );

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
    handleRefreshToken();
  }, [dispatch, queryClient]);

  function hasTimestampExpiredOrCloseToExpiry(timestamp: number) {
    // Convert timestamp to milliseconds
    timestamp *= 1000;

    // Get the current time in milliseconds since the Unix epoch
    const currentTime = Date.now();

    // Calculate the time 5 hours (in milliseconds)
    const fiveHoursInMilliseconds = 5 * 60 * 60 * 1000;

    // Check if the provided timestamp is within 5 hours of expiring or has already expired
    return timestamp - currentTime <= fiveHoursInMilliseconds;
  }

  const refreshUserToken = async (refreshToken: string) => {
    try {
      const result = await getCredentials(refreshToken);
      return result;
    } catch (error) {
      console.log('Error occured here', error);
      return null;
    }
  };

  const checkInternetConnectivity = async () => {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected;
  };

  const handleRefreshToken = async () => {
    const cred = await getData('cred');
    if (cred) {
      const isConnected = await checkInternetConnectivity();
      if (!isConnected) {
        SplashScreen.hide();
        return;
      }
      try {
        const decoded = jwtDecode(cred?.accessToken);
        if (decoded && !decoded.exp) {
          throw 'error';
        }
        const isExpired = hasTimestampExpiredOrCloseToExpiry(decoded?.exp || 0);
        if (isExpired) {
          if (!cred.refreshToken || cred.refreshToken == null) {
            throw 'error';
          }
          const newAccessToken = await refreshUserToken(cred.refreshToken);
          if (newAccessToken == null || !newAccessToken) {
            throw 'error';
          }
          if (newAccessToken && !newAccessToken.refreshToken) {
            throw 'error';
          }
          storeData('cred', newAccessToken);
          dispatch(updateAccessToken(newAccessToken?.accessToken));
          const request = {
            onSuccess: () => {},
            onFail: () => {},
          };
          dispatch(getUserDetails(request));
          dispatch(updateIsLoggedIn(true));
          SplashScreen.hide();
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
      } catch (err) {
        clearCredentials()
          .then(() => clearSession({}, {useLegacyCallbackUrl: true}))
          .then(async () => {
            dispatch(updateIsLoggedIn(false));
            queryClient.clear();
            await clearAll();
          });
      }
    } else {
      SplashScreen.hide();
    }
  };

  return (
    <NavigationContainer>
      <OneSignalProvider appId={onesignalAppId} handlers={notificationHandlers}>
        {isLoggedIn ? <CommonStack /> : <SignInStack />}
      </OneSignalProvider>
    </NavigationContainer>
  );
}
