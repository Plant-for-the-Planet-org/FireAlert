import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const isAndroid = Platform.OS === 'android';

/**
 * Requests location permission from the user
 * Handles platform-specific permission flows for Android and iOS
 *
 * @returns {Promise<string | boolean>} Resolves with 'granted' or true on success
 * @throws {Error} Rejects with Error('blocked') if permission is permanently denied
 * @throws {Error} Rejects with Error('denied') if permission is temporarily denied (Android only)
 *
 * @example
 * try {
 *   await locationPermission();
 *   // Permission granted - proceed with location access
 * } catch (err) {
 *   if (err.message === 'blocked') {
 *     // Show alert to open settings
 *   } else if (err.message === 'denied') {
 *     // Show alert to retry permission request
 *   }
 * }
 *
 * @remarks
 * Android behavior:
 * - GRANTED: Resolves with 'granted'
 * - NEVER_ASK_AGAIN: Rejects with Error('blocked')
 * - DENIED: Rejects with Error('denied')
 *
 * iOS behavior:
 * - granted: Resolves with true
 * - denied/restricted: Rejects with Error('blocked')
 */
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
