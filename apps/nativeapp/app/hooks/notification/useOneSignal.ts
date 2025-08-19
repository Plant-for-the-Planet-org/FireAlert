import {useEffect} from 'react';
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from 'react-native-onesignal';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../services/trpc';
import {useAppSelector} from '../redux/reduxHooks';
import {getDeviceInfo} from '../../utils/deviceInfo';

interface NotificationHandlers {
  onReceived?: (notification: any) => void;
  onOpened?: (openResult: any) => void;
  onIds?: (device: any) => void;
}

const useOneSignal = (appId: string, handlers: NotificationHandlers) => {
  const {userDetails} = useAppSelector(state => state.loginSlice);
  const toast = useToast();

  const createAlertPreference = trpc.alertMethod.createAlertMethod.useMutation({
    retryDelay: 3000,
    onSuccess: data => {
      if (
        [405, 403].includes(data?.json?.status) ||
        [405, 403].includes(data?.json?.httpStatus)
      ) {
        return toast.show(data?.json?.message || 'something went wrong', {
          type: 'warning',
        });
      }
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  async function getDeviceState() {
    const deviceState = {
      userId: await OneSignal.User.pushSubscription.getIdAsync(),
      pushToken: await OneSignal.User.pushSubscription.getTokenAsync(),
      externalId: await OneSignal.User.getExternalId(),
      optedIn: await OneSignal.User.pushSubscription.getOptedInAsync(),
      permission: await OneSignal.Notifications.getPermissionAsync(),
      permissionNative: await OneSignal.Notifications.permissionNative(),
      tags: await OneSignal.User.getTags(),
    };

    console.log(JSON.stringify(deviceState, null, 2));
    return deviceState;
  }

  trpc.alertMethod.getAlertMethods.useQuery(undefined, {
    enabled: true,
    onSuccess: alertMethods => {
      getDeviceState().then(async res => {
        if (res?.userId) {
          const hasMatchingDeviceMethod = alertMethods?.json?.data?.some(
            el => el.destination === res?.userId && el.method === 'device',
          );

          if (!hasMatchingDeviceMethod && res?.permission) {
            const {deviceName, deviceId} = await getDeviceInfo();
            const payload = {
              deviceId,
              deviceName,
              method: 'device',
              destination: res?.userId,
            };
            // console.log(payload);
            createAlertPreference.mutate({json: payload});
          }
        }
      });
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  useEffect(() => {
    if (userDetails?.data?.id) {
      // OneSignal.setAppId(appId);
      OneSignal.initialize(appId);

      // OneSignal.promptForPushNotificationsWithUserResponse();
      OneSignal.Notifications.requestPermission(false);

      // OneSignal.setExternalUserId(userDetails?.data?.id);
      OneSignal.login(userDetails?.data?.id);

      const receivedHandler = (event: NotificationWillDisplayEvent) => {
        console.log('OneSignal: notification will show in foreground:', event);
        const notification = event.getNotification();

        event.notification.display();
        // notificationReceivedEvent.complete(notification);

        if (handlers.onReceived) {
          handlers.onReceived(notification);
        }
      };

      const openedHandler = (event: NotificationClickEvent) => {
        if (handlers.onOpened) {
          handlers.onOpened(event);
        }
      };

      // OneSignal.setNotificationWillShowInForegroundHandler(receivedHandler);
      OneSignal.Notifications.addEventListener(
        'foregroundWillDisplay',
        receivedHandler,
      );

      // OneSignal.setNotificationOpenedHandler(openedHandler);
      OneSignal.Notifications.addEventListener('click', openedHandler);
    }
    return () => {
      // OneSignal.clearHandlers();
      // OneSignal.Notifications.clearAll();
    };
  }, [
    appId,
    handlers.onReceived,
    handlers.onOpened,
    handlers,
    userDetails?.data?.id,
  ]);
};

export default useOneSignal;
