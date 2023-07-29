import {useEffect} from 'react';
import OneSignal from 'react-native-onesignal';
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
      if (data?.json?.status === 403) {
        return toast.show(data?.json?.message || 'something went wrong', {
          type: 'warning',
        });
      }
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  trpc.alertMethod.getAlertMethods.useQuery(
    undefined,
    {
      enabled: !!userDetails?.data?.id,
      onSuccess: alertMethods => {
        OneSignal.getDeviceState().then(async res => {
          if (res?.userId) {
            if (
              !(
                alertMethods?.json?.data?.filter(
                  el =>
                    el.destination === res?.userId && el.method === 'device',
                ).length > 0
              ) &&
              res?.hasNotificationPermission
            ) {
              const {deviceName, deviceId} = await getDeviceInfo();
              const payload = {
                deviceId,
                deviceName,
                method: 'device',
                destination: res?.userId,
              };
              createAlertPreference.mutate({json: payload});
            }
          }
        });
      },
      onError: () => {
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  useEffect(() => {
    if (userDetails?.data?.id) {
      OneSignal.setAppId(appId);
      OneSignal.promptForPushNotificationsWithUserResponse();
      OneSignal.setExternalUserId(userDetails?.data?.id);

      const receivedHandler = (notificationReceivedEvent: any) => {
        console.log(
          'OneSignal: notification will show in foreground:',
          notificationReceivedEvent,
        );
        const notification = notificationReceivedEvent.getNotification();

        // const data = notification.additionalData;

        notificationReceivedEvent.complete(notification);

        if (handlers.onReceived) {
          handlers.onReceived(notification);
        }
      };

      const openedHandler = (notification: any) => {
        if (handlers.onOpened) {
          handlers.onOpened(notification);
        }
      };

      OneSignal.setNotificationWillShowInForegroundHandler(receivedHandler);
      OneSignal.setNotificationOpenedHandler(openedHandler);
    }
    return () => {
      OneSignal.clearHandlers();
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
