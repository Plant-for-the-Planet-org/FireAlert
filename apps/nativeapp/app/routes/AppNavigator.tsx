import * as React from 'react';
import {jwtDecode} from 'jwt-decode';
import {useToast} from 'react-native-toast-notifications';
import NetInfo from '@react-native-community/netinfo';
import SplashScreen from 'react-native-splash-screen';
import {NavigationContainer} from '@react-navigation/native';
import {onlineManager, useQueryClient} from '@tanstack/react-query';
import {
  getConfigData,
  getUserDetails,
  updateIsLoggedIn,
  updateAccessToken,
  setSessionExpired,
} from '../redux/slices/login/loginSlice';
import {CommonStack, SignInStack} from './stack';
import {getData} from '../utils/localStorage';
import {refreshAccessToken, forceLogout} from '../utils/auth';
import {useAppDispatch, useAppSelector} from '../hooks/redux/reduxHooks';
import {PushNotificationProvider} from '../hooks/notification/usePushNotification';
import {
  flushPendingNotification,
  handleNotificationOpen,
  linking,
  navigationRef,
} from '../utils/linking';
import {NotificationHandlers} from '../services/PushNotification';

export default function AppNavigator() {
  const {isLoggedIn, sessionExpired} = useAppSelector(
    state => state.loginSlice,
  );
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();

  const notificationHandlers = React.useMemo<NotificationHandlers>(
    () => ({
      onOpened: payload => {
        handleNotificationOpen(payload);
      },
    }),
    [],
  );

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

  React.useEffect(() => {
    if (!isLoggedIn) {
      queryClient.clear();
    }
  }, [isLoggedIn, queryClient]);

  React.useEffect(() => {
    if (sessionExpired) {
      toast.show('Session expired, please log in again', {type: 'danger'});
      dispatch(setSessionExpired(false));
    }
  }, [sessionExpired, dispatch, toast]);

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
          const newAccessToken = await refreshAccessToken();
          if (!newAccessToken) {
            // refreshAccessToken() already forced a logout on failure
            SplashScreen.hide();
            return;
          }
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
        try {
          await forceLogout();
        } finally {
          SplashScreen.hide();
        }
      }
    } else {
      SplashScreen.hide();
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={flushPendingNotification}>
      <PushNotificationProvider handlers={notificationHandlers}>
        {isLoggedIn ? <CommonStack /> : <SignInStack />}
      </PushNotificationProvider>
    </NavigationContainer>
  );
}
