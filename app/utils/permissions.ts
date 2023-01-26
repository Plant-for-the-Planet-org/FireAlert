import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const isAndroid = Platform.OS === 'android';

export const locationPermission = () => {
  return new Promise((resolve, reject) => {
    if (isAndroid) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      )
        .then(granted => {
          switch (granted) {
            case PermissionsAndroid.RESULTS.GRANTED:
              resolve('granted');
              return true;
            case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
              reject(new Error('blocked'));
              return false;
            case PermissionsAndroid.RESULTS.DENIED:
              reject(new Error('denied'));
              return false;
          }
        })
        .catch(err => console.warn(err));
    } else {
      Geolocation.requestAuthorization('whenInUse').then(permissionStatus => {
        if (permissionStatus === 'granted') {
          resolve(true);
        } else {
          reject(new Error('blocked'));
        }
      });
    }
  });
};
