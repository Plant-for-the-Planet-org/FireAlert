import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import notifee, {EventType} from '@notifee/react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './app/App';
import {handleNotificationOpen} from './app/utils/linking';
import {name as appName} from './app.json';

// Must be registered outside of React. Notification messages are shown by
// the OS while in background, so nothing to do here besides acking.
setBackgroundMessageHandler(getMessaging(), async () => {});

// Tap on a Notifee notification while the app is in background.
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS) {
    handleNotificationOpen({data: detail.notification?.data ?? null});
  }
});

AppRegistry.registerComponent(appName, () => App);
