import {useEffect} from 'react';
import OneSignal from 'react-native-onesignal';

import {useAppSelector} from '../redux/reduxHooks';

interface NotificationHandlers {
  onReceived?: (notification: any) => void;
  onOpened?: (openResult: any) => void;
  onIds?: (device: any) => void;
}

const useOneSignal = (appId: string, handlers: NotificationHandlers) => {
  const {userDetails} = useAppSelector(state => state.loginSlice);
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
        console.log('notification:', notification);
        const data = notification.additionalData;
        console.log('additionalData:', data);
        notificationReceivedEvent.complete(notification);

        if (handlers.onReceived) {
          handlers.onReceived(notification);
        }
      };

      const openedHandler = (notification: any) => {
        console.log('OneSignal: notification opened:', notification);

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
